// tsup/esbuild always emits `module.exports = { default: fn, ...named }`
// for a CJS build when the source has `export default` + named exports.
// That means `require("express-dev-logger")` returns an object instead of
// the callable function, breaking `app.use(devLogger())`.
//
// This script rewrites dist/index.cjs after the build so that
// `require("express-dev-logger")` returns the default export directly,
// with any named exports (like errorLogger) attached as properties —
// e.g. `require("express-dev-logger").errorLogger` still works.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distFile = path.join(__dirname, "..", "dist", "index.cjs");

const original = readFileSync(distFile, "utf8");

const fixup = `
// --- CJS interop fixup (see scripts/fix-cjs-exports.js) ---
if (module.exports && typeof module.exports === "object" && "default" in module.exports) {
  const __named = module.exports;
  const __default = __named.default;
  module.exports = __default;
  for (const key of Object.keys(__named)) {
    if (key !== "default") module.exports[key] = __named[key];
  }
}
`;

writeFileSync(distFile, original + fixup, "utf8");
console.log("✔ Fixed CJS default export interop in dist/index.cjs");