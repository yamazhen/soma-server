from model.DeckTypes import Deck
from model.NoteTypes import MarkdownNote
from model.QuizTypes import Quiz
from pydantic import BaseModel


class QuizResponse(BaseModel):
    quiz: Quiz

class DeckResponse(BaseModel):
    deck: Deck

class NoteResponse(BaseModel):
    note: MarkdownNote
