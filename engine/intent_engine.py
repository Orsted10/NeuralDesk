"""
NeuralDesk — Intent Classification Inference Engine
====================================================
Loads the trained TFLite intent classifier and provides
fast inference for command understanding.
"""

import json
import os
import numpy as np
import sys

MAX_SEQUENCE_LENGTH = 32


class IntentEngine:
    """Intent classification engine using TFLite model."""

    def __init__(self, model_dir="models"):
        self.model_dir = model_dir
        self.interpreter = None
        self.word_to_idx = {}
        self.idx_to_label = {}
        self._load_model()

    def _load_model(self):
        """Load the TFLite model and associated tokenizer/labels."""
        tflite_path = os.path.join(self.model_dir, "intent_classifier.tflite")
        tokenizer_path = os.path.join(self.model_dir, "intent_tokenizer.json")
        labels_path = os.path.join(self.model_dir, "intent_labels.json")

        # Load tokenizer
        if os.path.exists(tokenizer_path):
            with open(tokenizer_path, "r", encoding="utf-8") as f:
                self.word_to_idx = json.load(f)

        # Load labels
        if os.path.exists(labels_path):
            with open(labels_path, "r", encoding="utf-8") as f:
                self.idx_to_label = json.load(f)

        # Load TFLite model
        if os.path.exists(tflite_path):
            try:
                # Try tflite-runtime first (production)
                try:
                    import tflite_runtime.interpreter as tflite
                    self.interpreter = tflite.Interpreter(model_path=tflite_path)
                except ImportError:
                    # Fall back to full TensorFlow
                    import tensorflow as tf
                    self.interpreter = tf.lite.Interpreter(model_path=tflite_path)

                self.interpreter.allocate_tensors()
                self.input_details = self.interpreter.get_input_details()
                self.output_details = self.interpreter.get_output_details()
                print(f"[IntentEngine] Model loaded from {tflite_path}")
            except Exception as e:
                print(f"[IntentEngine] Warning: Could not load TFLite model: {e}")
                self.interpreter = None
        else:
            print(f"[IntentEngine] Warning: Model file not found at {tflite_path}")

    def _encode_text(self, text):
        """Convert text to padded integer sequence."""
        tokens = []
        for word in text.lower().split():
            tokens.append(self.word_to_idx.get(word, 1))  # 1 = <UNK>
        if len(tokens) > MAX_SEQUENCE_LENGTH:
            tokens = tokens[:MAX_SEQUENCE_LENGTH]
        else:
            tokens = tokens + [0] * (MAX_SEQUENCE_LENGTH - len(tokens))
        return np.array([tokens], dtype=np.int32)

    def predict(self, text):
        """
        Predict the intent of a given text command.

        Returns:
            dict: {
                "intent": str,
                "confidence": float,
                "all_scores": dict of intent -> confidence,
                "attention_words": list of (word, score) for heatmap
            }
        """
        if self.interpreter is None:
            return self._fallback_predict(text)

        # Encode input
        input_data = self._encode_text(text)

        # Cast to model's expected input type
        expected_dtype = self.input_details[0]['dtype']
        input_data = input_data.astype(expected_dtype)

        # Run inference
        self.interpreter.set_tensor(self.input_details[0]['index'], input_data)
        self.interpreter.invoke()
        output = self.interpreter.get_tensor(self.output_details[0]['index'])[0]

        # Get top prediction
        intent_idx = int(np.argmax(output))
        confidence = float(output[intent_idx])
        intent = self.idx_to_label.get(str(intent_idx), "unknown")

        # Get all scores for visualization
        all_scores = {}
        for idx, score in enumerate(output):
            label = self.idx_to_label.get(str(idx), f"class_{idx}")
            all_scores[label] = round(float(score), 4)

        # Generate attention-like word importance scores
        attention_words = self._compute_word_importance(text, output)

        return {
            "intent": intent,
            "confidence": round(confidence, 4),
            "all_scores": dict(sorted(all_scores.items(), key=lambda x: -x[1])[:5]),
            "attention_words": attention_words
        }

    def _compute_word_importance(self, text, output):
        """
        Compute approximate word importance for attention heatmap.
        Uses leave-one-out perturbation to estimate word contribution.
        """
        if self.interpreter is None:
            return [(w, 0.5) for w in text.split()]

        words = text.lower().split()
        base_pred = int(np.argmax(output))
        base_conf = float(output[base_pred])
        importance = []

        for i, word in enumerate(words):
            # Remove word and re-predict
            perturbed = " ".join(words[:i] + words[i+1:])
            if not perturbed.strip():
                importance.append((word, 1.0))
                continue

            input_data = self._encode_text(perturbed)
            expected_dtype = self.input_details[0]['dtype']
            input_data = input_data.astype(expected_dtype)
            self.interpreter.set_tensor(self.input_details[0]['index'], input_data)
            self.interpreter.invoke()
            perturbed_output = self.interpreter.get_tensor(self.output_details[0]['index'])[0]
            perturbed_conf = float(perturbed_output[base_pred])

            # Importance = how much confidence drops when word is removed
            drop = max(0, base_conf - perturbed_conf)
            importance.append((word, round(drop, 4)))

        # Normalize
        max_imp = max(score for _, score in importance) if importance else 1
        if max_imp > 0:
            importance = [(w, round(s / max_imp, 4)) for w, s in importance]

        return importance

    def _fallback_predict(self, text):
        """Keyword-based fallback when model is unavailable."""
        text_lower = text.lower()
        keyword_map = {
            "send_whatsapp": ["whatsapp", "message", "text", "msg", "ping"],
            "read_email": ["read email", "check email", "inbox", "mail"],
            "draft_email": ["draft", "compose", "write email"],
            "send_email": ["send email", "email"],
            "set_reminder": ["remind", "reminder", "don't forget"],
            "create_event": ["schedule", "calendar event", "book"],
            "check_calendar": ["calendar", "schedule", "agenda", "planned"],
            "search_web": ["search", "google", "look up", "find info"],
            "open_file": ["open", "file", "find file", "locate"],
            "morning_briefing": ["morning", "briefing", "daily", "start my day"],
            "summarize_email": ["summarize", "summary", "digest"],
            "get_weather": ["weather", "temperature", "rain", "forecast"],
            "play_music": ["play", "music", "song", "playlist"],
            "set_alarm": ["alarm", "wake me"],
            "take_note": ["note", "jot", "write down"],
            "translate_text": ["translate", "translation"],
            "calculate": ["calculate", "math", "compute", "how much"],
            "tell_joke": ["joke", "funny", "laugh", "humor"],
            "get_news": ["news", "headlines", "trending"],
            "general_chat": ["hello", "hi", "hey", "thanks", "bye", "good"]
        }

        best_intent = "general_chat"
        best_score = 0
        for intent, keywords in keyword_map.items():
            score = sum(1 for kw in keywords if kw in text_lower)
            if score > best_score:
                best_score = score
                best_intent = intent

        return {
            "intent": best_intent,
            "confidence": 0.6 if best_score > 0 else 0.3,
            "all_scores": {best_intent: 0.6},
            "attention_words": [(w, 0.5) for w in text.split()[:5]]
        }

    def get_model_info(self):
        """Get model metadata for the dashboard."""
        history_path = os.path.join(self.model_dir, "intent_training_history.json")
        if os.path.exists(history_path):
            with open(history_path, "r") as f:
                return json.load(f)
        return {}
