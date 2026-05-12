"""
NeuralDesk — Response Generation Inference Engine
===================================================
Loads the trained TFLite response generator and provides
contextual response generation for the AI agent.
"""

import json
import os
import numpy as np

MAX_SEQ_LEN = 48


class ResponseEngine:
    """Response generation engine using TFLite model."""

    def __init__(self, model_dir="models"):
        self.model_dir = model_dir
        self.interpreter = None
        self.word_to_idx = {}
        self.responses = []
        self._load_model()

    def _load_model(self):
        """Load the TFLite model, tokenizer, and response templates."""
        tflite_path = os.path.join(self.model_dir, "response_generator.tflite")
        tokenizer_path = os.path.join(self.model_dir, "response_tokenizer.json")
        responses_path = os.path.join(self.model_dir, "response_templates.json")

        if os.path.exists(tokenizer_path):
            with open(tokenizer_path, "r", encoding="utf-8") as f:
                self.word_to_idx = json.load(f)

        if os.path.exists(responses_path):
            with open(responses_path, "r", encoding="utf-8") as f:
                self.responses = json.load(f)

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
                print(f"[ResponseEngine] Model loaded from {tflite_path}")
            except Exception as e:
                print(f"[ResponseEngine] Warning: Could not load model: {e}")
                self.interpreter = None

    def _encode_text(self, text):
        """Convert text to padded integer sequence."""
        tokens = [self.word_to_idx.get(w, 1) for w in text.lower().split()]
        if len(tokens) > MAX_SEQ_LEN:
            tokens = tokens[:MAX_SEQ_LEN]
        else:
            tokens = tokens + [0] * (MAX_SEQ_LEN - len(tokens))
        return np.array([tokens], dtype=np.int32)

    def generate(self, text, intent=None):
        """
        Generate a response for the given input text.

        Returns:
            dict: {
                "response": str,
                "confidence": float,
                "method": str ("model" or "fallback")
            }
        """
        if self.interpreter is not None and self.responses:
            input_data = self._encode_text(text)
            expected_dtype = self.input_details[0]['dtype']
            input_data = input_data.astype(expected_dtype)
            self.interpreter.set_tensor(self.input_details[0]['index'], input_data)
            self.interpreter.invoke()
            output = self.interpreter.get_tensor(self.output_details[0]['index'])[0]

            resp_idx = int(np.argmax(output))
            confidence = float(output[resp_idx])

            if resp_idx < len(self.responses):
                return {
                    "response": self.responses[resp_idx],
                    "confidence": round(confidence, 4),
                    "method": "model"
                }

        # Fallback
        return {
            "response": self._fallback_generate(text, intent),
            "confidence": 0.5,
            "method": "fallback"
        }

    def _fallback_generate(self, text, intent=None):
        """Generate response using intent-based templates."""
        intent_responses = {
            "send_whatsapp": "Sure! I'll send that WhatsApp message for you. Composing now...",
            "read_email": "Let me check your inbox. You have several new emails. Here's a summary of the most important ones.",
            "draft_email": "I'll help you draft that email. Let me compose something in your writing style.",
            "send_email": "Email sent successfully! I've composed it using your usual tone.",
            "set_reminder": "Reminder set! I'll make sure to alert you at the right time.",
            "create_event": "Event added to your calendar. You'll get a notification before it starts.",
            "check_calendar": "Here's your schedule. You have a few events lined up today.",
            "search_web": "Let me search that for you. Here are the top results I found.",
            "open_file": "Looking for that file... Found it! Opening now.",
            "morning_briefing": "Good morning! Here's your daily briefing with emails, calendar, and reminders.",
            "summarize_email": "Here's your email digest. I've highlighted the urgent items first.",
            "get_weather": "Currently it's pleasant outside. No rain expected today.",
            "play_music": "Starting your music playlist now. Enjoy!",
            "set_alarm": "Alarm set! I'll make sure you wake up on time.",
            "take_note": "Note saved! I've added it to your notes with a timestamp.",
            "translate_text": "Here's the translation you requested.",
            "calculate": "Let me calculate that for you.",
            "tell_joke": "Why do programmers prefer dark mode? Because light attracts bugs!",
            "get_news": "Here are today's top headlines.",
            "general_chat": "Hey! I'm here to help. What can I do for you today?"
        }

        if intent and intent in intent_responses:
            return intent_responses[intent]
        return "I'm ready to help! Just tell me what you need."

    def get_model_info(self):
        """Get model metadata."""
        history_path = os.path.join(self.model_dir, "response_training_history.json")
        if os.path.exists(history_path):
            with open(history_path, "r") as f:
                return json.load(f)
        return {}
