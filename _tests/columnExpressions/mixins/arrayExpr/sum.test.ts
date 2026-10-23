declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running ArrayExpr.sum tests...");

const df = $df.data([
    { numbers: [1, 2, 3, 4] },
    { numbers: [] },
    { numbers: null }
]);

const res = df.select([$df.col("numbers").arr.sum().alias("s")]).toDicts() as any[];
if (res[0].s !== 10) throw new Error("Expected sum 10");
if (res[1].s !== null) throw new Error("Expected null for empty array sum");
if (res[2].s !== null) throw new Error("Expected null for null array");

console.log("✓ ArrayExpr.sum tests passed!");
