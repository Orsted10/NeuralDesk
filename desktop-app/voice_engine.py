import asyncio
import websockets
import speech_recognition as sr
import json
import threading
import sys

# Global set of connected websocket clients
clients = set()
main_loop = None

async def register(websocket):
    clients.add(websocket)
    try:
        await websocket.wait_closed()
    finally:
        clients.remove(websocket)

async def notify_clients(message):
    if clients:
        await asyncio.gather(*(client.send(json.dumps(message)) for client in clients))

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
    r.pause_threshold = 2.0 # Wait 2 seconds of silence before cutting off

    with sr.Microphone() as source:
        print("Adjusting for ambient noise... Please wait.")
        r.adjust_for_ambient_noise(source, duration=1)
        print("Listening started.")
        
        # This will run in a background thread and automatically handle speech/silence detection
        while True:
            try:
                audio = r.listen(source, timeout=None, phrase_time_limit=None)
                # Process in a separate thread so we don't block listening
                threading.Thread(target=process_audio, args=(r, audio)).start()
            except Exception as e:
                print(f"Listen error: {e}")

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
