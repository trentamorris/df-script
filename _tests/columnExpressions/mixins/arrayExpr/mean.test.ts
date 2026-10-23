declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running ArrayExpr.mean tests...");


const df = $df.data([
    { numbers: [10, 20, 30] },
    { numbers: [] },
    { numbers: null }
]);

const res = df.select([$df.col("numbers").arr.mean().alias("m")]).toDicts() as any[];
if (res[0].m !== 20) throw new Error("Expected 20");
if (res[1].m !== null) throw new Error("Expected null for empty array");
if (res[2].m !== null) throw new Error("Expected null for null array");


console.log("✓ ArrayExpr.mean tests passed!");
