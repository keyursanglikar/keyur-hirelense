content = '''import os
import threading
from faster_whisper import WhisperModel

_model = None
_model_lock = threading.Lock()

def get_whisper_model():
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                print("Loading faster-whisper 'small' model on CPU...")
                _model = WhisperModel("small", device="cpu", compute_type="int8")
    return _model

def transcribe_audio(audio_file_path):
    try:
        model = get_whisper_model()
        segments, info = model.transcribe(audio_file_path, beam_size=5)
        text = " ".join([segment.text for segment in segments])
        return text.strip()
    except Exception as e:
        print(f"Transcription error: {e}")
        return ""
'''
with open('hirelense_backend/apps/candidates/transcriber.py', 'w', encoding='utf-8') as f:
    f.write(content)
