from rest_framework import serializers


class AskSerializer(serializers.Serializer):
    question = serializers.CharField()
    provider = serializers.CharField(required=False, allow_blank=True, default="")
    model = serializers.CharField(required=False, allow_blank=True, default="")
    question_type = serializers.ChoiceField(
        choices=["general", "coding", "math", "creative", "summarize", "translate"],
        default="general",
    )
    offline_mode = serializers.BooleanField(default=False)
