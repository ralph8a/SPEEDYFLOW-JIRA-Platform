#!/usr/bin/env python3
"""Small desktop launcher using pywebview to open the app in a native window.

Usage:
  python app_window.py [--start] [--url URL]

Options:
  --start    Start docker-compose services before opening the window (calls docker compose up -d)
  --url URL  Backend URL to load (default reads ML from .env or http://localhost:5000)

This script is intentionally lightweight and requires `pywebview` to be installed:
  pip install pywebview

Notar: On Windows, pywebview can use Edge (mshtml) or cef; for best results install a supported GUI backend.
"""
import os
import time
import argparse
import subprocess
import webbrowser

try:
    import webview
except Exception:
    webview = None


def read_env_value(key, default=None):
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if '=' not in line:
                    continue
                k, v = line.split('=', 1)
                if k.strip() == key:
                    return v.strip()
    return os.getenv(key, default)


def wait_for_http(url, timeout=120):
    import urllib.request
    import urllib.error
    start = time.time()
    while time.time() - start < timeout:
        try:
            with urllib.request.urlopen(url, timeout=5) as r:
                if 200 <= r.getcode() < 400:
                    return True
        except Exception:
            time.sleep(1)
    return False


def start_docker_compose():
    # Use docker compose (modern CLI). If not available, try docker-compose.
    cmds = [['docker', 'compose', 'up', '--build', '-d'], ['docker-compose', 'up', '--build', '-d']]
    for cmd in cmds:
        try:
            subprocess.check_call(cmd)
            return True
        except Exception:
            continue
    return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--start', action='store_true', help='Start docker-compose services before opening window')
    parser.add_argument('--url', type=str, default=None, help='Backend URL to open')
    args = parser.parse_args()

    backend_url = args.url or read_env_value('BACKEND_URL') or 'http://localhost:5000'

    if args.start:
        print('Starting services via docker compose...')
        ok = start_docker_compose()
        if not ok:
            print('Failed to start docker-compose. Ensure Docker is installed and docker compose is available.')

    health_url = backend_url.rstrip('/') + '/health'
    print(f'Waiting for backend to respond at {health_url} (120s timeout)')
    if not wait_for_http(health_url, timeout=120):
        print('Backend did not respond in time; opening window anyway.')

    if webview is None:
        print('pywebview not installed. Falling back to opening system browser.')
        webbrowser.open(backend_url)
        return

    print('Opening native window...')
    # Create a window; on some platforms, options may vary
    window = webview.create_window('SPEEDYFLOW', backend_url, width=1200, height=800)
    webview.start()


if __name__ == '__main__':
    main()
