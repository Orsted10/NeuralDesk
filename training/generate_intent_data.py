"""
NeuralDesk — Synthetic Intent Dataset Generator
================================================
Generates 10,000+ labelled training examples across 20 intent categories.
Each example is a natural language command with an associated intent label
and entity annotations. Variations are created programmatically using
template expansion with randomized slots.
"""

import json
import random
import os

# ──────────────────────────────────────────────────
# INTENT TEMPLATES
# Each intent has base templates with {slot} placeholders
# ──────────────────────────────────────────────────

CONTACTS = [
    "Rohan", "Priya", "Ankit", "Sneha", "Rahul", "Megha", "Arjun", "Kavita",
    "Vikram", "Neha", "Suresh", "Divya", "Aman", "Pooja", "Karan", "Ritu",
    "Mom", "Dad", "Professor", "Boss", "Manager", "Team Lead", "Client",
    "Unnati", "Ankan", "Dr. Sharma", "Mr. Gupta", "Sarah", "John", "Alex"
]

SUBJECTS = [
    "the project update", "the meeting tomorrow", "the assignment deadline",
    "the presentation slides", "lunch plans", "the exam schedule",
    "the weekend trip", "the code review", "tonight's plan", "the report",
    "the internship application", "the event details", "tomorrow's class",
    "the budget report", "the team meeting notes", "the lab submission"
]

MESSAGES = [
    "hello", "hi there", "how are you", "good morning", "I'll be late",
    "can we meet at 5", "please send the file", "thanks for your help",
    "I'm on my way", "let's catch up later", "meeting is rescheduled",
    "please check your email", "the task is done", "I need your help",
    "are you free tonight", "happy birthday", "congratulations",
    "I'll call you back", "running late sorry", "see you tomorrow"
]

TIMES = [
    "3 PM", "5 PM", "tomorrow morning", "next Monday", "in 2 hours",
    "at noon", "tonight at 8", "this evening", "tomorrow at 10",
    "next week", "in 30 minutes", "after lunch", "before class",
    "at 9 AM sharp", "end of day", "by Friday"
]

TASKS = [
    "submit the assignment", "buy groceries", "call the dentist",
    "finish the report", "review the code", "prepare slides",
    "attend the webinar", "pay the electricity bill", "water the plants",
    "take medicine", "pick up laundry", "book train tickets",
    "send the invoice", "update the resume", "clean the desk",
    "backup the project files", "schedule a meeting", "reply to emails"
]

TOPICS = [
    "machine learning", "Python programming", "climate change",
    "latest tech news", "stock market today", "weather forecast",
    "recipe for pasta", "best laptops 2025", "TensorFlow tutorial",
    "cricket score", "movie reviews", "travel destinations",
    "AI research papers", "job openings", "health tips"
]

FILE_NAMES = [
    "report.pdf", "presentation.pptx", "notes.txt", "project_code.py",
    "budget.xlsx", "resume.docx", "photo.jpg", "meeting_notes.md",
    "dataset.csv", "model.h5", "assignment.pdf", "screenshot.png"
]

SENDERS = [
    "professor", "boss", "HR department", "university", "recruiter",
    "Amazon", "Google", "team lead", "client", "bank", "Rohan", "Priya",
    "internship coordinator", "lab assistant", "admin office"
]

INTENT_TEMPLATES = {
    "send_whatsapp": [
        "send a whatsapp message to {contact}",
        "message {contact} on whatsapp",
        "whatsapp {contact} saying {message}",
        "text {contact} that {message}",
        "send {contact} a message",
        "tell {contact} that {message}",
        "drop a message to {contact}",
        "ping {contact} on whatsapp",
        "send whatsapp to {contact} about {subject}",
        "message {contact} about {subject}",
        "can you whatsapp {contact}",
        "please text {contact}",
        "forward this to {contact} on whatsapp",
        "let {contact} know that {message}",
        "notify {contact} via whatsapp",
        "shoot a text to {contact}",
        "buzz {contact} on whatsapp saying {message}",
        "hit up {contact} with a message",
        "write to {contact} on whatsapp",
        "reach out to {contact} on whatsapp"
    ],

    "read_email": [
        "read my emails",
        "check my inbox",
        "what emails did I get",
        "show me my latest emails",
        "any new emails",
        "check email from {sender}",
        "did {sender} email me",
        "show unread emails",
        "what's in my inbox",
        "open my email",
        "read emails from {sender}",
        "any messages from {sender}",
        "check if {sender} sent anything",
        "show me emails about {subject}",
        "do I have any new mail",
        "pull up my inbox",
        "what did {sender} say in the email",
        "any important emails today",
        "show emails from this week",
        "fetch my latest mail"
    ],

    "draft_email": [
        "draft an email to {contact}",
        "write an email to {contact} about {subject}",
        "compose an email for {contact}",
        "help me write an email to {contact}",
        "draft a reply to {contact}",
        "prepare an email about {subject}",
        "write a professional email to {contact}",
        "compose a message to {contact} about {subject}",
        "type up an email to {contact}",
        "create an email draft for {contact}",
        "help me reply to {contact}'s email",
        "draft a formal email about {subject}",
        "write back to {contact}",
        "pen an email to {contact}",
        "I need to email {contact} about {subject}"
    ],

    "send_email": [
        "send an email to {contact}",
        "email {contact} about {subject}",
        "send {contact} an email saying {message}",
        "fire off an email to {contact}",
        "mail {contact} about {subject}",
        "send email to {contact} regarding {subject}",
        "shoot an email to {contact}",
        "email {contact} the {subject}",
        "dispatch an email to {contact}",
        "send a quick email to {contact}",
        "forward this email to {contact}",
        "reply to {contact}'s email",
        "respond to {contact} via email",
        "send the email now",
        "email this to {contact}"
    ],

    "set_reminder": [
        "remind me to {task} at {time}",
        "set a reminder for {time}",
        "remind me about {subject} {time}",
        "don't let me forget to {task}",
        "set an alarm for {time}",
        "remind me {time} to {task}",
        "create a reminder to {task}",
        "I need a reminder for {time}",
        "alert me at {time} about {task}",
        "remind me later to {task}",
        "set reminder: {task} at {time}",
        "please remind me to {task}",
        "add a reminder for {task}",
        "schedule a reminder for {time}",
        "wake me up at {time}"
    ],

    "create_event": [
        "add an event to my calendar",
        "schedule a meeting at {time}",
        "create a calendar event for {time}",
        "book {time} for {task}",
        "add {task} to my calendar at {time}",
        "schedule {task} for {time}",
        "put {task} on my calendar",
        "create an event called {task}",
        "calendar event: {task} at {time}",
        "block {time} for {task}",
        "set up a meeting with {contact} at {time}",
        "add to calendar: {task}",
        "new calendar event at {time}",
        "plan {task} for {time}",
        "mark {time} for {task}"
    ],

    "check_calendar": [
        "what's on my calendar today",
        "show my schedule",
        "any events today",
        "what do I have planned",
        "check my calendar",
        "what's scheduled for {time}",
        "am I free at {time}",
        "show my agenda",
        "what events are coming up",
        "do I have any meetings today",
        "when is my next meeting",
        "show calendar for this week",
        "what's happening {time}",
        "any appointments today",
        "pull up my schedule"
    ],

    "search_web": [
        "search for {topic}",
        "google {topic}",
        "look up {topic}",
        "find information about {topic}",
        "search the web for {topic}",
        "what is {topic}",
        "tell me about {topic}",
        "search {topic} online",
        "find out about {topic}",
        "web search: {topic}",
        "look up information on {topic}",
        "can you search for {topic}",
        "I want to know about {topic}",
        "find me info on {topic}",
        "research {topic} for me"
    ],

    "open_file": [
        "open {file}",
        "find the file {file}",
        "locate {file} on my computer",
        "open the file called {file}",
        "show me {file}",
        "where is {file}",
        "find {file}",
        "pull up {file}",
        "access {file}",
        "load {file}",
        "can you open {file}",
        "launch {file}",
        "bring up {file}",
        "display {file}",
        "get {file} for me"
    ],

    "morning_briefing": [
        "give me my morning briefing",
        "what's my day looking like",
        "morning summary please",
        "brief me on today",
        "what do I need to know today",
        "start my day",
        "daily briefing",
        "what's happening today",
        "summarize my morning",
        "catch me up on everything",
        "today's overview",
        "morning update",
        "how does my day look",
        "give me the rundown for today",
        "what's on the agenda today"
    ],

    "summarize_email": [
        "summarize my emails",
        "give me an email summary",
        "what are the important emails",
        "email digest please",
        "brief me on my emails",
        "summarize unread emails",
        "give me a quick email overview",
        "what do my emails say",
        "email highlights please",
        "condense my inbox",
        "tl;dr my emails",
        "quick summary of my mail",
        "what's important in my inbox",
        "email briefing",
        "summarize emails from {sender}"
    ],

    "get_weather": [
        "what's the weather like",
        "how's the weather today",
        "is it going to rain",
        "weather forecast",
        "temperature today",
        "what's the weather outside",
        "do I need an umbrella",
        "weather report",
        "is it sunny today",
        "what's the forecast for tomorrow",
        "how hot is it",
        "check the weather",
        "weather update",
        "will it rain today",
        "what's the temperature"
    ],

    "play_music": [
        "play some music",
        "play a song",
        "put on some tunes",
        "play my playlist",
        "start playing music",
        "play something relaxing",
        "music please",
        "turn on music",
        "play my favorite songs",
        "shuffle my playlist",
        "play background music",
        "put on some chill music",
        "play the latest hits",
        "start my workout playlist",
        "play jazz music"
    ],

    "set_alarm": [
        "set an alarm for {time}",
        "wake me up at {time}",
        "alarm at {time}",
        "set alarm {time}",
        "I need an alarm for {time}",
        "alarm clock for {time}",
        "set a {time} alarm",
        "wake me at {time}",
        "buzz me at {time}",
        "set morning alarm for {time}",
        "create an alarm for {time}",
        "alarm me at {time}",
        "schedule alarm for {time}",
        "ring at {time}",
        "timer for {time}"
    ],

    "take_note": [
        "take a note",
        "note down: {message}",
        "save this note: {message}",
        "jot down {message}",
        "remember that {message}",
        "make a note about {subject}",
        "write this down: {message}",
        "add to my notes: {message}",
        "note: {message}",
        "save a note saying {message}",
        "quick note: {message}",
        "log this: {message}",
        "add a note about {subject}",
        "write a note: {message}",
        "capture this: {message}"
    ],

    "translate_text": [
        "translate {message} to Spanish",
        "how do you say {message} in French",
        "translate this to Hindi",
        "what's {message} in German",
        "translate to Japanese: {message}",
        "convert {message} to Chinese",
        "say {message} in Italian",
        "translation of {message}",
        "translate {message}",
        "how to say {message} in Korean",
        "translate this text",
        "language translation for {message}",
        "what is {message} in Arabic",
        "put {message} in Portuguese",
        "translate from English to Tamil"
    ],

    "calculate": [
        "what's 15 times 23",
        "calculate 256 plus 789",
        "how much is 100 divided by 7",
        "compute the square root of 144",
        "what's 20 percent of 350",
        "calculate my expenses",
        "math: 45 times 12",
        "what's 1000 minus 347",
        "solve 2x plus 5 equals 15",
        "convert 100 dollars to rupees",
        "calculate the tip on 45 dollars",
        "what's the area of a circle with radius 5",
        "how much is 3.14 times 25",
        "percentage calculator: 75 out of 200",
        "convert 72 fahrenheit to celsius"
    ],

    "tell_joke": [
        "tell me a joke",
        "make me laugh",
        "say something funny",
        "got any jokes",
        "I need a laugh",
        "tell a funny joke",
        "humor me",
        "crack a joke",
        "something to cheer me up",
        "give me a good joke",
        "any funny stories",
        "tell me something funny",
        "joke of the day",
        "lighten the mood",
        "entertain me"
    ],

    "get_news": [
        "what's the latest news",
        "show me today's news",
        "news update",
        "what's happening in the world",
        "top headlines today",
        "latest news about {topic}",
        "any breaking news",
        "news briefing",
        "show tech news",
        "what's trending today",
        "current affairs update",
        "world news",
        "today's top stories",
        "news about {topic}",
        "headline news please"
    ],

    "general_chat": [
        "hello",
        "hi there",
        "how are you",
        "what's up",
        "hey",
        "good morning",
        "good evening",
        "what can you do",
        "who are you",
        "tell me about yourself",
        "thank you",
        "thanks a lot",
        "you're awesome",
        "nice talking to you",
        "goodbye",
        "see you later",
        "that's cool",
        "interesting",
        "okay great",
        "sounds good"
    ]
}


def fill_template(template):
    """Fill a template string with random slot values."""
    result = template
    result = result.replace("{contact}", random.choice(CONTACTS))
    result = result.replace("{message}", random.choice(MESSAGES))
    result = result.replace("{subject}", random.choice(SUBJECTS))
    result = result.replace("{time}", random.choice(TIMES))
    result = result.replace("{task}", random.choice(TASKS))
    result = result.replace("{topic}", random.choice(TOPICS))
    result = result.replace("{file}", random.choice(FILE_NAMES))
    result = result.replace("{sender}", random.choice(SENDERS))
    return result


def add_variations(text):
    """Create natural language variations of the text."""
    variations = [text]

    # Polite prefix
    polite = random.choice(["please ", "can you ", "could you ", "hey desk, ", ""])
    variations.append(polite + text)

    # Casual variation
    if random.random() > 0.5:
        casual = text.lower().replace("please ", "").replace("can you ", "")
        variations.append(casual)

    # Typo / informal
    if random.random() > 0.7:
        words = text.split()
        if len(words) > 3:
            # Skip a random word
            idx = random.randint(1, len(words) - 1)
            informal = " ".join(words[:idx] + words[idx+1:])
            variations.append(informal)

    return variations


def generate_dataset(target_size=12000):
    """Generate the full intent classification dataset."""
    dataset = []
    intents = list(INTENT_TEMPLATES.keys())

    while len(dataset) < target_size:
        for intent, templates in INTENT_TEMPLATES.items():
            template = random.choice(templates)
            filled = fill_template(template)

            # Add base example
            dataset.append({"text": filled, "intent": intent})

            # Add variations
            for var in add_variations(filled):
                if var != filled and len(dataset) < target_size:
                    dataset.append({"text": var, "intent": intent})

            if len(dataset) >= target_size:
                break

    random.shuffle(dataset)
    return dataset[:target_size]


def main():
    print("=" * 60)
    print("NeuralDesk — Intent Dataset Generator")
    print("=" * 60)

    dataset = generate_dataset(12000)

    # Stats
    intent_counts = {}
    for item in dataset:
        intent_counts[item["intent"]] = intent_counts.get(item["intent"], 0) + 1

    print(f"\nTotal examples: {len(dataset)}")
    print(f"Intent categories: {len(intent_counts)}")
    print("\nDistribution:")
    for intent, count in sorted(intent_counts.items(), key=lambda x: -x[1]):
        print(f"  {intent:25s} -> {count:5d} examples")

    # Save
    os.makedirs("data", exist_ok=True)
    output_path = os.path.join("data", "intent_dataset.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2, ensure_ascii=False)

    print(f"\nDataset saved to: {output_path}")
    print("=" * 60)


if __name__ == "__main__":
    main()
