#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-5173}"
PID_FILE="$ROOT/.dev-server.pid"
WATCH_PID_FILE="$ROOT/.dev-watch.pid"
URL="http://localhost:${PORT}/"

cd "$ROOT"

if [[ -f "$PID_FILE" ]]; then
  existing_pid="$(cat "$PID_FILE")"
  if kill -0 "$existing_pid" 2>/dev/null; then
    echo "Dev server already running (pid ${existing_pid})"
    echo "  ${URL}"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

if lsof -ti ":${PORT}" >/dev/null 2>&1; then
  echo "Port ${PORT} is already in use. Stop that process first, or run:"
  echo "  PORT=<other-port> ./scripts/dev-start.sh"
  exit 1
fi

# JSX is compiled ahead of time now, so an initial build has to exist before
# the server comes up, and a watcher has to keep it current while editing.
node "$ROOT/scripts/build.mjs"

nohup node "$ROOT/scripts/build.mjs" --watch >/dev/null 2>&1 &
watch_pid=$!
echo "$watch_pid" > "$WATCH_PID_FILE"

nohup python3 -m http.server "$PORT" >/dev/null 2>&1 &
server_pid=$!
echo "$server_pid" > "$PID_FILE"

sleep 0.2
if ! kill -0 "$server_pid" 2>/dev/null; then
  rm -f "$PID_FILE"
  echo "Failed to start dev server on port ${PORT}."
  exit 1
fi

cat <<EOF

  Portfolio dev server
  --------------------
  Local:   ${URL}
  Stop:    ./scripts/dev-stop.sh

  Runs a static file server plus an esbuild watcher that rebuilds
  app.bundle.js when any .jsx file changes. Refresh to pick it up.

  Not Vite: it expects ES modules, and these .jsx files are classic
  scripts sharing a global scope.

EOF
