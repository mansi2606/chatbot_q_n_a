# routes/ask.py
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.gpt import gpt_to_tts_stream
from utils.vectorstore import build_prompt, get_vectorstore
import logging, time
from datetime import datetime
import asyncio

logging.basicConfig(
    filename=f"logs/server_log_{datetime.now().strftime('%Y-%m-%d')}.log",
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

router = APIRouter()

class QuestionInput(BaseModel):
    query: str

@router.post("/ask/")
async def ask_and_stream(input: QuestionInput, request: Request):
    request_id = request.headers.get("X-Request-ID", "no-id")
    log_info = {"request_id": request_id, "question": input.query}

    try:
        step_start = time.perf_counter()
        t0 = time.perf_counter()
        vectorstore = get_vectorstore()
        top_docs = vectorstore.similarity_search(input.query, k=3)
        print(top_docs)
        t1 = time.perf_counter()
        log_info["vector_search_ms"] = round((t1 - t0) * 1000, 2)

        context = "\n\n".join([doc.page_content for doc in top_docs])
        print("context --------------", context)
        prompt = build_prompt(context, input.query)


        t2 = time.perf_counter()
        stream = gpt_to_tts_stream(prompt)  # this is async generator now
        t3 = time.perf_counter()
        log_info["stream_setup_ms"] = round((t3 - t2) * 1000, 2)
        log_info["backend_total_ms"] = round((t3 - step_start) * 1000, 2)

        logging.info(f"/ask/ profile: {log_info}")
        return StreamingResponse(stream, media_type="audio/mpeg")
    except Exception as e:
        logging.error(f"Error in /ask/ | ID: {request_id} | {str(e)}")
        raise
