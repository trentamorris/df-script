import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("=========================================");
console.log("🔍 RUNNING COMPREHENSIVE DIST VERIFICATION");
console.log("=========================================\n");

function runCode(code, isModule, label) {
  process.stdout.write(`▶ Verifying ${label}... `);
  try {
    const args = isModule ? ["--input-type=module", "-"] : ["-"];
    execSync(`node ${args.join(" ")}`, {
      cwd: rootDir,
      input: code,
      stdio: ["pipe", "pipe", "pipe"],
    });
    console.log("✓ PASSED");
  } catch (err) {
    console.log("✗ FAILED\n");
    console.error(`Error during ${label}:`);
    if (err.stdout) console.error(err.stdout.toString());
    if (err.stderr) console.error(err.stderr.toString());
    process.exit(1);
  }
}

function assertExec(cmd, label) {
  process.stdout.write(`▶ Verifying ${label}... `);
  try {
    execSync(cmd, { cwd: rootDir, stdio: "pipe" });
    console.log("✓ PASSED");
  } catch (err) {
    console.log("✗ FAILED\n");
    console.error(`Error during ${label}:`);
    if (err.stdout) console.error(err.stdout.toString());
    if (err.stderr) console.error(err.stderr.toString());
    process.exit(1);
  }
}

// 1. Verify CommonJS Bundle Loading & Runtime Execution
const cjsSnippet = `
const { $df, DataFrame } = require("./dist/index.js");
const { isBlankString } = require("./dist/utils.js");

if (typeof $df !== "function" && typeof $df !== "object") throw new Error("CJS: $df not exported properly");
if (typeof isBlankString !== "function") throw new Error("CJS: isBlankString not exported properly");

const df = $df.data([{ a: 1, b: 2 }, { a: 3, b: 4 }]);
const res = df.withColumns($df.col("a").add($df.col("b")).alias("c")).toDicts();
if (res.length !== 2 || res[0].c !== 3 || res[1].c !== 7) throw new Error("CJS: basic calculation failed");
`;
runCode(cjsSnippet, false, "CommonJS bundle execution (dist/index.js & dist/utils.js)");

// 2. Verify Native ESM Bundle Loading & Runtime Execution
const esmSnippet = `
import { $df, DataFrame } from "./dist/index.mjs";
import { isBlankString } from "./dist/utils.mjs";

if (typeof $df !== "function" && typeof $df !== "object") throw new Error("ESM: $df not exported properly");
if (typeof isBlankString !== "function") throw new Error("ESM: isBlankString not exported properly");

const df = $df.data([{ a: 10, b: 20 }, { a: 30, b: 40 }]);
const res = df.withColumns($df.col("a").add($df.col("b")).alias("c")).toDicts();
if (res.length !== 2 || res[0].c !== 30 || res[1].c !== 70) throw new Error("ESM: basic calculation failed");
`;
runCode(esmSnippet, true, "Native ESM bundle execution (dist/index.mjs & dist/utils.mjs)");

// 3. Verify TypeScript Declarations Resolution (Consumer Simulation)
const tempTsFile = path.join(rootDir, ".temp-typecheck.ts");
const tsConsumerCode = `
import { $df, DataFrame, RowRecord } from "./dist/index.js";
import { isBlankString } from "./dist/utils.js";

interface Person extends RowRecord {
  name: string;
  score: number;
}

const rawData: Person[] = [{ name: "Alice", score: 100 }, { name: "Bob", score: 85 }];
const df: DataFrame<Person> = $df.data(rawData);
const filtered: DataFrame<Person> = df.filter($df.col("score").gt(90));
const columns: string[] = filtered.columns;
const isBlank: boolean = isBlankString("   ");
`;

fs.writeFileSync(tempTsFile, tsConsumerCode, "utf-8");

try {
  assertExec(`npx tsc --noEmit --skipLibCheck false ${tempTsFile}`, "TypeScript declaration (.d.ts) resolution & type checking");
} finally {
  if (fs.existsSync(tempTsFile)) {
    fs.unlinkSync(tempTsFile);
  }
}

// 4. Verify Export Integrity in package.json vs dist/ Files
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf-8"));
const requiredFiles = [
  pkg.main,
  pkg.module,
  pkg.types,
  pkg.exports["."].import,
  pkg.exports["."].require,
  pkg.exports["."].types,
  pkg.exports["./utils"].import,
  pkg.exports["./utils"].require,
  pkg.exports["./utils"].types,
  pkg.exports["./expressions"].import,
  pkg.exports["./expressions"].require,
  pkg.exports["./expressions"].types,
];

process.stdout.write("▶ Verifying package.json exports mapping to existing files... ");
for (const relPath of requiredFiles) {
  if (!relPath) continue;
  const fullPath = path.resolve(rootDir, relPath);
  if (!fs.existsSync(fullPath)) {
    console.log("✗ FAILED\n");
    console.error(`Missing expected package file: ${relPath} (resolved: ${fullPath})`);
    process.exit(1);
  }
}
console.log("✓ PASSED");

console.log("\n=========================================");
console.log("🎉 ALL DIST VERIFICATION CHECKS PASSED!");
console.log("=========================================\n");
