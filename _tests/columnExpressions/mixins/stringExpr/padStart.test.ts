declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.padStart tests...");


const df = $df.data([
    { digits: "42" },
    { digits: null }
]);

const res = df.select([$df.col("digits").str.padStart(5, "*").alias("p")]).toDicts() as any[];
if (res[0].p !== "***42") throw new Error("padStart failed");
if (res[1].p !== null) throw new Error("padStart null failed");


console.log("✓ StringExpr.padStart tests passed!");
