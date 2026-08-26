import os
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
        if not os.path.exists(audio_file_path) or os.path.getsize(audio_file_path) < 100:
            return ""
        model = get_whisper_model()
        segments, info = model.transcribe(
            audio_file_path,
            beam_size=3,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500),
            language="en"
        )
        text = " ".join([segment.text.strip() for segment in segments if segment.text])
        return text.strip()
    except Exception as e:
        print(f"Transcription error: {e}")
        try:
            # Fallback without language/vad if error occurred
            model = get_whisper_model()
            segments, info = model.transcribe(audio_file_path, beam_size=1)
            text = " ".join([segment.text.strip() for segment in segments if segment.text])
            return text.strip()
        except Exception as e2:
            print(f"Fallback transcription error: {e2}")
            return ""
