declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running ArrayExpr.any tests...");


const df = $df.data([
    { bools: [false, false, true] },
    { bools: [false, false] },
    { bools: [] },
    { bools: null }
]);

const res = df.select([$df.col("bools").arr.any().alias("any_true")]).toDicts() as any[];
if (res[0].any_true !== true) throw new Error("Expected true");
if (res[1].any_true !== false) throw new Error("Expected false");
if (res[2].any_true !== false) throw new Error("Expected false for empty array");
if (res[3].any_true !== null) throw new Error("Expected null for null array");


console.log("✓ ArrayExpr.any tests passed!");
