import os
import random
import string
import time
import requests
from concurrent.futures import ThreadPoolExecutor
from faker import Faker
from colorama import Fore, Style, init
from pystyle import Colors, Colorate, Center, Write

# Initialize colorama for cross-platform support
init(autoreset=True)

# Configuration
BASE_URL = "https://teamer1.replit.app"
REGISTER_URL = f"{BASE_URL}/api/auth/register"
INVITE_URL = f"{BASE_URL}/api/invite"

fake = Faker()

BANNER = """
 ████████╗███████╗ █████╗ ███╗   ███╗███████╗██████╗ 
 ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██╔════╝██╔══██╗
    ██║   █████╗  ███████║██╔████╔██║█████╗  ██████╔╝
    ██║   ██╔══╝  ██╔══██║██║╚██╔╝██║██╔══╝  ██╔══██╗
    ██║   ███████╗██║  ██║██║ ╚═╝ ██║███████╗██║  ██║
    ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝
           A C C O U N T   G E N E R A T O R
            Created by Antigravity (Gemini)
"""

def get_random_string(length):
    letters = string.ascii_letters + string.digits
    return ''.join(random.choice(letters) for i in range(length))

class TeamerGenerator:
    def __init__(self, invite_code):
        self.invite_code = invite_code
        self.success_count = 0
        self.fail_count = 0

    def create_account(self):
        try:
            # Generate random 50-letter string for email prefix
            email_prefix = get_random_string(50)
            email = f"{email_prefix}@teamer.bot"
            username = fake.user_name()[:32]
            if len(username) < 3: username += "bot"
            display_name = fake.name()
            password = get_random_string(12)

            # 1. Register
            payload = {
                "email": email,
                "username": username,
                "displayName": display_name,
                "password": password
            }

            resp = requests.post(REGISTER_URL, json=payload, timeout=10)
            if resp.status_code != 201:
                print(f"{Fore.RED}[ERROR] Registration failed for {username}: {resp.text}")
                self.fail_count += 1
                return

            data = resp.json()
            token = data.get("accessToken")
            if not token:
                print(f"{Fore.RED}[ERROR] No token received for {username}")
                self.fail_count += 1
                return

            # 2. Join Server
            join_url = f"{INVITE_URL}/{self.invite_code}"
            headers = {"Authorization": f"Bearer {token}"}
            
            join_resp = requests.post(join_url, headers=headers, timeout=10)
            if join_resp.status_code == 200:
                print(f"{Fore.GREEN}[SUCCESS] Created & Joined: {Fore.CYAN}{username} {Fore.WHITE}| {Fore.YELLOW}{email}")
                self.success_count += 1
                # Save to file
                with open("accounts.txt", "a") as f:
                    f.write(f"{email}:{password}:{token}\n")
            else:
                print(f"{Fore.YELLOW}[WARNING] Created {username} but failed to join: {join_resp.text}")
                self.success_count += 1 # Account was created though
                # Still save the account even if join failed
                with open("accounts.txt", "a") as f:
                    f.write(f"{email}:{password}:{token}\n")
        except Exception as e:
            print(f"{Fore.RED}[CRITICAL] Thread error: {str(e)}")
            self.fail_count += 1

def main():
    os.system('cls' if os.name == 'nt' else 'clear')
    print(Colorate.Vertical(Colors.blue_to_purple, Center.XCenter(BANNER)))
    
    # User Inputs
    while True:
        try:
            count = int(Write.Input("\n[?] How many accounts do you want to generate? -> ", Colors.blue_to_purple, interval=0.005))
            break
        except ValueError:
            print(f"{Fore.RED}Please enter a valid number.")

    invite_code = Write.Input("[?] Enter Server Invite Code -> ", Colors.blue_to_purple, interval=0.005)
    
    threads = 10
    try:
        thread_input = Write.Input("[?] Threads (Enter for 10) -> ", Colors.blue_to_purple, interval=0.005)
        if thread_input.strip():
            threads = int(thread_input)
    except ValueError:
        pass

    print(f"\n{Fore.MAGENTA}--- Starting Generation ({count} accounts, {threads} threads) ---\n")
    
    generator = TeamerGenerator(invite_code)
    
    with ThreadPoolExecutor(max_workers=threads) as executor:
        for _ in range(count):
            executor.submit(generator.create_account)

    print(f"\n{Fore.MAGENTA}{'='*50}")
    print(f"{Fore.GREEN}Finished! Successfully generated/joined: {generator.success_count}")
    print(f"{Fore.RED}Failed: {generator.fail_count}")
    print(f"{Fore.MAGENTA}{'='*50}")
    input(f"\n{Fore.WHITE}Press Enter to exit...")

if __name__ == "__main__":
    main()
