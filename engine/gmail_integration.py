"""
NeuralDesk — Gmail Integration
================================
Real Gmail inbox integration using Google OAuth2 and Gmail API.
Fetches actual emails, scores them with the neural model,
and provides a seamless connection experience.
"""

import os
import json
import base64
import re
from datetime import datetime
from email.utils import parsedate_to_datetime

# Gmail API constants
SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]
CREDENTIALS_FILE = os.path.join("data", "gmail_credentials.json")
TOKEN_FILE = os.path.join("data", "gmail_token.json")


class GmailClient:
    """Handles Gmail API OAuth2 flow and email fetching."""

    def __init__(self):
        self.service = None
        self._connected = False

    def is_connected(self):
        """Check if we have a valid Gmail connection."""
        if self._connected and self.service:
            return True
        # Try to load saved token
        return self._try_load_token()

    def _try_load_token(self):
        """Try to restore a saved OAuth token."""
        if not os.path.exists(TOKEN_FILE) or not os.path.exists(CREDENTIALS_FILE):
            return False
        try:
            from google.oauth2.credentials import Credentials
            from google.auth.transport.requests import Request
            from googleapiclient.discovery import build

            creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
                # Save refreshed token
                with open(TOKEN_FILE, "w") as f:
                    f.write(creds.to_json())
            if creds and creds.valid:
                self.service = build("gmail", "v1", credentials=creds)
                self._connected = True
                return True
        except Exception as e:
            print(f"[Gmail] Token restore failed: {e}")
        return False

    def get_auth_url(self, redirect_uri):
        """
        Generate an OAuth2 authorization URL.
        The user visits this URL to grant access.
        """
        if not os.path.exists(CREDENTIALS_FILE):
            return None

        try:
            from google_auth_oauthlib.flow import Flow

            flow = Flow.from_client_secrets_file(
                CREDENTIALS_FILE,
                scopes=SCOPES,
                redirect_uri=redirect_uri
            )
            auth_url, _ = flow.authorization_url(
                access_type="offline",
                include_granted_scopes="true",
                prompt="consent"
            )
            return auth_url
        except Exception as e:
            print(f"[Gmail] Auth URL error: {e}")
            return None

    def handle_callback(self, authorization_response, redirect_uri):
        """
        Handle the OAuth2 callback after user grants permission.
        Exchange the authorization code for tokens.
        """
        try:
            from google_auth_oauthlib.flow import Flow
            from googleapiclient.discovery import build

            flow = Flow.from_client_secrets_file(
                CREDENTIALS_FILE,
                scopes=SCOPES,
                redirect_uri=redirect_uri
            )
            flow.fetch_token(authorization_response=authorization_response)
            creds = flow.credentials

            # Save token for future use
            with open(TOKEN_FILE, "w") as f:
                f.write(creds.to_json())

            self.service = build("gmail", "v1", credentials=creds)
            self._connected = True
            return True
        except Exception as e:
            print(f"[Gmail] Callback error: {e}")
            return False

    def fetch_emails(self, max_results=20):
        """
        Fetch recent emails from the user's Gmail inbox.

        Returns:
            list of dict: [{subject, sender, body, date, snippet, labels}, ...]
        """
        if not self.is_connected():
            return []

        try:
            # Fetch message IDs
            results = self.service.users().messages().list(
                userId="me",
                maxResults=max_results,
                labelIds=["INBOX"]
            ).execute()

            messages = results.get("messages", [])
            emails = []

            for msg_meta in messages:
                try:
                    msg = self.service.users().messages().get(
                        userId="me",
                        id=msg_meta["id"],
                        format="full"
                    ).execute()

                    email_data = self._parse_email(msg)
                    if email_data:
                        emails.append(email_data)
                except Exception as e:
                    print(f"[Gmail] Error parsing message {msg_meta['id']}: {e}")
                    continue

            return emails
        except Exception as e:
            print(f"[Gmail] Fetch error: {e}")
            return []

    def _parse_email(self, msg):
        """Parse a Gmail API message into a clean dict."""
        headers = msg.get("payload", {}).get("headers", [])
        header_dict = {h["name"].lower(): h["value"] for h in headers}

        subject = header_dict.get("subject", "(No Subject)")
        sender = header_dict.get("from", "Unknown")
        date_str = header_dict.get("date", "")
        snippet = msg.get("snippet", "")

        # Parse date
        try:
            date_obj = parsedate_to_datetime(date_str)
            date_formatted = date_obj.strftime("%b %d, %I:%M %p")
        except Exception:
            date_formatted = date_str[:20] if date_str else ""

        # Extract body text
        body = self._extract_body(msg.get("payload", {}))

        # Clean sender name
        sender_name = sender
        match = re.match(r'"?([^"<]+)"?\s*<', sender)
        if match:
            sender_name = match.group(1).strip()

        # Get labels
        label_ids = msg.get("labelIds", [])
        is_unread = "UNREAD" in label_ids
        is_important = "IMPORTANT" in label_ids
        is_starred = "STARRED" in label_ids

        return {
            "subject": subject,
            "sender": sender_name,
            "sender_full": sender,
            "body": body[:500] if body else snippet,
            "snippet": snippet,
            "date": date_formatted,
            "is_unread": is_unread,
            "is_important": is_important,
            "is_starred": is_starred,
            "gmail_id": msg.get("id", "")
        }

    def _extract_body(self, payload):
        """Extract plain text body from Gmail message payload."""
        body_text = ""

        if payload.get("mimeType") == "text/plain":
            data = payload.get("body", {}).get("data", "")
            if data:
                body_text = base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
        elif payload.get("parts"):
            for part in payload["parts"]:
                if part.get("mimeType") == "text/plain":
                    data = part.get("body", {}).get("data", "")
                    if data:
                        body_text = base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
                        break
                elif part.get("parts"):
                    # Nested multipart
                    body_text = self._extract_body(part)
                    if body_text:
                        break

        # Clean up
        body_text = re.sub(r'<[^>]+>', '', body_text)  # Strip HTML tags
        body_text = re.sub(r'\s+', ' ', body_text).strip()
        return body_text

    def disconnect(self):
        """Disconnect Gmail and remove saved token."""
        self.service = None
        self._connected = False
        if os.path.exists(TOKEN_FILE):
            os.remove(TOKEN_FILE)

    def has_credentials_file(self):
        """Check if OAuth credentials file exists."""
        return os.path.exists(CREDENTIALS_FILE)
