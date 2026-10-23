declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.stripPrefix tests...");


const df = $df.data([
    { text: "pre-middle-suf" },
    { text: "no-pre" },
    { text: null }
]);

const res = df.select([$df.col("text").str.stripPrefix("pre-").alias("s")]).toDicts() as any[];
if (res[0].s !== "middle-suf") throw new Error("stripPrefix 0 failed");
if (res[1].s !== "no-pre") throw new Error("stripPrefix 1 failed");
if (res[2].s !== null) throw new Error("stripPrefix null failed");


console.log("✓ StringExpr.stripPrefix tests passed!");
