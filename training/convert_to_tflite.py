"""
NeuralDesk — TFLite Conversion Script
Converts trained Keras models to TFLite with SELECT_TF_OPS for LSTM support.
"""
import os
import sys
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

# Register custom layers before loading
@keras.saving.register_keras_serializable()
class MultiHeadSelfAttention(layers.Layer):
    def __init__(self, embed_dim, num_heads, **kwargs):
        super().__init__(**kwargs)
        self.embed_dim = embed_dim
        self.num_heads = num_heads
        self.attention = layers.MultiHeadAttention(num_heads=num_heads, key_dim=embed_dim // num_heads)
        self.layernorm = layers.LayerNormalization()
    def call(self, inputs):
        attn_output = self.attention(inputs, inputs)
        return self.layernorm(inputs + attn_output)
    def get_config(self):
        config = super().get_config()
        config.update({"embed_dim": self.embed_dim, "num_heads": self.num_heads})
        return config

@keras.saving.register_keras_serializable()
class TransformerBlock(layers.Layer):
    def __init__(self, embed_dim, num_heads, ff_dim, rate=0.1, **kwargs):
        super().__init__(**kwargs)
        self.embed_dim = embed_dim
        self.num_heads = num_heads
        self.ff_dim = ff_dim
        self.rate = rate
        self.att = layers.MultiHeadAttention(num_heads=num_heads, key_dim=embed_dim // num_heads)
        self.ffn = keras.Sequential([layers.Dense(ff_dim, activation="relu"), layers.Dense(embed_dim)])
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
        config.update({"embed_dim": self.embed_dim, "num_heads": self.num_heads, "ff_dim": self.ff_dim, "rate": self.rate})
        return config


def convert_model(keras_path, tflite_path, model_name):
    print(f"\nConverting {model_name}...")
    if not os.path.exists(keras_path):
        print(f"  SKIP: {keras_path} not found")
        return False
    try:
        model = tf.keras.models.load_model(keras_path)
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        converter.target_spec.supported_ops = [
            tf.lite.OpsSet.TFLITE_BUILTINS,
            tf.lite.OpsSet.SELECT_TF_OPS
        ]
        converter._experimental_lower_tensor_list_ops = False
        tflite_model = converter.convert()
        with open(tflite_path, "wb") as f:
            f.write(tflite_model)
        print(f"  OK: {tflite_path} ({len(tflite_model)/1024:.1f} KB)")
        return True
    except Exception as e:
        print(f"  ERROR: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("NeuralDesk - TFLite Conversion")
    print("=" * 60)
    models = [
        ("models/intent_classifier.keras", "models/intent_classifier.tflite", "Intent Classifier"),
        ("models/email_priority.keras", "models/email_priority.tflite", "Email Priority"),
        ("models/response_generator.keras", "models/response_generator.tflite", "Response Generator"),
        ("models/voice_detector.keras", "models/voice_detector.tflite", "Voice Detector"),
    ]
    for k, t, n in models:
        convert_model(k, t, n)
    print("\nDone!")
