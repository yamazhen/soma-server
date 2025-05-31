from pydantic import BaseModel
from model.QuizTypes import Quiz


class QuizResponse(BaseModel):
    quiz: Quiz
