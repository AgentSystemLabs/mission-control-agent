import { build } from "esbuild";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import * as path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));
fs.rmSync(path.join(dir, "dist"), { recursive: true, force: true });

const common = {
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node24",
  external: ["node-pty"],
  logLevel: "info",
};

await build({
  ...common,
  entryPoints: [path.join(dir, "src/cli.ts")],
  outfile: path.join(dir, "dist/cli.cjs"),
  banner: {
    js: "#!/usr/bin/env node\n/* Mission Control agent CLI. node-pty is external. */",
  },
});

await build({
  ...common,
  entryPoints: [path.join(dir, "src/index.ts")],
  outfile: path.join(dir, "dist/index.cjs"),
});
