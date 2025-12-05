import requests
from requests.auth import HTTPBasicAuth

resp = requests.post(
    'http://127.0.0.1:5005/api/notifications/sync',
    auth=HTTPBasicAuth(
        'rafael.hernandez@speedymovil.com.mx',
        'ATATT3xFfGF0r9SoGBNb7j2DckL5gFIAYGJx6ZjHgEMJz_TG8GgeCJmQj7f96vwzEvVxEaWN88vELV0Pg8N1WuIVL0XjVFO3hLUvGPM0h6e4Mx1U21c5C4sG2EiNtdUY_i1oTJ5z49Tz_g06UZYI0lzuwEDCObRz51_FpD-eCm3kIqeD3Q5rPvw=78CDBE04'
    ),
    timeout=30
)

print(f'Status: {resp.status_code}')
result = resp.json()

if resp.status_code != 200:
    print(f'ERROR: {result}')
else:
    print(f'Success: {result.get("success")}')
    data = result.get("data", {})
    print(f'Synced: {data.get("synced")}')
    print(f'Created: {data.get("created")}')

    if data.get("notifications"):
        print(f'\nFirst notification:')
        print(data["notifications"][0])
