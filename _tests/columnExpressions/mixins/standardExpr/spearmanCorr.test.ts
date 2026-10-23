declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.spearmanCorr tests...");


const df = $df.data([
    { a: 1, b: 2 },
    { a: 2, b: 4 },
    { a: 3, b: 6 }
]);
const res = df.select([$df.col("a").spearmanCorr($df.col("b")).alias("c")]).toDicts() as any[];
if (Math.abs(res[0].c - 1) > 1e-6) throw new Error("spearmanCorr failed: " + res[0].c);


console.log("✓ StandardExpr.spearmanCorr tests passed!");
