#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN="$DIR/bin/cloudflared"

if [ ! -f "$BIN" ]; then
  if [ -f "/tmp/cloudflared" ]; then
    BIN="/tmp/cloudflared"
  else
    mkdir -p "$DIR/bin"
    curl -L -s "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64" -o "$BIN"
    chmod +x "$BIN"
  fi
fi

# Run cloudflared with protocol http2
"$BIN" tunnel --protocol http2 --url http://localhost:3000 --no-autoupdate > /tmp/tunnel.log 2>&1 &
TUNNEL_PID=$!
echo "Tunnel PID: $TUNNEL_PID"

# Wait for tunnel URL
for i in {1..20}; do
  sleep 1
  URL=$(grep -o "https://[a-zA-Z0-9.-]*\.trycloudflare\.com" /tmp/tunnel.log | tail -n 1 || true)
  if [ -n "$URL" ]; then
    echo "Found Tunnel URL: $URL"
    echo "$URL" > /tmp/tunnel_url.txt
    # Sync with Telegram Bot menu button
    TOKEN="9180620527:AAFR_DNWRbzns3p4b8z9wyw0_-VH6T9c3lM"
    curl -s -X POST "https://api.telegram.org/bot$TOKEN/setChatMenuButton" \
      -H "Content-Type: application/json" \
      -d "{\"menu_button\":{\"type\":\"web_app\",\"text\":\"⚡ Open NBS App\",\"web_app\":{\"url\":\"$URL\"}}}" > /dev/null || true
    break
  fi
done
