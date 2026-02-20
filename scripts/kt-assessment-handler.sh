#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
STATE_FILE="$PROJECT_ROOT/content/.state/active-state.json"

usage() {
  cat <<'EOF'
Usage:
  kt-assessment-handler.sh prepare --type pre|final --questions <N> [--graph-id <id>] [--node-id <id>] [--force-new]
  kt-assessment-handler.sh append --file <path> --question "<text>" --answer "<text>"
  kt-assessment-handler.sh amend --file <path> --index <N> --answer "<text>"
  kt-assessment-handler.sh list [--type pre|final] [--graph-id <id>] [--node-id <id>]
  kt-assessment-handler.sh status [--file <path>] [--type pre|final] [--graph-id <id>] [--node-id <id>]
  kt-assessment-handler.sh review --file <path>
  kt-assessment-handler.sh render-review-markdown --file <path> [--heading "<text>"]
  kt-assessment-handler.sh submit --file <path>
  kt-assessment-handler.sh finalize --file <path> [--questions <N>] --correct <N> --score <N> --summary "<text>"

Commands:
  prepare   Resolve or create the active assessment file for the current node.
  append    Append one Q&A pair to an in-progress assessment file.
  amend     Amend an existing answer by question index (1-based).
  list      List assessment versions for a node.
  status    Get status for a file or latest version by type.
  review    Return normalized question/answer list for review display.
  render-review-markdown  Render full Q&A review markdown for classroom.md.
  submit    Mark test as submitted (soft lock; amend still allowed until scoring).
  finalize  Mark test as complete with final scoring fields (can be re-run after amendments).
EOF
}

json_escape() {
  local s=${1:-}
  s=${s//\\/\\\\}
  s=${s//\"/\\\"}
  s=${s//$'\n'/\\n}
  s=${s//$'\r'/}
  s=${s//$'\t'/\\t}
  printf '%s' "$s"
}

require_jq() {
  if ! command -v jq >/dev/null 2>&1; then
    echo "{\"ok\":false,\"error\":\"jq is required\"}"
    exit 1
  fi
}

resolve_active_state() {
  local graph_id node_id view
  if [[ ! -f "$STATE_FILE" ]]; then
    echo "{\"ok\":false,\"error\":\"active state file not found\",\"statePath\":\"$(json_escape "$STATE_FILE")\"}"
    exit 1
  fi
  view="$(jq -r '.view // empty' "$STATE_FILE")"
  graph_id="$(jq -r '.graphId // empty' "$STATE_FILE")"
  node_id="$(jq -r '.nodeId // empty' "$STATE_FILE")"

  if [[ "$view" != "classroom" || -z "$graph_id" || -z "$node_id" ]]; then
    echo "{\"ok\":false,\"error\":\"no active classroom\",\"state\":{\"view\":\"$(json_escape "$view")\",\"graphId\":\"$(json_escape "$graph_id")\",\"nodeId\":\"$(json_escape "$node_id")\"}}"
    exit 1
  fi
  printf '%s|%s' "$graph_id" "$node_id"
}

resolve_node_state_dir() {
  local graph_id="${1:-}" node_id="${2:-}"
  if [[ -z "$graph_id" || -z "$node_id" ]]; then
    IFS='|' read -r graph_id node_id <<<"$(resolve_active_state)"
  fi
  printf '%s|%s|%s' "$graph_id" "$node_id" "$PROJECT_ROOT/content/$graph_id/.state/$node_id"
}

prepare_cmd() {
  local test_type="" total_questions="" graph_id="" node_id="" force_new="false"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --type) test_type="$2"; shift 2 ;;
      --questions) total_questions="$2"; shift 2 ;;
      --graph-id) graph_id="$2"; shift 2 ;;
      --node-id) node_id="$2"; shift 2 ;;
      --force-new) force_new="true"; shift ;;
      *) echo "{\"ok\":false,\"error\":\"unknown argument: $(json_escape "$1")\"}"; exit 1 ;;
    esac
  done

  if [[ "$test_type" != "pre" && "$test_type" != "final" ]]; then
    echo "{\"ok\":false,\"error\":\"--type must be pre or final\"}"
    exit 1
  fi
  if ! [[ "$total_questions" =~ ^[0-9]+$ ]]; then
    echo "{\"ok\":false,\"error\":\"--questions must be an integer\"}"
    exit 1
  fi

  if [[ -z "$graph_id" || -z "$node_id" ]]; then
    IFS='|' read -r graph_id node_id <<<"$(resolve_active_state)"
  fi

  local node_state="$PROJECT_ROOT/content/$graph_id/.state/$node_id"
  mkdir -p "$node_state"

  local prefix="${test_type}test-v"
  local latest_file="" latest_ver=0
  shopt -s nullglob
  for f in "$node_state"/"${prefix}"*.json; do
    local base="${f##*/}"
    local ver="${base#${prefix}}"
    ver="${ver%.json}"
    if [[ "$ver" =~ ^[0-9]+$ ]] && (( ver > latest_ver )); then
      latest_ver="$ver"
      latest_file="$f"
    fi
  done
  shopt -u nullglob

  local mode="" target_file="" version=0 status="" answered=0 next_q=1 created="false"
  if [[ -n "$latest_file" && "$force_new" != "true" ]]; then
    status="$(jq -r '.status // empty' "$latest_file" 2>/dev/null || true)"
    if [[ "$status" == "in_progress" ]]; then
      mode="resume"
      target_file="$latest_file"
      version="$latest_ver"
      answered="$(jq '.details | length' "$target_file" 2>/dev/null || echo 0)"
      next_q=$((answered + 1))
    fi
  fi

  if [[ -z "$mode" ]]; then
    mode="new"
    version=$((latest_ver + 1))
    target_file="$node_state/${prefix}${version}.json"
    local now
    now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    jq -n \
      --argjson version "$version" \
      --arg type "$test_type" \
      --arg now "$now" \
      --argjson questions "$total_questions" \
      '{
        version: $version,
        type: $type,
        timestamp: $now,
        updatedAt: $now,
        status: "in_progress",
        questions: $questions,
        details: []
      }' > "$target_file"
    created="true"
    answered=0
    next_q=1
  fi

  local rel_file
  rel_file="$(realpath --relative-to="$PROJECT_ROOT" "$target_file" 2>/dev/null || echo "$target_file")"
  jq -n \
    --arg mode "$mode" \
    --arg file "$rel_file" \
    --argjson version "$version" \
    --arg type "$test_type" \
    --arg graphId "$graph_id" \
    --arg nodeId "$node_id" \
    --argjson answered "$answered" \
    --argjson nextQuestion "$next_q" \
    --argjson totalQuestions "$total_questions" \
    --argjson created "$created" \
    '{
      ok: true,
      mode: $mode,
      file: $file,
      version: $version,
      type: $type,
      graphId: $graphId,
      nodeId: $nodeId,
      answered: $answered,
      nextQuestion: $nextQuestion,
      totalQuestions: $totalQuestions,
      created: $created
    }'
}

append_cmd() {
  local file="" question="" answer="" total_questions=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --file) file="$2"; shift 2 ;;
      --question) question="$2"; shift 2 ;;
      --answer) answer="$2"; shift 2 ;;
      --questions) total_questions="$2"; shift 2 ;;
      *) echo "{\"ok\":false,\"error\":\"unknown argument: $(json_escape "$1")\"}"; exit 1 ;;
    esac
  done

  if [[ -z "$file" || -z "$question" ]]; then
    echo "{\"ok\":false,\"error\":\"--file and --question are required\"}"
    exit 1
  fi

  local abs_file="$file"
  if [[ "$file" != /* ]]; then
    abs_file="$PROJECT_ROOT/$file"
  fi
  if [[ ! -f "$abs_file" ]]; then
    echo "{\"ok\":false,\"error\":\"assessment file not found\",\"file\":\"$(json_escape "$file")\"}"
    exit 1
  fi

  local status
  status="$(jq -r '.status // empty' "$abs_file" 2>/dev/null || true)"
  if [[ "$status" != "in_progress" ]]; then
    echo "{\"ok\":false,\"error\":\"assessment file is not in_progress\",\"status\":\"$(json_escape "$status")\"}"
    exit 1
  fi

  local tmp_file now
  tmp_file="$(mktemp)"
  now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  if [[ -n "$total_questions" ]]; then
    jq \
      --arg q "$question" \
      --arg a "$answer" \
      --arg now "$now" \
      --argjson total "$total_questions" \
      '.details += [{question: $q, studentAnswer: $a}] | .updatedAt = $now | .questions = ($total // .questions // 0)' \
      "$abs_file" > "$tmp_file"
  else
    jq \
      --arg q "$question" \
      --arg a "$answer" \
      --arg now "$now" \
      '.details += [{question: $q, studentAnswer: $a}] | .updatedAt = $now' \
      "$abs_file" > "$tmp_file"
  fi
  mv "$tmp_file" "$abs_file"

  local answered next_q total
  answered="$(jq '.details | length' "$abs_file")"
  total="$(jq '.questions // 0' "$abs_file")"
  next_q=$((answered + 1))
  jq -n \
    --arg file "$(realpath --relative-to="$PROJECT_ROOT" "$abs_file" 2>/dev/null || echo "$abs_file")" \
    --argjson answered "$answered" \
    --argjson nextQuestion "$next_q" \
    --argjson totalQuestions "$total" \
    '{ok:true,file:$file,answered:$answered,nextQuestion:$nextQuestion,totalQuestions:$totalQuestions}'
}

amend_cmd() {
  local file="" idx="" answer=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --file) file="$2"; shift 2 ;;
      --index) idx="$2"; shift 2 ;;
      --answer) answer="$2"; shift 2 ;;
      *) echo "{\"ok\":false,\"error\":\"unknown argument: $(json_escape "$1")\"}"; exit 1 ;;
    esac
  done

  if [[ -z "$file" || -z "$idx" ]]; then
    echo "{\"ok\":false,\"error\":\"--file and --index are required\"}"
    exit 1
  fi
  if ! [[ "$idx" =~ ^[0-9]+$ ]] || (( idx < 1 )); then
    echo "{\"ok\":false,\"error\":\"--index must be >= 1\"}"
    exit 1
  fi

  local abs_file="$file"
  if [[ "$file" != /* ]]; then
    abs_file="$PROJECT_ROOT/$file"
  fi
  if [[ ! -f "$abs_file" ]]; then
    echo "{\"ok\":false,\"error\":\"assessment file not found\",\"file\":\"$(json_escape "$file")\"}"
    exit 1
  fi

  local status total
  status="$(jq -r '.status // empty' "$abs_file" 2>/dev/null || true)"
  total="$(jq '.details | length' "$abs_file" 2>/dev/null || echo 0)"
  if (( idx > total )); then
    echo "{\"ok\":false,\"error\":\"index out of range\",\"index\":$idx,\"answered\":$total}"
    exit 1
  fi

  local tmp_file now jq_index
  tmp_file="$(mktemp)"
  now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  jq_index=$((idx - 1))
  jq \
    --arg a "$answer" \
    --arg now "$now" \
    --argjson i "$jq_index" \
    '
      .details[$i].studentAnswer = $a
      | .updatedAt = $now
      | if .status == "complete" then
          .status = "submitted"
          | del(.finalizedAt, .score, .correct, .summary)
          | .details = ((.details // []) | map(del(.correct)))
        else
          .
        end
    ' \
    "$abs_file" > "$tmp_file"
  mv "$tmp_file" "$abs_file"

  jq -n \
    --arg file "$(realpath --relative-to="$PROJECT_ROOT" "$abs_file" 2>/dev/null || echo "$abs_file")" \
    --argjson index "$idx" \
    --arg answer "$answer" \
    '{ok:true,file:$file,index:$index,answer:$answer}'
}

finalize_cmd() {
  local file="" questions="" correct="" score="" summary=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --file) file="$2"; shift 2 ;;
      --questions) questions="$2"; shift 2 ;;
      --correct) correct="$2"; shift 2 ;;
      --score) score="$2"; shift 2 ;;
      --summary) summary="$2"; shift 2 ;;
      *) echo "{\"ok\":false,\"error\":\"unknown argument: $(json_escape "$1")\"}"; exit 1 ;;
    esac
  done

  if [[ -z "$file" || -z "$correct" || -z "$score" || -z "$summary" ]]; then
    echo "{\"ok\":false,\"error\":\"--file --correct --score and --summary are required\"}"
    exit 1
  fi
  if ! [[ "$correct" =~ ^[0-9]+$ ]]; then
    echo "{\"ok\":false,\"error\":\"--correct must be an integer\"}"
    exit 1
  fi
  if ! [[ "$score" =~ ^[0-9]+([.][0-9]+)?$ ]]; then
    echo "{\"ok\":false,\"error\":\"--score must be numeric\"}"
    exit 1
  fi
  if [[ -n "$questions" ]] && ! [[ "$questions" =~ ^[0-9]+$ ]]; then
    echo "{\"ok\":false,\"error\":\"--questions must be an integer\"}"
    exit 1
  fi

  local abs_file="$file"
  if [[ "$file" != /* ]]; then
    abs_file="$PROJECT_ROOT/$file"
  fi
  if [[ ! -f "$abs_file" ]]; then
    echo "{\"ok\":false,\"error\":\"assessment file not found\",\"file\":\"$(json_escape "$file")\"}"
    exit 1
  fi

  local inferred_questions now tmp_file
  inferred_questions="$(jq '(.questions // ((.details // []) | length))' "$abs_file" 2>/dev/null || echo 0)"
  if [[ -z "$questions" ]]; then
    questions="$inferred_questions"
  fi
  now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  tmp_file="$(mktemp)"
  jq \
    --argjson questions "$questions" \
    --argjson correct "$correct" \
    --argjson score "$score" \
    --arg summary "$summary" \
    --arg now "$now" \
    '
      .questions = $questions
      | .correct = $correct
      | .score = $score
      | .summary = $summary
      | .status = "complete"
      | .finalizedAt = $now
      | .updatedAt = $now
    ' \
    "$abs_file" > "$tmp_file"
  mv "$tmp_file" "$abs_file"

  jq -n \
    --arg file "$(realpath --relative-to="$PROJECT_ROOT" "$abs_file" 2>/dev/null || echo "$abs_file")" \
    --argjson questions "$questions" \
    --argjson correct "$correct" \
    --argjson score "$score" \
    --arg summary "$summary" \
    '{ok:true,file:$file,status:"complete",questions:$questions,correct:$correct,score:$score,summary:$summary}'
}

review_cmd() {
  local file=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --file) file="$2"; shift 2 ;;
      *) echo "{\"ok\":false,\"error\":\"unknown argument: $(json_escape "$1")\"}"; exit 1 ;;
    esac
  done
  if [[ -z "$file" ]]; then
    echo "{\"ok\":false,\"error\":\"--file is required\"}"
    exit 1
  fi
  local abs_file="$file"
  if [[ "$file" != /* ]]; then
    abs_file="$PROJECT_ROOT/$file"
  fi
  if [[ ! -f "$abs_file" ]]; then
    echo "{\"ok\":false,\"error\":\"assessment file not found\",\"file\":\"$(json_escape "$file")\"}"
    exit 1
  fi
  jq \
    --arg file "$(realpath --relative-to="$PROJECT_ROOT" "$abs_file" 2>/dev/null || echo "$abs_file")" \
    '{
      ok: true,
      file: $file,
      status: (.status // "unknown"),
      questions: (.questions // 0),
      answered: ((.details // []) | length),
      details: ((.details // []) | to_entries | map({index: (.key + 1), question: .value.question, studentAnswer: .value.studentAnswer}))
    }' \
    "$abs_file"
}

list_cmd() {
  local test_type="" graph_id="" node_id=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --type) test_type="$2"; shift 2 ;;
      --graph-id) graph_id="$2"; shift 2 ;;
      --node-id) node_id="$2"; shift 2 ;;
      *) echo "{\"ok\":false,\"error\":\"unknown argument: $(json_escape "$1")\"}"; exit 1 ;;
    esac
  done

  if [[ -n "$test_type" && "$test_type" != "pre" && "$test_type" != "final" ]]; then
    echo "{\"ok\":false,\"error\":\"--type must be pre or final\"}"
    exit 1
  fi

  local node_state
  IFS='|' read -r graph_id node_id node_state <<<"$(resolve_node_state_dir "$graph_id" "$node_id")"
  mkdir -p "$node_state"

  local glob='*test-v*.json'
  if [[ -n "$test_type" ]]; then
    glob="${test_type}test-v*.json"
  fi

  shopt -s nullglob
  local files=("$node_state"/$glob)
  shopt -u nullglob

  local base_json out_json
  base_json="$(mktemp)"
  out_json="$(mktemp)"
  jq -n \
    --arg graphId "$graph_id" \
    --arg nodeId "$node_id" \
    --arg type "${test_type:-all}" \
    '{ok:true,graphId:$graphId,nodeId:$nodeId,type:$type,items:[]}' > "$base_json"

  local f
  for f in "${files[@]}"; do
    local rel
    rel="$(realpath --relative-to="$PROJECT_ROOT" "$f" 2>/dev/null || echo "$f")"
    local item
    item="$(jq -n \
      --arg file "$rel" \
      --argjson version "$(jq '.version // 0' "$f" 2>/dev/null || echo 0)" \
      --arg kind "$(jq -r '.type // empty' "$f" 2>/dev/null)" \
      --arg status "$(jq -r '.status // empty' "$f" 2>/dev/null)" \
      --argjson answered "$(jq '(.details // []) | length' "$f" 2>/dev/null || echo 0)" \
      --argjson questions "$(jq '.questions // 0' "$f" 2>/dev/null || echo 0)" \
      '{file:$file,version:$version,type:$kind,status:$status,answered:$answered,questions:$questions}')"
    jq --argjson item "$item" '.items += [$item]' "$base_json" > "$out_json"
    mv "$out_json" "$base_json"
  done
  jq '.items |= sort_by(.version) | .items |= reverse' "$base_json"
  rm -f "$base_json" "$out_json"
}

status_cmd() {
  local file="" test_type="" graph_id="" node_id=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --file) file="$2"; shift 2 ;;
      --type) test_type="$2"; shift 2 ;;
      --graph-id) graph_id="$2"; shift 2 ;;
      --node-id) node_id="$2"; shift 2 ;;
      *) echo "{\"ok\":false,\"error\":\"unknown argument: $(json_escape "$1")\"}"; exit 1 ;;
    esac
  done

  local abs_file=""
  if [[ -n "$file" ]]; then
    abs_file="$file"
    if [[ "$abs_file" != /* ]]; then
      abs_file="$PROJECT_ROOT/$abs_file"
    fi
  else
    if [[ "$test_type" != "pre" && "$test_type" != "final" ]]; then
      echo "{\"ok\":false,\"error\":\"--type pre|final is required when --file is not provided\"}"
      exit 1
    fi
    local node_state
    IFS='|' read -r graph_id node_id node_state <<<"$(resolve_node_state_dir "$graph_id" "$node_id")"
    local latest=0 f
    shopt -s nullglob
    for f in "$node_state"/"${test_type}test-v"*.json; do
      local v="${f##*${test_type}test-v}"
      v="${v%.json}"
      if [[ "$v" =~ ^[0-9]+$ ]] && (( v > latest )); then
        latest="$v"
        abs_file="$f"
      fi
    done
    shopt -u nullglob
    if [[ -z "$abs_file" ]]; then
      echo "{\"ok\":false,\"error\":\"no assessment file found\",\"type\":\"$test_type\"}"
      exit 1
    fi
  fi

  if [[ ! -f "$abs_file" ]]; then
    echo "{\"ok\":false,\"error\":\"assessment file not found\",\"file\":\"$(json_escape "${file:-$abs_file}")\"}"
    exit 1
  fi

  jq \
    --arg file "$(realpath --relative-to="$PROJECT_ROOT" "$abs_file" 2>/dev/null || echo "$abs_file")" \
    '{
      ok: true,
      file: $file,
      type: (.type // ""),
      version: (.version // 0),
      status: (.status // "unknown"),
      questions: (.questions // 0),
      answered: ((.details // []) | length),
      nextQuestion: (((.details // []) | length) + 1),
      submittedAt: (.submittedAt // null),
      finalizedAt: (.finalizedAt // null),
      score: (.score // null),
      correct: (.correct // null),
      summary: (.summary // null)
    }' \
    "$abs_file"
}

render_review_markdown_cmd() {
  local file="" heading="Assessment Q&A Review"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --file) file="$2"; shift 2 ;;
      --heading) heading="$2"; shift 2 ;;
      *) echo "{\"ok\":false,\"error\":\"unknown argument: $(json_escape "$1")\"}"; exit 1 ;;
    esac
  done
  if [[ -z "$file" ]]; then
    echo "{\"ok\":false,\"error\":\"--file is required\"}"
    exit 1
  fi
  local abs_file="$file"
  if [[ "$file" != /* ]]; then
    abs_file="$PROJECT_ROOT/$file"
  fi
  if [[ ! -f "$abs_file" ]]; then
    echo "{\"ok\":false,\"error\":\"assessment file not found\",\"file\":\"$(json_escape "$file")\"}"
    exit 1
  fi

  local markdown
  markdown="$(jq -r \
    --arg heading "$heading" \
    '
      [
        "## " + $heading,
        "",
        (.details // [] | to_entries | map(
          "### Q" + ((.key + 1)|tostring) + ": " + (.value.question // "")
          + "\n\n" + "**Answer:** " + (.value.studentAnswer // "") + "\n"
        ) | join("\n"))
      ] | join("\n")
    ' "$abs_file")"

  jq -n \
    --arg file "$(realpath --relative-to="$PROJECT_ROOT" "$abs_file" 2>/dev/null || echo "$abs_file")" \
    --arg markdown "$markdown" \
    '{ok:true,file:$file,markdown:$markdown}'
}

submit_cmd() {
  local file=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --file) file="$2"; shift 2 ;;
      *) echo "{\"ok\":false,\"error\":\"unknown argument: $(json_escape "$1")\"}"; exit 1 ;;
    esac
  done
  if [[ -z "$file" ]]; then
    echo "{\"ok\":false,\"error\":\"--file is required\"}"
    exit 1
  fi

  local abs_file="$file"
  if [[ "$file" != /* ]]; then
    abs_file="$PROJECT_ROOT/$file"
  fi
  if [[ ! -f "$abs_file" ]]; then
    echo "{\"ok\":false,\"error\":\"assessment file not found\",\"file\":\"$(json_escape "$file")\"}"
    exit 1
  fi

  local status
  status="$(jq -r '.status // empty' "$abs_file" 2>/dev/null || true)"
  if [[ "$status" == "complete" ]]; then
    echo "{\"ok\":false,\"error\":\"assessment file is complete; cannot submit\",\"status\":\"complete\"}"
    exit 1
  fi

  local tmp_file now
  tmp_file="$(mktemp)"
  now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  jq \
    --arg now "$now" \
    '.status = "submitted" | .submittedAt = $now | .updatedAt = $now' \
    "$abs_file" > "$tmp_file"
  mv "$tmp_file" "$abs_file"

  local answered total
  answered="$(jq '.details | length' "$abs_file")"
  total="$(jq '.questions // 0' "$abs_file")"
  jq -n \
    --arg file "$(realpath --relative-to="$PROJECT_ROOT" "$abs_file" 2>/dev/null || echo "$abs_file")" \
    --argjson answered "$answered" \
    --argjson totalQuestions "$total" \
    '{ok:true,file:$file,status:"submitted",answered:$answered,totalQuestions:$totalQuestions}'
}

main() {
  require_jq
  if [[ $# -lt 1 ]]; then
    usage
    exit 1
  fi
  local cmd="$1"
  shift
  case "$cmd" in
    prepare) prepare_cmd "$@" ;;
    append) append_cmd "$@" ;;
    amend) amend_cmd "$@" ;;
    list) list_cmd "$@" ;;
    status) status_cmd "$@" ;;
    review) review_cmd "$@" ;;
    render-review-markdown) render_review_markdown_cmd "$@" ;;
    submit) submit_cmd "$@" ;;
    finalize) finalize_cmd "$@" ;;
    -h|--help|help) usage ;;
    *) echo "{\"ok\":false,\"error\":\"unknown command: $(json_escape "$cmd")\"}"; exit 1 ;;
  esac
}

main "$@"
