import os
import time
import requests
from concurrent.futures import ThreadPoolExecutor
from colorama import Fore, Style, init
from pystyle import Colors, Colorate, Center, Write

init(autoreset=True)

BASE_URL = "https://teamer1.replit.app"

BANNER = """
 ███╗   ███╗███████╗███████╗███████╗ █████╗  ██████╗ ███████╗
 ████╗ ████║██╔════╝██╔════╝██╔════╝██╔══██╗██╔════╝ ██╔════╝
 ██╔████╔██║█████╗  ███████╗███████╗███████║██║  ███╗█████╗  
 ██║╚██╔╝██║██╔══╝  ╚════██║╚════██║██╔══██║██║   ██║██╔══╝  
 ██║ ╚═╝ ██║███████╗███████║███████║██║  ██║╚██████╔╝███████╗
 ╚═╝     ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝
           M E S S A G E   B R O A D C A S T E R
"""

def post_message(account_data, channel_id, content):
    try:
        email, password, token = account_data.split(":")
        url = f"{BASE_URL}/api/channels/{channel_id}/messages"
        headers = {"Authorization": f"Bearer {token.strip()}"}
        payload = {"content": content}

        resp = requests.post(url, json=payload, headers=headers, timeout=10)
        if resp.status_code == 201:
            print(f"{Fore.GREEN}[SUCCESS] Message sent from {Fore.CYAN}{email}")
        else:
            print(f"{Fore.RED}[ERROR] Failed to send from {email}: {resp.text}")
    except Exception as e:
        print(f"{Fore.RED}[CRITICAL] Error with account: {str(e)}")

def main():
    os.system('cls' if os.name == 'nt' else 'clear')
    print(Colorate.Vertical(Colors.blue_to_purple, Center.XCenter(BANNER)))

    if not os.path.exists("accounts.txt"):
        print(f"{Fore.RED}Error: accounts.txt not found. Please run the generator first.")
        input("\nPress Enter to exit...")
        return

    channel_id = Write.Input("\n[?] Enter Target Channel ID -> ", Colors.blue_to_purple, interval=0.005)
    message_content = Write.Input("[?] Enter Message Content -> ", Colors.blue_to_purple, interval=0.005)
    
    threads = 10
    try:
        thread_input = Write.Input("[?] Threads (Enter for 10) -> ", Colors.blue_to_purple, interval=0.005)
        if thread_input.strip():
            threads = int(thread_input)
    except ValueError:
        pass

    with open("accounts.txt", "r") as f:
        accounts = f.readlines()

    print(f"\n{Fore.MAGENTA}--- Broadcasting to {len(accounts)} accounts ---\n")

    with ThreadPoolExecutor(max_workers=threads) as executor:
        for acc in accounts:
            if acc.strip():
                executor.submit(post_message, acc, channel_id, message_content)

    print(f"\n{Fore.GREEN}Finished broadcasting!")
    input("\nPress Enter to exit...")

if __name__ == "__main__":
    main()
