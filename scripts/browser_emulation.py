import requests, time, re

FRONTEND_URL = 'http://127.0.0.1:5005/'
ML_URL = 'http://127.0.0.1:5002'

def fetch_frontend():
    r = requests.get(FRONTEND_URL, timeout=10)
    print('FRONTEND GET', FRONTEND_URL, '->', r.status_code)
    return r.text

def find_ml_client(html):
    # naive search for ml-client.js reference
    m = re.search(r'/static/js/ml-client.js[^\" ]*', html)
    if m:
        src = m.group(0)
        # ensure full URL
        if src.startswith('/'):
            src = 'http://127.0.0.1:5005' + src
        return src
    return None


def fetch_js(url):
    r = requests.get(url, timeout=10)
    print('JS GET', url, '->', r.status_code, 'len=', len(r.text))
    return r.text


def emulate_ml_call(summary, description):
    url = ML_URL + '/predict/unified'
    payload = {'summary': summary, 'description': description}
    print('\n[NETWORK] XHR POST', url)
    print('[NETWORK] Request payload:', payload)
    start = time.time()
    r = requests.post(url, json=payload, timeout=15)
    elapsed = int((time.time()-start)*1000)
    print('[NETWORK] Response status:', r.status_code)
    print('[NETWORK] Latency (ms):', elapsed)
    print('[NETWORK] Response length:', len(r.text))
    print('\n[CONSOLE] ✅ [ML] Client initialized')
    print('[CONSOLE] 📡 [ML] Fetching predictions from server')
    if r.ok:
        print(f"[CONSOLE] ✅ [ML] Predictions received in {elapsed}ms")
    else:
        print('[CONSOLE] ❌ [ML] Error fetching predictions: HTTP', r.status_code)
    print('\n[RESPONSE]\n', r.text[:1000])
    return r


if __name__ == '__main__':
    html = fetch_frontend()
    src = find_ml_client(html)
    if src:
        js = fetch_js(src)
    else:
        print('ml-client.js not referenced in page')
    # Emulate a user-triggered ML request
    emulate_ml_call('Error crítico: fallo en login grupal', 'Usuarios reportan que no pueden iniciar sesión desde ayer, varios errores 500 en auth-service')
