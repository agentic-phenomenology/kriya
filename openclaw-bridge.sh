#!/bin/bash
# OpenClaw Bridge - Polls Kriya for messages to Computer the Cat

KRIYA_URL="${KRIYA_URL:-http://localhost:3001}"
SECRET="${OPENCLAW_WEBHOOK_SECRET:-computer-cat-secret-2026}"

# Poll for pending messages
poll_messages() {
  curl -s "$KRIYA_URL/api/openclaw/pending" \
    -H "X-OpenClaw-Secret: $SECRET"
}

# Get a specific message
get_message() {
  curl -s "$KRIYA_URL/api/openclaw/$1" \
    -H "X-OpenClaw-Secret: $SECRET"
}

# Submit a response
respond() {
  local id="$1"
  local response="$2"
  curl -s -X POST "$KRIYA_URL/api/openclaw/$id/respond" \
    -H "X-OpenClaw-Secret: $SECRET" \
    -H "Content-Type: application/json" \
    -d "{\"response\": $(echo "$response" | jq -Rs .)}"
}

# Main
case "$1" in
  poll)
    poll_messages | jq
    ;;
  get)
    get_message "$2" | jq
    ;;
  respond)
    respond "$2" "$3"
    ;;
  *)
    echo "Usage: $0 {poll|get <id>|respond <id> <message>}"
    ;;
esac
