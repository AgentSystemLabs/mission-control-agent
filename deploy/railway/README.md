# Deploy Mission Control Agent on Railway

This bundle runs the remote agent on Railway with **persistent storage** for:

- `~/.ssh` — copied or generated Git SSH keys
- `~/.claude`, `~/.codex`, `~/.cursor` — agent CLI auth and config
- `~/workspace` — git clones (via `/workspace` symlink when only one volume is used)

Without a Railway volume, all of that is wiped on every redeploy.

## Quick deploy

1. **[Deploy from GitHub](https://railway.com/new)** → select `AgentSystemLabs/mission-control-agent`.
2. Leave **Root Directory** empty (repo root).
3. Set **Config-as-Code Path** to `deploy/railway/railway.json`.
4. **Variables** → add `MC_AGENT_API_KEY` (see below).
5. **Volumes** → add a volume mounted at **`/home/workspace`** (1 GB+ recommended).

   The container `HOME` is `/home/workspace`. Mounting elsewhere (e.g. only `/workspace`) leaves SSH keys and CLI auth on ephemeral disk — and causes `EACCES` on `~/.ssh` if the home volume is root-owned without the entrypoint fix.
6. **Networking** → generate a public domain (HTTPS).
7. Deploy, then copy the API key into Mission Control as a **Remote VM** sandbox URL (`wss://…`).

### Generate `MC_AGENT_API_KEY`

Use a long random hex secret, e.g.:

```sh
openssl rand -hex 32
```

In a Railway **template**, you can auto-generate it with:

```txt
${{secret(64, "0123456789abcdef")}}
```

## What the config enforces

`deploy/railway/railway.json` sets:

- Dockerfile: `docker/remote-agent/Dockerfile`
- Health check: `GET /health`
- **`requiredMountPath: /home/workspace`** — deploy fails until a volume is attached there

The remote-agent image sets `MC_LINK_WORKSPACE_TO_HOME=1`, so a single volume at `/home/workspace` also persists git clones under `/home/workspace/workspace` (symlinked as `/workspace`).

If you prefer separate volumes (like local Docker Compose), mount **`/workspace`** as well — the entrypoint detects it in `/proc/mounts` and keeps `/workspace` independent.

## CLI deploy

```sh
railway login
railway init
railway up
railway variables set MC_AGENT_API_KEY="$(openssl rand -hex 32)"
railway volume add --mount-path /home/workspace
railway redeploy
```

## Verify

```sh
curl -s "https://<your-service>.up.railway.app/health"
# {"ok":true,"version":"0.2.0"}
```

## Publish as a Railway template

See [TEMPLATE.md](./TEMPLATE.md) for the one-click template checklist (volumes, generated API key, public HTTP).

## Backup

```sh
railway ssh -- "tar czf - /home/workspace" > mc-agent-home-$(date +%Y%m%d).tar.gz
```

Restore onto a fresh volume:

```sh
cat mc-agent-home-YYYYMMDD.tar.gz | railway ssh -- "tar xzf - -C /"
railway redeploy
```

## Cost notes

- Railway volumes require a paid plan (Hobby or above).
- Size the volume for your repos; clones live under `/home/workspace/workspace` when using the single-volume layout.
