import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("=========================================");
console.log("🔍 RUNNING TYPE-LEVEL VERIFICATION (*.test-d.ts)");
console.log("=========================================\n");

function findTestDFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findTestDFiles(fullPath));
    } else if (file.endsWith(".test-d.ts")) {
      results.push(fullPath);
    }
  }
  return results;
}

const testsDir = path.join(rootDir, "_tests");
const testFiles = findTestDFiles(testsDir);

if (testFiles.length === 0) {
  console.log("No *.test-d.ts files found.");
  process.exit(0);
}

const relativeFiles = testFiles.map(f => path.relative(rootDir, f).replace(/\\/g, "/"));
console.log(`Found ${relativeFiles.length} type test file(s):`);
for (const f of relativeFiles) {
  console.log(`  • ${f}`);
}
console.log("");

try {
  process.stdout.write("▶ Compiling type assertions with tsc... ");
  const cmd = `npx tsc --target ES2022 --module ESNext --moduleResolution bundler --customConditions @df-script/source --strict --noEmit --skipLibCheck --rootDir . ${relativeFiles.join(" ")}`;
  execSync(cmd, { cwd: rootDir, stdio: "pipe" });
  console.log("✓ PASSED\n");
  console.log("=========================================");
  console.log("🎉 ALL TYPE TESTS PASSED SUCCESSFULLY!");
  console.log("=========================================");
} catch (err) {
  console.log("✗ FAILED\n");
  if (err.stdout) console.error(err.stdout.toString());
  if (err.stderr) console.error(err.stderr.toString());
  process.exit(1);
}
