/**
 * extract-docs.mjs
 *
 * Reads JSDoc comments from the df-script library source files recursively
 * and outputs a static, structured docs.json file grouped by file paths.
 *
 * Usage:
 *   node scripts/extract-docs.mjs
 *   node scripts/extract-docs.mjs --out ./docs.json
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, "../src");

// ─── Regexes to capture JSDoc comments followed by identifiers ────────────────

// Capture any JSDoc block + the immediate next declaration name (method, function, or class)
const JSDOC_BLOCK_REGEX = /\/\*\*([\s\S]*?)\*\/[\s\r\n]*?(?:export\s+|public\s+|private\s+|static\s+)*?(?:function\s+|class\s+|\*?)([a-zA-Z0-9_$]+)/g;

const PARAM_REGEX = /@param\s+([a-zA-Z0-9_$.?]+)\s+(.*)/;
const RETURNS_REGEX = /@returns\s+(.*)/;

// ─── JSDoc Parser ────────────────────────────────────────────────────────────

function parseJSDocComment(comment) {
  let desc = "";
  let returns;
  const examplesList = [];
  const paramsList = [];

  const lines = comment.split("\n").map(l => l.replace(/^\s*\*?\s?/, "").trim());

  const descLines = [];
  let currentExampleLines = [];
  let inExample = false;

  for (const line of lines) {
    if (line.startsWith("@")) {
      if (inExample) {
        examplesList.push(currentExampleLines.join("\n").trim());
        currentExampleLines = [];
        inExample = false;
      }
      if (line.startsWith("@example")) {
        inExample = true;
      } else if (line.startsWith("@param")) {
        const m = line.match(PARAM_REGEX);
        if (m) paramsList.push({ name: m[1], desc: m[2].trim() });
      } else if (line.startsWith("@returns")) {
        const m = line.match(RETURNS_REGEX);
        if (m) returns = m[1].trim();
      }
    } else {
      if (inExample) currentExampleLines.push(line);
      else if (line !== "") descLines.push(line);
    }
  }

  if (inExample && currentExampleLines.length > 0) {
    examplesList.push(currentExampleLines.join("\n").trim());
  }

  desc = descLines.join(" ");
  return {
    desc,
    examples: examplesList.length > 0 ? examplesList : undefined,
    params: paramsList.length > 0 ? paramsList : undefined,
    returns
  };
}

// ─── Recursive Directory Walker ──────────────────────────────────────────────

function getSourceFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getSourceFiles(filePath));
    } else if (file.endsWith(".ts") && !file.endsWith(".d.ts")) {
      results.push(filePath);
    }
  }
  return results;
}

// ─── Pure Raw Extraction ─────────────────────────────────────────────────────

function extractRawDocs() {
  const docs = {};
  const sourceFiles = getSourceFiles(srcDir);

  for (const filePath of sourceFiles) {
    const rawContent = fs.readFileSync(filePath, "utf-8");

    // Skip pure type definition files (@typefile) or internal utility files (@internalfile)
    if (rawContent.includes("@typefile") || rawContent.includes("@internalfile")) {
      continue;
    }

    // Normalize path to relative format with forward slashes for cross-platform stability
    const relativePath = path.relative(srcDir, filePath).replace(/\\/g, "/");

    let fileDocs = null;
    let match;

    JSDOC_BLOCK_REGEX.lastIndex = 0;
    while ((match = JSDOC_BLOCK_REGEX.exec(rawContent)) !== null) {
      const comment = match[1];
      const symbolName = match[2];

      // Skip internal functions marked with @internal or @ignore, or constructor / leading underscore symbols
      if (comment.includes("@internal") || comment.includes("@ignore") || symbolName.startsWith("_") || symbolName === "constructor") {
        continue;
      }

      const parsed = parseJSDocComment(comment);

      // If we successfully parsed JSDoc details, add them
      if (parsed.desc || parsed.params || parsed.returns || parsed.examples) {
        if (!fileDocs) {
          fileDocs = {};
        }
        fileDocs[symbolName] = parsed;
      }
    }

    if (fileDocs) {
      docs[relativePath] = fileDocs;
    }
  }

  return docs;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const outArg = process.argv.indexOf("--out");
const outPath = outArg !== -1
  ? path.resolve(process.argv[outArg + 1])
  : path.resolve(__dirname, "../docs.json");

console.log("Extracting raw docs recursively from source files...");
const docs = extractRawDocs();
const fileCount = Object.keys(docs).length;
const symbolCount = Object.values(docs).reduce((acc, f) => acc + Object.keys(f).length, 0);

console.log(`  Found JSDocs in ${fileCount} files containing ${symbolCount} documented symbols.`);

fs.writeFileSync(outPath, JSON.stringify(docs, null, 2), "utf-8");
console.log(`  Written to: ${outPath}`);
console.log("Done.");
