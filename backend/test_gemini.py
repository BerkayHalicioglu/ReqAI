"""
Quick test script for Gemini API connectivity.
Reads the API key from the .env file instead of hardcoding it.
"""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("ERROR: GEMINI_API_KEY not found in .env file.")
    print("Please set GEMINI_API_KEY in your backend/.env file.")
    exit(1)

url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
headers = {"Content-Type": "application/json"}
payload = {
    "contents": [
        {
            "parts": [{"text": "Say hello!"}]
        }
    ]
}

try:
    res = requests.post(url, headers=headers, json=payload, timeout=10)
    print(f"Status Code: {res.status_code}")
    print(f"Response Body: {res.text}")
except Exception as e:
    print(f"Request failed: {e}")
