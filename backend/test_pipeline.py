import requests
import json
import sys
import time

# Configuration
BASE_URL = "http://127.0.0.1:8000/api/v1/translate"
# Replace this with a valid JWT token from your frontend login
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MDcyZjEyZS00OGMzLTRjZTEtYjc0NC00NzkxZjA0NGQzOTQiLCJleHAiOjE3NzI0MjQyNDAsInR5cGUiOiJhY2Nlc3MifQ.0whm6Tngus0AETFKNW6ocfxN2ZK-ifw-QkMwuLQUZVI" 
TEST_IMAGE_PATH = "test_page.jpg"

def run_test():
    headers = {"Authorization": f"Bearer {TOKEN}"}

    print("--- Starting Pipeline Test ---")
    print(f"1. Uploading {TEST_IMAGE_PATH}...")

    try:
        with open(TEST_IMAGE_PATH, "rb") as f:
            files = {"file": (TEST_IMAGE_PATH, f, "image/jpeg")}
            data = {"engine": "pipeline", "source_language": "ja", "target_language": "en"}
            upload_resp = requests.post(
                f"{BASE_URL}/upload", 
                headers=headers, 
                files=files, 
                data=data
            )
    except FileNotFoundError:
        print("Error: Please put a 'test_page.jpg' file in this directory.")
        return

    if upload_resp.status_code != 202:
        print(f"Upload failed. Status code: {upload_resp.status_code}")
        print(upload_resp.text)
        return

    job_data = upload_resp.json()
    job_id = job_data["id"]
    print(f"Success. Job ID: {job_id}")

    print("\n2. Connecting to SSE Stream...")
    # Assuming a single image upload, the page number is 1
    page_number = 1
    stream_url = f"{BASE_URL}/jobs/{job_id}/pages/{page_number}/pipeline-progress"

    # We use stream=True to keep the connection open and read chunks as they arrive
    with requests.get(stream_url, headers=headers, stream=True) as stream_resp:
        if stream_resp.status_code != 200:
            print(f"Stream connection failed. Status code: {stream_resp.status_code}")
            print(stream_resp.text)
            return

        print("Connected. Waiting for AI server processing", end="")
        
        for line in stream_resp.iter_lines():
            if not line:
                continue

            decoded = line.decode("utf-8")
            if decoded.startswith("data: "):
                payload_str = decoded.replace("data: ", "")
                
                try:
                    event = json.loads(payload_str)

                    # Handle the empty waiting pings
                    if event.get("waiting"):
                        sys.stdout.write(".")
                        sys.stdout.flush()
                        continue

                    # Print the phase update
                    stage = event.get('stage')
                    name = event.get('name')
                    status = event.get('status')
                    print(f"\n[Stage {stage}] {name} - Status: {status}")

                    # Handle errors
                    if status == "failed":
                        print(f"\nPIPELINE ERROR: {event.get('error')}")
                        break

                    # Handle completion
                    if stage == 6 and status == "done":
                        print("\n--- Pipeline Complete ---")
                        regions = event.get("regions", [])
                        print(f"Total Regions Detected: {len(regions)}")
                        
                        # Print the first couple of regions to verify the translation worked
                        for r in regions[:3]: 
                            print(f"  Box: {r.get('bbox')}")
                            print(f"  JP:  {r.get('japanese')}")
                            print(f"  EN:  {r.get('english')}\n")
                            
                        if len(regions) > 3:
                            print(f"  ... and {len(regions) - 3} more regions.")
                        break

                except json.JSONDecodeError:
                    print(f"\nUnparseable SSE chunk: {payload_str}")

if __name__ == "__main__":
    run_test()