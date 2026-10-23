declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.cov tests...");


const df = $df.data([
    { a: 1, b: 2 },
    { a: 2, b: 4 },
    { a: 3, b: 6 }
]);
const res = df.select([$df.col("a").cov($df.col("b")).alias("c")]).toDicts() as any[];
if (Math.abs(res[0].c - 2) > 1e-6) throw new Error("cov failed: " + res[0].c);


console.log("✓ StandardExpr.cov tests passed!");
