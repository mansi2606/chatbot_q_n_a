
## Directory Structure

# ├── main.py
# |__ __init__.py                     # FastAPI app entry
# ├── routes/
# │   └── ask.py                  # Ask endpoint
# ├── services/
# │   ├── gpt.py                  # GPT streaming logic
# │   └── tts.py                  # ElevenLabs streaming logic
# ├── utils/
# │   └── vectorstore.py          # Vector DB setup and loading
# └── .env                        # API keys and configs

### main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# from routes.ask import router as ask_router
from utils.vectorstore import load_vectorstore
from contextlib import asynccontextmanager
from routes.ask import router as ask_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_vectorstore()
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ask_router)