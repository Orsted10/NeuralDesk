# NeuralDesk — Personal AI Agent

> A privacy-first personal AI agent powered by 4 custom neural network models built from scratch with TensorFlow and Keras.

![Python](https://img.shields.io/badge/Python-3.11-blue)
![TensorFlow](https://img.shields.io/badge/TensorFlow-2.16-orange)
![Keras](https://img.shields.io/badge/Keras-3.x-red)
![Flask](https://img.shields.io/badge/Flask-3.1-green)
![License](https://img.shields.io/badge/License-Academic-purple)

## Overview

NeuralDesk is an autonomous personal AI agent that understands your commands, manages your emails, generates human-like responses, and responds to your voice — all powered by neural networks we designed and trained ourselves. Every intelligent decision comes from our own models, not external APIs.

## Neural Network Models

| Model | Architecture | Task | Accuracy |
|-------|-------------|------|----------|
| **Intent Classifier** | BiLSTM + Multi-Head Attention | Command understanding (20 intents) | 98.8% |
| **Email Priority** | LSTM + Dual-Head (Score + Category) | Email scoring & classification | 73.8% |
| **Response Generator** | Transformer Decoder (2 blocks) | Contextual response generation | ~85% |
| **Voice Detector** | CNN on MFCC Spectrograms | Wake-word & command detection | ~97% |

## Features

- **Command Center** — Type or speak commands, get intelligent responses
- **Email Dashboard** — AI-scored inbox with priority heatmaps
- **Voice Recognition** — Browser-based speech-to-text with wake word
- **Attention Heatmaps** — See which words trigger intent classification
- **Memory System** — Learns preferences from interactions
- **Activity Feed** — Full interaction history with intent tracking
- **Model Performance** — Live accuracy metrics for all 4 models

## Tech Stack

- **Neural Networks**: TensorFlow 2.16, Keras 3, TFLite
- **Backend**: Flask, Gunicorn
- **Frontend**: Vanilla JS, CSS (Glassmorphism dark theme)
- **Voice**: Web Speech API
- **Memory**: JSON-based persistent storage
- **Deployment**: Render.com (Free tier)

## Quick Start

```bash
# Clone
git clone https://github.com/yourusername/NeuralDesk.git
cd NeuralDesk

# Install production dependencies
pip install -r requirements.txt

# Run
python app.py
# Open http://localhost:5000
```

## Training Models (Optional)

```bash
# Install training dependencies
pip install -r requirements-training.txt

# Generate datasets
python training/generate_intent_data.py
python training/generate_email_data.py

# Train all models
python training/train_intent_classifier.py
python training/train_email_priority.py
python training/train_response_generator.py
python training/train_voice_detector.py

# Convert to TFLite for deployment
python training/convert_to_tflite.py
```

## Project Structure

```
NeuralDesk/
├── app.py                    # Flask web application
├── engine/                   # Core AI inference engines
│   ├── agent.py              # Main agent orchestrator
│   ├── intent_engine.py      # Intent classification
│   ├── email_engine.py       # Email priority scoring
│   ├── response_engine.py    # Response generation
│   └── memory.py             # Persistent memory system
├── models/                   # Trained model artifacts (.tflite)
├── training/                 # Model training scripts
├── templates/                # HTML dashboard
├── static/                   # CSS, JS, assets
└── data/                     # Sample data & user preferences
```

## Team

- **Ankan Bhattacharjee** (25LBCS3067)
- **Unnati Mishra** (25LBCS3069)

Python Programming | Academic Year 2025-26
Track: Neural Networks with TensorFlow and Keras | Domain: AI and Deep Learning
