# Railway template — Mission Control Agent

Use this checklist to publish a **one-click Railway template** from the Mission Control agent repo.

## Template composer settings

| Field | Value |
| --- | --- |
| **Source** | `https://github.com/AgentSystemLabs/mission-control-agent` |
| **Root Directory** | *(empty — repo root)* |
| **Config-as-Code Path** | `deploy/railway/railway.json` |

## Service: `mission-control-agent`

### Variables

| Name | Value |
| --- | --- |
| `MC_AGENT_API_KEY` | `${{secret(64, "0123456789abcdef")}}` |

Do **not** set `MC_AGENT_PORT` — the agent uses Railway's injected `PORT`.

### Volume

Attach **one** volume:

| Mount path | Purpose |
| --- | --- |
| `/home/workspace` | SSH keys, Claude/Codex/Cursor auth, git clones |

`requiredMountPath` in `railway.json` blocks deploy until this volume exists.

Optional second volume at `/workspace` if you want clones on separate storage (Compose-style). Not required — the image symlinks `/workspace` into the home volume by default.

### Networking

- Enable **Public Networking** → **HTTP**
- Railway terminates TLS; Mission Control should use `wss://<your-domain>`

### Health check

Handled by config-as-code: `/health` (120s timeout for cold starts).

## Template description (suggested copy)

> Remote sandbox agent for [Mission Control](https://github.com/AgentSystemLabs/mission-control). Exposes a bearer-protected WebSocket control plane (PTY, files, git, SSH key setup). Includes Claude Code, Codex, OpenCode, and Cursor CLI. **Requires a volume at `/home/workspace`** to persist SSH keys, agent auth, and cloned repos across redeploys.

## After publish

Share the template URL from Railway → Workspace → Templates.

Users should:

1. Deploy the template
2. Open **Variables** and copy `MC_AGENT_API_KEY`
3. Copy the public `https://` URL
4. In Mission Control → **Sandboxes** → create **Remote VM** with `wss://…` and the API key

## Maintainer: republish after repo changes

When the Dockerfile or `railway.json` changes, open the template in Railway → **Edit** → confirm settings still match this file → save.
