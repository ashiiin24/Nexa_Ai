# Django LLM Hub

Malayalam/Manglish friendly Django project for asking questions through multiple LLM providers.

## Features

- One UI for OpenAI, Gemini, Groq, DeepSeek, Claude, OpenRouter/Llama, and Ollama.
- Question type selector: general, coding, math, creative, summarize, translate.
- Offline mode forces Ollama as the default provider.
- REST API endpoints:
  - `GET /api/providers/`
  - `POST /api/ask/`
- SQLite logging through Django admin.

## Setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py migrate
python manage.py runserver
```

Open `http://127.0.0.1:8000/`.

## API Keys

Edit `.env` and add the keys you need:

```env
OPENAI_API_KEY=...
GEMINI_API_KEY=...
GROQ_API_KEY=...
DEEPSEEK_API_KEY=...
ANTHROPIC_API_KEY=...
OPENROUTER_API_KEY=...
```

## Login and Google Sign In

Local signup/login pages are available at:

- `http://127.0.0.1:8000/signup/`
- `http://127.0.0.1:8000/login/`

For Google sign in, create an OAuth Client in Google Cloud Console and add this redirect URI:

```text
http://127.0.0.1:8000/accounts/google/login/callback/
```

Then set these in `.env`:

```env
GOOGLE_OAUTH_CLIENT_ID=your-google-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-google-client-secret
```

## Offline Ollama

Install and run Ollama, then pull a model:

```powershell
ollama pull llama3.1
ollama serve
```

Keep `.env` like this:

```env
DEFAULT_PROVIDER=ollama
DEFAULT_OLLAMA_MODEL=llama3.1
OLLAMA_BASE_URL=http://localhost:11434
```

When the UI Offline checkbox is enabled, the backend always uses Ollama even if another provider is selected.

## Example API Request

```powershell
Invoke-RestMethod -Method Post http://127.0.0.1:8000/api/ask/ `
  -ContentType "application/json" `
  -Body '{"question":"Django explain cheyyu","question_type":"coding","provider":"ollama","model":"llama3.1","offline_mode":true}'
```
