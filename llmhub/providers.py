import os
from dataclasses import dataclass

import requests


@dataclass(frozen=True)
class ProviderConfig:
    key: str
    label: str
    default_model: str
    needs_api_key: bool = True


PROVIDERS = {
    "ollama": ProviderConfig("ollama", "Ollama Offline", os.getenv("DEFAULT_OLLAMA_MODEL", "llama3.1"), False),
    "openai": ProviderConfig("openai", "OpenAI", os.getenv("OPENAI_DEFAULT_MODEL", "gpt-4.1-mini")),
    "gemini": ProviderConfig("gemini", "Google Gemini", os.getenv("GEMINI_DEFAULT_MODEL", "gemini-2.0-flash")),
    "groq": ProviderConfig("groq", "Groq", os.getenv("GROQ_DEFAULT_MODEL", "llama-3.3-70b-versatile")),
    "deepseek": ProviderConfig("deepseek", "DeepSeek", os.getenv("DEEPSEEK_DEFAULT_MODEL", "deepseek-chat")),
    "claude": ProviderConfig("claude", "Anthropic Claude", os.getenv("ANTHROPIC_DEFAULT_MODEL", "claude-3-5-haiku-latest")),
    "openrouter": ProviderConfig("openrouter", "OpenRouter / Llama", os.getenv("OPENROUTER_DEFAULT_MODEL", "meta-llama/llama-3.1-8b-instruct")),
}

PROVIDER_API_KEYS = {
    "openai": "OPENAI_API_KEY",
    "gemini": "GEMINI_API_KEY",
    "groq": "GROQ_API_KEY",
    "deepseek": "DEEPSEEK_API_KEY",
    "claude": "ANTHROPIC_API_KEY",
    "openrouter": "OPENROUTER_API_KEY",
}


class LLMError(RuntimeError):
    pass


def provider_options():
    return [
        {
            "key": config.key,
            "label": config.label,
            "default_model": config.default_model,
            "needs_api_key": config.needs_api_key,
            "configured": not config.needs_api_key or bool(os.getenv(PROVIDER_API_KEYS.get(config.key, "")).strip()),
        }
        for config in PROVIDERS.values()
    ]


def choose_provider(provider, model, offline_mode):
    if offline_mode:
        provider = "ollama"
        model = os.getenv("DEFAULT_OLLAMA_MODEL", PROVIDERS["ollama"].default_model)

    provider = provider or os.getenv("DEFAULT_PROVIDER", "ollama")
    if provider not in PROVIDERS:
        raise LLMError(f"Unknown provider: {provider}")

    return provider, model or PROVIDERS[provider].default_model


def ask_llm(provider, model, system_prompt, question):
    try:
        if provider == "ollama":
            return _ask_ollama(model, system_prompt, question)
        if provider == "openai":
            return _ask_openai(model, system_prompt, question)
        if provider == "gemini":
            return _ask_gemini(model, system_prompt, question)
        if provider == "groq":
            return _ask_groq(model, system_prompt, question)
        if provider == "deepseek":
            return _ask_openai_compatible(
                api_key=os.getenv("DEEPSEEK_API_KEY"),
                base_url="https://api.deepseek.com",
                model=model,
                system_prompt=system_prompt,
                question=question,
                provider_name="DeepSeek",
            )
        if provider == "claude":
            return _ask_claude(model, system_prompt, question)
        if provider == "openrouter":
            return _ask_openai_compatible(
                api_key=os.getenv("OPENROUTER_API_KEY"),
                base_url="https://openrouter.ai/api/v1",
                model=model,
                system_prompt=system_prompt,
                question=question,
                provider_name="OpenRouter",
            )
    except LLMError:
        raise
    except Exception as exc:
        raise LLMError(_friendly_provider_error(provider, exc)) from exc

    raise LLMError(f"Provider not implemented: {provider}")


def _friendly_provider_error(provider, exc):
    message = str(exc)
    if provider == "gemini" and ("429" in message or "RESOURCE_EXHAUSTED" in message):
        return (
            "Gemini quota exceeded for this API key/model. "
            "Try again later, enable billing/check quota in Google AI Studio, "
            "or choose another provider such as Ollama, OpenAI, Groq, or DeepSeek."
        )
    if provider == "openai" and ("429" in message or "insufficient_quota" in message):
        return (
            "OpenAI quota/billing is not available for this API key. "
            "Check billing and usage limits in the OpenAI dashboard, use another OpenAI key, "
            "or choose Offline/Ollama or another provider."
        )
    if provider == "deepseek" and ("402" in message or "Insufficient Balance" in message):
        return (
            "DeepSeek account balance is insufficient for this API key. "
            "Add balance in the DeepSeek dashboard, use another DeepSeek key, "
            "or choose another LLM such as Ollama, Gemini, Groq, or OpenAI."
        )
    return f"{PROVIDERS.get(provider, ProviderConfig(provider, provider, '')).label} request failed: {message}"


def _ask_ollama(model, system_prompt, question):
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
    payload = {
        "model": model,
        "prompt": question,
        "system": system_prompt,
        "stream": False,
    }
    try:
        response = requests.post(f"{base_url}/api/generate", json=payload, timeout=120)
        response.raise_for_status()
    except requests.RequestException as exc:
        raise LLMError(f"Ollama request failed. Is Ollama running? {exc}") from exc
    data = response.json()
    return data.get("response", "").strip()


def _ask_openai(model, system_prompt, question):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise LLMError("OPENAI_API_KEY missing in .env")

    from openai import OpenAI

    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question},
        ],
    )
    return response.choices[0].message.content.strip()


def _ask_gemini(model, system_prompt, question):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise LLMError("GEMINI_API_KEY missing in .env")

    from google import genai

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model=model,
        contents=f"{system_prompt}\n\nUser question:\n{question}",
    )
    return getattr(response, "text", "") or str(response)


def _ask_groq(model, system_prompt, question):
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise LLMError("GROQ_API_KEY missing in .env")

    from groq import Groq

    client = Groq(api_key=api_key)
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question},
        ],
    )
    return response.choices[0].message.content.strip()


def _ask_claude(model, system_prompt, question):
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise LLMError("ANTHROPIC_API_KEY missing in .env")

    import anthropic

    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model=model,
        max_tokens=2048,
        system=system_prompt,
        messages=[{"role": "user", "content": question}],
    )
    return "".join(block.text for block in response.content if getattr(block, "type", "") == "text").strip()


def _ask_openai_compatible(api_key, base_url, model, system_prompt, question, provider_name):
    if not api_key:
        raise LLMError(f"{provider_name} API key missing in .env")

    from openai import OpenAI

    client = OpenAI(api_key=api_key, base_url=base_url)
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question},
        ],
    )
    return response.choices[0].message.content.strip()
