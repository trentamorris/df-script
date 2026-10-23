declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running ArrayExpr.get tests...");


const df = $df.data([
    { numbers: [10, 20, 30, 40] },
    { numbers: null }
]);

const res = df.select([
    $df.col("numbers").arr.get(1).alias("idx_1"),
    $df.col("numbers").arr.get(-1).alias("idx_neg_1"),
    $df.col("numbers").arr.get(100).alias("idx_oob")
]).toDicts() as any[];

if (res[0].idx_1 !== 20) throw new Error("Expected 20");
if (res[0].idx_neg_1 !== 40) throw new Error("Expected 40");
if (res[0].idx_oob !== null) throw new Error("Expected null for oob");
if (res[1].idx_1 !== null) throw new Error("Expected null for null array");


console.log("✓ ArrayExpr.get tests passed!");
