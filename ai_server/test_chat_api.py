import requests
import json
import sys
import time
import os

# ── CONFIGURATION ─────────────────────────────────────────────────────────────
API_URL = "http://localhost:8001/v1/chat/completions"
# Using the model configured in your .env
MODEL_NAME = "Qwen3.5-35B-A3B-UD-IQ3_S.gguf" 

# ANSI Colors for terminal
GREEN = "\033[92m"
BLUE = "\033[94m"
CYAN = "\033[96m"
YELLOW = "\033[93m"
RESET = "\033[0m"
BOLD = "\033[1m"

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def print_header():
    clear_screen()
    print(f"{BOLD}{CYAN}══════════════════════════════════════════════════════════════════{RESET}")
    print(f"{BOLD}{CYAN}  🤖  AI Chat Client  (Streaming & Memory){RESET}")
    print(f"{CYAN}      Model: {MODEL_NAME}{RESET}")
    print(f"{CYAN}      Server: {API_URL}{RESET}")
    print(f"{BOLD}{CYAN}══════════════════════════════════════════════════════════════════{RESET}\n")

def chat_session():
    # 1. Initialize Conversation History
    messages = [
        {"role": "system", "content": "You are a helpful, intelligent AI assistant. Be concise and accurate."}
    ]

    print_header()
    print(f"{YELLOW}Type 'exit', 'quit', or 'clear' to manage the chat.\n{RESET}")

    while True:
        try:
            # 2. Get User Input
            user_input = input(f"{BOLD}{GREEN}You:{RESET} ").strip()
            
            if not user_input:
                continue
                
            if user_input.lower() in ('exit', 'quit'):
                print(f"\n{YELLOW}👋 Goodbye!{RESET}")
                break
                
            if user_input.lower() == 'clear':
                messages = [messages[0]] # Keep system prompt only
                print_header()
                print(f"{YELLOW}🧹 History cleared.{RESET}\n")
                continue

            # Add user message to history
            messages.append({"role": "user", "content": user_input})

            # 3. Prepare Request
            payload = {
                "model": MODEL_NAME,
                "messages": messages,
                "stream": True,
                "max_tokens": 4096,
                "temperature": 0.7,
                "top_p": 0.95
            }

            print(f"{BOLD}{BLUE}AI:{RESET} ", end="", flush=True)

            # 4. Stream Response
            full_response = ""
            start_time = time.time()
            first_token_time = None
            token_count = 0

            try:
                with requests.post(API_URL, json=payload, stream=True) as response:
                    if response.status_code != 200:
                        print(f"\n{BOLD}❌ Error {response.status_code}:{RESET} {response.text}")
                        continue

                    for line in response.iter_lines():
                        if not line: continue
                        
                        decoded = line.decode('utf-8')
                        if decoded.startswith("data: "):
                            data_str = decoded[6:]
                            
                            if data_str.strip() == "[DONE]":
                                break
                                
                            try:
                                data = json.loads(data_str)
                                chunk = data['choices'][0]['delta']
                                
                                if "content" in chunk:
                                    content = chunk['content']
                                    
                                    # Timing stats
                                    if first_token_time is None:
                                        first_token_time = time.time()
                                    
                                    print(content, end="", flush=True)
                                    full_response += content
                                    token_count += 1
                                    
                            except json.JSONDecodeError:
                                pass

            except requests.exceptions.ConnectionError:
                print(f"\n{BOLD}❌ Connection Error:{RESET} Is the server running on port 8001?")
                break

            # 5. Append AI response to history
            messages.append({"role": "assistant", "content": full_response})
            
            # 6. Performance Footer
            total_time = time.time() - start_time
            ttft = (first_token_time - start_time) * 1000 if first_token_time else 0
            tps = token_count / total_time if total_time > 0 else 0
            
            print(f"\n\n{YELLOW}⚡ {tps:.1f} t/s  |  ⏱ TTFT: {ttft:.0f}ms  |  Server: Check terminal for VRAM/Layer info{RESET}")
            print(f"{CYAN}──────────────────────────────────────────────────────────────────{RESET}\n")

        except KeyboardInterrupt:
            print(f"\n\n{YELLOW}👋 Interrupted.{RESET}")
            break

if __name__ == "__main__":
    chat_session()