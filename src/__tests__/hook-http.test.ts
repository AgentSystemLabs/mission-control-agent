import { describe, expect, it } from "vitest";
import type { IncomingMessage } from "node:http";
import {
  isLoopbackRemoteAddress,
  parseHookHttpRequest,
} from "../hook-http";

function req(
  method: string,
  url: string,
  remoteAddress = "127.0.0.1",
): IncomingMessage {
  return {
    method,
    url,
    socket: { remoteAddress },
  } as IncomingMessage;
}

describe("parseHookHttpRequest", () => {
  it("parses a hook POST with taskId and hookEvent", () => {
    expect(
      parseHookHttpRequest(
        req("POST", "/api/hooks/claude?taskId=task-1&hookEvent=UserPromptSubmit"),
      ),
    ).toEqual({
      slug: "claude",
      taskId: "task-1",
      hookEvent: "UserPromptSubmit",
    });
  });

  it("rejects non-POST and missing taskId", () => {
    expect(parseHookHttpRequest(req("GET", "/api/hooks/claude?taskId=t1"))).toBeNull();
    expect(parseHookHttpRequest(req("POST", "/api/hooks/claude"))).toBeNull();
    expect(parseHookHttpRequest(req("POST", "/health"))).toBeNull();
  });
});

describe("isLoopbackRemoteAddress", () => {
  it("accepts IPv4 and IPv6 loopback", () => {
    expect(isLoopbackRemoteAddress(req("POST", "/", "127.0.0.1"))).toBe(true);
    expect(isLoopbackRemoteAddress(req("POST", "/", "::1"))).toBe(true);
    expect(isLoopbackRemoteAddress(req("POST", "/", "::ffff:127.0.0.1"))).toBe(true);
  });

  it("rejects remote addresses", () => {
    expect(isLoopbackRemoteAddress(req("POST", "/", "10.0.0.5"))).toBe(false);
  });
});
