/**
 * generate-llms-txt.mjs
 *
 * Generates llms.txt and llms-full.txt following the llmstxt.org specification:
 * - llms.txt: Built directly from README.md with visual shields stripped, ensuring zero
 *   documentation drift between human and machine indexes.
 * - llms-full.txt: Complete, comprehensive API reference with signatures, parameters, return types,
 *   examples, and a consolidated flat type definitions catalog from docs.json.
 *
 * Usage:
 *   node scripts/generate-llms-txt.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, "..");
const docsJsonPath = path.resolve(rootDir, "docs.json");
const packageJsonPath = path.resolve(rootDir, "package.json");
const readmePath = path.resolve(rootDir, "README.md");
const websitePublicDir = path.resolve(__dirname, "../../df-script-website/public");

// ─── 1. Generate llms.txt from README.md ──────────────────────────────────────

export function buildLlmsTxtFromReadme(readmeContent) {
  // 1. Strip shields / badge images: [![...](...)](...)
  let clean = readmeContent.replace(/\[\!\[.*?\]\(.*?\)\]\(.*?\)\s*\n?/g, "");

  // 2. Normalize repeated empty newlines down to max 2
  clean = clean.replace(/\n{3,}/g, "\n\n").trim();

  return clean + "\n";
}

// ─── 2. Generate llms-full.txt ─────────────────────────────────────────────────

export function buildLlmsFullTxt({ pkg, docs }) {
  const lines = [];

  lines.push(`# ${pkg.name} API Reference (v${pkg.version})`);
  lines.push("");
  lines.push(`> ${pkg.description}`);
  lines.push("");
  lines.push("- **License**: MIT");
  lines.push("- **Website**: https://df-script.js.org");
  lines.push("- **GitHub**: https://github.com/trentamorris/df-script");
  lines.push("- **Overview (llms.txt)**: https://df-script.js.org/llms.txt");
  lines.push("- **API Schema (docs.json)**: https://df-script.js.org/docs.json");
  lines.push("");

  const formatOperation = (op) => {
    lines.push(`## ${op.name || "Operation"}`);
    lines.push("");
    if (op.desc) {
      lines.push(op.desc);
      lines.push("");
    }
    if (op.signature) {
      lines.push("### Signature");
      lines.push("```typescript");
      lines.push(op.signature);
      lines.push("```");
      lines.push("");
    }
    if (op.params && op.params.length > 0) {
      lines.push("### Parameters");
      for (const p of op.params) {
        const opt = p.optional ? ", optional" : "";
        const dflt = p.default !== undefined ? `, default: ${p.default}` : "";
        lines.push(`- \`${p.name}\` (${p.type || "any"}${opt}${dflt}): ${p.desc || ""}`);
      }
      lines.push("");
    }
    if (op.returns) {
      lines.push(`### Returns: \`${op.returns}\``);
      lines.push("");
    }
    if (op.subTypes && op.subTypes.length > 0) {
      lines.push("### Types Referenced");
      lines.push(
        op.subTypes
          .map((t) => {
            const anchor = t.toLowerCase().replace(/[^a-z0-9_-]/g, "");
            return `- [\`${t}\`](#${anchor})`;
          })
          .join("\n")
      );
      lines.push("");
    }
    if (op.examples && op.examples.length > 0) {
      lines.push("### Examples");
      lines.push("```typescript");
      lines.push(op.examples.join("\n\n"));
      lines.push("```");
      lines.push("");
    }
    lines.push("---");
    lines.push("");
  };

  // 1. ColumnExpressions
  if (docs.columnExpressions) {
    lines.push("# Column Expression API");
    lines.push("");
    for (const [groupName, groupOps] of Object.entries(docs.columnExpressions)) {
      lines.push(`## Namespace: $df.col.${groupName}`);
      lines.push("");
      for (const op of Object.values(groupOps)) {
        formatOperation(op);
      }
    }
  }

  // 2. DataFrame
  if (docs.dataframe) {
    lines.push("# DataFrame API");
    lines.push("");
    for (const op of Object.values(docs.dataframe)) {
      formatOperation(op);
    }
  }

  // 3. Top-Level Functions
  if (docs.functions) {
    lines.push("# Top-Level Functions");
    lines.push("");
    for (const op of Object.values(docs.functions)) {
      formatOperation(op);
    }
  }

  // 4. DataTypes
  if (docs.datatypes) {
    lines.push("# Data Types");
    lines.push("");
    for (const op of Object.values(docs.datatypes)) {
      formatOperation(op);
    }
  }

  // 5. Flat Types Dictionary
  if (docs.types && Object.keys(docs.types).length > 0) {
    lines.push("# Type Definitions");
    lines.push("");
    for (const [typeName, typeDef] of Object.entries(docs.types)) {
      lines.push(`### ${typeName}`);
      lines.push("```typescript");
      lines.push(typeDef.signature);
      lines.push("```");
      if (typeDef.subTypes && typeDef.subTypes.length > 0) {
        const refLinks = typeDef.subTypes
          .map((s) => {
            const anchor = s.toLowerCase().replace(/[^a-z0-9_-]/g, "");
            return `[\`${s}\`](#${anchor})`;
          })
          .join(", ");
        lines.push(`References: ${refLinks}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  if (!fs.existsSync(docsJsonPath)) {
    console.error(`Error: docs.json not found at ${docsJsonPath}. Run extract-docs first.`);
    process.exit(1);
  }

  console.log("Reading repository artifacts (package.json, docs.json, README.md)...");
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  const docs = JSON.parse(fs.readFileSync(docsJsonPath, "utf-8"));
  const readmeContent = fs.readFileSync(readmePath, "utf-8");

  // 1. Build llms.txt directly from README.md (shields stripped)
  const llmsTxt = buildLlmsTxtFromReadme(readmeContent);
  const llmsFullTxt = buildLlmsFullTxt({ pkg, docs });

  // 2. Write to df-script root
  const llmsTxtDest = path.resolve(rootDir, "llms.txt");
  const llmsFullTxtDest = path.resolve(rootDir, "llms-full.txt");
  fs.writeFileSync(llmsTxtDest, llmsTxt, "utf-8");
  fs.writeFileSync(llmsFullTxtDest, llmsFullTxt, "utf-8");
  console.log(`✓ Generated ${path.relative(rootDir, llmsTxtDest)} (from README.md)`);
  console.log(`✓ Generated ${path.relative(rootDir, llmsFullTxtDest)}`);

  // 3. Sync to df-script-website/public
  if (fs.existsSync(websitePublicDir)) {
    fs.writeFileSync(path.join(websitePublicDir, "llms.txt"), llmsTxt, "utf-8");
    fs.writeFileSync(path.join(websitePublicDir, "llms-full.txt"), llmsFullTxt, "utf-8");
    fs.copyFileSync(docsJsonPath, path.join(websitePublicDir, "docs.json"));
    console.log(`✓ Synced llms.txt, llms-full.txt, and docs.json to website public directory`);
  }

  console.log("Done.");
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isMain) {
  main();
}
