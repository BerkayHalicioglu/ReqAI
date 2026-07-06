"""
AI Requirement Analysis Service.

Given raw requirement-document text, produces a structured breakdown of:
  Requirements -> Tasks -> Test Scenarios (with priority/complexity estimates)

Two implementations are provided:
  - MockAIService: deterministic, no external calls, good for local dev/demo
  - OpenAIService: calls the real OpenAI API and expects strict JSON back

Both return the exact same dict shape, so routers/callers don't care which
one is active. Toggle with USE_MOCK_AI in .env.
"""
import json
import re
from abc import ABC, abstractmethod

from app.core.config import settings

SYSTEM_PROMPT = """You are a senior business analyst and software architect.
You will be given a raw customer requirements document.

Break it down into:
1. Business Requirements (high-level needs)
2. For each requirement, Development Tasks (concrete, implementable units of work)
3. For each task, Test Scenarios (at least one) with an expected result
4. A priority (LOW, MEDIUM, HIGH, CRITICAL) for each requirement and task
5. A complexity estimate (SIMPLE, MODERATE, COMPLEX) for each task

Respond with ONLY valid JSON, no markdown fences, no commentary, in this exact shape:
{
  "requirements": [
    {
      "title": "string",
      "description": "string",
      "priority": "LOW|MEDIUM|HIGH|CRITICAL",
      "tasks": [
        {
          "title": "string",
          "description": "string",
          "priority": "LOW|MEDIUM|HIGH|CRITICAL",
          "complexity": "SIMPLE|MODERATE|COMPLEX",
          "test_scenarios": [
            {
              "title": "string",
              "description": "string",
              "expected_result": "string"
            }
          ]
        }
      ]
    }
  ]
}
"""


class AIService(ABC):
    @abstractmethod
    def analyze(self, document_text: str) -> dict:
        """Return the structured requirement/task/test-scenario breakdown."""
        raise NotImplementedError


class MockAIService(AIService):
    """
    Deterministic mock so Week 2 can be demoed/tested end-to-end without
    burning OpenAI credits. Splits the document into paragraphs and treats
    each non-empty paragraph as one business requirement, then fabricates
    a couple of tasks and test scenarios per requirement.
    """

    def analyze(self, document_text: str) -> dict:
        paragraphs = [p.strip() for p in re.split(r"\n\s*\n", document_text) if p.strip()]
        if not paragraphs:
            paragraphs = [document_text.strip() or "Untitled requirement"]

        priorities = ["HIGH", "MEDIUM", "LOW", "CRITICAL"]
        complexities = ["SIMPLE", "MODERATE", "COMPLEX"]

        requirements = []
        for i, para in enumerate(paragraphs):
            first_line = para.splitlines()[0].strip()
            req_title = (first_line[:80] or f"Requirement {i + 1}")
            req_priority = priorities[i % len(priorities)]

            tasks = []
            for t in range(2):  # two tasks per requirement, deterministic demo data
                task_priority = priorities[(i + t) % len(priorities)]
                task_complexity = complexities[(i + t) % len(complexities)]
                tasks.append({
                    "title": f"Implement part {t + 1} of: {req_title}",
                    "description": f"Development task derived from requirement: \"{para[:200]}\"",
                    "priority": task_priority,
                    "complexity": task_complexity,
                    "test_scenarios": [
                        {
                            "title": f"Verify part {t + 1} behaves as expected",
                            "description": f"Test that the implementation for '{req_title}' meets the stated need.",
                            "expected_result": "The system behaves according to the requirement without errors.",
                        }
                    ],
                })

            requirements.append({
                "title": req_title,
                "description": para,
                "priority": req_priority,
                "tasks": tasks,
            })

        return {"requirements": requirements}


class OpenAIService(AIService):
    """Real AI analysis via the OpenAI Chat Completions API."""

    def __init__(self):
        from openai import OpenAI
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)

    def analyze(self, document_text: str) -> dict:
        response = self.client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": document_text},
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content
        return json.loads(raw)


class FallbackAIService(AIService):
    """
    LangChain-style fallback service. Attempts to call the real OpenAI API first.
    If it fails due to rate limits, quota limits, incorrect API keys, or connection
    errors, it catches the exception and falls back to MockAIService.
    """

    def __init__(self, primary: AIService, fallback: AIService):
        self.primary = primary
        self.fallback = fallback

    def analyze(self, document_text: str) -> dict:
        try:
            print("Attempting primary AI service (OpenAI)...")
            return self.primary.analyze(document_text)
        except Exception as e:
            import logging
            logging.warning(
                f"Primary AI service (OpenAI) failed with error: {e}. "
                f"Falling back to Mock AI Service to prevent service interruption."
            )
            print(f"Fallback triggered: OpenAI failed with {e}. Running Mock AI...")
            return self.fallback.analyze(document_text)


def get_ai_service() -> AIService:
    # If explicitly configured to use Mock or if API key is not set/placeholder, return Mock directly
    if settings.USE_MOCK_AI or not settings.OPENAI_API_KEY or "your-key" in settings.OPENAI_API_KEY:
        return MockAIService()
    # Otherwise, return the Fallback wrapper
    return FallbackAIService(primary=OpenAIService(), fallback=MockAIService())

