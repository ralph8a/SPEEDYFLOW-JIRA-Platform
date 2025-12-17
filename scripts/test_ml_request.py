import requests
import json

def main():
    url = 'http://127.0.0.1:5002/predict/unified'
    payload = {
        'summary': 'Error crítico: fallo en login grupal',
        'description': 'Usuarios reportan que no pueden iniciar sesión desde ayer, varios errores 500 en auth-service'
    }
    try:
        r = requests.post(url, json=payload, timeout=15)
        print('STATUS', r.status_code)
        print(r.text)
    except Exception as e:
        print('EXCEPTION', e)

if __name__ == '__main__':
    main()
