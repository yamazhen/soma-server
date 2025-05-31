import os
from fastapi import Depends, FastAPI
import uvicorn
from middleware.gatewayMiddleware import verify_gateway_key
from utils.uptime import get_uptime_seconds, format_uptime
from model.RequestTypes import PromptRequest, GenerateFromNote
from model.ResponseTypes import QuizResponse
from ai.contentGenerator import generateContent, generateQuiz

NODE_ENV = os.environ.get("NODE_ENV")


app = FastAPI()


@app.get("/api/health")
def healthCheck():
    uptime = format_uptime(get_uptime_seconds())
    return {"status": "healthy", "service": "service-ai", "uptime": uptime }

@app.post("/api/v1/prompt")
def prompt(request: PromptRequest):
    res = generateContent(request.prompt)
    return res

@app.post("/api/v1/generate-from-note/quiz")
def generateQuizFromNote(request: GenerateFromNote) -> QuizResponse:
    quiz = generateQuiz(request.note_content, request.generated_num)
    return QuizResponse(quiz=quiz)

if __name__ == "__main__":
    port = int(os.environ.get("SERVICE_AI_PORT", 3002))
    host = os.environ.get("SERVICE_AI_URL", "localhost")
    is_dev = NODE_ENV == "development"

    if is_dev:
        uvicorn.run("main:app", host=host, port=port, reload=True)
    else:
        uvicorn.run(app, host=host, port=port)

