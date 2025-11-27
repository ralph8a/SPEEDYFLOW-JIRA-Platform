import logging
from utils.api_migration import get_api_client

def list_service_desks_and_queues():
    client = get_api_client()
    # List all service desks
    print("Fetching all service desks...")
    desks_resp = client._make_request(
        "GET",
        f"{client.site}/rest/servicedeskapi/servicedesk",
        client.headers
    )
    if not desks_resp or "values" not in desks_resp:
        print("No service desks found or API error.")
        return
    for desk in desks_resp["values"]:
        desk_id = desk.get("id")
        desk_name = desk.get("projectName") or desk.get("name")
        print(f"Service Desk: {desk_name} (ID: {desk_id})")
        # List queues for this service desk
        queues_resp = client._make_request(
            "GET",
            f"{client.site}/rest/servicedeskapi/servicedesk/{desk_id}/queue",
            client.headers
        )
        if not queues_resp or "values" not in queues_resp:
            print("  No queues found or API error.")
            continue
        for queue in queues_resp["values"]:
            print(f"    Queue: {queue.get('name')} (ID: {queue.get('id')})")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    list_service_desks_and_queues()