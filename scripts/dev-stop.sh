#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-5173}"
PID_FILE="$ROOT/.dev-server.pid"
WATCH_PID_FILE="$ROOT/.dev-watch.pid"

stop_pid() {
  local pid="$1"
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    sleep 0.2
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || true
    fi
    echo "Stopped dev server (pid ${pid})."
    return 0
  fi
  return 1
}

stopped=0

if [[ -f "$PID_FILE" ]]; then
  pid="$(cat "$PID_FILE")"
  if stop_pid "$pid"; then
    stopped=1
  fi
  rm -f "$PID_FILE"
fi

if [[ -f "$WATCH_PID_FILE" ]]; then
  wpid="$(cat "$WATCH_PID_FILE")"
  if kill -0 "$wpid" 2>/dev/null; then
    kill "$wpid" 2>/dev/null || true
    echo "Stopped JSX watcher (pid ${wpid})."
    stopped=1
  fi
  rm -f "$WATCH_PID_FILE"
fi

while IFS= read -r pid; do
  if stop_pid "$pid"; then
    stopped=1
  fi
done < <(lsof -ti ":${PORT}" 2>/dev/null || true)

if [[ "$stopped" -eq 0 ]]; then
  echo "No dev server running on port ${PORT}."
else
  echo "Port ${PORT} is free."
fi
