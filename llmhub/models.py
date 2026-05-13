from django.db import models
from django.conf import settings


class QuestionLog(models.Model):
    QUESTION_TYPES = [
        ("general", "General"),
        ("coding", "Coding"),
        ("math", "Math"),
        ("creative", "Creative"),
        ("summarize", "Summarize"),
        ("translate", "Translate"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="question_logs",
        null=True,
        blank=True,
    )
    provider = models.CharField(max_length=40)
    model = models.CharField(max_length=120)
    question_type = models.CharField(max_length=40, choices=QUESTION_TYPES, default="general")
    offline_mode = models.BooleanField(default=False)
    question = models.TextField()
    answer = models.TextField(blank=True)
    error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.provider}:{self.model} - {self.question[:50]}"
