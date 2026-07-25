import { execSync } from "child_process";
import readline from "readline";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });

async function main() {
  let token = process.env.NPM_TOKEN;

  if (!token) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    token = await new Promise((resolve) => {
      rl.question("Enter your npm publication token (starts with npm_): ", (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }

  if (!token) {
    console.error("Error: NPM token is required.");
    process.exit(1);
  }

  console.log("Setting temporary authentication token...");
  run(`npm config set //registry.npmjs.org/:_authToken ${token}`);

  try {
    console.log("Running npm publish...");
    run("npm publish");
    console.log("Successfully published!");
  } catch (error) {
    console.error("Failed to publish:", error.message);
  } finally {
    console.log("Cleaning up temporary token from configuration...");
    run("npm config delete //registry.npmjs.org/:_authToken");
    console.log("Cleanup complete. Local configuration is safe.");
  }
}

main();
