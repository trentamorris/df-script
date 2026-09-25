import esbuild from "esbuild";

const sharedMangleCache = {};

const commonConfig = {
    bundle: true,
    minify: true,
    minifyWhitespace: true,
    minifyIdentifiers: true,
    minifySyntax: true,
    target: "es2020",
    treeShaking: true,
    drop: ["console", "debugger"],
    legalComments: "none",
    charset: "utf8",
    mangleProps: /^_/,
    mangleCache: sharedMangleCache
};

const builds = [
    // CJS bundles
    { ...commonConfig, entryPoints: ["src/index.ts"], outfile: "dist/index.js", platform: "node" },
    { ...commonConfig, entryPoints: ["src/utils/index.ts"], outfile: "dist/utils.js", platform: "node" },
    { ...commonConfig, entryPoints: ["src/columnExpressions/index.ts"], outfile: "dist/expressions.js", platform: "node" },

    // ESM bundles
    { ...commonConfig, entryPoints: ["src/index.ts"], outfile: "dist/index.mjs", platform: "neutral", format: "esm", external: ["fs"] },
    { ...commonConfig, entryPoints: ["src/utils/index.ts"], outfile: "dist/utils.mjs", platform: "neutral", format: "esm", external: ["fs"] },
    { ...commonConfig, entryPoints: ["src/columnExpressions/index.ts"], outfile: "dist/expressions.mjs", platform: "neutral", format: "esm", external: ["fs"] }
];

console.log("Building df-script bundles with shared mangleCache...");
for (const cfg of builds) {
    const result = await esbuild.build({ ...cfg, mangleCache: sharedMangleCache });
    if (result.mangleCache) {
        Object.assign(sharedMangleCache, result.mangleCache);
    }
}
console.log("Build complete! Mangle cache entries:", Object.keys(sharedMangleCache).length);
