import * as fs from "node:fs";
import * as path from "node:path";
import { randomBytes } from "node:crypto";

type SetupOptions = {
  cwd?: string;
  force?: boolean;
  port?: number;
};

function writeFileOnce(file: string, content: string, force: boolean): void {
  if (!force && fs.existsSync(file)) {
    throw new Error(`${file} already exists. Re-run with --force to overwrite.`);
  }
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, content, { encoding: "utf8", mode: 0o600 });
}

export function setupRemoteAgent(opts: SetupOptions = {}): { dir: string; apiKey: string; port: number } {
  const root = path.resolve(opts.cwd ?? process.cwd(), "mission-control-agent");
  const port = opts.port ?? 9333;
  const apiKey = randomBytes(32).toString("hex");
  const force = !!opts.force;

  writeFileOnce(
    path.join(root, ".env"),
    `MC_AGENT_API_KEY=${apiKey}\nMC_AGENT_PORT=${port}\nMC_WORKSPACE_ROOT=/workspace\n`,
    force,
  );

  writeFileOnce(
    path.join(root, "Dockerfile"),
    `FROM node:24-bookworm

ENV DEBIAN_FRONTEND=noninteractive HOME=/home/workspace PATH=/home/workspace/.local/bin:$PATH
RUN apt-get update && apt-get install -y --no-install-recommends bash build-essential ca-certificates curl git gnupg jq less openssh-client procps python3 python3-pip python3-venv ripgrep sudo unzip xz-utils zip zsh \\
  && rm -rf /var/lib/apt/lists/*
RUN usermod -l workspace -d /home/workspace -m node \\
  && groupmod -n workspace node \\
  && echo "workspace ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/workspace \\
  && chmod 0440 /etc/sudoers.d/workspace
RUN corepack enable \\
  && corepack prepare pnpm@11.1.2 --activate \\
  && npm install -g @openai/codex@latest @anthropic-ai/claude-code@latest opencode-ai@latest @agentsystemlabs/mission-control-agent@latest
USER workspace
RUN for i in 1 2 3; do curl https://cursor.com/install -fsS | bash && break; echo "cursor-agent install attempt $i failed; retrying in 5s..."; sleep 5; done || true
USER root
RUN ln -sf /home/workspace/.local/bin/cursor-agent /usr/local/bin/cursor-agent \\
  && ln -sf /home/workspace/.local/bin/agent /usr/local/bin/agent || true
RUN mkdir -p /workspace /home/workspace/.ssh /home/workspace/.config \\
  && chown -R workspace:workspace /workspace /home/workspace \\
  && chmod 700 /home/workspace/.ssh
ENV CLAUDE_CONFIG_DIR=/home/workspace/.claude
EXPOSE ${port}
WORKDIR /workspace
CMD ["mission-control-agent"]
`,
    force,
  );

  writeFileOnce(
    path.join(root, "docker-compose.yml"),
    `services:
  mission-control-agent:
    build: .
    env_file: .env
    ports:
      - "127.0.0.1:${port}:${port}"
    volumes:
      - workspace:/workspace
      - agent-home:/home/workspace
    restart: unless-stopped

volumes:
  workspace:
  agent-home:
`,
    force,
  );

  return { dir: root, apiKey, port };
}
