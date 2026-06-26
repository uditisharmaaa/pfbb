"""Local dev server: serves static files, property search API, and Anthropic proxy."""

import json
import os
import ssl
from copy import deepcopy
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib import error, request

import certifi

from locations import infer_location_preferences, merge_preferences
from prompt import (
    REFINE_SYSTEM_PROMPT,
    build_refine_user_message,
    parse_preferences_json,
    summarize_results,
)
from properties import PROPERTIES
from rank import DEFAULT_PREFERENCES, rank_properties

SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())

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
API_PATHS = {"/api/chat", "/api/search"}


def call_anthropic(model: str, system: str, messages: list[dict]) -> str:
    payload = json.dumps(
        {
            "model": model,
            "max_tokens": 4096,
            "system": system,
            "messages": messages,
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

    with request.urlopen(req, context=SSL_CONTEXT) as resp:
        data = json.loads(resp.read())
        return "".join(
            block["text"]
            for block in data.get("content", [])
            if block.get("type") == "text"
        )


def refine_preferences(
    model: str,
    preferences: dict,
    message: str,
    shown: list[dict] | None,
) -> dict:
    user_content = build_refine_user_message(preferences, message, shown)
    text = call_anthropic(
        model,
        REFINE_SYSTEM_PROMPT,
        [{"role": "user", "content": user_content}],
    )
    parsed = parse_preferences_json(text)
    return parsed if parsed else preferences


class Handler(SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        if self.path in API_PATHS:
            self.send_response(204)
            self._cors_headers()
            self.end_headers()
        else:
            super().do_OPTIONS()

    def do_POST(self):
        if self.path not in API_PATHS:
            self.send_error(404)
            return

        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length))

        try:
            if self.path == "/api/search":
                result = self._handle_search(body)
            else:
                result = self._handle_chat(body)
            self._json_response(200, result)
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

    def _handle_search(self, body: dict) -> dict:
        model = body.get("model", "claude-sonnet-4-6")
        message = body.get("message", "").strip()
        if not message:
            raise ValueError("message is required")

        preferences = deepcopy(body.get("preferences") or DEFAULT_PREFERENCES)
        shown = body.get("shown") or []

        inferred = infer_location_preferences(message)
        llm_updated = refine_preferences(model, preferences, message, shown)
        updated = merge_preferences(llm_updated, inferred, message)
        properties = rank_properties(PROPERTIES, updated)

        if not properties and updated.get("city"):
            properties = rank_properties(
                PROPERTIES,
                {
                    **updated,
                    "areas": [],
                    "types": [],
                    "budgetMax": None,
                    "styles": [],
                    "nearLandmarks": [],
                },
            )[: updated.get("count", 3)]

        if not properties:
            properties = rank_properties(
                PROPERTIES,
                {**updated, "areas": [], "types": [], "budgetMax": None, "styles": [], "city": None},
            )[: updated.get("count", 3)]

        reply = summarize_results(properties, updated)

        return {
            "reply": reply,
            "preferences": updated,
            "properties": properties,
        }

    def _handle_chat(self, body: dict) -> dict:
        messages = body.get("messages") or []
        if not messages:
            raise ValueError("messages is required")

        last_user = next(
            (m["content"] for m in reversed(messages) if m.get("role") == "user"),
            "",
        )

        search_result = self._handle_search(
            {
                "model": body.get("model", "claude-sonnet-4-6"),
                "message": last_user,
                "preferences": body.get("preferences"),
                "shown": body.get("shown"),
            }
        )
        return search_result

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
