import type { IncomingMessage } from "node:http";

const HOOK_PATH = /^\/api\/hooks\/([a-z0-9-]+)$/;

export type ParsedHookRequest = {
  slug: string;
  taskId: string;
  hookEvent?: string;
};

export function parseHookHttpRequest(req: IncomingMessage): ParsedHookRequest | null {
  if (req.method !== "POST") return null;
  const pathname = (req.url ?? "").split("?")[0] ?? "";
  const match = pathname.match(HOOK_PATH);
  if (!match?.[1]) return null;
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  const taskId = url.searchParams.get("taskId")?.trim();
  if (!taskId) return null;
  const hookEvent = url.searchParams.get("hookEvent")?.trim() || undefined;
  return { slug: match[1], taskId, hookEvent };
}

/** Hooks run inside the agent VM/container and must only hit loopback. */
export function isLoopbackRemoteAddress(req: IncomingMessage): boolean {
  const addr = req.socket.remoteAddress ?? "";
  return addr === "127.0.0.1" || addr === "::1" || addr === "::ffff:127.0.0.1";
}

export async function readRequestBody(req: IncomingMessage, maxBytes = 256 * 1024): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
    size += buf.length;
    if (size > maxBytes) throw new Error("hook body too large");
    chunks.push(buf);
  }
  return Buffer.concat(chunks).toString("utf8");
}
