declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.stripSuffix tests...");

const df = $df.data([
    { text: "pre-middle-suf" },
    { text: "no-suf" },
    { text: "no-match" },
    { text: null }
]);

const res = df.select([$df.col("text").str.stripSuffix("-suf").alias("s")]).toDicts() as any[];
if (res[0].s !== "pre-middle") throw new Error("stripSuffix 0 failed: " + res[0].s);
if (res[1].s !== "no") throw new Error("stripSuffix 1 failed: " + res[1].s);
if (res[2].s !== "no-match") throw new Error("stripSuffix 2 failed: " + res[2].s);
if (res[3].s !== null) throw new Error("stripSuffix null failed");

console.log("✓ StringExpr.stripSuffix tests passed!");
