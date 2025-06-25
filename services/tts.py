from elevenlabs.client import ElevenLabs
import os
from dotenv import load_dotenv
load_dotenv()

tts_client = ElevenLabs(api_key=os.getenv("ELEVEN_API_KEY"))

TTS_SETTINGS = {
    "stability": 0.7,
    "similarity_boost": 0.5,
    "pitch": 1.8,
    "speed": 1.15,
    "timbre": "excited",
    "emphasis": True,
    "use_speaker_boost": True
}

def stream_tts(text: str):
    audio_stream = tts_client.text_to_speech.convert_as_stream(
        text=text,
        voice_id="sXXU5CoXEMsIqocfPUh2",
        model_id="eleven_turbo_v2",
        voice_settings=TTS_SETTINGS
    )
    for chunk in audio_stream:
        if isinstance(chunk, bytes):
            yield chunk