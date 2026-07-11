import os
import time
import requests
from concurrent.futures import ThreadPoolExecutor
from colorama import Fore, Style, init
from pystyle import Colors, Colorate, Center, Write

init(autoreset=True)

BASE_URL = "https://teamer1.replit.app"

BANNER = """
 ██████╗ ███╗   ██╗██╗     ██╗███╗   ██╗███████╗
██╔═══██╗████╗  ██║██║     ██║████╗  ██║██╔════╝
██║   ██║██╔██╗ ██║██║     ██║██╔██╗ ██║█████╗  
██║   ██║██║╚██╗██║██║     ██║██║╚██╗██║██╔══╝  
╚██████╔╝██║ ╚████║███████╗██║██║ ╚████║███████╗
 ╚═════╝ ╚═╝  ╚═══╝╚══════╝╚═╝╚═╝  ╚═══╝╚══════╝
           P R E S E N C E   M A N A G E R
"""

def set_status(account_data, status):
    try:
        email, password, token = account_data.split(":")
        
        if status == "ONLINE":
            # WORKAROUND: The /status endpoint is broken on the server (NameError: 'data').
            # We use /api/auth/login instead, as it successfully sets the user to ONLINE.
            url = f"{BASE_URL}/api/auth/login"
            payload = {"email": email.strip(), "password": password.strip()}
            resp = requests.post(url, json=payload, timeout=10)
        elif status == "OFFLINE":
            # WORKAROUND: We use /api/auth/logout which successfully sets the user to OFFLINE.
            url = f"{BASE_URL}/api/auth/logout"
            headers = {"Authorization": f"Bearer {token.strip()}"}
            payload = {"refreshToken": ""} # Server logic just checks token exists for status flip
            resp = requests.post(url, json=payload, headers=headers, timeout=10)
        else:
            print(f"{Fore.RED}[UNSUPPORTED] '{status}' is currently unavailable due to a server-side bug (NameError).")
            return

        if resp.status_code in (200, 201):
            print(f"{Fore.GREEN}[SUCCESS] {email} updated to {Fore.YELLOW}{status}")
        else:
            print(f"{Fore.RED}[ERROR] Failed for {email}: {resp.text}")
    except Exception as e:
        print(f"{Fore.RED}[CRITICAL] Error with account: {str(e)}")

def main():
    os.system('cls' if os.name == 'nt' else 'clear')
    print(Colorate.Vertical(Colors.blue_to_purple, Center.XCenter(BANNER)))

    if not os.path.exists("accounts.txt"):
        print(f"{Fore.RED}Error: accounts.txt not found. Please run the generator first.")
        input("\nPress Enter to exit...")
        return

    print(f"\n[1] ONLINE")
    print(f"[2] IDLE")
    print(f"[3] DND")
    print(f"[4] OFFLINE")
    
    choice = Write.Input("\n[?] Select Status (1-4) -> ", Colors.blue_to_purple, interval=0.005)
    status_map = {"1": "ONLINE", "2": "IDLE", "3": "DND", "4": "OFFLINE"}
    status = status_map.get(choice, "ONLINE")

    threads = 10
    try:
        thread_input = Write.Input("[?] Threads (Enter for 10) -> ", Colors.blue_to_purple, interval=0.005)
        if thread_input.strip():
            threads = int(thread_input)
    except ValueError:
        pass

    with open("accounts.txt", "r") as f:
        accounts = f.readlines()

    print(f"\n{Fore.MAGENTA}--- Setting status to {status} for {len(accounts)} accounts ---\n")

    with ThreadPoolExecutor(max_workers=threads) as executor:
        for acc in accounts:
            if acc.strip():
                executor.submit(set_status, acc, status)

    print(f"\n{Fore.GREEN}Finished updating status!")
    input("\nPress Enter to exit...")

if __name__ == "__main__":
    main()
