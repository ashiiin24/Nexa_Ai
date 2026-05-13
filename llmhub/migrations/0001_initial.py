from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="QuestionLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("provider", models.CharField(max_length=40)),
                ("model", models.CharField(max_length=120)),
                (
                    "question_type",
                    models.CharField(
                        choices=[
                            ("general", "General"),
                            ("coding", "Coding"),
                            ("math", "Math"),
                            ("creative", "Creative"),
                            ("summarize", "Summarize"),
                            ("translate", "Translate"),
                        ],
                        default="general",
                        max_length=40,
                    ),
                ),
                ("offline_mode", models.BooleanField(default=False)),
                ("question", models.TextField()),
                ("answer", models.TextField(blank=True)),
                ("error", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
