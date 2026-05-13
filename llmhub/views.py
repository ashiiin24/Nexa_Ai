from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm
from django.conf import settings
from django.shortcuts import redirect, render
from django.views.decorators.http import require_POST
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import QuestionLog
from .prompts import build_system_prompt
from .providers import LLMError, ask_llm, choose_provider, provider_options
from .serializers import AskSerializer


@login_required
def home(request):
    logs = QuestionLog.objects.filter(user=request.user)
    return render(
        request,
        "llmhub/home.html",
        {
            "providers": provider_options(),
            "logs": logs[:10],
            "search_logs": logs[:100],
            "question_types": QuestionLog.QUESTION_TYPES,
        },
    )


def login_view(request):
    if request.user.is_authenticated:
        return redirect("home")

    form = AuthenticationForm(request, data=request.POST or None)
    if request.method == "POST" and form.is_valid():
        login(request, form.get_user())
        return redirect("home")

    google_oauth_ready = bool(settings.GOOGLE_OAUTH_CLIENT_ID and settings.GOOGLE_OAUTH_CLIENT_SECRET)
    return render(request, "llmhub/login.html", {"form": form, "google_oauth_ready": google_oauth_ready})


def signup_view(request):
    if request.user.is_authenticated:
        return redirect("home")

    form = UserCreationForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        user = form.save()
        login(request, user, backend="django.contrib.auth.backends.ModelBackend")
        return redirect("home")

    google_oauth_ready = bool(settings.GOOGLE_OAUTH_CLIENT_ID and settings.GOOGLE_OAUTH_CLIENT_SECRET)
    return render(request, "llmhub/signup.html", {"form": form, "google_oauth_ready": google_oauth_ready})


@require_POST
def logout_view(request):
    logout(request)
    return redirect("login")


@api_view(["GET"])
def providers_api(request):
    return Response({"providers": provider_options()})


@login_required
@api_view(["POST"])
def ask_api(request):
    serializer = AskSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    payload = serializer.validated_data

    try:
        provider, model = choose_provider(
            payload.get("provider"),
            payload.get("model"),
            payload.get("offline_mode"),
        )
        system_prompt = build_system_prompt(payload["question_type"])
        answer = ask_llm(provider, model, system_prompt, payload["question"])
    except LLMError as exc:
        QuestionLog.objects.create(
            user=request.user,
            provider=payload.get("provider") or "unknown",
            model=payload.get("model") or "",
            question_type=payload["question_type"],
            offline_mode=payload.get("offline_mode", False),
            question=payload["question"],
            error=str(exc),
        )
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    log = QuestionLog.objects.create(
        user=request.user,
        provider=provider,
        model=model,
        question_type=payload["question_type"],
        offline_mode=payload.get("offline_mode", False),
        question=payload["question"],
        answer=answer,
    )
    return Response(
        {
            "id": log.id,
            "provider": provider,
            "model": model,
            "question_type": payload["question_type"],
            "answer": answer,
        }
    )
