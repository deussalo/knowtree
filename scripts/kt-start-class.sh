#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
STATE_PATH="$PROJECT_ROOT/content/.state/active-state.json"

json_escape() {
  local s=${1:-}
  s=${s//\\/\\\\}
  s=${s//\"/\\\"}
  s=${s//$'\n'/\\n}
  s=${s//$'\r'/}
  s=${s//$'\t'/\\t}
  printf '%s' "$s"
}

if [[ ! -f "$STATE_PATH" ]]; then
  printf '{"ok":false,"error":"active state file not found","statePath":"%s"}\n' "$(json_escape "$STATE_PATH")"
  exit 1
fi

state_json="$(cat "$STATE_PATH")"

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

if [[ "$view" != "classroom" || -z "$graph_id" || -z "$node_id" ]]; then
  printf '{"ok":false,"error":"no active classroom","state":{"view":"%s","graphId":"%s","nodeId":"%s"}}\n' \
    "$(json_escape "$view")" "$(json_escape "$graph_id")" "$(json_escape "$node_id")"
  exit 2
fi

graph_dir="$PROJECT_ROOT/content/$graph_id"
if [[ ! -d "$graph_dir" ]]; then
  printf '{"ok":false,"error":"graph directory not found","graphId":"%s"}\n' "$(json_escape "$graph_id")"
  exit 3
fi

node_file=""
while IFS= read -r -d '' f; do
  [[ "$(basename "$f")" == "specialist_style.md" ]] && continue
  id_line="$(sed -n '1,25p' "$f" | sed -n 's/^ID:[[:space:]]*\([0-9][0-9]*\).*/\1/p' | head -1)"
  if [[ "$id_line" == "$node_id" ]]; then
    node_file="$f"
    break
  fi
done < <(find "$graph_dir" -maxdepth 1 -type f -name '*.md' -print0)

if [[ -z "$node_file" ]]; then
  printf '{"ok":false,"error":"node file not found for active node","graphId":"%s","nodeId":"%s"}\n' \
    "$(json_escape "$graph_id")" "$(json_escape "$node_id")"
  exit 4
fi

node_base="$(basename "$node_file" .md)"
node_title="$node_base"
if [[ "$node_title" =~ ^\[[0-9]+\][[:space:]]*(.*)$ ]]; then
  node_title="${BASH_REMATCH[1]}"
fi

node_state_dir="$graph_dir/.state/$node_id"
progress_path="$node_state_dir/progress.json"
classroom_path="$node_state_dir/classroom.md"

progress_exists=false
classroom_exists=false
if [[ -f "$progress_path" ]]; then progress_exists=true; fi
if [[ -f "$classroom_path" ]]; then classroom_exists=true; fi

specialist_style="$graph_dir/specialist_style.md"
specialist_exists=false
if [[ -f "$specialist_style" ]]; then specialist_exists=true; fi

printf '{\n'
printf '  "ok": true,\n'
printf '  "graphId": "%s",\n' "$(json_escape "$graph_id")"
printf '  "nodeId": "%s",\n' "$(json_escape "$node_id")"
printf '  "nodeTitle": "%s",\n' "$(json_escape "$node_title")"
printf '  "graphPath": "%s",\n' "$(json_escape "content/$graph_id")"
printf '  "nodeFile": "%s",\n' "$(json_escape "content/$graph_id/$(basename "$node_file")")"
printf '  "nodeStatePath": "%s",\n' "$(json_escape "content/$graph_id/.state/$node_id")"
printf '  "progressPath": "%s",\n' "$(json_escape "content/$graph_id/.state/$node_id/progress.json")"
printf '  "classroomPath": "%s",\n' "$(json_escape "content/$graph_id/.state/$node_id/classroom.md")"
printf '  "progressExists": %s,\n' "$progress_exists"
printf '  "classroomExists": %s,\n' "$classroom_exists"
printf '  "specialistStylePath": "%s",\n' "$(json_escape "content/$graph_id/specialist_style.md")"
printf '  "specialistStyleExists": %s\n' "$specialist_exists"
printf '}\n'
