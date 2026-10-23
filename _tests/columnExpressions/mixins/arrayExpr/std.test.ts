declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running ArrayExpr.std tests...");


const df = $df.data([
    { numbers: [10, 20, 30] },
    { numbers: null }
]);

const res = df.select([$df.col("numbers").arr.std().alias("s")]).toDicts() as any[];
if (Math.abs(res[0].s - 10) > 1e-6) throw new Error("Expected std 10");
if (res[1].s !== null) throw new Error("Expected null");


console.log("✓ ArrayExpr.std tests passed!");
