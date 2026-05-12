"""
NeuralDesk — Flask Application
================================
Main web application serving the NeuralDesk AI agent dashboard.
Provides REST API endpoints for command processing, email scoring,
memory management, and model performance visualization.
"""

import json
import os
import time
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# Global agent instance
agent = None


def get_agent():
    """Lazy-load the NeuralDesk agent."""
    global agent
    if agent is None:
        from engine.agent import NeuralDeskAgent
        agent = NeuralDeskAgent(model_dir="models", data_dir="data")
    return agent


# ──────────────────────────────────────────────────
# Web Routes
# ──────────────────────────────────────────────────

@app.route("/")
def index():
    """Serve the main dashboard."""
    return render_template("index.html")


# ──────────────────────────────────────────────────
# API Routes
# ──────────────────────────────────────────────────

@app.route("/api/command", methods=["POST"])
def process_command():
    """Process a user command through the full NeuralDesk pipeline."""
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "Missing 'text' field"}), 400

    text = data["text"].strip()
    if not text:
        return jsonify({"error": "Empty command"}), 400

    try:
        a = get_agent()
        result = a.process(text)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/emails", methods=["GET"])
def get_emails():
    """Get emails scored by the priority model."""
    try:
        a = get_agent()
        emails = a.get_scored_emails()
        return jsonify({"emails": emails, "count": len(emails)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/emails/score", methods=["POST"])
def score_email():
    """Score a single email."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing email data"}), 400

    try:
        a = get_agent()
        result = a.email_engine.score(
            subject=data.get("subject", ""),
            sender=data.get("sender", ""),
            body=data.get("body", "")
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/memory", methods=["GET"])
def get_memory():
    """Get memory statistics and preferences."""
    try:
        a = get_agent()
        return jsonify({
            "stats": a.get_memory_stats(),
            "preferences": a.get_preferences()
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/history", methods=["GET"])
def get_history():
    """Get recent interaction history."""
    try:
        n = request.args.get("n", 20, type=int)
        a = get_agent()
        history = a.get_history(n)
        return jsonify({"history": history, "count": len(history)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/feedback", methods=["POST"])
def submit_feedback():
    """Submit feedback on an interaction for online learning."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing feedback data"}), 400

    try:
        a = get_agent()
        result = a.submit_feedback(
            interaction_index=data.get("index", -1),
            is_correct=data.get("is_correct", True),
            corrected_intent=data.get("corrected_intent")
        )
        return jsonify({"status": "ok", "feedback": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/models", methods=["GET"])
def get_model_stats():
    """Get training statistics for all models."""
    try:
        a = get_agent()
        stats = a.get_model_stats()
        return jsonify(stats)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint for deployment monitoring."""
    return jsonify({
        "status": "healthy",
        "service": "NeuralDesk",
        "version": "1.0.0",
        "timestamp": time.time()
    })


# ──────────────────────────────────────────────────
# Run
# ──────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
