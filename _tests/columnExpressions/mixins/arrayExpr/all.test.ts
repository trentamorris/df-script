declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running ArrayExpr.all tests...");


const df = $df.data([
    { bools: [true, true, true] },
    { bools: [true, false, true] },
    { bools: [] },
    { bools: null }
]);

const res = df.select([$df.col("bools").arr.all().alias("all_true")]).toDicts() as any[];
if (res[0].all_true !== true) throw new Error("Expected true");
if (res[1].all_true !== false) throw new Error("Expected false");
if (res[2].all_true !== true) throw new Error("Expected true for empty array");
if (res[3].all_true !== null) throw new Error("Expected null for null array");


console.log("✓ ArrayExpr.all tests passed!");
