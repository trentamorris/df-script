import { execSync } from "child_process";
import readline from "readline";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const run = (cmd, options = {}) => execSync(cmd, { cwd: rootDir, stdio: "inherit", ...options });

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const pkgPath = path.join(rootDir, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const version = pkg.version;
  const pkgName = pkg.name;

  console.log("=========================================");
  console.log(`🚀 PREPARING RELEASE: ${pkgName} v${version}`);
  console.log("=========================================\n");

  // Step 1: Run Full Test Suite (Source & Dist)
  console.log("▶ [1/4] Running project tests (source & dist)...");
  try {
    console.log("  → Running source tests (npm test)...");
    run("npm test");
    console.log("  → Running bundle distribution tests (npm run test:dist)...");
    run("npm run test:dist");
    console.log("✅ All source and dist tests passed successfully.\n");
  } catch (err) {
    console.error("❌ Tests failed! Aborting release.");
    process.exit(1);
  }

  // Step 2: Run Production Build
  console.log("▶ [2/4] Building production bundles...");
  try {
    run("npm run build");
    console.log("✅ Build succeeded.\n");
  } catch (err) {
    console.error("❌ Build failed! Aborting release.");
    process.exit(1);
  }

  // Step 3: Publish Dry-Run (Package inspection without uploading)
  console.log("▶ [3/4] Running NPM publish dry-run...");
  console.log("-----------------------------------------");
  try {
    run("npm publish --dry-run");
  } catch (err) {
    console.error("❌ Dry-run failed:", err.message);
    process.exit(1);
  }
  console.log("-----------------------------------------\n");

  // Step 4: First User Confirmation
  const confirm1 = await prompt(`Ready to publish ${pkgName}@${version} to npm registry? (yes/no): `);
  if (confirm1.toLowerCase() !== "yes" && confirm1.toLowerCase() !== "y") {
    console.log("🚫 Release cancelled by user. Nothing was published.");
    process.exit(0);
  }

  // Step 4b: Second Final Confirmation
  const confirm2 = await prompt(`⚠️ FINAL CONFIRMATION: Are you sure you want to proceed and publish v${version} live to npm? (yes/no): `);
  if (confirm2.toLowerCase() !== "yes" && confirm2.toLowerCase() !== "y") {
    console.log("🚫 Release cancelled on final confirmation. Nothing was published.");
    process.exit(0);
  }

  // Step 5: Authentication Token Handling
  let token = process.env.NPM_TOKEN;
  if (!token) {
    console.log("\n💡 Tip: Use an npm Automation/Granular Access Token to bypass 2FA prompts.");
    token = await prompt("Enter your NPM publish token (or press Enter to use active CLI login session): ");
  }

  if (token) {
    console.log("Setting temporary authentication token...");
    run(`npm config set //registry.npmjs.org/:_authToken ${token}`);
  }

  try {
    console.log(`\n▶ [4/4] Publishing ${pkgName}@${version} to NPM...`);
    run("npm publish");
    console.log("\n=========================================");
    console.log(`🎉 SUCCESSFULLY PUBLISHED ${pkgName}@${version} TO NPM!`);
    console.log("=========================================");
  } catch (error) {
    console.error("\n❌ Failed to publish:", error.message);
  } finally {
    if (token) {
      console.log("Cleaning up temporary token from configuration...");
      run("npm config delete //registry.npmjs.org/:_authToken");
      console.log("Cleanup complete.");
    }
  }
}

main();
