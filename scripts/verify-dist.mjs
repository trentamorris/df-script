// npm run test:dist
// 1. Rebuilds dist/ (which also writes build/mangle-cache.json)
// 2. Compiles _tests/run_all_dist_tests.ts with the SAME property-mangle map, keeping the package external,
//    so tests import the real, unmodified dist/*.mjs files through package.json "exports"
// 3. Runs that single bundle in every installed runtime (Node always; Bun / Deno when present)
import esbuild from "esbuild";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_ESM = path.join(ROOT_DIR, "build", "dist-tests.mjs");
const OUT_CJS = path.join(ROOT_DIR, "build", "dist-tests.cjs");
const PKG_NAME = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "package.json"), "utf8")).name;
const ONLY_NODE = process.argv.includes("--node");
const ONLY_BUN = process.argv.includes("--bun");
const ONLY_DENO = process.argv.includes("--deno");
const HAS_FILTER = ONLY_NODE || ONLY_BUN || ONLY_DENO;

const ESM_RUNTIMES = [
    { id: "node", name: "Node (ESM)", probe: "node --version", run: "node" },
    { id: "bun", name: "Bun (ESM)", probe: "bun --version", run: "bun run" },
    { id: "deno", name: "Deno (ESM)", probe: "deno --version", run: "deno run -A" },
];
const CJS_RUNTIMES = [
    { id: "node", name: "Node (CJS)", probe: "node --version", run: "node" },
    { id: "bun", name: "Bun (CJS)", probe: "bun --version", run: "bun run" },
];

function _isInstalled(probe) {
    try {
        execSync(probe, { stdio: "ignore" });
        return true;
    } catch {
        return false;
    }
}

// Resolve "df-script[/sub]" through package.json exports, then emit it as a relative external import
function _externalPackage(outFile, kindOverride) {
    return {
        name: "external-package",
        setup(build) {
            const filter = new RegExp(`^${PKG_NAME}(/.*)?$`);
            build.onResolve({ filter }, async (args) => {
                if (args.pluginData === "resolving") return undefined;
                const res = await build.resolve(args.path, { kind: kindOverride || args.kind, resolveDir: args.resolveDir, pluginData: "resolving" });
                if (res.errors.length > 0) return { errors: res.errors };
                const rel = path.relative(path.dirname(outFile), res.path).replace(/\\/g, "/");
                return { path: rel.startsWith(".") ? rel : `./${rel}`, external: true };
            });
        }
    };
}

execSync("npm run build", { cwd: ROOT_DIR, stdio: "inherit" });

const mangleCache = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "build", "mangle-cache.json"), "utf8"));
// Rename only properties the build actually renamed; data fields like row._lower_boundary must stay untouched
const mangledNames = Object.keys(mangleCache).filter((k) => mangleCache[k] !== false);
const MANGLE_REGEX = new RegExp(`^(${mangledNames.join("|")})$`);
const commonBuild = {
    entryPoints: [path.join(ROOT_DIR, "_tests", "run_all_dist_tests.ts")],
    bundle: true,
    mangleProps: MANGLE_REGEX,
    mangleCache,
    external: ["node:*"],
    // package.json declares "sideEffects": false; test files are pure side effects, so annotations must be ignored
    ignoreAnnotations: true,
    logLevel: "warning",
};

await Promise.all([
    esbuild.build({ ...commonBuild, platform: "neutral", format: "esm", outfile: OUT_ESM, plugins: [_externalPackage(OUT_ESM)] }),
    esbuild.build({ ...commonBuild, platform: "node", format: "cjs", outfile: OUT_CJS, plugins: [_externalPackage(OUT_CJS, "require-call")] }),
]);

let failed = 0;
for (const [runtimes, outFile] of [[ESM_RUNTIMES, OUT_ESM], [CJS_RUNTIMES, OUT_CJS]]) {
    for (let i = 0; i < runtimes.length; i++) {
        const rt = runtimes[i];
        if (HAS_FILTER && !((rt.id === "node" && ONLY_NODE) || (rt.id === "bun" && ONLY_BUN) || (rt.id === "deno" && ONLY_DENO))) {
            continue;
        }
        if (!_isInstalled(rt.probe)) {
            console.log(`\n⏭  ${rt.name} not installed, skipping`);
            continue;
        }
        console.log(`\n▶ Running dist tests in ${rt.name}...`);
        try {
            execSync(`${rt.run} "${outFile}"`, { cwd: ROOT_DIR, stdio: "inherit" });
            console.log(`✓ ${rt.name} passed`);
        } catch {
            console.error(`✗ ${rt.name} failed`);
            failed++;
        }
    }
}

// Verify shipped .d.ts declarations (without @df-script/source, so tsc resolves dist/*.d.ts)
console.log("\n▶ Verifying shipped .d.ts declarations...");
try {
    execSync(
        "npx tsc --target ES2022 --module ESNext --moduleResolution bundler --strict --noEmit --skipLibCheck --rootDir . _tests/dataframe/select.test-d.ts _tests/dataframe/withColumns.test-d.ts _tests/functions/readJson.test-d.ts",
        { cwd: ROOT_DIR, stdio: "inherit" }
    );
    console.log("✓ Shipped .d.ts declarations passed");
} catch {
    console.error("✗ Shipped .d.ts declarations failed");
    failed++;
}

process.exit(failed > 0 ? 1 : 0);
