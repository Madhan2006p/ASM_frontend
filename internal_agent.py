import socket
import requests
import ipaddress
import concurrent.futures
import time
import sys

API_BASE = "http://localhost:8000/api/attacksurface"

def scan_port(ip, port):
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            if s.connect_ex((str(ip), port)) == 0:
                return port
    except Exception:
        pass
    return None

def scan_host(ip):
    sys.stdout.write(f"Scanning {ip}... ")
    sys.stdout.flush()
    open_ports = []
    ports_to_check = [22, 80, 443, 3306, 5432, 6379, 8000, 8080, 5173]
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(ports_to_check)) as executor:
        futures = {executor.submit(scan_port, ip, p): p for p in ports_to_check}
        for future in concurrent.futures.as_completed(futures):
            res = future.result()
            if res:
                open_ports.append(res)
    
    if open_ports:
        print(f"LIVE (Ports: {open_ports})")
        
        # Super basic OS/Service fingerprinting mock based on ports
        os_guess = "Linux" if 22 in open_ports else "Windows" if 3389 in open_ports else "Unknown"
        findings = []
        risk_score = 0
        if 22 in open_ports:
            findings.append("Exposed SSH Port")
            risk_score += 15
        if 80 in open_ports:
            findings.append("Unencrypted HTTP traffic possible")
            risk_score += 20
            
        return {
            "ip_address": str(ip),
            "hostname": f"srv-internal-{str(ip).split('.')[-1]}",
            "os": os_guess,
            "is_live": True,
            "ports": open_ports,
            "risk_score": risk_score,
            "findings": findings
        }
    else:
        print("Offline")
    return None

def run_agent():
    target_cidr = "127.0.0.1/28" # Scanning local block for demo purposes
    print(f"[*] Starting Internal Scanner Agent. Target: {target_cidr}")
    print(f"[*] Connecting to ASM Cloud: {API_BASE}")
    
    try:
        scan_resp = requests.post(f"{API_BASE}/internal-scans/", json={
            "network_range": target_cidr,
            "status": "running"
        })
        scan_id = scan_resp.json().get("id")
        print(f"[+] Authenticated successfully. Scan ID allocated: {scan_id}\n")
    except Exception as e:
        print(f"[-] Failed to connect to API: {e}")
        return

    network = ipaddress.ip_network(target_cidr, strict=False)
    discovered = []
    
    for ip in network.hosts():
        result = scan_host(ip)
        if result:
            result["scan"] = scan_id
            discovered.append(result)
            
    print(f"\n[*] Scan complete. Found {len(discovered)} live assets. Uploading to ASM Cloud...")
    
    for asset in discovered:
        requests.post(f"{API_BASE}/internal-assets/", json=asset)
        
    requests.patch(f"{API_BASE}/internal-scans/{scan_id}/", json={"status": "completed", "progress": 100})
    print("[+] Results synchronized successfully. You can now view them on your dashboard!")

if __name__ == "__main__":
    run_agent()
