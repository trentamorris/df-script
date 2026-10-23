declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running ArrayExpr.max tests...");


const df = $df.data([
    { numbers: [3, 1, 9, 2] },
    { numbers: [] },
    { numbers: null }
]);

const res = df.select([$df.col("numbers").arr.max().alias("m")]).toDicts() as any[];
if (res[0].m !== 9) throw new Error("Expected 9");
if (res[1].m !== null) throw new Error("Expected null for empty array");
if (res[2].m !== null) throw new Error("Expected null for null array");


console.log("✓ ArrayExpr.max tests passed!");
