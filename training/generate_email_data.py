"""
NeuralDesk — Synthetic Email Dataset Generator
===============================================
Generates 5,000+ labelled email examples for training
the email priority scoring model. Each email has:
- subject, sender, body text
- priority score (0-100)
- category (urgent/normal/low/spam)
"""

import json
import random
import os


URGENT_SUBJECTS = [
    "URGENT: Server is down", "CRITICAL: Security breach detected",
    "ACTION REQUIRED: Submit by EOD", "EMERGENCY: Client meeting moved",
    "DEADLINE: Project submission tonight", "IMMEDIATE: Budget approval needed",
    "URGENT: Exam rescheduled to tomorrow", "CRITICAL UPDATE: System failure",
    "ASAP: Review required before release", "IMPORTANT: Visa application deadline",
    "FINAL WARNING: Account suspension", "URGENT: Flight cancelled",
    "EMERGENCY MEETING: 4 PM today", "CRITICAL: Data loss incident",
    "ACTION NEEDED: Contract expires today"
]

NORMAL_SUBJECTS = [
    "Meeting notes from today", "Project update - Week 5",
    "Feedback on your presentation", "Team lunch this Friday",
    "New feature request from client", "Code review for PR #234",
    "Schedule for next week", "Monthly report attached",
    "Invitation: Workshop on AI", "Updated project timeline",
    "Follow up on our discussion", "Shared document: Budget Plan",
    "Training session announcement", "Performance review scheduled",
    "New policy update", "Lab schedule changes",
    "Assignment feedback available", "Newsletter: Tech Weekly",
    "Upcoming webinar invitation", "Department meeting agenda"
]

LOW_SUBJECTS = [
    "FYI: Office closed on holiday", "Newsletter: Monthly digest",
    "Auto-reply: Out of office", "Subscription confirmed",
    "Weekly roundup from Medium", "New blog post published",
    "Community event announcement", "Photo album shared",
    "App update available", "Feedback survey - optional",
    "Fun Friday activities", "Social gathering next month",
    "Archived: Old thread", "Re: Re: Re: Old discussion",
    "Automated backup complete", "System maintenance scheduled"
]

SPAM_SUBJECTS = [
    "You've WON $1,000,000!!!", "FREE iPhone - Click NOW!!!",
    "Congratulations! You're selected!", "LIMITED TIME OFFER 90% OFF",
    "Make $5000 from home guaranteed", "Urgent: Verify your account",
    "You have (1) new message from a secret admirer",
    "EXCLUSIVE DEAL - Act now before it's too late",
    "Your package is waiting - confirm delivery",
    "Hot singles in your area", "Get rich quick scheme",
    "Lose 30 pounds in 30 days!!!", "Cheap medications online",
    "Nigerian prince needs your help", "Double your bitcoin today",
    "Claim your prize now!", "You've been selected for a reward"
]

SENDERS = {
    "urgent": ["professor@university.edu", "boss@company.com", "hr@company.com",
               "admin@university.edu", "client@business.com", "cto@startup.com"],
    "normal": ["colleague@company.com", "teammate@project.org", "rohan@gmail.com",
               "priya@outlook.com", "events@university.edu", "ta@university.edu"],
    "low": ["newsletter@medium.com", "noreply@github.com", "updates@linkedin.com",
            "digest@weekly.com", "notifications@slack.com", "no-reply@app.com"],
    "spam": ["winner@lottery.xyz", "deals@cheap-store.biz", "admin@verify-now.com",
             "offer@limited-time.net", "prize@congratulations.info"]
}

URGENT_BODIES = [
    "This requires your immediate attention. The deadline is today and we cannot proceed without your approval.",
    "Please respond ASAP. The server has been down for 2 hours and customers are affected.",
    "Critical issue detected in production. All hands on deck. Join the war room immediately.",
    "The client has moved the presentation to tomorrow morning. We need the slides finalized tonight.",
    "Your submission is due by midnight. Late submissions will not be accepted under any circumstances.",
    "Security alert: Unauthorized access detected on your account. Change your password immediately.",
    "The exam has been rescheduled to tomorrow. Please confirm your attendance.",
    "Budget approval is needed before 5 PM today. Without this, the project will be delayed."
]

NORMAL_BODIES = [
    "Hi team, here are the notes from today's meeting. Please review and let me know if I missed anything.",
    "Attached is the weekly project update. We're on track for the milestone deadline next Friday.",
    "Great presentation today! I had a few suggestions for improvement that I've outlined below.",
    "Hey everyone, we're doing team lunch this Friday at the new restaurant. RSVP by Wednesday.",
    "The client has requested a new feature for the dashboard. Let's discuss in our next standup.",
    "I've reviewed your code changes. Overall looks good, just a few minor comments inline.",
    "Reminder: The training session on cloud computing is scheduled for next Tuesday at 2 PM.",
    "Please find attached the monthly performance report for your review."
]

LOW_BODIES = [
    "This is an automated message. The office will be closed on the upcoming national holiday.",
    "Here's your weekly digest of top articles from Medium. Happy reading!",
    "I am currently out of office and will return on Monday. For urgent matters, contact my backup.",
    "Your subscription has been confirmed. You'll receive updates in your inbox.",
    "Check out our latest blog post on the future of artificial intelligence.",
    "Join us for the annual community event next month. Details in the attached flyer.",
    "System maintenance is scheduled for this weekend. Expect brief downtime."
]

SPAM_BODIES = [
    "CONGRATULATIONS! You have been randomly selected to receive a cash prize of $1,000,000. Click the link below to claim your reward NOW!!!",
    "Limited time offer! Get the latest iPhone for FREE. Just complete a short survey and it's yours!",
    "Dear user, your account will be suspended unless you verify your identity within 24 hours. Click here to verify.",
    "Make money from home! No experience needed. Guaranteed $5,000 per week. Sign up today!",
    "Hot deals on medications! No prescription needed. 90% off retail prices. Order now!",
    "A Nigerian prince needs your help transferring $45 million. You will receive 30% as commission.",
    "Double your cryptocurrency investment in just 24 hours with our proven trading bot!"
]


def generate_email(category):
    """Generate a single email example with the given category."""
    if category == "urgent":
        subject = random.choice(URGENT_SUBJECTS)
        sender = random.choice(SENDERS["urgent"])
        body = random.choice(URGENT_BODIES)
        priority = random.randint(80, 100)
    elif category == "normal":
        subject = random.choice(NORMAL_SUBJECTS)
        sender = random.choice(SENDERS["normal"])
        body = random.choice(NORMAL_BODIES)
        priority = random.randint(40, 75)
    elif category == "low":
        subject = random.choice(LOW_SUBJECTS)
        sender = random.choice(SENDERS["low"])
        body = random.choice(LOW_BODIES)
        priority = random.randint(5, 35)
    else:  # spam
        subject = random.choice(SPAM_SUBJECTS)
        sender = random.choice(SENDERS["spam"])
        body = random.choice(SPAM_BODIES)
        priority = random.randint(0, 10)

    return {
        "subject": subject,
        "sender": sender,
        "body": body,
        "priority_score": priority,
        "category": category,
        "text": f"Subject: {subject} From: {sender} Body: {body}"
    }


def generate_dataset(target_size=6000):
    """Generate the full email priority dataset."""
    dataset = []
    categories = ["urgent", "normal", "low", "spam"]
    per_category = target_size // len(categories)

    for category in categories:
        for _ in range(per_category):
            email = generate_email(category)
            dataset.append(email)
            # Add slight variation
            if random.random() > 0.5:
                variation = generate_email(category)
                # Mix subject and body
                variation["text"] = f"Subject: {variation['subject']} From: {email['sender']} Body: {variation['body']}"
                dataset.append(variation)

    random.shuffle(dataset)
    return dataset[:target_size]


def main():
    print("=" * 60)
    print("NeuralDesk — Email Dataset Generator")
    print("=" * 60)

    dataset = generate_dataset(6000)

    # Stats
    cat_counts = {}
    for item in dataset:
        cat_counts[item["category"]] = cat_counts.get(item["category"], 0) + 1

    print(f"\nTotal emails: {len(dataset)}")
    print(f"Categories: {len(cat_counts)}")
    print("\nDistribution:")
    for cat, count in sorted(cat_counts.items(), key=lambda x: -x[1]):
        print(f"  {cat:15s} -> {count:5d} emails")

    # Save
    os.makedirs("data", exist_ok=True)
    output_path = os.path.join("data", "email_dataset.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2, ensure_ascii=False)

    print(f"\nDataset saved to: {output_path}")
    print("=" * 60)


if __name__ == "__main__":
    main()
