#!/usr/bin/env bash
set -euo pipefail

PORT="${KT_PORT:-3000}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
API_STATE_URL="http://localhost:${PORT}/api/state"
SHELL_BIN="${SHELL:-/bin/bash}"

json_escape() {
  local s=${1:-}
  s=${s//\\/\\\\}
  s=${s//\"/\\\"}
  s=${s//$'\n'/\\n}
  s=${s//$'\r'/}
  s=${s//$'\t'/\\t}
  printf '%s' "$s"
}

check_server() {
  curl --max-time 1 -sS -o /dev/null -w "%{http_code}" "$API_STATE_URL" 2>/dev/null || true
}

get_server_pid() {
  # Try ss first (iproute2), fall back to lsof
  local pid=""
  if command -v ss >/dev/null 2>&1; then
    pid="$(ss -tlnp "sport = :${PORT}" 2>/dev/null | grep -oP 'pid=\K[0-9]+' | head -1)"
  fi
  if [[ -z "$pid" ]] && command -v lsof >/dev/null 2>&1; then
    pid="$(lsof -ti "TCP:${PORT}" -sTCP:LISTEN 2>/dev/null | head -1)"
  fi
  printf '%s' "$pid"
}

get_server_cwd() {
  local pid="$1"
  if [[ -z "$pid" ]]; then printf ''; return; fi
  if [[ -L "/proc/${pid}/cwd" ]]; then
    readlink -f "/proc/${pid}/cwd" 2>/dev/null || true
  fi
}

server_code="$(check_server)"
server_started=false
startup_hint=""

if [[ "$server_code" != "200" ]]; then
  if [[ ! -x "$SHELL_BIN" ]]; then
    SHELL_BIN="/bin/bash"
  fi

  # Launch through the user's shell so PATH/profile-managed Go installs are available.
  KT_PROJECT_ROOT="$PROJECT_ROOT" KT_PORT="$PORT" nohup "$SHELL_BIN" -lc '
    [ -f "$HOME/.profile" ] && . "$HOME/.profile"
    [ -f "$HOME/.bashrc" ] && . "$HOME/.bashrc"
    [ -f "$HOME/.zshrc" ] && . "$HOME/.zshrc"
    cd "$KT_PROJECT_ROOT" && go run server/main.go --port "$KT_PORT"
  ' >/tmp/knowtree-server.log 2>&1 &

  for _ in $(seq 1 120); do
    sleep 0.25
    server_code="$(check_server)"
    if [[ "$server_code" == "200" ]]; then
      server_started=true
      break
    fi
  done

  if [[ "$server_started" != "true" ]]; then
    if grep -qi "go: No such file or directory" /tmp/knowtree-server.log 2>/dev/null; then
      startup_hint="Go not found in non-interactive shell PATH. Configure Go in ~/.profile or start server manually: go run server/main.go --port ${PORT}"
    elif [[ -s /tmp/knowtree-server.log ]]; then
      startup_hint="Server failed to start. Check /tmp/knowtree-server.log"
    else
      startup_hint="Server did not become healthy in time. Try manual start: go run server/main.go --port ${PORT}"
    fi
  fi
fi

server_running=false
server_pid=""
server_cwd=""
if [[ "$server_code" == "200" ]]; then
  server_running=true
  server_pid="$(get_server_pid)"
  server_cwd="$(get_server_cwd "$server_pid")"
fi

state_json='{}'
if [[ "$server_running" == true ]]; then
  state_json="$(curl --max-time 1 -sS "$API_STATE_URL" 2>/dev/null || echo '{}')"
fi

view=""
graph_id=""
node_id=""
if command -v jq >/dev/null 2>&1; then
  view="$(printf '%s' "$state_json" | jq -r '.view // empty' 2>/dev/null || true)"
  graph_id="$(printf '%s' "$state_json" | jq -r '.graphId // empty' 2>/dev/null || true)"
  node_id="$(printf '%s' "$state_json" | jq -r '.nodeId // empty' 2>/dev/null || true)"
else
  view="$(printf '%s' "$state_json" | sed -n 's/.*"view"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
  graph_id="$(printf '%s' "$state_json" | sed -n 's/.*"graphId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
  node_id="$(printf '%s' "$state_json" | sed -n 's/.*"nodeId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
fi

active_class=false
if [[ "$view" == "classroom" && -n "$graph_id" && -n "$node_id" ]]; then
  active_class=true
fi

printf '{\n'
printf '  "serverRunning": %s,\n' "$server_running"
printf '  "serverStarted": %s,\n' "$server_started"
printf '  "serverPort": %s,\n' "$PORT"
printf '  "webappUrl": "http://localhost:%s",\n' "$PORT"
printf '  "serverPid": "%s",\n' "$(json_escape "$server_pid")"
printf '  "serverCwd": "%s",\n' "$(json_escape "$server_cwd")"
printf '  "projectRoot": "%s",\n' "$(json_escape "$PROJECT_ROOT")"
printf '  "startupHint": "%s",\n' "$(json_escape "$startup_hint")"
printf '  "activeClassroom": %s,\n' "$active_class"
printf '  "state": {\n'
printf '    "view": "%s",\n' "$(json_escape "$view")"
printf '    "graphId": "%s",\n' "$(json_escape "$graph_id")"
printf '    "nodeId": "%s"\n' "$(json_escape "$node_id")"
printf '  }\n'
printf '}\n'
