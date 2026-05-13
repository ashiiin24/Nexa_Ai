QUESTION_TYPE_PROMPTS = {
    "general": "Answer clearly and practically.",
    "coding": "Answer as a senior software engineer. Include runnable code when useful.",
    "math": "Solve step by step and show the final answer clearly.",
    "creative": "Be imaginative, polished, and vivid.",
    "summarize": "Summarize the user's text into concise bullet points.",
    "translate": "Translate or explain the requested text while preserving meaning.",
}


def build_system_prompt(question_type):
    guide = QUESTION_TYPE_PROMPTS.get(question_type, QUESTION_TYPE_PROMPTS["general"])
    return (
        "You are a helpful multilingual assistant. "
        "If the user writes Malayalam or Manglish, reply naturally in the same style. "
        f"Task mode: {guide}"
    )
