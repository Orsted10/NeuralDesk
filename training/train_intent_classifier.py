"""
NeuralDesk — Intent Classifier Training
========================================
Model 1: The Brain
Architecture: Embedding → BiLSTM → MultiHeadAttention → Dense
Trained on 12,000+ synthetic intent examples across 20 categories.
Target: 92%+ accuracy on unseen commands.
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
MAX_SEQUENCE_LENGTH = 32
VOCAB_SIZE = 8000
EMBEDDING_DIM = 128
LSTM_UNITS = 64
NUM_HEADS = 4
DENSE_UNITS = 64
DROPOUT_RATE = 0.3
BATCH_SIZE = 64
EPOCHS = 25
LEARNING_RATE = 0.001


@keras.saving.register_keras_serializable()
class MultiHeadSelfAttention(layers.Layer):
    """Multi-Head Self Attention layer for sequence modeling."""

    def __init__(self, embed_dim, num_heads, **kwargs):
        super().__init__(**kwargs)
        self.embed_dim = embed_dim
        self.num_heads = num_heads
        self.attention = layers.MultiHeadAttention(
            num_heads=num_heads, key_dim=embed_dim // num_heads
        )
        self.layernorm = layers.LayerNormalization()

    def call(self, inputs):
        attn_output = self.attention(inputs, inputs)
        return self.layernorm(inputs + attn_output)

    def get_config(self):
        config = super().get_config()
        config.update({"embed_dim": self.embed_dim, "num_heads": self.num_heads})
        return config


def build_intent_model(vocab_size, num_classes):
    """
    Build the BiLSTM + Multi-Head Attention intent classifier.

    Architecture:
        Input → Embedding(128) → BiLSTM(64) → MultiHeadAttention(4 heads)
        → GlobalAveragePooling → Dense(64, relu) → Dropout(0.3) → Dense(num_classes, softmax)
    """
    inputs = layers.Input(shape=(MAX_SEQUENCE_LENGTH,), name="input_tokens")

    # Embedding layer
    x = layers.Embedding(
        input_dim=vocab_size,
        output_dim=EMBEDDING_DIM,
        mask_zero=False,
        name="embedding"
    )(inputs)

    # Bidirectional LSTM
    x = layers.Bidirectional(
        layers.LSTM(LSTM_UNITS, return_sequences=True, name="lstm"),
        name="bilstm"
    )(x)

    # Multi-Head Self Attention
    x = MultiHeadSelfAttention(LSTM_UNITS * 2, NUM_HEADS, name="attention")(x)

    # Pooling
    x = layers.GlobalAveragePooling1D(name="global_pool")(x)

    # Classification head
    x = layers.Dense(DENSE_UNITS, activation="relu", name="dense_1")(x)
    x = layers.Dropout(DROPOUT_RATE, name="dropout")(x)
    outputs = layers.Dense(num_classes, activation="softmax", name="output")(x)

    model = keras.Model(inputs=inputs, outputs=outputs, name="IntentClassifier")
    return model


def simple_tokenizer(texts, vocab_size=VOCAB_SIZE):
    """Build a simple word-level tokenizer."""
    word_counts = {}
    for text in texts:
        for word in text.lower().split():
            word_counts[word] = word_counts.get(word, 0) + 1

    # Sort by frequency and take top vocab_size - 2 words
    sorted_words = sorted(word_counts.items(), key=lambda x: -x[1])
    word_to_idx = {"<PAD>": 0, "<UNK>": 1}
    for i, (word, _) in enumerate(sorted_words[:vocab_size - 2]):
        word_to_idx[word] = i + 2

    return word_to_idx


def encode_texts(texts, word_to_idx, max_len=MAX_SEQUENCE_LENGTH):
    """Convert texts to padded integer sequences."""
    encoded = []
    for text in texts:
        tokens = []
        for word in text.lower().split():
            tokens.append(word_to_idx.get(word, 1))  # 1 = <UNK>
        # Pad or truncate
        if len(tokens) > max_len:
            tokens = tokens[:max_len]
        else:
            tokens = tokens + [0] * (max_len - len(tokens))
        encoded.append(tokens)
    return np.array(encoded, dtype=np.int32)


def main():
    print("=" * 60)
    print("NeuralDesk — Intent Classifier Training")
    print("=" * 60)

    # ── Load dataset ──
    data_path = os.path.join("data", "intent_dataset.json")
    if not os.path.exists(data_path):
        print("Dataset not found. Generating...")
        from generate_intent_data import main as gen_main
        gen_main()

    with open(data_path, "r", encoding="utf-8") as f:
        dataset = json.load(f)

    texts = [item["text"] for item in dataset]
    intents = [item["intent"] for item in dataset]

    # ── Create label mapping ──
    unique_intents = sorted(set(intents))
    label_to_idx = {label: idx for idx, label in enumerate(unique_intents)}
    idx_to_label = {idx: label for label, idx in label_to_idx.items()}
    num_classes = len(unique_intents)

    print(f"\nDataset size: {len(texts)}")
    print(f"Number of intent classes: {num_classes}")
    print(f"Classes: {unique_intents}")

    # ── Tokenize ──
    word_to_idx = simple_tokenizer(texts)
    X = encode_texts(texts, word_to_idx)
    y = np.array([label_to_idx[intent] for intent in intents], dtype=np.int32)

    print(f"Vocabulary size: {len(word_to_idx)}")
    print(f"Input shape: {X.shape}")

    # ── Split ──
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.15, random_state=42, stratify=y
    )
    print(f"Training samples: {len(X_train)}")
    print(f"Test samples: {len(X_test)}")

    # ── Build model ──
    actual_vocab = min(len(word_to_idx) + 1, VOCAB_SIZE)
    model = build_intent_model(actual_vocab, num_classes)
    model.summary()

    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=LEARNING_RATE),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"]
    )

    # ── Train ──
    print("\n" + "=" * 60)
    print("Training...")
    print("=" * 60)

    callbacks = [
        keras.callbacks.EarlyStopping(
            monitor="val_accuracy", patience=5, restore_best_weights=True
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss", factor=0.5, patience=3, min_lr=1e-6
        )
    ]

    history = model.fit(
        X_train, y_train,
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

    test_loss, test_acc = model.evaluate(X_test, y_test, verbose=0)
    print(f"Test Accuracy: {test_acc:.4f}")
    print(f"Test Loss: {test_loss:.4f}")

    # ── Save model ──
    os.makedirs("models", exist_ok=True)

    # Save Keras model
    keras_path = os.path.join("models", "intent_classifier.keras")
    model.save(keras_path)
    print(f"\nKeras model saved to: {keras_path}")

    # Convert to TFLite
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    converter.target_spec.supported_ops = [
        tf.lite.OpsSet.TFLITE_BUILTINS,
        tf.lite.OpsSet.SELECT_TF_OPS
    ]
    converter._experimental_lower_tensor_list_ops = False
    tflite_model = converter.convert()
    tflite_path = os.path.join("models", "intent_classifier.tflite")
    with open(tflite_path, "wb") as f:
        f.write(tflite_model)
    print(f"TFLite model saved to: {tflite_path}")
    print(f"TFLite model size: {len(tflite_model) / 1024:.1f} KB")

    # Save tokenizer and labels
    tokenizer_path = os.path.join("models", "intent_tokenizer.json")
    with open(tokenizer_path, "w", encoding="utf-8") as f:
        json.dump(word_to_idx, f, ensure_ascii=False)
    print(f"Tokenizer saved to: {tokenizer_path}")

    labels_path = os.path.join("models", "intent_labels.json")
    with open(labels_path, "w", encoding="utf-8") as f:
        json.dump(idx_to_label, f, ensure_ascii=False)
    print(f"Labels saved to: {labels_path}")

    # ── Test predictions ──
    print("\n" + "=" * 60)
    print("Sample Predictions")
    print("=" * 60)

    test_commands = [
        "send a message to Rohan",
        "what emails did I get today",
        "remind me to submit the assignment at 5 PM",
        "search for machine learning tutorials",
        "tell me a joke",
        "what's the weather like",
        "set an alarm for 7 AM",
        "draft an email to professor about the project",
        "good morning how are you",
        "play some music"
    ]

    for cmd in test_commands:
        encoded = encode_texts([cmd], word_to_idx)
        pred = model.predict(encoded, verbose=0)[0]
        intent_idx = np.argmax(pred)
        confidence = pred[intent_idx]
        intent = idx_to_label[intent_idx]
        print(f"  '{cmd}' -> {intent} ({confidence:.2%})")

    # Save training history
    history_data = {
        "accuracy": [float(x) for x in history.history["accuracy"]],
        "val_accuracy": [float(x) for x in history.history["val_accuracy"]],
        "loss": [float(x) for x in history.history["loss"]],
        "val_loss": [float(x) for x in history.history["val_loss"]],
        "test_accuracy": float(test_acc),
        "test_loss": float(test_loss)
    }
    hist_path = os.path.join("models", "intent_training_history.json")
    with open(hist_path, "w") as f:
        json.dump(history_data, f, indent=2)
    print(f"\nTraining history saved to: {hist_path}")

    print("\n" + "=" * 60)
    print("Intent Classifier training complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
