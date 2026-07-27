"""
AI Requirement Analysis Service.

Given raw requirement-document text, produces a structured breakdown of:
  Requirements -> Tasks -> Test Scenarios (with priority/complexity estimates)

This service uses a Strategy / Provider pattern similar to LangChain:
  - LLMProvider: Abstract base class for different AI models
  - ProviderRegistry: Dynamically registers and resolves active providers (OpenAI, Gemini, Mock, etc.)
  - ProviderAIService: Orchestrates requirements decomposition and batch translations
  - FallbackProviderAIService: Chains providers in a fallback pipeline (e.g. OpenAI -> Gemini -> Mock)
"""
import json
import re
import copy
import requests
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

TRANSLATE_PROMPT = """You are a professional translator.
You will be given a JSON object containing a requirements decomposition structure or raw text.
Translate all text content (e.g. document content, requirement titles/descriptions, task titles/descriptions, and test scenarios expected results) to {target_lang}.
Ensure that you preserve the structure, IDs, priorities, complexities, and JSON format exactly.
Do not add any markdown formatting, code block ticks, or extra text. Return ONLY the valid JSON object.
"""


# =====================================================================
# 1. Plug-and-Play LLM Provider Interfaces
# =====================================================================
class LLMProvider(ABC):
    @abstractmethod
    def generate_json(self, system_prompt: str, user_prompt: str) -> dict:
        """Query the LLM provider and return a parsed JSON dictionary."""
        raise NotImplementedError


# =====================================================================
# 2. Concrete Provider Implementations
# =====================================================================
class MockProvider(LLMProvider):
    """Deterministic mock provider that requires no external API keys."""

    def generate_json(self, system_prompt: str, user_prompt: str) -> dict:
        # If it is a translation request, try to parse and return original
        if "translate" in system_prompt.lower():
            try:
                return json.loads(user_prompt)
            except Exception:
                return {}

        paragraphs = [p.strip() for p in re.split(r"\n\s*\n", user_prompt) if p.strip()]
        if not paragraphs:
            paragraphs = [user_prompt.strip() or "Untitled requirement"]

        priorities = ["HIGH", "MEDIUM", "LOW", "CRITICAL"]
        complexities = ["SIMPLE", "MODERATE", "COMPLEX"]

        requirements = []
        for i, para in enumerate(paragraphs):
            first_line = para.splitlines()[0].strip()
            req_title = (first_line[:80] or f"Requirement {i + 1}")
            req_priority = priorities[i % len(priorities)]

            tasks = []
            for t in range(2):
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


class OpenAIProvider(LLMProvider):
    """Real AI provider utilizing OpenAI's API."""

    def generate_json(self, system_prompt: str, user_prompt: str) -> dict:
        if not settings.OPENAI_API_KEY or "your-key" in settings.OPENAI_API_KEY:
            raise ValueError("OpenAI API key not configured.")

        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY)

        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content
        return json.loads(raw)


class GeminiProvider(LLMProvider):
    """Real AI provider utilizing Google's Gemini API via REST calls."""

    def generate_json(self, system_prompt: str, user_prompt: str) -> dict:
        if not settings.GEMINI_API_KEY or "your-key" in settings.GEMINI_API_KEY:
            raise ValueError("Gemini API key not configured.")

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={settings.GEMINI_API_KEY}"
        headers = {"Content-Type": "application/json"}
        
        # Combine system prompt and user input
        prompt_content = f"{system_prompt}\n\nUser Input / Document Content:\n{user_prompt}"
        
        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt_content}]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }

        res = requests.post(url, headers=headers, json=payload, timeout=30)
        res.raise_for_status()
        
        raw_text = res.json()["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(raw_text)


# =====================================================================
# 3. Provider Registry (Plug-and-Play Manager)
# =====================================================================
class ProviderRegistry:
    _registry = {}

    @classmethod
    def register(cls, name: str, provider_cls):
        cls._registry[name.lower()] = provider_cls

    @classmethod
    def get(cls, name: str) -> LLMProvider:
        provider_cls = cls._registry.get(name.lower())
        if not provider_cls:
            print(f"Warning: Provider '{name}' not found. Falling back to MockProvider.")
            return cls._registry["mock"]()
        return provider_cls()


# Register current providers
ProviderRegistry.register("mock", MockProvider)
ProviderRegistry.register("openai", OpenAIProvider)
ProviderRegistry.register("gemini", GeminiProvider)


# =====================================================================
# 4. Service Interfaces
# =====================================================================
class AIService(ABC):
    @abstractmethod
    def analyze(self, document_text: str) -> dict:
        """Return the structured requirement/task/test-scenario breakdown."""
        raise NotImplementedError

    @abstractmethod
    def translate_document(self, document_data: dict, target_lang: str) -> dict:
        """Translate the document detail structure to the target language."""
        raise NotImplementedError


class ProviderAIService(AIService):
    """Orchestrator service that delegates work to a specific LLMProvider."""

    def __init__(self, provider: LLMProvider):
        self.provider = provider

    def analyze(self, document_text: str) -> dict:
        return self.provider.generate_json(SYSTEM_PROMPT, document_text)

    def translate_document(self, document_data: dict, target_lang: str) -> dict:
        data = copy.deepcopy(document_data)
        target = target_lang.lower()
        if target not in ["tr", "en"]:
            return data

        # Gather all text values to translate in a single batch
        texts_to_translate = []
        paths = []

        if "content" in data:
            texts_to_translate.append(data["content"])
            paths.append(("content",))

        if "requirements" in data:
            for r_idx, req in enumerate(data["requirements"]):
                if "title" in req:
                    texts_to_translate.append(req["title"])
                    paths.append(("requirements", r_idx, "title"))
                if "description" in req:
                    texts_to_translate.append(req["description"])
                    paths.append(("requirements", r_idx, "description"))
                if "tasks" in req:
                    for t_idx, task in enumerate(req["tasks"]):
                        if "title" in task:
                            texts_to_translate.append(task["title"])
                            paths.append(("requirements", r_idx, "tasks", t_idx, "title"))
                        if "description" in task:
                            texts_to_translate.append(task["description"])
                            paths.append(("requirements", r_idx, "tasks", t_idx, "description"))
                        if "test_scenarios" in task:
                            for ts_idx, ts in enumerate(task["test_scenarios"]):
                                if "expected_result" in ts:
                                    texts_to_translate.append(ts["expected_result"])
                                    paths.append(("requirements", r_idx, "tasks", t_idx, "test_scenarios", ts_idx, "expected_result"))
                                if "title" in ts:
                                    texts_to_translate.append(ts["title"])
                                    paths.append(("requirements", r_idx, "tasks", t_idx, "test_scenarios", ts_idx, "title"))
                                if "description" in ts:
                                    texts_to_translate.append(ts["description"])
                                    paths.append(("requirements", r_idx, "tasks", t_idx, "test_scenarios", ts_idx, "description"))

        if not texts_to_translate:
            return data

        translated_texts = []
        try:
            # Set a very strict socket timeout (1.5 seconds) to prevent hanging
            import socket
            socket.setdefaulttimeout(1.5)

            from deep_translator import GoogleTranslator
            translator = GoogleTranslator(source='auto', target=target)
            translated_texts = translator.translate_batch(texts_to_translate)
        except Exception as e:
            print(f"Batch translation failed ({e}). Falling back to dictionary.")
            tr_to_en = {
                "Sistem": "System",
                "Kullanıcı": "User",
                "giriş": "login",
                "şifre": "password",
                "veri": "data",
                "görev": "task",
                "gereksinim": "requirement"
            }
            en_to_tr = {
                "System": "Sistem",
                "User": "Kullanıcı",
                "login": "giriş",
                "password": "şifre",
                "data": "veri",
                "task": "görev",
                "requirement": "gereksinim"
            }
            dictionary = tr_to_en if target == "en" else en_to_tr
            tag = " [TR]" if target == "tr" else " [EN]"

            for text in texts_to_translate:
                if not text:
                    translated_texts.append(text)
                    continue
                new_text = text
                for k, v in dictionary.items():
                    new_text = re.sub(r'\b' + k + r'\b', v, new_text, flags=re.IGNORECASE)
                if not (new_text.endswith(" [EN]") or new_text.endswith(" [TR]")):
                    new_text = new_text + tag
                translated_texts.append(new_text)
        finally:
            import socket
            socket.setdefaulttimeout(None)

        # Map translated values back to their original dictionary path
        for path, trans in zip(paths, translated_texts):
            if len(path) == 1:
                data[path[0]] = trans
            elif len(path) == 3:
                data[path[0]][path[1]][path[2]] = trans
            elif len(path) == 5:
                data[path[0]][path[1]][path[2]][path[3]][path[4]] = trans
            elif len(path) == 7:
                data[path[0]][path[1]][path[2]][path[3]][path[4]][path[5]][path[6]] = trans

        return data


class FallbackProviderAIService(AIService):
    """
    LangChain-style fallback service that chains multiple LLMProvider strategies.
    Attempts primary provider first; if it fails, falls back sequentially down the chain.
    """

    def __init__(self, providers: list[LLMProvider]):
        self.providers = providers

    def analyze(self, document_text: str) -> dict:
        last_err = None
        for provider in self.providers:
            try:
                print(f"Attempting analysis using provider: {provider.__class__.__name__}...")
                # Generate analysis JSON using this provider
                data = provider.generate_json(SYSTEM_PROMPT, document_text)
                return data
            except Exception as e:
                print(f"Provider {provider.__class__.__name__} failed: {e}")
                last_err = e
        
        # If all providers fail, raise the last exception
        raise last_err or RuntimeError("All AI providers failed.")

    def translate_document(self, document_data: dict, target_lang: str) -> dict:
        # Translation uses ProviderAIService wrapper which has built-in deep-translator
        # We can construct a simple ProviderAIService on the fly using the first successful provider
        for provider in self.providers:
            try:
                service = ProviderAIService(provider)
                return service.translate_document(document_data, target_lang)
            except Exception as e:
                print(f"Translation with provider {provider.__class__.__name__} failed: {e}")
        
        # Absolute fallback to mock provider translating
        mock_service = ProviderAIService(MockProvider())
        return mock_service.translate_document(document_data, target_lang)


# =====================================================================
# 5. Dependency Injection / Factory Function
# =====================================================================
def get_ai_service() -> AIService:
    # If MOCK mode is explicitly enabled, return Mock directly
    if settings.USE_MOCK_AI:
        return ProviderAIService(ProviderRegistry.get("mock"))

    # Compile the active provider fallback chain (similar to LangChain)
    fallback_chain = []
    
    # Add primary configured provider
    primary_name = settings.AI_PROVIDER.lower()
    fallback_chain.append(ProviderRegistry.get(primary_name))
    
    # Add secondary real providers as automatic fallbacks
    if primary_name == "openai":
        fallback_chain.append(ProviderRegistry.get("gemini"))
    elif primary_name == "gemini":
        fallback_chain.append(ProviderRegistry.get("openai"))
        
    # Always append Mock as the final bulletproof fallback
    fallback_chain.append(ProviderRegistry.get("mock"))
    
    # Return the fallback orchestrator
    return FallbackProviderAIService(fallback_chain)
