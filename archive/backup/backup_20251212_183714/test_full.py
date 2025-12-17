import requests
import json
BASE_URL = "http://127.0.0.1:5005"
print("=" * 80)
print("1. Getting Service Desks...")
print("=" * 80)
try:
    response = requests.get(f"{BASE_URL}/api/desks", timeout=30)
    if response.status_code == 200:
        desks = response.json().get('desks', [])
        print(f"\nFound {len(desks)} desks:")
        for desk in desks[:5]:
            print(f"  - ID: {desk.get('id')}, Name: {desk.get('projectName', 'Unknown')}")
        if desks:
            desk_id = desks[0].get('id')
            print(f"\nUsing first desk ID: {desk_id}")
            print("\n" + "=" * 80)
            print(f"2. Getting Queues for Desk {desk_id}...")
            print("=" * 80)
            response2 = requests.get(f"{BASE_URL}/api/queues?desk_id={desk_id}", timeout=30)
            if response2.status_code == 200:
                queues = response2.json().get('queues', [])
                print(f"\nFound {len(queues)} queues:")
                for queue in queues[:5]:
                    print(f"  - ID: {queue.get('id')}, Name: {queue.get('name', 'Unknown')}")
                if queues:
                    queue_id = queues[0].get('id')
                    print("\n" + "=" * 80)
                    print(f"3. Testing Kanban with Desk={desk_id}, Queue={queue_id}")
                    print("=" * 80)
                    params = {"desk_id": desk_id, "queue_id": queue_id, "current_user": "rafael"}
                    response3 = requests.get(f"{BASE_URL}/api/kanban", params=params, timeout=30)
                    if response3.status_code == 200:
                        data = response3.json()
                        print(f"\nTotal Issues: {data.get('total_issues', 0)}")
                        print(f"Columns: {len(data.get('columns', []))}")
                        for col in data.get('columns', []):
                            name = col.get('name', 'Unknown')
                            count = col.get('count', 0)
                            print(f"\n  [{count}] {name}")
                            if "Reported" in name:
                                print("    >>> FOUND REPORTED BY ME COLUMN!")
                    else:
                        print(f"Error: {response3.text}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
