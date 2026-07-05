import asyncio
import websockets
import speech_recognition as sr
import json
import threading
import sys
import os
import urllib.request
import time

try:
    import numpy as np
    import sounddevice as sd
    from kokoro_onnx import Kokoro
except ImportError:
    Kokoro = None

MODEL_DIR = os.path.expanduser("~/.jarvis_models")
ONNX_URL = "https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/kokoro-v0_19.onnx"
VOICES_URL = "https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/voices.json"

kokoro_model = None
is_speaking = False

def download_file(url, dest):
    filename = os.path.basename(dest)
    print(f"Downloading {filename}... (Offline Model)")
    
    def reporthook(blocknum, blocksize, totalsize):
        if totalsize > 0 and main_loop:
            percent = (blocknum * blocksize * 100) / totalsize
            if percent > 100: percent = 100
            if not hasattr(reporthook, "last_percent") or (percent - reporthook.last_percent) >= 2 or percent == 100:
                reporthook.last_percent = percent
                try:
                    asyncio.run_coroutine_threadsafe(
                        notify_clients({"type": "download_progress", "filename": filename, "percent": int(percent)}),
                        main_loop
                    )
                except Exception:
                    pass

    urllib.request.urlretrieve(url, dest, reporthook=reporthook)
    if main_loop:
        try:
            asyncio.run_coroutine_threadsafe(
                notify_clients({"type": "download_complete", "filename": filename}),
                main_loop
            )
        except Exception:
            pass
    print(f"Downloaded {filename}!")

def init_tts():
    global kokoro_model
    if not Kokoro:
        print("Kokoro-ONNX is not installed. Local TTS disabled.")
        return
    
    if not os.path.exists(MODEL_DIR):
        os.makedirs(MODEL_DIR)
        
    onnx_path = os.path.join(MODEL_DIR, "kokoro-v0_19.onnx")
    voices_path = os.path.join(MODEL_DIR, "voices.json")
    
    if not os.path.exists(onnx_path):
        download_file(ONNX_URL, onnx_path)
    if not os.path.exists(voices_path):
        download_file(VOICES_URL, voices_path)
        
    print("Loading Local Kokoro TTS Engine into memory...")
    try:
        kokoro_model = Kokoro(onnx_path, voices_path)
        print("Kokoro TTS Ready!")
    except Exception as e:
        print(f"Failed to load Kokoro model: {e}")

threading.Thread(target=init_tts, daemon=True).start()

# Global set of connected websocket clients
clients = set()
main_loop = None

async def register(websocket):
    clients.add(websocket)
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                if data.get("type") == "speak":
                    text = data.get("text", "")
                    if text:
                        asyncio.create_task(speak_text(text))
            except Exception as e:
                print(f"WS error: {e}")
    finally:
        clients.remove(websocket)

async def notify_clients(message):
    if clients:
        await asyncio.gather(*(client.send(json.dumps(message)) for client in clients))

async def speak_text(text):
    global kokoro_model, is_speaking
    if not kokoro_model:
        # If model is still downloading, notify UI immediately to not freeze
        await notify_clients({"type": "speech_started"})
        await asyncio.sleep(0.1)
        await notify_clients({"type": "speech_ended"})
        return
        
    if is_speaking:
        return
        
    is_speaking = True
    await notify_clients({"type": "speech_started"})
    try:
        loop = asyncio.get_running_loop()
        def _synth_and_play():
            try:
                samples, sample_rate = kokoro_model.create(text, voice="af_sarah", speed=1.0, lang="en-us")
                sd.play(samples, sample_rate)
                sd.wait()
            except Exception as e:
                print(f"Playback error: {e}")
                
        await loop.run_in_executor(None, _synth_and_play)
    finally:
        is_speaking = False
        await notify_clients({"type": "speech_ended"})

def process_audio(recognizer, audio):
    try:
        text = recognizer.recognize_google(audio)
        text = text.lower().strip()
        print(f"Heard: {text}")
        
        # Just send everything to the UI. The UI will decide if it's a wake word
        # or a manual dictation based on its current state.
        asyncio.run_coroutine_threadsafe(
            notify_clients({"type": "transcript", "text": text}),
            main_loop
        )

    except sr.UnknownValueError:
        pass # Unrecognized speech
    except sr.RequestError as e:
        print(f"Could not request results; {e}")

def listen_loop():
    r = sr.Recognizer()
    r.energy_threshold = 300 # Dynamic energy threshold
    r.dynamic_energy_threshold = True
    r.pause_threshold = 0.6 # Wait 0.6 seconds of silence before cutting off (faster response)

    while True:
        try:
            with sr.Microphone() as source:
                print("Adjusting for ambient noise... Please wait.")
                r.adjust_for_ambient_noise(source, duration=0.5)
                print("Listening started.")
                
                # This will run in a background thread and automatically handle speech/silence detection
                while True:
                    try:
                        audio = r.listen(source, timeout=None, phrase_time_limit=None)
                        if not is_speaking: # Don't transcribe JARVIS's own voice
                            threading.Thread(target=process_audio, args=(r, audio)).start()
                    except Exception as e:
                        print(f"Listen error: {e}")
                        # Break inner loop to recreate microphone
                        break
        except Exception as outer_e:
            print(f"Microphone init error: {outer_e}")
            
        # Wait a bit before trying to reconnect the microphone
        import time
        time.sleep(2)
async def main():
    global main_loop
    main_loop = asyncio.get_running_loop()

    # Start the speech recognition loop in a separate thread
    listener_thread = threading.Thread(target=listen_loop, daemon=True)
    listener_thread.start()

    # Start the WebSocket server
    async with websockets.serve(register, "localhost", 8765):
        print("WebSocket server running on ws://localhost:8765")
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    # Windows asyncio fix
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Exiting...")
