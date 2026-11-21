import { chromium, firefox, webkit } from "playwright";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("=========================================");
console.log("🌐 COMPILING & RUNNING ALL PROJECT TESTS IN BROWSER");
console.log("=========================================\n");

// 1. Bundle entire project test suite for browser runtime via esbuild
process.stdout.write("▶ Bundling full test suite for browser runtime via esbuild... ");
const bundlePath = path.join(rootDir, "dist", "browser-test-bundle.js");

try {
  execSync(
    'npx esbuild _tests/run_all_browser_tests.ts --bundle --platform=browser --format=iife --conditions=@df-script/source --outfile=dist/browser-test-bundle.js --external:fs --external:path --external:node:* --ignore-annotations',
    { cwd: rootDir, stdio: ["pipe", "pipe", "pipe"] }
  );
  console.log("✓ PASSED");
} catch (err) {
  console.log("✗ FAILED\n");
  if (err.stdout) console.error(err.stdout.toString());
  if (err.stderr) console.error(err.stderr.toString());
  process.exit(1);
}

const browserBundleCode = fs.readFileSync(bundlePath, "utf-8");

const browsers = [
  { name: "Chromium (Chrome / Edge)", launcher: chromium },
  { name: "Firefox (Gecko)", launcher: firefox },
  { name: "WebKit (Apple Safari)", launcher: webkit },
];

async function runBrowserTestSuite(browserMeta) {
  process.stdout.write(`\n▶ Running full test suite in ${browserMeta.name}...\n`);

  let browser;
  try {
    browser = await browserMeta.launcher.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const errors = [];

    // Capture browser console logs, error messages and uncaught exceptions
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.error(`  [Browser Error] ${msg.text()}`);
      }
    });

    page.on("pageerror", (err) => {
      errors.push(err.message || String(err));
    });

    await page.evaluate((code) => {
      // Mock Node process.exit in browser context to catch any test failure exit
      window.process = {
        exit(code) {
          if (code && code !== 0) {
            throw new Error(`Test suite called process.exit(${code})`);
          }
        }
      };

      // Execute entire bundled test suite inside browser DOM
      const runner = new Function(code);
      runner();
    }, browserBundleCode);

    if (errors.length > 0) {
      throw new Error(`Browser test execution encountered ${errors.length} error(s):\n  - ${errors.join("\n  - ")}`);
    }

    console.log(`✓ All tests passed in ${browserMeta.name}!`);
    await browser.close();
  } catch (err) {
    console.log(`✗ FAILED in ${browserMeta.name}\n`);
    console.error(err.message || err);
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
    process.exit(1);
  }
}

async function main() {
  for (const browserMeta of browsers) {
    await runBrowserTestSuite(browserMeta);
  }

  console.log("\n=========================================");
  console.log("🎉 ALL TESTS PASSED ACROSS CHROMIUM, FIREFOX & WEBKIT!");
  console.log("=========================================\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
