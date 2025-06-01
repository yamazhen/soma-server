from pydantic import BaseModel


class MarkdownNote(BaseModel):
    title: str
    content: str
