declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running ArrayExpr.agg tests...");


const df = $df.data([
    { numbers: [1, 2, 3, 4] },
    { numbers: [10, 20] },
    { numbers: null }
]);

const res = df.select([
    $df.col("numbers").arr.agg($df.element().sum()).alias("total")
]).toDicts() as any[];

if (res[0].total !== 10) throw new Error("Expected total 10");
if (res[1].total !== 30) throw new Error("Expected total 30");
if (res[2].total !== null) throw new Error("Expected null for null array");


console.log("✓ ArrayExpr.agg tests passed!");
