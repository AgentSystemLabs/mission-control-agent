#!/usr/bin/env bash
set -euo pipefail

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Node.js 24+ and npm are required for the Mission Control agent setup tool." >&2
  echo "Install Node, then rerun this script." >&2
  exit 1
fi

npx -y @agentsystemlabs/mission-control-agent@latest setup "$@"

dir="${MISSION_CONTROL_AGENT_DIR:-mission-control-agent}"
if command -v docker >/dev/null 2>&1; then
  echo ""
  echo "Docker detected. Starting the agent with docker compose..."
  (cd "$dir" && docker compose up -d --build)
else
  echo ""
  echo "Docker was not found. Setup files were written to $dir."
  echo "Install Docker and run: cd $dir && docker compose up -d --build"
fi
