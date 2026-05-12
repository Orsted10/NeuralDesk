"""
NeuralDesk — Email Priority Inference Engine
=============================================
Loads the trained TFLite email priority model and provides
fast inference for email scoring and categorization.
"""

import json
import os
import numpy as np

MAX_SEQUENCE_LENGTH = 64


class EmailEngine:
    """Email priority scoring engine using TFLite model."""

    def __init__(self, model_dir="models"):
        self.model_dir = model_dir
        self.interpreter = None
        self.word_to_idx = {}
        self.idx_to_category = {}
        self._load_model()

    def _load_model(self):
        """Load the TFLite model and tokenizer."""
        tflite_path = os.path.join(self.model_dir, "email_priority.tflite")
        tokenizer_path = os.path.join(self.model_dir, "email_tokenizer.json")
        cat_path = os.path.join(self.model_dir, "email_categories.json")

        if os.path.exists(tokenizer_path):
            with open(tokenizer_path, "r", encoding="utf-8") as f:
                self.word_to_idx = json.load(f)

        if os.path.exists(cat_path):
            with open(cat_path, "r") as f:
                self.idx_to_category = json.load(f)

        if os.path.exists(tflite_path):
            try:
                try:
                    import tflite_runtime.interpreter as tflite
                    self.interpreter = tflite.Interpreter(model_path=tflite_path)
                except ImportError:
                    import tensorflow as tf
                    self.interpreter = tf.lite.Interpreter(model_path=tflite_path)

                self.interpreter.allocate_tensors()
                self.input_details = self.interpreter.get_input_details()
                self.output_details = self.interpreter.get_output_details()
                print(f"[EmailEngine] Model loaded from {tflite_path}")
            except Exception as e:
                print(f"[EmailEngine] Warning: Could not load model: {e}")
                self.interpreter = None

    def _encode_text(self, text):
        """Convert text to padded integer sequence."""
        tokens = [self.word_to_idx.get(w, 1) for w in text.lower().split()]
        if len(tokens) > MAX_SEQUENCE_LENGTH:
            tokens = tokens[:MAX_SEQUENCE_LENGTH]
        else:
            tokens = tokens + [0] * (MAX_SEQUENCE_LENGTH - len(tokens))
        return np.array([tokens], dtype=np.int32)

    def score(self, subject="", sender="", body=""):
        """
        Score an email for priority.

        Returns:
            dict: {
                "priority_score": int (0-100),
                "category": str (urgent/normal/low/spam),
                "category_confidence": float,
                "all_categories": dict
            }
        """
        text = f"Subject: {subject} From: {sender} Body: {body}"

        if self.interpreter is None:
            return self._fallback_score(subject, sender, body)

        input_data = self._encode_text(text)
        expected_dtype = self.input_details[0]['dtype']
        input_data = input_data.astype(expected_dtype)
        self.interpreter.set_tensor(self.input_details[0]['index'], input_data)
        self.interpreter.invoke()

        # Get outputs (dual head)
        priority_raw = self.interpreter.get_tensor(self.output_details[0]['index'])[0]
        category_raw = self.interpreter.get_tensor(self.output_details[1]['index'])[0]

        priority_score = int(float(priority_raw[0]) * 100)
        priority_score = max(0, min(100, priority_score))

        cat_idx = int(np.argmax(category_raw))
        category = self.idx_to_category.get(str(cat_idx), "normal")
        cat_confidence = float(category_raw[cat_idx])

        all_cats = {}
        for idx, score_val in enumerate(category_raw):
            cat_name = self.idx_to_category.get(str(idx), f"cat_{idx}")
            all_cats[cat_name] = round(float(score_val), 4)

        return {
            "priority_score": priority_score,
            "category": category,
            "category_confidence": round(cat_confidence, 4),
            "all_categories": all_cats
        }

    def _fallback_score(self, subject, sender, body):
        """Keyword-based fallback scoring."""
        text = f"{subject} {sender} {body}".lower()
        score = 50

        urgent_words = ["urgent", "critical", "asap", "emergency", "deadline",
                        "immediate", "important", "action required", "final warning"]
        spam_words = ["won", "free", "click", "congratulations", "limited time",
                      "guaranteed", "prince", "lottery", "!!!"]
        low_words = ["newsletter", "digest", "auto-reply", "out of office",
                     "unsubscribe", "no-reply", "automated"]

        for w in urgent_words:
            if w in text:
                score += 15
        for w in spam_words:
            if w in text:
                score -= 20
        for w in low_words:
            if w in text:
                score -= 10

        score = max(0, min(100, score))

        if score >= 75:
            category = "urgent"
        elif score >= 40:
            category = "normal"
        elif score >= 15:
            category = "low"
        else:
            category = "spam"

        return {
            "priority_score": score,
            "category": category,
            "category_confidence": 0.6,
            "all_categories": {category: 0.6}
        }

    def score_batch(self, emails):
        """Score a batch of emails."""
        results = []
        for email in emails:
            result = self.score(
                subject=email.get("subject", ""),
                sender=email.get("sender", ""),
                body=email.get("body", "")
            )
            result["subject"] = email.get("subject", "")
            result["sender"] = email.get("sender", "")
            results.append(result)
        return sorted(results, key=lambda x: -x["priority_score"])

    def get_model_info(self):
        """Get model metadata."""
        history_path = os.path.join(self.model_dir, "email_training_history.json")
        if os.path.exists(history_path):
            with open(history_path, "r") as f:
                return json.load(f)
        return {}
