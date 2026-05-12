"""
NeuralDesk — Email Priority Model Training
===========================================
Model 4: The Filter
Architecture: Embedding → LSTM → Dense layers
Dual-head output: priority score (regression) + category (classification)
Trained on 6,000+ synthetic email examples.
"""

import json
import os
import numpy as np

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from sklearn.model_selection import train_test_split


# ──────────────────────────────────────────────────
# Hyperparameters
# ──────────────────────────────────────────────────
MAX_SEQUENCE_LENGTH = 64
VOCAB_SIZE = 6000
EMBEDDING_DIM = 64
LSTM_UNITS = 48
DENSE_UNITS = 32
DROPOUT_RATE = 0.3
BATCH_SIZE = 64
EPOCHS = 20
LEARNING_RATE = 0.001
NUM_CATEGORIES = 4  # urgent, normal, low, spam


def build_email_model(vocab_size):
    """
    Build the email priority scoring model.

    Dual-head architecture:
        Input → Embedding → LSTM → Dense →
            Head 1: priority_score (sigmoid * 100)
            Head 2: category (softmax over 4 classes)
    """
    inputs = layers.Input(shape=(MAX_SEQUENCE_LENGTH,), name="input_tokens")

    x = layers.Embedding(
        input_dim=vocab_size,
        output_dim=EMBEDDING_DIM,
        name="embedding"
    )(inputs)

    x = layers.LSTM(LSTM_UNITS, return_sequences=False, name="lstm")(x)
    x = layers.Dense(DENSE_UNITS, activation="relu", name="shared_dense")(x)
    x = layers.Dropout(DROPOUT_RATE, name="dropout")(x)

    # Head 1: Priority score (0-100)
    priority_out = layers.Dense(16, activation="relu", name="priority_dense")(x)
    priority_out = layers.Dense(1, activation="sigmoid", name="priority_score")(priority_out)

    # Head 2: Category classification
    category_out = layers.Dense(16, activation="relu", name="category_dense")(x)
    category_out = layers.Dense(NUM_CATEGORIES, activation="softmax", name="category")(category_out)

    model = keras.Model(
        inputs=inputs,
        outputs=[priority_out, category_out],
        name="EmailPriorityModel"
    )
    return model


def simple_tokenizer(texts, vocab_size=VOCAB_SIZE):
    """Build a simple word-level tokenizer."""
    word_counts = {}
    for text in texts:
        for word in text.lower().split():
            word_counts[word] = word_counts.get(word, 0) + 1

    sorted_words = sorted(word_counts.items(), key=lambda x: -x[1])
    word_to_idx = {"<PAD>": 0, "<UNK>": 1}
    for i, (word, _) in enumerate(sorted_words[:vocab_size - 2]):
        word_to_idx[word] = i + 2

    return word_to_idx


def encode_texts(texts, word_to_idx, max_len=MAX_SEQUENCE_LENGTH):
    """Convert texts to padded integer sequences."""
    encoded = []
    for text in texts:
        tokens = [word_to_idx.get(w, 1) for w in text.lower().split()]
        if len(tokens) > max_len:
            tokens = tokens[:max_len]
        else:
            tokens = tokens + [0] * (max_len - len(tokens))
        encoded.append(tokens)
    return np.array(encoded, dtype=np.int32)


def main():
    print("=" * 60)
    print("NeuralDesk — Email Priority Model Training")
    print("=" * 60)

    # ── Load dataset ──
    data_path = os.path.join("data", "email_dataset.json")
    if not os.path.exists(data_path):
        print("Dataset not found. Generating...")
        from generate_email_data import main as gen_main
        gen_main()

    with open(data_path, "r", encoding="utf-8") as f:
        dataset = json.load(f)

    texts = [item["text"] for item in dataset]
    priority_scores = np.array([item["priority_score"] / 100.0 for item in dataset], dtype=np.float32)

    category_map = {"urgent": 0, "normal": 1, "low": 2, "spam": 3}
    categories = np.array([category_map[item["category"]] for item in dataset], dtype=np.int32)

    print(f"\nDataset size: {len(texts)}")
    print(f"Categories: {list(category_map.keys())}")

    # ── Tokenize ──
    word_to_idx = simple_tokenizer(texts)
    X = encode_texts(texts, word_to_idx)
    actual_vocab = min(len(word_to_idx) + 1, VOCAB_SIZE)

    print(f"Vocabulary size: {len(word_to_idx)}")

    # ── Split ──
    X_train, X_test, y_pri_train, y_pri_test, y_cat_train, y_cat_test = train_test_split(
        X, priority_scores, categories, test_size=0.15, random_state=42
    )

    print(f"Training samples: {len(X_train)}")
    print(f"Test samples: {len(X_test)}")

    # ── Build model ──
    model = build_email_model(actual_vocab)
    model.summary()

    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=LEARNING_RATE),
        loss={
            "priority_score": "mse",
            "category": "sparse_categorical_crossentropy"
        },
        loss_weights={"priority_score": 1.0, "category": 1.0},
        metrics={
            "priority_score": ["mae"],
            "category": ["accuracy"]
        }
    )

    # ── Train ──
    print("\n" + "=" * 60)
    print("Training...")
    print("=" * 60)

    callbacks = [
        keras.callbacks.EarlyStopping(
            monitor="val_loss", patience=5, restore_best_weights=True
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss", factor=0.5, patience=3
        )
    ]

    history = model.fit(
        X_train,
        {"priority_score": y_pri_train, "category": y_cat_train},
        validation_split=0.1,
        batch_size=BATCH_SIZE,
        epochs=EPOCHS,
        callbacks=callbacks,
        verbose=1
    )

    # ── Evaluate ──
    print("\n" + "=" * 60)
    print("Evaluation")
    print("=" * 60)

    results = model.evaluate(
        X_test,
        {"priority_score": y_pri_test, "category": y_cat_test},
        verbose=0
    )
    print(f"Total Loss: {results[0]:.4f}")
    print(f"Priority MAE: {results[2]:.4f} (on 0-1 scale -> {results[2]*100:.1f} points on 0-100)")
    print(f"Category Accuracy: {results[4]:.4f}")

    # ── Save ──
    os.makedirs("models", exist_ok=True)

    keras_path = os.path.join("models", "email_priority.keras")
    model.save(keras_path)
    print(f"\nKeras model saved to: {keras_path}")

    # TFLite conversion
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    converter.target_spec.supported_ops = [
        tf.lite.OpsSet.TFLITE_BUILTINS,
        tf.lite.OpsSet.SELECT_TF_OPS
    ]
    converter._experimental_lower_tensor_list_ops = False
    tflite_model = converter.convert()
    tflite_path = os.path.join("models", "email_priority.tflite")
    with open(tflite_path, "wb") as f:
        f.write(tflite_model)
    print(f"TFLite model saved to: {tflite_path}")
    print(f"TFLite model size: {len(tflite_model) / 1024:.1f} KB")

    # Save tokenizer
    tokenizer_path = os.path.join("models", "email_tokenizer.json")
    with open(tokenizer_path, "w", encoding="utf-8") as f:
        json.dump(word_to_idx, f, ensure_ascii=False)

    # Save category map
    cat_path = os.path.join("models", "email_categories.json")
    idx_to_cat = {str(v): k for k, v in category_map.items()}
    with open(cat_path, "w") as f:
        json.dump(idx_to_cat, f, indent=2)

    # Save training history
    history_data = {
        "category_accuracy": [float(x) for x in history.history.get("category_accuracy", [])],
        "val_category_accuracy": [float(x) for x in history.history.get("val_category_accuracy", [])],
        "loss": [float(x) for x in history.history["loss"]],
        "val_loss": [float(x) for x in history.history["val_loss"]],
        "test_category_accuracy": float(results[4]),
        "test_priority_mae": float(results[2])
    }
    hist_path = os.path.join("models", "email_training_history.json")
    with open(hist_path, "w") as f:
        json.dump(history_data, f, indent=2)

    # ── Test predictions ──
    print("\n" + "=" * 60)
    print("Sample Predictions")
    print("=" * 60)

    test_emails = [
        "Subject: URGENT: Server is down From: boss@company.com Body: Please respond ASAP.",
        "Subject: Team lunch Friday From: colleague@work.com Body: Hey everyone, lunch at noon.",
        "Subject: You've WON $1,000,000!!! From: winner@lottery.xyz Body: Click to claim now!",
        "Subject: Meeting notes From: team@project.org Body: Attached are the notes from today.",
    ]

    for email_text in test_emails:
        encoded = encode_texts([email_text], word_to_idx, MAX_SEQUENCE_LENGTH)
        pred_priority, pred_category = model.predict(encoded, verbose=0)
        score = float(pred_priority[0][0]) * 100
        cat_idx = int(np.argmax(pred_category[0]))
        cat_name = idx_to_cat[str(cat_idx)]
        print(f"  Score: {score:.0f}/100 | Category: {cat_name}")
        print(f"    -> {email_text[:80]}...")
        print()

    print("=" * 60)
    print("Email Priority Model training complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
