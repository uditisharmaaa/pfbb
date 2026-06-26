"""Local dev server: serves static files and proxies chat to Anthropic."""

import json
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib import error, request

API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

if not API_KEY:
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_path):
        for line in open(env_path):
            line = line.strip()
            if line.startswith("ANTHROPIC_API_KEY="):
                API_KEY = line.split("=", 1)[1]
                break

if not API_KEY:
    raise SystemExit("Set ANTHROPIC_API_KEY in .env or environment")
ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
PORT = 8080


class Handler(SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        if self.path == "/api/chat":
            self.send_response(204)
            self._cors_headers()
            self.end_headers()
        else:
            super().do_OPTIONS()

    def do_POST(self):
        if self.path != "/api/chat":
            self.send_error(404)
            return

        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length))

        payload = json.dumps(
            {
                "model": body.get("model", "claude-sonnet-4-6"),
                "max_tokens": 4096,
                "system": (
                    "You are the AI assistant for 'Property Finder but Better' — "
                    "a smarter, friendlier way to search UAE properties. "
                    "Help users find homes, compare areas, understand budgets, "
                    "and answer real estate questions clearly and concisely."
                ),
                "messages": body["messages"],
            }
        ).encode()

        req = request.Request(
            ANTHROPIC_URL,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "x-api-key": API_KEY,
                "anthropic-version": "2023-06-01",
            },
            method="POST",
        )

        try:
            with request.urlopen(req) as resp:
                data = json.loads(resp.read())
                text = "".join(
                    block["text"]
                    for block in data.get("content", [])
                    if block.get("type") == "text"
                )
                self._json_response(200, {"reply": text})
        except error.HTTPError as e:
            err_body = e.read().decode()
            try:
                err_json = json.loads(err_body)
                message = err_json.get("error", {}).get("message", err_body)
            except json.JSONDecodeError:
                message = err_body
            self._json_response(e.code, {"error": message})
        except Exception as e:
            self._json_response(500, {"error": str(e)})

    def _json_response(self, status, data):
        body = json.dumps(data).encode()
        self.send_response(status)
        self._cors_headers()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)

    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def log_message(self, format, *args):
        if "/api/" in (args[0] if args else ""):
            super().log_message(format, *args)


if __name__ == "__main__":
    print(f"Serving at http://localhost:{PORT}")
    HTTPServer(("", PORT), Handler).serve_forever()
