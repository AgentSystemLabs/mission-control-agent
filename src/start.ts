import { loadConfig } from "./config";
import { createAgentServer, AGENT_VERSION } from "./server";
import { log } from "./logger";

export function startAgentFromEnv(): void {
  const config = loadConfig();

  // Fail closed: this server exposes PTY + file/git RPC.
  if (config.pairingToken === "" && !config.allowInsecure) {
    log("error", "startup.refused", {
      reason:
        "no MC_AGENT_API_KEY or MC_PAIRING_TOKEN set; set a secret or MC_AGENT_INSECURE=1 for local testing only",
    });
    process.exit(1);
  }

  const server = createAgentServer(config);

  server.listen(config.port, config.bindHost, () => {
    log("info", "listening", {
      version: AGENT_VERSION,
      port: config.port,
      bindHost: config.bindHost,
      workspaceRoot: config.workspaceRoot,
      pairing: config.pairingToken ? "on" : "INSECURE",
    });
  });

  const shutdown = (): void => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 2_000).unref();
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
