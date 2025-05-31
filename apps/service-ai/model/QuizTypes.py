
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel

class QuestionType(str, Enum):
    MULTIPLE_CHOICE = "multiple-choice"
    TRUE_FALSE = "true-false"
    TEXT_ANSWER = "text-answer"

class Option(BaseModel):
    text: str
    is_correct: bool

class Question(BaseModel):
    text: str
    type: QuestionType
    boolean_answer: Optional[bool] = None
    options: List[Option] = []
    answer: List[str] = []

class Quiz(BaseModel):
    title: str
    questions: List[Question]

