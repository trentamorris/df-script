declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running ArrayExpr.min tests...");


const df = $df.data([
    { numbers: [3, 1, 9, 2] },
    { numbers: [] },
    { numbers: null }
]);

const res = df.select([$df.col("numbers").arr.min().alias("m")]).toDicts() as any[];
if (res[0].m !== 1) throw new Error("Expected 1");
if (res[1].m !== null) throw new Error("Expected null for empty array");
if (res[2].m !== null) throw new Error("Expected null for null array");


console.log("✓ ArrayExpr.min tests passed!");
