import gzip
import json
data = json.load(gzip.open('C:\\Users\\rafae\\SPEEDYFLOW-JIRA-Platform\\data\\cache\\ALL_active_tickets.json.gz', 'rt'))
print(f'✅ Total tickets: {len(data)}')
print(f'\n📋 Tickets extraídos:')
for ticket in data:
    key = ticket.get("key", "")
    summary = ticket.get("fields", {}).get("summary", "N/A")
    status = ticket.get("fields", {}).get("status", {}).get("name", "")
    print(f'  • {key}: {summary} [{status}]')
print(f'\n📊 Campos disponibles en primer ticket:')
if data:
    print(f'  Keys: {list(data[0].keys())}')
    print(f'  Fields: {list(data[0].get("fields", {}).keys())}')
