# Mission Control Agent

Public sandbox agent for Mission Control. It runs on a local Docker sandbox, Railway, or any VM and exposes a bearer-protected WebSocket control plane for PTY, file, git, and SSH setup RPC.

## Install on a VM

With npm / npx:

```sh
npx @agentsystemlabs/mission-control-agent setup
cd mission-control-agent
docker compose up -d --build
```

Or with the shell installer:

```sh
curl -fsSL https://raw.githubusercontent.com/AgentSystemLabs/mission-control-agent/main/scripts/install.sh | bash
```

The setup command prints the generated `MC_AGENT_API_KEY`. Paste that key into Mission Control when creating a **Remote VM** sandbox.

For same-machine testing or SSH tunnels, use:

```txt
ws://localhost:9333
```

For public VM/Railway access, terminate TLS and use `https://` / `wss://`.

## Run Directly

```sh
export MC_AGENT_API_KEY="$(openssl rand -hex 32)"
export MC_WORKSPACE_ROOT=/workspace
mission-control-agent
```

## Railway

Create a Railway service from this repo. The repo includes `railway.toml`, which points at `docker/remote-agent/Dockerfile`.

**Important:** leave **Root Directory** empty (repo root). Do **not** set it to `docker/remote-agent` — the Dockerfile copies `src/`, `package.json`, and `docker-entrypoint.sh` from the repo root; a subdirectory root causes `"/docker-entrypoint.sh": not found` at build time.

Set `MC_AGENT_API_KEY` as a Railway variable. Do not set `MC_AGENT_PORT`; the agent reads Railway's injected `PORT` automatically. Generate a public domain and paste the `https://...` URL into Mission Control.

## Local Mission Control Docker Image

Mission Control's private desktop app builds its local sandbox image from this package's Dockerfile:

```txt
docker/sandbox-base/Dockerfile
```

That keeps local Docker sandboxes and remote VM sandboxes on the same published agent runtime.

## Environment

| Var | Default | Purpose |
| --- | --- | --- |
| `MC_AGENT_PORT` | `PORT` or `9333` | WS + health port |
| `PORT` | empty | Railway-provided port fallback |
| `MC_AGENT_BIND_HOST` | `0.0.0.0` | Bind address; use `::` for dual-stack private networks |
| `MC_WORKSPACE_ROOT` | `/workspace` | Confinement root for spawns + RPC |
| `MC_AGENT_API_KEY` | empty | Required bearer secret for remote deployments |
| `MC_PAIRING_TOKEN` | empty | Local Docker compatibility fallback for the same bearer secret |
| `MC_AGENT_ALLOW_QUERY_TOKEN` | `0` | Legacy opt-in for `?token=` auth; keep off for remote agents |
| `MC_HOOK_API_HOST` | `host.docker.internal` | Host the in-container hooks POST to |

## Security

Treat a public agent URL as a privileged shell exposed to the internet. Anyone with the API key can run commands, read/write workspace files, clone repos, and use credentials stored in the remote agent home directory.

Recommended posture:

- Use a long random `MC_AGENT_API_KEY` and rotate it if it may have leaked.
- Use `wss://` for public access. Mission Control rejects plaintext `ws://` for public hostnames.
- Prefer SSH tunnels, WireGuard/Tailscale, VPN/VPC, or private networking over a public domain.
- Use generated sandbox keys for Git auth on remote VMs; do not upload host private keys.
- `/health` is intentionally unauthenticated and returns only liveness/version.

Railway private networking is reachable only from services in the same Railway project/environment. A desktop app on your laptop needs a tunnel or gateway to reach `*.railway.internal`.

## Development

```sh
npm install
npm run typecheck
npm test
npm run build
```
