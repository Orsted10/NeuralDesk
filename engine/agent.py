"""
NeuralDesk — Agent Orchestrator
================================
The central AI agent that ties together all four neural models
into a unified pipeline. Takes a user command, classifies intent,
extracts entities, generates a response, and logs the interaction.
"""

import json
import os
import re
import time
from datetime import datetime


class NeuralDeskAgent:
    """Main AI agent that orchestrates all neural models."""

    def __init__(self, model_dir="models", data_dir="data"):
        self.model_dir = model_dir
        self.data_dir = data_dir
        self._init_engines()
        self._load_sample_data()

    def _init_engines(self):
        """Initialize all inference engines."""
        from engine.intent_engine import IntentEngine
        from engine.email_engine import EmailEngine
        from engine.response_engine import ResponseEngine
        from engine.memory import MemorySystem

        self.intent_engine = IntentEngine(self.model_dir)
        self.email_engine = EmailEngine(self.model_dir)
        self.response_engine = ResponseEngine(self.model_dir)
        self.memory = MemorySystem(self.data_dir)

    def _load_sample_data(self):
        """Load sample/demo data."""
        emails_path = os.path.join(self.data_dir, "sample_emails.json")
        if os.path.exists(emails_path):
            with open(emails_path, "r", encoding="utf-8") as f:
                self.sample_emails = json.load(f)
        else:
            self.sample_emails = []

    def process(self, user_input):
        """
        Process a user command through the full NeuralDesk pipeline.

        Pipeline:
            1. Intent Classification (What does the user want?)
            2. Entity Extraction (Who/What/When?)
            3. Action Execution (Do the thing)
            4. Response Generation (Tell the user what happened)
            5. Memory Logging (Remember this interaction)

        Returns:
            dict with full pipeline results
        """
        start_time = time.time()

        # Step 1: Intent Classification
        intent_result = self.intent_engine.predict(user_input)
        intent = intent_result["intent"]
        confidence = intent_result["confidence"]

        # Step 2: Entity Extraction
        entities = self._extract_entities(user_input, intent)

        # Step 3: Action Execution
        action_result = self._execute_action(intent, entities, user_input)

        # Step 4: Response Generation
        response_result = self.response_engine.generate(user_input, intent)

        # Use action-specific response if available, otherwise use model response
        final_response = action_result.get("message", response_result["response"])

        # Step 5: Memory Logging
        self.memory.log_interaction(user_input, intent, final_response, confidence)

        elapsed = time.time() - start_time

        return {
            "input": user_input,
            "intent": intent,
            "confidence": confidence,
            "entities": entities,
            "response": final_response,
            "action": action_result,
            "attention_words": intent_result.get("attention_words", []),
            "top_intents": intent_result.get("all_scores", {}),
            "response_method": response_result.get("method", "unknown"),
            "processing_time_ms": round(elapsed * 1000, 1),
            "timestamp": datetime.now().isoformat()
        }

    def _extract_entities(self, text, intent):
        """
        Extract relevant entities from the user's command.
        Uses pattern matching + intent context for entity extraction.
        """
        entities = {}
        text_lower = text.lower()

        # Contact extraction
        contact_patterns = [
            r"(?:to|from|message|text|email|whatsapp|tell|ping|contact)\s+(\w+(?:\s+\w+)?)",
        ]
        for pattern in contact_patterns:
            match = re.search(pattern, text_lower)
            if match:
                contact = match.group(1).strip()
                # Filter out common non-contact words
                skip_words = {"me", "my", "the", "a", "an", "some", "that", "this", "about"}
                if contact not in skip_words:
                    entities["contact"] = contact.title()
                    break

        # Time extraction
        time_patterns = [
            r"at (\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)?)",
            r"(tomorrow|today|tonight|this evening|next \w+)",
            r"in (\d+\s+(?:minutes?|hours?|days?))",
            r"by (\w+day)",
        ]
        for pattern in time_patterns:
            match = re.search(pattern, text_lower)
            if match:
                entities["time"] = match.group(1) if match.group(1) else match.group(0)
                break

        # Message content extraction
        msg_patterns = [
            r"(?:saying|that|:)\s+(.+?)$",
        ]
        for pattern in msg_patterns:
            match = re.search(pattern, text_lower)
            if match:
                entities["message"] = match.group(1).strip()
                break

        # Subject/topic extraction
        topic_patterns = [
            r"(?:about|regarding|for)\s+(.+?)(?:\s+at|\s+by|$)",
        ]
        for pattern in topic_patterns:
            match = re.search(pattern, text_lower)
            if match:
                entities["topic"] = match.group(1).strip()
                break

        return entities

    def _execute_action(self, intent, entities, user_input):
        """Execute the detected intent action."""
        action_handlers = {
            "send_whatsapp": self._action_send_whatsapp,
            "read_email": self._action_read_email,
            "draft_email": self._action_draft_email,
            "send_email": self._action_send_email,
            "set_reminder": self._action_set_reminder,
            "create_event": self._action_create_event,
            "check_calendar": self._action_check_calendar,
            "search_web": self._action_search_web,
            "open_file": self._action_open_file,
            "morning_briefing": self._action_morning_briefing,
            "summarize_email": self._action_summarize_email,
            "get_weather": self._action_get_weather,
            "play_music": self._action_play_music,
            "set_alarm": self._action_set_alarm,
            "take_note": self._action_take_note,
            "translate_text": self._action_translate,
            "calculate": self._action_calculate,
            "tell_joke": self._action_tell_joke,
            "get_news": self._action_get_news,
            "general_chat": self._action_general_chat,
        }

        handler = action_handlers.get(intent, self._action_general_chat)
        return handler(entities, user_input)

    def _action_send_whatsapp(self, entities, text):
        contact = entities.get("contact", "Unknown")
        message = entities.get("message", "Hello!")
        return {
            "action": "send_whatsapp",
            "status": "success",
            "message": f"WhatsApp message sent to {contact}: \"{message}\"",
            "details": {"contact": contact, "message": message}
        }

    def _action_read_email(self, entities, text):
        emails = self.get_scored_emails()[:5]
        urgent = sum(1 for e in emails if e.get("category") == "urgent")
        normal = sum(1 for e in emails if e.get("category") == "normal")
        summary = f"You have {len(emails)} emails - {urgent} urgent, {normal} normal priority."
        if emails:
            top = emails[0]
            summary += f" Most important: \"{top['subject']}\" from {top['sender']}."
        return {
            "action": "read_email",
            "status": "success",
            "message": summary,
            "details": {"email_count": len(emails), "urgent": urgent}
        }

    def _action_draft_email(self, entities, text):
        contact = entities.get("contact", "recipient")
        topic = entities.get("topic", "your request")
        return {
            "action": "draft_email",
            "status": "success",
            "message": f"I've drafted an email to {contact} about {topic}. It matches your usual writing style. Ready to review and send.",
            "details": {"to": contact, "topic": topic}
        }

    def _action_send_email(self, entities, text):
        contact = entities.get("contact", "recipient")
        return {
            "action": "send_email",
            "status": "success",
            "message": f"Email sent to {contact} successfully!",
            "details": {"to": contact}
        }

    def _action_set_reminder(self, entities, text):
        time_str = entities.get("time", "soon")
        topic = entities.get("topic", entities.get("message", "your task"))
        return {
            "action": "set_reminder",
            "status": "success",
            "message": f"Reminder set for {time_str}: \"{topic}\". I'll alert you when it's time.",
            "details": {"time": time_str, "task": topic}
        }

    def _action_create_event(self, entities, text):
        time_str = entities.get("time", "TBD")
        topic = entities.get("topic", "New Event")
        return {
            "action": "create_event",
            "status": "success",
            "message": f"Calendar event created: \"{topic}\" at {time_str}.",
            "details": {"time": time_str, "event": topic}
        }

    def _action_check_calendar(self, entities, text):
        events = [
            {"time": "10:00 AM", "event": "Team Standup", "duration": "30 min"},
            {"time": "1:00 PM", "event": "Lunch with Priya", "duration": "1 hr"},
            {"time": "4:00 PM", "event": "Code Review", "duration": "45 min"},
        ]
        msg = "Your schedule today:\n"
        for e in events:
            msg += f"  {e['time']} - {e['event']} ({e['duration']})\n"
        return {
            "action": "check_calendar",
            "status": "success",
            "message": msg.strip(),
            "details": {"events": events}
        }

    def _action_search_web(self, entities, text):
        topic = entities.get("topic", "your query")
        return {
            "action": "search_web",
            "status": "success",
            "message": f"I found several results for \"{topic}\". Here are the top highlights from the search.",
            "details": {"query": topic}
        }

    def _action_open_file(self, entities, text):
        return {
            "action": "open_file",
            "status": "success",
            "message": "File found and opened! Check your desktop.",
            "details": {}
        }

    def _action_morning_briefing(self, entities, text):
        emails = self.get_scored_emails()
        urgent = sum(1 for e in emails if e.get("category") == "urgent")
        msg = f"Good morning! Here's your briefing:\n"
        msg += f"  Emails: {len(emails)} total, {urgent} urgent\n"
        msg += f"  Calendar: 3 events today\n"
        msg += f"  Weather: 28 C, partly cloudy\n"
        msg += f"  Reminders: 2 pending tasks"
        return {
            "action": "morning_briefing",
            "status": "success",
            "message": msg,
            "details": {"email_count": len(emails), "urgent": urgent}
        }

    def _action_summarize_email(self, entities, text):
        emails = self.get_scored_emails()[:3]
        msg = "Email Summary:\n"
        for i, e in enumerate(emails, 1):
            msg += f"  {i}. [{e.get('category', 'N/A').upper()}] {e['subject']} (Score: {e.get('priority_score', 'N/A')})\n"
        return {
            "action": "summarize_email",
            "status": "success",
            "message": msg.strip(),
            "details": {"count": len(emails)}
        }

    def _action_get_weather(self, entities, text):
        return {
            "action": "get_weather",
            "status": "success",
            "message": "Currently 28 C and partly cloudy. High of 33 C expected. 20% chance of rain this afternoon.",
            "details": {"temp": 28, "condition": "partly cloudy", "rain_chance": 20}
        }

    def _action_play_music(self, entities, text):
        return {
            "action": "play_music",
            "status": "success",
            "message": "Playing your 'Focus & Flow' playlist. Enjoy the music!",
            "details": {"playlist": "Focus & Flow"}
        }

    def _action_set_alarm(self, entities, text):
        time_str = entities.get("time", "7:00 AM")
        return {
            "action": "set_alarm",
            "status": "success",
            "message": f"Alarm set for {time_str}. I'll make sure you're up!",
            "details": {"time": time_str}
        }

    def _action_take_note(self, entities, text):
        note = entities.get("message", text)
        return {
            "action": "take_note",
            "status": "success",
            "message": f"Note saved: \"{note}\". Added to your notes with timestamp.",
            "details": {"note": note, "timestamp": datetime.now().isoformat()}
        }

    def _action_translate(self, entities, text):
        return {
            "action": "translate",
            "status": "success",
            "message": "Translation complete! Here's the translated text.",
            "details": {}
        }

    def _action_calculate(self, entities, text):
        # Try to extract and evaluate simple math
        try:
            math_match = re.search(r'(\d+[\s]*[+\-*/][\s]*\d+)', text)
            if math_match:
                result = eval(math_match.group(1))
                return {
                    "action": "calculate",
                    "status": "success",
                    "message": f"The answer is: {result}",
                    "details": {"expression": math_match.group(1), "result": result}
                }
        except Exception:
            pass
        return {
            "action": "calculate",
            "status": "success",
            "message": "I can help with calculations! Please provide the expression.",
            "details": {}
        }

    def _action_tell_joke(self, entities, text):
        import random
        jokes = [
            "Why do programmers prefer dark mode? Because light attracts bugs!",
            "A SQL query walks into a bar, sees two tables, and asks... 'Can I JOIN you?'",
            "Why do Java developers wear glasses? Because they can't C#!",
            "There are only 10 types of people in the world: those who understand binary, and those who don't.",
            "Why was the JavaScript developer sad? Because he didn't Node how to Express himself!",
            "What's a programmer's favorite hangout place? Foo Bar!",
        ]
        joke = random.choice(jokes)
        return {
            "action": "tell_joke",
            "status": "success",
            "message": joke,
            "details": {}
        }

    def _action_get_news(self, entities, text):
        return {
            "action": "get_news",
            "status": "success",
            "message": "Top Headlines Today:\n  1. AI breakthroughs in neural architecture search\n  2. New climate policy announced at G20 summit\n  3. Tech stocks surge on strong quarterly earnings",
            "details": {}
        }

    def _action_general_chat(self, entities, text):
        return {
            "action": "general_chat",
            "status": "success",
            "message": None,  # Use model response
            "details": {}
        }

    def get_scored_emails(self):
        """Get emails scored by the priority model."""
        if not self.sample_emails:
            return []
        return self.email_engine.score_batch(self.sample_emails)

    def get_memory_stats(self):
        """Get memory system statistics."""
        return self.memory.get_stats()

    def get_history(self, n=20):
        """Get recent interaction history."""
        return self.memory.get_recent_history(n)

    def get_preferences(self):
        """Get user preferences."""
        return self.memory.get_all_preferences()

    def submit_feedback(self, interaction_index, is_correct, corrected_intent=None):
        """Submit feedback on an interaction."""
        return self.memory.add_feedback(interaction_index, is_correct, corrected_intent)

    def get_model_stats(self):
        """Get training statistics for all models."""
        return {
            "intent_classifier": self.intent_engine.get_model_info(),
            "email_priority": self.email_engine.get_model_info(),
            "response_generator": self.response_engine.get_model_info(),
        }
