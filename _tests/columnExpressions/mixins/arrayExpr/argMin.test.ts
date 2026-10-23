declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running ArrayExpr.argMin tests...");


const df = $df.data([
    { numbers: [3, 1, 9, 2] },
    { numbers: [] },
    { numbers: null }
]);

const res = df.select([$df.col("numbers").arr.argMin().alias("min_idx")]).toDicts() as any[];
if (res[0].min_idx !== 1) throw new Error("Expected min_idx 1");
if (res[1].min_idx !== null) throw new Error("Expected null for empty array");
if (res[2].min_idx !== null) throw new Error("Expected null for null array");


console.log("✓ ArrayExpr.argMin tests passed!");
