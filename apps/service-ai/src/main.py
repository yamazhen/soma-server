import logging
import os
from contextlib import asynccontextmanager

import uvicorn
from ai.contentGenerator import get_model
from ai.geminiContentGenerator import (FileProcessingError,
                                       UnsupportedFileTypeError,
                                       generateContent, generateDeck,
                                       generateNoteFromFile, generateQuiz)
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from middleware.gatewayMiddleware import verify_gateway_key
from model.RequestTypes import GenerateFromNote, PromptRequest
from model.ResponseTypes import DeckResponse, NoteResponse, QuizResponse
from utils.uptime import format_uptime, get_uptime_seconds

NODE_ENV = os.environ.get("NODE_ENV")

logger = logging.getLogger(__name__)
model_available = False

@asynccontextmanager
async def lifespan(_):
    global model_available

    try:
        get_model()
        model_available = True
    except Exception as e:
        logger.error(f"Failed to load AI model: {e}")
        model_available = False

    yield

    logger.info("Shutting down AI model...")

app = FastAPI(dependencies=[Depends(verify_gateway_key)], lifespan=lifespan)

@app.get("/api/health")
def healthCheck():
    uptime = format_uptime(get_uptime_seconds())
    return {"status": "healthy", "service": "service-ai", "uptime": uptime }

# endpoint for gemini
@app.post("/api/v1/prompt")
def prompt(request: PromptRequest):
    res = generateContent(request.prompt)
    return res

@app.post("/api/v1/notes/generate-quiz")
def generateQuizFromNote(request: GenerateFromNote) -> QuizResponse:
    quiz = generateQuiz(request.note_content, request.generated_num)
    return QuizResponse(quiz=quiz)

@app.post("/api/v1/notes/generate-deck")
def generateDeckFromNote(request: GenerateFromNote) -> DeckResponse:
    deck = generateDeck(request.note_content, request.generated_num)
    return DeckResponse(deck=deck)

@app.post("/api/v1/notes/upload")
async def generateNoteFromUpload(file: UploadFile = File(...)):
    try:
        note = await generateNoteFromFile(file)
        return NoteResponse(note=note)
    except UnsupportedFileTypeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileProcessingError as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

# endpoint for Llama model
@app.post("/api/v2/prompt")
def promptLlama(request: PromptRequest):
    try:
        if not model_available:
            raise HTTPException(status_code=503, detail="AI model is not available")

        model = get_model()
        response = model.generate(request.prompt)

        return {"response": response}
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.environ.get("SERVICE_AI_PORT", 3002))
    host = os.environ.get("SERVICE_AI_URL", "0.0.0.0")
    is_dev = NODE_ENV == "development"

    if is_dev:
        uvicorn.run("main:app", host=host, port=port, reload=True)
    else:
        uvicorn.run(app, host=host, port=port)

