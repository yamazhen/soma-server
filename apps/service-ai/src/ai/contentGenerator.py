from google import genai
from typing import Any
from model.QuizTypes import Quiz
from model.DeckTypes import Deck
import os

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY)

def generateContent(prompt: str):
    return client.models.generate_content(model="gemini-2.0-flash", contents=prompt).text

def generateQuiz(source: str, num_questions: int):
    prompt = f"""Analyze the following markdown note content and create a comprehensive quiz based on key concepts, facts, and information presented.
    MARKDOWN CONTENT:
    {source}

    Generate {num_questions} questions.
    for multiple-choice questions, provide 4 options in the option field.
    for true-false questions, use the boolean_answer field.
    for text-answer questions, use the answers field.
    """

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": Quiz,
        }
    )
    parsed: Any = response.parsed
    quiz = Quiz.model_validate(parsed)
    return quiz

def generateDeck(source: str, num_cards: int):
    prompt = f"""Analyze the following markdown note content and create a comprehensive flashcard set based on key concepts, facts, and information presented.
    MARKDOWN CONTENT:
    {source}

    Generate {num_cards} questions.
    Make sure they are not too long, the answer should be concise
    """

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": Deck,
        }
    )
    parsed: Any = response.parsed
    deck = Deck.model_validate(parsed)
    return deck
