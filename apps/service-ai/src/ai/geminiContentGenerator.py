import io
import os
from typing import Any

import pypdf
from fastapi import File, UploadFile
from google import genai
from model.DeckTypes import Deck
from model.NoteTypes import MarkdownNote
from model.QuizTypes import Quiz
from PIL import Image

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY)

class UnsupportedFileTypeError(Exception):
    pass

class FileProcessingError(Exception):
    pass

def generateContent(prompt: str):
    return client.models.generate_content(model="gemini-1.5-flash", contents=prompt).text

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
        model="gemini-1.5-flash",
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
        model="gemini-1.5-flash",
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": Deck,
        }
    )
    parsed: Any = response.parsed
    deck = Deck.model_validate(parsed)
    return deck

async def generateNoteFromFile(file: UploadFile = File(...)):
    base_prompt = "Convert the following content into well-structured markdown notes. Use appropriate headers, bullet points, and formatting to make it easy to read and study."
    if file.content_type == "application/pdf":
        pdf_content = await file.read()
        pdf_reader = pypdf.PdfReader(io.BytesIO(pdf_content))
        text_content = "".join(page.extract_text() for page in pdf_reader.pages)

        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=[base_prompt, text_content],
            config={
                "response_mime_type": "application/json",
                "response_schema": MarkdownNote,
            }
        )

    elif file.content_type and file.content_type.startswith("image/"):
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        response = client.models.generate_content(
                model="gemini-1.5-flash",
                contents=[base_prompt, image],
                config={
                "response_mime_type": "application/json",
                "response_schema": MarkdownNote,
            }
            )
    else:
        raise UnsupportedFileTypeError(f"Unsupported file type: {file.content_type}")

    parsed: Any = response.parsed
    note = MarkdownNote.model_validate(parsed)
    return note

