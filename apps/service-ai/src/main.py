import asyncio
import logging
import os
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager

import uvicorn
from ai.contentGenerator import get_model, generate_deck_llama, generate_quiz_llama
from ai.geminiContentGenerator import (
    FileProcessingError,
    UnsupportedFileTypeError,
    generateContent,
    generateDeck,
    generateNoteFromFile,
    generateQuiz,
)
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from middleware.gatewayMiddleware import verify_gateway_key
from model.RequestTypes import GenerateFromNote, PromptRequest
from model.ResponseTypes import DeckResponse, NoteResponse, QuizResponse
from utils.uptime import format_uptime, get_uptime_seconds

NODE_ENV = os.environ.get("NODE_ENV")

logger = logging.getLogger(__name__)
model_available = False
executor = ThreadPoolExecutor(max_workers=2)


@asynccontextmanager
async def lifespan(_):
    global model_available

    # Disabled local Llama model for weak VPS - using Gemini fallback instead
    # try:
    #     get_model()
    #     model_available = True
    # except Exception as e:
    #     logger.error(f"Failed to load AI model: {e}")
    #     model_available = False

    logger.info("Local Llama model disabled - using Gemini API only")
    model_available = False

    yield

    logger.info("Shutting down AI model...")


app = FastAPI(dependencies=[Depends(verify_gateway_key)], lifespan=lifespan)


@app.get("/api/health")
def healthCheck():
    uptime = format_uptime(get_uptime_seconds())
    return {"status": "healthy", "service": "service-ai", "uptime": uptime}


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


# endpoint for Llama model - DISABLED for weak VPS
# @app.post("/api/v2/prompt")
# async def promptLlama(request: PromptRequest):
#     try:
#         if not model_available:
#             raise HTTPException(status_code=503, detail="AI model is not available")

#         try:
#             loop = asyncio.get_event_loop()
#             custom_response = await asyncio.wait_for(
#                 loop.run_in_executor(
#                     executor, lambda: get_model().generate(request.prompt)
#                 ),
#                 timeout=10.0,
#             )
#             return {"response": custom_response, "model_used": "custom"}

#         except asyncio.TimeoutError:
#             logger.warning("Custom model timed out, falling back to Gemini")
#             return {"response": generateContent(request.prompt), "model_used": "gemini"}

#         except Exception as e:
#             logger.error(f"Custom model error: {e}, falling back to Gemini")
#             return {"response": generateContent(request.prompt), "model_used": "gemini"}
#     except Exception as e:
#         logger.error(f"Both models failed: {e}")
#         raise HTTPException(status_code=500, detail=str(e))

# @app.post("/api/v2/notes/generate-quiz")
# async def generateQuizFromNoteLlama(request: GenerateFromNote) -> QuizResponse:
#     try:
#         if not model_available:
#             quiz = generateQuiz(request.note_content, request.generated_num)
#             return QuizResponse(quiz=quiz)

#         try:
#             loop = asyncio.get_event_loop()
#             custom_quiz = await asyncio.wait_for(
#                 loop.run_in_executor(
#                     executor, lambda: generate_quiz_llama(request.note_content, request.generated_num)
#                 ),
#                 timeout=10.0,
#             )
#             return QuizResponse(quiz=custom_quiz)
#         except asyncio.TimeoutError:
#             quiz = generateQuiz(request.note_content, request.generated_num)
#             return QuizResponse(quiz=quiz)
#         except Exception as e:
#             quiz = generateQuiz(request.note_content, request.generated_num)
#             return QuizResponse(quiz=quiz)
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# @app.post("/api/v2/notes/generate-deck")
# async def generateDeckFromNoteLlama(request: GenerateFromNote) -> DeckResponse:
#     try:
#         if not model_available:
#             deck = generateDeck(request.note_content, request.generated_num)
#             return DeckResponse(deck=deck)

#         try:
#             loop = asyncio.get_event_loop()
#             custom_deck = await asyncio.wait_for(
#                 loop.run_in_executor(
#                     executor, lambda: generate_deck_llama(request.note_content, request.generated_num)
#                 ),
#                 timeout=10.0,
#             )
#             return DeckResponse(deck=custom_deck)
#         except asyncio.TimeoutError:
#             deck = generateDeck(request.note_content, request.generated_num)
#             return DeckResponse(deck=deck)
#         except Exception as e:
#             deck = generateDeck(request.note_content, request.generated_num)
#             return DeckResponse(deck=deck)
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.environ.get("SERVICE_AI_PORT", 3002))
    host = os.environ.get("SERVICE_AI_URL", "0.0.0.0")
    is_dev = NODE_ENV == "development"

    if is_dev:
        uvicorn.run("main:app", host=host, port=port, reload=True)
    else:
        uvicorn.run(app, host=host, port=port)
