from django.contrib import admin

from .models import QuestionLog


@admin.register(QuestionLog)
class QuestionLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "provider", "model", "question_type", "offline_mode")
    list_filter = ("provider", "question_type", "offline_mode", "created_at")
    search_fields = ("question", "answer", "model")
