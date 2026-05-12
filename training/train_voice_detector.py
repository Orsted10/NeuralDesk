"""
NeuralDesk — Voice Command Detector Training
=============================================
Model 3: The Ears
Architecture: CNN on MFCC-like spectrograms
Trains on synthetically generated audio feature representations
for wake-word detection and command type classification.

Note: In the deployed web app, we use the browser's Web Speech API
for actual speech recognition. This model demonstrates the CNN
architecture for MFCC-based audio classification.
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
N_MFCC = 13          # Number of MFCC coefficients
TIME_STEPS = 32      # Temporal resolution
NUM_CLASSES = 6      # Command categories
BATCH_SIZE = 32
EPOCHS = 20
LEARNING_RATE = 0.001

COMMAND_CLASSES = [
    "hey_desk",      # Wake word
    "send_message",   # Communication commands
    "read_email",     # Email commands
    "set_reminder",   # Task commands
    "search",         # Search commands
    "silence"         # Background / no command
]


def generate_synthetic_mfcc_data(n_samples=5000):
    """
    Generate synthetic MFCC-like spectrograms for training.

    Each class has distinct spectral patterns that the CNN learns to
    distinguish — simulating how real MFCC features from different
    spoken commands have different frequency-time characteristics.
    """
    X = []
    y = []
    samples_per_class = n_samples // NUM_CLASSES

    for class_idx in range(NUM_CLASSES):
        for _ in range(samples_per_class):
            # Base pattern for this class
            spectrogram = np.random.randn(N_MFCC, TIME_STEPS).astype(np.float32) * 0.3

            if class_idx == 0:  # hey_desk — rising pitch pattern
                for t in range(TIME_STEPS):
                    spectrogram[2:5, t] += np.sin(t * 0.3) * 2.0
                    spectrogram[6:8, t] += np.cos(t * 0.2) * 1.5
            elif class_idx == 1:  # send_message — steady mid-frequency
                spectrogram[3:7, :] += 1.5
                spectrogram[5:8, 10:25] += 1.0
            elif class_idx == 2:  # read_email — low frequency dominant
                spectrogram[0:4, :] += 2.0
                spectrogram[1:3, 5:20] += 1.5
            elif class_idx == 3:  # set_reminder — pulsating pattern
                for t in range(TIME_STEPS):
                    spectrogram[:, t] += np.sin(t * 0.5) * 1.0
                spectrogram[4:8, :] += 0.8
            elif class_idx == 4:  # search — broad frequency
                spectrogram += 0.5
                spectrogram[2:10, 5:25] += 1.0
            else:  # silence — near zero
                spectrogram *= 0.1

            # Add noise
            noise = np.random.randn(N_MFCC, TIME_STEPS).astype(np.float32) * 0.2
            spectrogram += noise

            X.append(spectrogram)
            y.append(class_idx)

    X = np.array(X, dtype=np.float32)
    y = np.array(y, dtype=np.int32)

    # Shuffle
    indices = np.random.permutation(len(X))
    return X[indices], y[indices]


def build_voice_cnn():
    """
    Build a CNN for MFCC spectrogram classification.

    Architecture:
        Input(13, 32, 1) → Conv2D(32) → MaxPool → Conv2D(64) → MaxPool
        → Conv2D(64) → GlobalAvgPool → Dense(64) → Dense(6, softmax)
    """
    inputs = layers.Input(shape=(N_MFCC, TIME_STEPS, 1), name="mfcc_input")

    # Conv Block 1
    x = layers.Conv2D(32, (3, 3), activation="relu", padding="same", name="conv1")(inputs)
    x = layers.BatchNormalization(name="bn1")(x)
    x = layers.MaxPooling2D((2, 2), name="pool1")(x)

    # Conv Block 2
    x = layers.Conv2D(64, (3, 3), activation="relu", padding="same", name="conv2")(x)
    x = layers.BatchNormalization(name="bn2")(x)
    x = layers.MaxPooling2D((2, 2), name="pool2")(x)

    # Conv Block 3
    x = layers.Conv2D(64, (3, 3), activation="relu", padding="same", name="conv3")(x)
    x = layers.BatchNormalization(name="bn3")(x)

    # Classification head
    x = layers.GlobalAveragePooling2D(name="global_pool")(x)
    x = layers.Dense(64, activation="relu", name="dense1")(x)
    x = layers.Dropout(0.3, name="dropout")(x)
    outputs = layers.Dense(NUM_CLASSES, activation="softmax", name="output")(x)

    model = keras.Model(inputs=inputs, outputs=outputs, name="VoiceCommandCNN")
    return model


def main():
    print("=" * 60)
    print("NeuralDesk — Voice Command Detector Training")
    print("=" * 60)

    # Generate synthetic MFCC data
    print("\nGenerating synthetic MFCC spectrograms...")
    X, y = generate_synthetic_mfcc_data(6000)

    # Add channel dimension for CNN
    X = X[..., np.newaxis]  # (N, 13, 32) → (N, 13, 32, 1)

    print(f"Data shape: {X.shape}")
    print(f"Labels shape: {y.shape}")
    print(f"Classes: {COMMAND_CLASSES}")

    # Split
    split_idx = int(len(X) * 0.85)
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    print(f"Training samples: {len(X_train)}")
    print(f"Test samples: {len(X_test)}")

    # Build model
    model = build_voice_cnn()
    model.summary()

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
            monitor="val_accuracy", patience=5, restore_best_weights=True
        ),
    ]

    history = model.fit(
        X_train, y_train,
        validation_split=0.1,
        batch_size=BATCH_SIZE,
        epochs=EPOCHS,
        callbacks=callbacks,
        verbose=1
    )

    # Evaluate
    print("\n" + "=" * 60)
    print("Evaluation")
    print("=" * 60)

    test_loss, test_acc = model.evaluate(X_test, y_test, verbose=0)
    print(f"Test Accuracy: {test_acc:.4f}")
    print(f"Test Loss: {test_loss:.4f}")

    # Save
    os.makedirs("models", exist_ok=True)

    keras_path = os.path.join("models", "voice_detector.keras")
    model.save(keras_path)
    print(f"\nKeras model saved to: {keras_path}")

    # TFLite
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    tflite_model = converter.convert()
    tflite_path = os.path.join("models", "voice_detector.tflite")
    with open(tflite_path, "wb") as f:
        f.write(tflite_model)
    print(f"TFLite model saved to: {tflite_path}")
    print(f"TFLite model size: {len(tflite_model) / 1024:.1f} KB")

    # Save class labels
    labels_path = os.path.join("models", "voice_labels.json")
    with open(labels_path, "w") as f:
        json.dump({str(i): c for i, c in enumerate(COMMAND_CLASSES)}, f, indent=2)

    # Save history
    history_data = {
        "accuracy": [float(x) for x in history.history["accuracy"]],
        "val_accuracy": [float(x) for x in history.history["val_accuracy"]],
        "loss": [float(x) for x in history.history["loss"]],
        "val_loss": [float(x) for x in history.history["val_loss"]],
        "test_accuracy": float(test_acc),
        "test_loss": float(test_loss)
    }
    hist_path = os.path.join("models", "voice_training_history.json")
    with open(hist_path, "w") as f:
        json.dump(history_data, f, indent=2)

    print("\n" + "=" * 60)
    print("Voice Command Detector training complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
