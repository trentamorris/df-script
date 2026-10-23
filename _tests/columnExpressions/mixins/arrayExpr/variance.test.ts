declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running ArrayExpr.variance tests...");


const df = $df.data([
    { numbers: [10, 20, 30] },
    { numbers: null }
]);

const res = df.select([$df.col("numbers").arr.variance().alias("v")]).toDicts() as any[];
if (Math.abs(res[0].v - 100) > 1e-6) throw new Error("Expected variance 100");
if (res[1].v !== null) throw new Error("Expected null");


console.log("✓ ArrayExpr.variance tests passed!");
