import requests
import json
BASE_URL = "http://127.0.0.1:5005"
DESK_ID = "1"
QUEUE_ID = "all"
CURRENT_USER = "rafael"
url = f"{BASE_URL}/api/kanban"
params = {"desk_id": DESK_ID, "queue_id": QUEUE_ID, "current_user": CURRENT_USER}
print("Testing /api/kanban endpoint...")
print(f"URL: {url}")
print(f"Params: {params}")
try:
    response = requests.get(url, params=params, timeout=30)
    print(f"\nStatus: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"\nTotal Issues: {data.get('total_issues', 0)}")
        print(f"Total Columns: {len(data.get('columns', []))}")
        for col in data.get('columns', []):
            name = col.get('name', 'Unknown')
            count = col.get('count', 0)
            print(f"\n- {name}: {count} issues")
            if "Reported by Me" in name:
                print(f"  FOUND! Issues:")
                for issue in col.get('issues', [])[:3]:
                    print(f"    - {issue.get('key')}: {issue.get('summary', '')[:50]}")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Error: {e}")
