from typing import List
from pydantic import BaseModel


class Card(BaseModel):
    front: str
    back: str

class Deck(BaseModel):
    title: str
    cards: List[Card]
