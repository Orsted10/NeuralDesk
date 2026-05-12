"""
NeuralDesk Memory System
========================
A lightweight, JSON-based persistent memory system that stores user
preferences, past interactions, and learned patterns. This replaces
a full vector database (ChromaDB) for deployment simplicity while
maintaining the core learning-from-feedback capability.
"""

import json
import os
from datetime import datetime


class MemorySystem:
    """Local JSON-based memory for storing user preferences and interaction history."""

    def __init__(self, memory_dir="data"):
        self.memory_dir = memory_dir
        self.preferences_file = os.path.join(memory_dir, "user_preferences.json")
        self.history_file = os.path.join(memory_dir, "interaction_history.json")
        os.makedirs(memory_dir, exist_ok=True)
        self.preferences = self._load_json(self.preferences_file, default={
            "name": "User",
            "tone": "professional",
            "email_priority_keywords": ["urgent", "deadline", "important", "asap"],
            "frequent_contacts": [],
            "preferred_greeting": "Hey",
            "learned_intents": {},
            "feedback_log": []
        })
        self.history = self._load_json(self.history_file, default=[])

    def _load_json(self, filepath, default=None):
        """Load JSON file, return default if not found."""
        if os.path.exists(filepath):
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                return default if default is not None else {}
        return default if default is not None else {}

    def _save_json(self, filepath, data):
        """Save data to JSON file."""
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False, default=str)

    def log_interaction(self, user_input, intent, response, confidence):
        """Record an interaction for learning and history."""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "input": user_input,
            "detected_intent": intent,
            "response": response,
            "confidence": round(confidence, 4),
        }
        self.history.append(entry)
        # Keep only last 500 interactions
        if len(self.history) > 500:
            self.history = self.history[-500:]
        self._save_json(self.history_file, self.history)

    def update_preference(self, key, value):
        """Update a user preference."""
        self.preferences[key] = value
        self._save_json(self.preferences_file, self.preferences)

    def get_preference(self, key, default=None):
        """Get a user preference."""
        return self.preferences.get(key, default)

    def add_feedback(self, interaction_index, is_correct, corrected_intent=None):
        """Record user feedback on an interaction for online learning."""
        feedback = {
            "timestamp": datetime.now().isoformat(),
            "interaction_index": interaction_index,
            "is_correct": is_correct,
            "corrected_intent": corrected_intent
        }
        self.preferences.setdefault("feedback_log", []).append(feedback)
        self._save_json(self.preferences_file, self.preferences)
        return feedback

    def get_recent_history(self, n=20):
        """Get the N most recent interactions."""
        return self.history[-n:] if self.history else []

    def get_stats(self):
        """Get memory statistics."""
        total = len(self.history)
        if total == 0:
            return {"total_interactions": 0, "unique_intents": 0, "avg_confidence": 0}

        intents = {}
        total_conf = 0
        for h in self.history:
            intent = h.get("detected_intent", "unknown")
            intents[intent] = intents.get(intent, 0) + 1
            total_conf += h.get("confidence", 0)

        return {
            "total_interactions": total,
            "unique_intents": len(intents),
            "intent_distribution": intents,
            "avg_confidence": round(total_conf / total, 4) if total else 0,
            "feedback_count": len(self.preferences.get("feedback_log", [])),
        }

    def get_all_preferences(self):
        """Return all user preferences."""
        return self.preferences

    def clear_history(self):
        """Clear interaction history."""
        self.history = []
        self._save_json(self.history_file, self.history)
