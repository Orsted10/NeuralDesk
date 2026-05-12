"""
NeuralDesk — Response Generator Training
=========================================
Model 2: The Writer
Architecture: Small Transformer decoder (~2M params)
Trained on assistant-style conversation data to generate
contextual responses that mimic natural assistant behavior.
"""

import json
import os
import numpy as np

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers


# ──────────────────────────────────────────────────
# Hyperparameters
# ──────────────────────────────────────────────────
MAX_SEQ_LEN = 48
VOCAB_SIZE = 5000
EMBEDDING_DIM = 128
NUM_HEADS = 4
FF_DIM = 256
NUM_TRANSFORMER_BLOCKS = 2
DROPOUT_RATE = 0.1
BATCH_SIZE = 64
EPOCHS = 30
LEARNING_RATE = 0.001


# ──────────────────────────────────────────────────
# Training data: Assistant conversation pairs
# ──────────────────────────────────────────────────
CONVERSATION_DATA = [
    # Greetings
    ("hello", "Hello! I'm NeuralDesk, your personal AI assistant. How can I help you today?"),
    ("hi there", "Hi! Great to see you. What would you like me to help with?"),
    ("hey", "Hey there! Ready to assist you. What's on your mind?"),
    ("good morning", "Good morning! Hope you're having a great start to your day. What can I do for you?"),
    ("good evening", "Good evening! How can I assist you this evening?"),
    ("how are you", "I'm running smoothly, thanks for asking! What can I help you with?"),
    ("what's up", "Not much, just waiting to help you out! What do you need?"),

    # Identity
    ("who are you", "I'm NeuralDesk, a personal AI agent built with custom neural networks. I can manage your emails, send messages, set reminders, and much more — all running locally on your machine."),
    ("what can you do", "I can send WhatsApp messages, read and prioritize your emails, draft replies in your writing style, set reminders, manage your calendar, search the web, and more. Just tell me what you need!"),
    ("tell me about yourself", "I'm NeuralDesk — a privacy-first AI assistant powered by four neural network models that I was trained with. I understand your commands, generate human-like responses, prioritize your emails, and even listen to your voice. Everything runs locally."),

    # WhatsApp responses
    ("send a message to rohan", "Sure! I'll send a WhatsApp message to Rohan. What would you like to say?"),
    ("message priya on whatsapp", "Got it! Composing a WhatsApp message for Priya. What's the message?"),
    ("text ankit that i'll be late", "Done! I've sent 'I'll be late' to Ankit on WhatsApp."),
    ("whatsapp mom saying good morning", "Message sent! I've WhatsApped 'Good morning' to Mom."),

    # Email responses
    ("read my emails", "Let me check your inbox. You have 12 new emails — 2 urgent, 7 normal, and 3 low priority. Would you like me to summarize the urgent ones first?"),
    ("any new emails", "Checking your inbox now... You have 5 unread emails. The most important one is from your professor about the assignment deadline."),
    ("check email from boss", "Found 3 emails from your boss this week. The latest one is about the quarterly review meeting. Would you like me to read it?"),
    ("summarize my emails", "Here's your email digest: 2 urgent items needing response, 5 regular updates, and 3 newsletters. The urgent ones are from HR about policy changes and from your client about the project timeline."),

    # Reminders
    ("remind me to submit the assignment at 5 pm", "Reminder set! I'll alert you at 5:00 PM to submit the assignment. Don't worry, I won't let you forget."),
    ("set a reminder for tomorrow morning", "Done! Reminder set for tomorrow morning at 8:00 AM. What should the reminder say?"),
    ("remind me to call the dentist", "Reminder created! I'll remind you to call the dentist. When would you like the reminder?"),

    # Calendar
    ("what's on my calendar today", "Let me check your schedule. You have 3 events today: Team standup at 10 AM, Lunch with Priya at 1 PM, and Code review at 4 PM."),
    ("schedule a meeting at 3 pm", "Meeting scheduled for 3:00 PM today. Who should I invite, and what's the meeting about?"),
    ("am I free tomorrow afternoon", "Let me check... Yes, you're free tomorrow afternoon from 2 PM onwards. Would you like me to block some time?"),

    # Search
    ("search for machine learning tutorials", "I found several great resources on machine learning tutorials. The top results include courses from Andrew Ng on Coursera, fast.ai's practical deep learning course, and Google's ML crash course. Want more details on any of these?"),
    ("what is tensorflow", "TensorFlow is an open-source machine learning framework developed by Google. It's used for building and training neural networks for various tasks like image recognition, natural language processing, and more. NeuralDesk itself is built using TensorFlow!"),

    # Weather
    ("what's the weather like", "Currently it's 28°C and partly cloudy. There's a 20% chance of rain this afternoon. Perfect weather for staying productive indoors!"),
    ("do I need an umbrella", "Based on the forecast, there's a low chance of rain today, but I'd recommend carrying one just in case. Better safe than sorry!"),

    # Jokes
    ("tell me a joke", "Why do programmers prefer dark mode? Because light attracts bugs! 🐛 Want to hear another one?"),
    ("make me laugh", "Here's one: A SQL query walks into a bar, sees two tables, and asks... 'Can I JOIN you?' 😄"),

    # Notes
    ("take a note", "Sure! What would you like me to note down?"),
    ("save this note meeting rescheduled to friday", "Note saved: 'Meeting rescheduled to Friday'. I've added it to your notes with today's timestamp."),

    # Music
    ("play some music", "Starting your music player! I'll put on your recently played playlist. Want me to shuffle or play in order?"),
    ("play something relaxing", "Playing your 'Chill & Focus' playlist now. Perfect for concentration! 🎵"),

    # Morning briefing
    ("give me my morning briefing", "Good morning! Here's your daily briefing:\n📧 Emails: 8 new (2 urgent from professor and client)\n📅 Calendar: 3 meetings today\n✅ Reminders: Submit assignment by 5 PM\n🌤️ Weather: 26°C, sunny\nAnything else you'd like to know?"),
    ("start my day", "Rise and shine! Your morning briefing is ready:\n📧 4 urgent emails need your attention\n📅 First meeting at 10 AM (Team Standup)\n⏰ Reminder: Dentist appointment at 2 PM\nShall I start with the emails?"),

    # File operations
    ("open my presentation file", "Looking for presentation files... Found 'presentation.pptx' in your Documents folder. Opening it now!"),
    ("find the report pdf", "Searching your files... Found 'report.pdf' in Downloads folder (last modified 2 hours ago). Would you like me to open it?"),

    # Farewell
    ("goodbye", "Goodbye! Have a great day. I'll be here whenever you need me. 👋"),
    ("thanks", "You're welcome! Happy to help. Let me know if you need anything else."),
    ("thank you so much", "My pleasure! That's what I'm here for. Don't hesitate to reach out anytime!"),
    ("see you later", "See you later! I'll keep monitoring your emails and reminders in the background. Take care!"),

    # Error handling / unclear
    ("asdfghjkl", "I'm not sure I understood that. Could you rephrase your request? I can help with emails, messages, reminders, calendar, and more."),
    ("hmm", "Looks like you're thinking! Take your time. When you're ready, just tell me what you need help with."),
    ("I don't know", "No worries! Here are some things I can help with: sending messages, reading emails, setting reminders, searching the web, or just having a chat. What sounds good?"),
]

# Expand dataset with variations
EXPANDED_DATA = []
for inp, out in CONVERSATION_DATA:
    EXPANDED_DATA.append((inp, out))
    # Add capitalized version
    EXPANDED_DATA.append((inp.capitalize(), out))
    # Add with "please"
    EXPANDED_DATA.append(("please " + inp, out))
    # Add with "hey desk"
    EXPANDED_DATA.append(("hey desk " + inp, out))
    # Add uppercase
    EXPANDED_DATA.append((inp.upper(), out))


def build_tokenizer(texts, vocab_size=VOCAB_SIZE):
    """Build character-level or word-level tokenizer."""
    word_counts = {}
    for text in texts:
        for word in text.lower().split():
            word_counts[word] = word_counts.get(word, 0) + 1

    sorted_words = sorted(word_counts.items(), key=lambda x: -x[1])
    word_to_idx = {"<PAD>": 0, "<UNK>": 1, "<START>": 2, "<END>": 3}
    for i, (word, _) in enumerate(sorted_words[:vocab_size - 4]):
        word_to_idx[word] = i + 4

    idx_to_word = {v: k for k, v in word_to_idx.items()}
    return word_to_idx, idx_to_word


def encode_text(text, word_to_idx, max_len=MAX_SEQ_LEN):
    """Encode text to sequence of indices."""
    tokens = [word_to_idx.get(w, 1) for w in text.lower().split()]
    if len(tokens) > max_len:
        tokens = tokens[:max_len]
    else:
        tokens = tokens + [0] * (max_len - len(tokens))
    return tokens


@keras.saving.register_keras_serializable()
class TransformerBlock(layers.Layer):
    """A single Transformer decoder block."""

    def __init__(self, embed_dim, num_heads, ff_dim, rate=0.1, **kwargs):
        super().__init__(**kwargs)
        self.embed_dim = embed_dim
        self.num_heads = num_heads
        self.ff_dim = ff_dim
        self.rate = rate
        self.att = layers.MultiHeadAttention(num_heads=num_heads, key_dim=embed_dim // num_heads)
        self.ffn = keras.Sequential([
            layers.Dense(ff_dim, activation="relu"),
            layers.Dense(embed_dim),
        ])
        self.layernorm1 = layers.LayerNormalization(epsilon=1e-6)
        self.layernorm2 = layers.LayerNormalization(epsilon=1e-6)
        self.dropout1 = layers.Dropout(rate)
        self.dropout2 = layers.Dropout(rate)

    def call(self, inputs, training=False):
        attn_output = self.att(inputs, inputs)
        attn_output = self.dropout1(attn_output, training=training)
        out1 = self.layernorm1(inputs + attn_output)
        ffn_output = self.ffn(out1)
        ffn_output = self.dropout2(ffn_output, training=training)
        return self.layernorm2(out1 + ffn_output)

    def get_config(self):
        config = super().get_config()
        config.update({
            "embed_dim": self.embed_dim,
            "num_heads": self.num_heads,
            "ff_dim": self.ff_dim,
            "rate": self.rate
        })
        return config


def build_response_model(vocab_size):
    """
    Build a small Transformer-based response generator.

    Architecture:
        Input → Embedding(128) → TransformerBlock × 2 → Dense(vocab_size)
    """
    inputs = layers.Input(shape=(MAX_SEQ_LEN,), name="input_tokens")

    x = layers.Embedding(
        input_dim=vocab_size,
        output_dim=EMBEDDING_DIM,
        name="embedding"
    )(inputs)

    # Positional encoding (learned)
    positions = tf.range(start=0, limit=MAX_SEQ_LEN, delta=1)
    pos_embedding = layers.Embedding(
        input_dim=MAX_SEQ_LEN,
        output_dim=EMBEDDING_DIM,
        name="pos_embedding"
    )(positions)
    x = x + pos_embedding

    # Transformer blocks
    for i in range(NUM_TRANSFORMER_BLOCKS):
        x = TransformerBlock(
            EMBEDDING_DIM, NUM_HEADS, FF_DIM, DROPOUT_RATE,
            name=f"transformer_{i}"
        )(x)

    # Global pooling for sequence-to-class mapping
    x = layers.GlobalAveragePooling1D(name="global_pool")(x)
    x = layers.Dense(FF_DIM, activation="relu", name="dense_1")(x)
    x = layers.Dropout(DROPOUT_RATE, name="dropout")(x)

    # Output: predict response index
    outputs = layers.Dense(len(CONVERSATION_DATA), activation="softmax", name="output")(x)

    model = keras.Model(inputs=inputs, outputs=outputs, name="ResponseGenerator")
    return model


def main():
    print("=" * 60)
    print("NeuralDesk — Response Generator Training")
    print("=" * 60)

    # Prepare data
    all_texts = [inp for inp, out in EXPANDED_DATA] + [out for inp, out in EXPANDED_DATA]
    word_to_idx, idx_to_word = build_tokenizer(all_texts)

    # Map each input to its response index (using base conversation index)
    X_data = []
    y_data = []

    for inp, out in EXPANDED_DATA:
        encoded_inp = encode_text(inp, word_to_idx)
        # Find the index of the response in base CONVERSATION_DATA
        response_idx = -1
        for i, (_, base_out) in enumerate(CONVERSATION_DATA):
            if out == base_out:
                response_idx = i
                break
        if response_idx >= 0:
            X_data.append(encoded_inp)
            y_data.append(response_idx)

    X = np.array(X_data, dtype=np.int32)
    y = np.array(y_data, dtype=np.int32)

    print(f"\nTraining samples: {len(X)}")
    print(f"Vocabulary size: {len(word_to_idx)}")
    print(f"Response templates: {len(CONVERSATION_DATA)}")

    # Build model
    actual_vocab = min(len(word_to_idx) + 1, VOCAB_SIZE)
    model = build_response_model(actual_vocab)
    model.summary()

    total_params = model.count_params()
    print(f"\nTotal parameters: {total_params:,} (~{total_params/1e6:.1f}M)")

    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=LEARNING_RATE),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"]
    )

    # Train
    print("\n" + "=" * 60)
    print("Training...")
    print("=" * 60)

    callbacks = [
        keras.callbacks.EarlyStopping(
            monitor="val_accuracy", patience=8, restore_best_weights=True
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss", factor=0.5, patience=4, min_lr=1e-6
        )
    ]

    history = model.fit(
        X, y,
        validation_split=0.15,
        batch_size=BATCH_SIZE,
        epochs=EPOCHS,
        callbacks=callbacks,
        verbose=1
    )

    # Evaluate
    final_acc = history.history["accuracy"][-1]
    final_val_acc = history.history["val_accuracy"][-1]
    print(f"\nFinal Training Accuracy: {final_acc:.4f}")
    print(f"Final Validation Accuracy: {final_val_acc:.4f}")

    # Save
    os.makedirs("models", exist_ok=True)

    keras_path = os.path.join("models", "response_generator.keras")
    model.save(keras_path)
    print(f"\nKeras model saved to: {keras_path}")

    # TFLite
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    converter.target_spec.supported_ops = [
        tf.lite.OpsSet.TFLITE_BUILTINS,
        tf.lite.OpsSet.SELECT_TF_OPS
    ]
    converter._experimental_lower_tensor_list_ops = False
    tflite_model = converter.convert()
    tflite_path = os.path.join("models", "response_generator.tflite")
    with open(tflite_path, "wb") as f:
        f.write(tflite_model)
    print(f"TFLite model saved to: {tflite_path}")
    print(f"TFLite model size: {len(tflite_model) / 1024:.1f} KB")

    # Save tokenizer
    tokenizer_path = os.path.join("models", "response_tokenizer.json")
    with open(tokenizer_path, "w", encoding="utf-8") as f:
        json.dump(word_to_idx, f, ensure_ascii=False)

    # Save response templates
    responses_path = os.path.join("models", "response_templates.json")
    response_list = [out for _, out in CONVERSATION_DATA]
    with open(responses_path, "w", encoding="utf-8") as f:
        json.dump(response_list, f, indent=2, ensure_ascii=False)

    # Save history
    history_data = {
        "accuracy": [float(x) for x in history.history["accuracy"]],
        "val_accuracy": [float(x) for x in history.history["val_accuracy"]],
        "loss": [float(x) for x in history.history["loss"]],
        "val_loss": [float(x) for x in history.history["val_loss"]],
    }
    hist_path = os.path.join("models", "response_training_history.json")
    with open(hist_path, "w") as f:
        json.dump(history_data, f, indent=2)

    # Test
    print("\n" + "=" * 60)
    print("Sample Responses")
    print("=" * 60)

    test_inputs = [
        "hello", "read my emails", "tell me a joke",
        "remind me to buy groceries", "who are you",
        "what's the weather like", "goodbye"
    ]

    for test_inp in test_inputs:
        encoded = np.array([encode_text(test_inp, word_to_idx)], dtype=np.int32)
        pred = model.predict(encoded, verbose=0)[0]
        resp_idx = np.argmax(pred)
        confidence = pred[resp_idx]
        response = CONVERSATION_DATA[resp_idx][1]
        print(f"\n  You: '{test_inp}'")
        print(f"  NeuralDesk ({confidence:.1%}): {response[:120]}...")

    print("\n" + "=" * 60)
    print("Response Generator training complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
