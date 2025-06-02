from pydantic import BaseModel
from model.QuizTypes import Quiz
from model.DeckTypes import Deck


class QuizResponse(BaseModel):
    quiz: Quiz

class DeckResponse(BaseModel):
    deck: Deck
