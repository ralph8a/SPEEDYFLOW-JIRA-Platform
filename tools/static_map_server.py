#!/usr/bin/env python3
"""
Simple static mapper server for dev: maps /static/* -> frontend/static/* and serves other paths from repo root.
Run: python tools/static_map_server.py 5005
"""
import http.server
import socketserver
import os
import sys
from urllib.parse import unquote, urlparse

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5005
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
STATIC_DIR = os.path.join(ROOT, 'frontend', 'static')

class MapperHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # map /static/... to frontend/static/...
        parsed = urlparse(path)
        p = unquote(parsed.path)
        if p.startswith('/static/'):
            rel = p[len('/static/'):]
            full = os.path.join(STATIC_DIR, rel.lstrip('/'))
            return full
        # otherwise serve from repository root
        # remove leading '/'
        rel = p.lstrip('/')
        full = os.path.join(ROOT, rel)
        if os.path.isdir(full):
            return full
        # fallback to repo root index
        return os.path.join(ROOT, rel)

if __name__ == '__main__':
    os.chdir(ROOT)
    with socketserver.TCPServer(("", PORT), MapperHandler) as httpd:
        print(f"Serving mapped static on port {PORT} (ROOT={ROOT}, STATIC_DIR={STATIC_DIR})")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('Shutting down')
            httpd.server_close()
