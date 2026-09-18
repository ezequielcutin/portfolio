#!/usr/bin/env node
// Builds app.bundle.js from the JSX sources.
//
// The .jsx files are classic scripts, not modules — no imports, no exports,
// relying on globals and cross-file hoisting. So this transforms each file's
// JSX and concatenates them in load order rather than bundling a module
// graph. Their 47 top-level names do not collide, which is what makes
// sharing one scope safe; layouts.jsx already aliases its hooks to
// useStateL/useEffectL for exactly this reason.
//
// Usage: node scripts/build.mjs [--watch]

import { build as esbuild, transform } from "esbuild";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { watch } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Load order matters: icons defines window.PFIcons, components consumes it,
// layouts consumes components, app mounts. components.jsx:2 destructures
// hooks off React, so the vendor prelude has to come first.
const SOURCES = ["icons.jsx", "components.jsx", "layouts.jsx", "app.jsx"];
const OUT = "app.bundle.js";

// GLSL lives in shaders/ as real .vert/.frag files so editors highlight it
// and shader edits are a plain text diff. They are inlined into shaders.js at
// build time rather than fetched at runtime: WebGL only ever accepts a JS
// string, so fetching would buy nothing but a round trip and an async boot.
const SHADER_DIR = "shaders";
const SHADER_OUT = "shaders.js";

// react-dom/client provides createRoot; react-dom provides createPortal and
// flushSync. All three are used, so both entry points are merged onto the
// single ReactDOM global the sources expect.
const VENDOR_ENTRY = `
import * as React from "react";
import * as ReactDOM from "react-dom";
import { createRoot, hydrateRoot } from "react-dom/client";
globalThis.React = React;
globalThis.ReactDOM = { ...ReactDOM, createRoot, hydrateRoot };
`;

async function buildVendor() {
  const result = await esbuild({
    stdin: { contents: VENDOR_ENTRY, resolveDir: ROOT, loader: "js" },
    bundle: true,
    write: false,
    format: "iife",
    minify: true,
    target: ["es2019"],
    define: { "process.env.NODE_ENV": '"production"' },
  });
  return result.outputFiles[0].text;
}

async function transformSources() {
  const parts = [];
  for (const file of SOURCES) {
    const source = await readFile(join(ROOT, file), "utf8");
    const { code } = await transform(source, {
      loader: "jsx",
      target: "es2019",
      minify: true,
      sourcefile: file,
    });
    parts.push(`/* ${file} */\n${code}`);
  }
  return parts.join("\n");
}

// Compiles every shader in a headless WebGL context and links each
// vert/frag pair, so a broken shader fails the build instead of failing
// silently in the browser. Without this the only signal is footer-screen.js
// logging a compile error to the console, which nobody sees until the panel
// scrolls into view.
//
// headless-gl is backed by ANGLE — the same GLSL translator Chrome uses on
// macOS and Windows — so this rejects what the browser would reject, down to
// the same error strings. Linking matters as much as compiling: it is what
// catches a varying declared in one stage and missing (or differently typed)
// in the other, which is the easiest way to break these two files.
//
// It is a native module and therefore optional: listed in
// optionalDependencies so a machine without a usable prebuild still installs
// and still builds. When it is missing the build says so and carries on
// rather than blocking a commit over a check it cannot run.
const STAGE_BY_EXT = { vert: "VERTEX_SHADER", frag: "FRAGMENT_SHADER" };

function indent(text) {
  return text
    .trim()
    .split("\n")
    .map((line) => `    ${line}`)
    .join("\n");
}

async function validateShaders(sources) {
  let createContext;
  try {
    createContext = (await import("gl")).default;
  } catch {
    return { skipped: 'optional dependency "gl" is not installed' };
  }

  // 1x1: nothing is ever drawn, the context exists only to compile and link.
  const gl = createContext(1, 1);
  if (!gl) return { skipped: "headless WebGL context unavailable" };

  const errors = [];
  const compiled = new Map();

  for (const [file, source] of sources) {
    const stage = STAGE_BY_EXT[file.split(".").pop()];
    // .glsl says nothing about which stage it belongs to, so it ships
    // uncompiled rather than guessing wrong and reporting a bogus error.
    if (!stage) continue;

    const shader = gl.createShader(gl[stage]);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      compiled.set(file, shader);
    } else {
      errors.push(`${SHADER_DIR}/${file}\n${indent(gl.getShaderInfoLog(shader))}`);
      gl.deleteShader(shader);
    }
  }

  // Pair by basename: screen.vert links against screen.frag.
  let programs = 0;
  for (const [file, vert] of compiled) {
    if (!file.endsWith(".vert")) continue;
    const fragFile = file.replace(/\.vert$/, ".frag");
    const frag = compiled.get(fragFile);
    if (!frag) continue;

    const program = gl.createProgram();
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
      programs++;
    } else {
      errors.push(
        `${SHADER_DIR}/${file} + ${SHADER_DIR}/${fragFile} (link)\n` +
          indent(gl.getProgramInfoLog(program))
      );
    }
    gl.deleteProgram(program);
  }

  for (const shader of compiled.values()) gl.deleteShader(shader);
  // Watch mode revalidates on every save, and contexts are a finite
  // resource — without this the watcher leaks one per rebuild.
  gl.getExtension("STACKGL_destroy_context")?.destroy();

  if (errors.length) {
    throw new Error(`shader validation failed\n\n${errors.join("\n\n")}\n`);
  }
  return { programs };
}

// Emits window.PF_SHADERS = { "screen.frag": "...", ... }. footer-screen.js is
// a plain script tag rather than part of the JSX bundle, so this is a separate
// file loaded before it — keeps the shader pipeline out of the React build.
async function buildShaders() {
  const files = (await readdir(join(ROOT, SHADER_DIR)))
    .filter((f) => /\.(vert|frag|glsl)$/.test(f))
    .sort();

  const sources = new Map();
  for (const file of files) {
    sources.set(file, await readFile(join(ROOT, SHADER_DIR, file), "utf8"));
  }

  // Before writing, so a failed build leaves the last known-good shaders.js
  // in place rather than committing GLSL that cannot compile.
  const check = await validateShaders(sources);

  // JSON.stringify handles the escaping — GLSL is full of newlines and
  // backslashes that would break a naive template literal.
  const entries = [...sources].map(
    ([file, source]) => `  ${JSON.stringify(file)}: ${JSON.stringify(source)}`
  );

  const code =
    "/* Generated by scripts/build.mjs from shaders/ — do not edit. */\n" +
    `window.PF_SHADERS = {\n${entries.join(",\n")}\n};\n`;

  await writeFile(join(ROOT, SHADER_OUT), code, "utf8");

  const hash = createHash("sha256").update(code).digest("hex").slice(0, 8);
  await injectShaderHash(hash);

  return { count: files.length, check };
}

async function injectShaderHash(hash) {
  const path = join(ROOT, "index.html");
  const html = await readFile(path, "utf8");
  const next = html.replace(
    /(<script src=")shaders\.js(?:\?v=[^"]*)?(">)/,
    `$1${SHADER_OUT}?v=${hash}$2`
  );
  if (next !== html) await writeFile(path, next, "utf8");
}

// The bundle is a classic script, not a module: top-level declarations have
// to stay in the shared global scope, so this deliberately does NOT wrap the
// app code in an IIFE. Only the vendor prelude is self-contained.
async function buildBundle() {
  const [vendor, app] = await Promise.all([buildVendor(), transformSources()]);
  const banner = "/* Generated by scripts/build.mjs — do not edit. */\n";
  const code = `${banner}${vendor}\n${app}`;
  await writeFile(join(ROOT, OUT), code, "utf8");

  const hash = createHash("sha256").update(code).digest("hex").slice(0, 8);
  await injectHash(hash);

  return { bytes: Buffer.byteLength(code), hash };
}

// Replaces the manual ?v= bumping that has repeatedly served stale code.
async function injectHash(hash) {
  const path = join(ROOT, "index.html");
  const html = await readFile(path, "utf8");
  const next = html.replace(
    /(<script src=")app\.bundle\.js(?:\?v=[^"]*)?(">)/,
    `$1${OUT}?v=${hash}$2`
  );
  if (next !== html) await writeFile(path, next, "utf8");
}

const isWatch = process.argv.includes("--watch");

const run = async () => {
  const started = Date.now();
  try {
    const [{ count, check }, { bytes, hash }] = await Promise.all([
      buildShaders(),
      buildBundle(),
    ]);
    const validation = check.skipped
      ? `unvalidated — ${check.skipped}`
      : `${check.programs} program${check.programs === 1 ? "" : "s"} validated`;
    console.log(
      `built ${SHADER_OUT} — ${count} shader${count === 1 ? "" : "s"}, ${validation}`
    );
    console.log(
      `built ${OUT} — ${(bytes / 1024).toFixed(1)} KB, v=${hash}, ${Date.now() - started}ms`
    );
  } catch (err) {
    console.error("build failed:", err.message);
    if (!isWatch) process.exitCode = 1;
  }
};

await run();

if (isWatch) {
  console.log("watching JSX + shader sources…");
  let timer = null;
  const bounce = () => {
    clearTimeout(timer); // editors fire several events per save
    timer = setTimeout(run, 60);
  };
  for (const file of SOURCES) watch(join(ROOT, file), bounce);
  // Directory watch, so adding a new .frag picks up without a restart.
  watch(join(ROOT, SHADER_DIR), bounce);
}
