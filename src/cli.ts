import { setupRemoteAgent } from "./setup";
import { startAgentFromEnv } from "./start";

function argValue(name: string): string | null {
  const prefix = `${name}=`;
  const found = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

function hasFlag(name: string): boolean {
  return process.argv.slice(2).includes(name);
}

function printHelp(): void {
  console.log(`Mission Control Agent

Usage:
  mission-control-agent             Start the agent server
  mission-control-agent setup       Write Docker Compose setup files

Setup flags:
  --dir=<path>    Parent directory for generated mission-control-agent/ folder
  --port=<port>   Agent port for generated compose setup (default: 9333)
  --force         Overwrite generated files if they already exist
`);
}

async function main(): Promise<void> {
  const cmd = process.argv[2];
  if (cmd === "--help" || cmd === "-h") {
    printHelp();
    return;
  }
  if (cmd === "setup") {
    const portRaw = argValue("--port");
    const port = portRaw ? Number.parseInt(portRaw, 10) : undefined;
    const result = setupRemoteAgent({
      cwd: argValue("--dir") ?? process.cwd(),
      port: Number.isInteger(port) && port! > 0 ? port : undefined,
      force: hasFlag("--force"),
    });
    console.log(`Wrote setup files to ${result.dir}`);
    console.log(`MC_AGENT_API_KEY=${result.apiKey}`);
    console.log("");
    console.log("Start it with:");
    console.log(`  cd ${result.dir} && docker compose up -d --build`);
    console.log("");
    console.log("Use this URL in Mission Control when running on the same machine or over an SSH tunnel:");
    console.log(`  ws://localhost:${result.port}`);
    return;
  }
  startAgentFromEnv();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
