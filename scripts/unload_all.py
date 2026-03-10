import requests
import sys

AI_SERVER_URL = "http://localhost:8001"

def unload_all_models():
    print(f"Connecting to AI Server at {AI_SERVER_URL}...")
    try:
        # First check health to see what's loaded
        health_resp = requests.get(f"{AI_SERVER_URL}/v1/health")
        if health_resp.status_code != 200:
            print(f"Failed to reach AI server: {health_resp.status_code}")
            sys.exit(1)
            
        health = health_resp.json()
        model_name = health.get("model_name")
        is_loaded = health.get("model_loaded", False)
        
        if not is_loaded or not model_name:
            print("No models are currently loaded in the text slot.")
        else:
            print(f"Found loaded text model: {model_name}. Unloading...")
            unload_resp = requests.post(f"{AI_SERVER_URL}/v1/models/{model_name}/unload")
            if unload_resp.status_code == 200:
                print(f"Successfully unloaded {model_name}")
            else:
                print(f"Failed to unload {model_name}: {unload_resp.text}")
                
        # Get all models to see if there's a vision model loaded
        models_resp = requests.get(f"{AI_SERVER_URL}/v1/models")
        if models_resp.status_code == 200:
            for m in models_resp.json().get("data", []):
                if m.get("is_loaded") and m.get("id") != model_name:
                    print(f"Found loaded model: {m.get('id')}. Unloading...")
                    u_resp = requests.post(f"{AI_SERVER_URL}/v1/models/{m.get('id')}/unload")
                    if u_resp.status_code == 200:
                        print(f"Successfully unloaded {m.get('id')}")
                    else:
                        print(f"Failed to unload {m.get('id')}: {u_resp.text}")
                        
        print("\nFinal Health Status:")
        final_health = requests.get(f"{AI_SERVER_URL}/v1/health").json()
        print(f"Model Loaded: {final_health.get('model_loaded')}")
        print(f"VRAM Usage: {final_health.get('vram_usage_mb')} MB")
        
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to AI Server. Is it running?")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    unload_all_models()
