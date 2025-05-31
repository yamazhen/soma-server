
from pydantic import BaseModel

class PromptRequest(BaseModel):
    prompt: str

class GenerateFromNote(BaseModel):
    note_content: str
    generated_num: int = 10
