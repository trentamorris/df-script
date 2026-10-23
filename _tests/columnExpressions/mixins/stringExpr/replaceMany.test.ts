declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.replaceMany tests...");


const df = $df.data([
    { text: "the quick brown fox" },
    { text: null }
]);

const res = df.select([
    $df.col("text").str.replaceMany([/quick/, /fox/], ["slow", "dog"]).alias("replaced")
]).toDicts() as any[];

if (res[0].replaced !== "the slow brown dog") throw new Error("replaceMany failed: " + res[0].replaced);
if (res[1].replaced !== null) throw new Error("replaceMany null failed");


console.log("✓ StringExpr.replaceMany tests passed!");
