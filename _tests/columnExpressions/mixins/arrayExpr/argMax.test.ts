declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running ArrayExpr.argMax tests...");


const df = $df.data([
    { numbers: [3, 1, 9, 2] },
    { numbers: [] },
    { numbers: null }
]);

const res = df.select([$df.col("numbers").arr.argMax().alias("max_idx")]).toDicts() as any[];
if (res[0].max_idx !== 2) throw new Error("Expected max_idx 2");
if (res[1].max_idx !== null) throw new Error("Expected null for empty array");
if (res[2].max_idx !== null) throw new Error("Expected null for null array");


console.log("✓ ArrayExpr.argMax tests passed!");
