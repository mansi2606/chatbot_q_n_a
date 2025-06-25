import asyncio
from openai import OpenAI
from services.tts import stream_tts
import os
from dotenv import load_dotenv
import logging, time
from typing import Generator
# from pydub import AudioSegment
# import simpleaudio as sa
# import io

load_dotenv()
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

PUNCTUATION = [".", "!", "?"]


def gpt_to_tts_stream(prompt: str) -> Generator[bytes, None, None]:
    buffer = ""
    sentence_endings = [".", "!", "?"]
    phrase_endings = [",", ";", ":"]
    gpt_start = time.time()

    logging.info("🧠 GPT stream started...")
    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        stream=True,
        temperature=0.5,
    )

    first_gpt_token_time = None
    first_audio_chunk_time = None
    first_audio_sent = False

    def should_flush(text):
        # Prioritize full sentences, fall back to phrase or long-enough chunk
        return (
            any(text.endswith(p) for p in sentence_endings) and len(text.strip()) > 20
        ) or (
            any(text.endswith(p) for p in phrase_endings) and len(text.strip()) > 30
        ) or len(text.strip()) > 80

    for chunk in response:
        delta = chunk.choices[0].delta.content if chunk.choices[0].delta else ""
        if delta:
            if not first_gpt_token_time:
                first_gpt_token_time = time.time()
                logging.info(f"🧠 First GPT token received after {first_gpt_token_time - gpt_start:.2f}s")

            buffer += delta

            if should_flush(buffer):
                tts_start = time.time()
                for audio_chunk in stream_tts(buffer):
                    if not first_audio_sent:
                        first_audio_sent = True
                        first_audio_chunk_time = time.time()
                        logging.info(f"🔊 First audio chunk sent after {first_audio_chunk_time - gpt_start:.2f}s")
                    yield audio_chunk
                logging.info(f"🎤 TTS chunk time: {time.time() - tts_start:.2f}s")
                buffer = ""

    # Flush any remaining text
    if buffer.strip():
        tts_start = time.time()
        for audio_chunk in stream_tts(buffer):
            if not first_audio_sent:
                first_audio_sent = True
                first_audio_chunk_time = time.time()
                logging.info(f"🔊 First (final) audio chunk sent after {first_audio_chunk_time - gpt_start:.2f}s")
            yield audio_chunk
        logging.info(f"🎤 Final TTS chunk time: {time.time() - tts_start:.2f}s")

    logging.info(f"✅ Total GPT-to-TTS stream time: {time.time() - gpt_start:.2f}s")


# async def gpt_to_tts_stream(prompt: str):
#     queue = asyncio.Queue()
#     loop = asyncio.get_event_loop()

#     def gpt_thread():
#         buffer = ""
#         response = openai_client.chat.completions.create(
#             model="gpt-4-turbo",
#             messages=[{"role": "user", "content": prompt}],
#             stream=True
#         )

#         for chunk in response:
#             delta = chunk.choices[0].delta.content if chunk.choices[0].delta else ""
#             if delta:
#                 buffer += delta
#                 print(f"buffer {buffer} {len(buffer.split())}")
#                 if len(buffer.split()) >= 12 or any(buffer.endswith(p) for p in PUNCTUATION):
#                     # Stream TTS for current buffer in chunks
#                     for audio_chunk in stream_tts(buffer):
#                         loop.call_soon_threadsafe(queue.put_nowait, audio_chunk)
#                     buffer = ""
#         if buffer:
#             for audio_chunk in stream_tts(buffer):
#                 loop.call_soon_threadsafe(queue.put_nowait, audio_chunk)

#         # signal end of stream
#         loop.call_soon_threadsafe(queue.put_nowait, None)

#     # run the GPT loop in background
#     loop.run_in_executor(None, gpt_thread)

#     # yield audio chunks from the queue as they come
#     while True:
#         chunk = await queue.get()
#         if chunk is None:
#             break
#         yield chunk
