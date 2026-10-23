declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.dot tests...");


const df = $df.data([
    { a: 1, b: 4 },
    { a: 2, b: 5 },
    { a: 3, b: 6 }
]);
const res = df.select([$df.col("a").dot($df.col("b")).alias("d")]).toDicts() as any[];
if (res[0].d !== 32) throw new Error("dot failed: " + res[0].d);


console.log("✓ StandardExpr.dot tests passed!");
