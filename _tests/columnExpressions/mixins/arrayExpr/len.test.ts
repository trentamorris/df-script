declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running ArrayExpr.len tests...");


const df = $df.data([
    { numbers: [10, 20, 30] },
    { numbers: [] },
    { numbers: null }
]);

const res = df.select([$df.col("numbers").arr.len().alias("l")]).toDicts() as any[];
if (res[0].l !== 3) throw new Error("Expected 3");
if (res[1].l !== 0) throw new Error("Expected 0");
if (res[2].l !== null) throw new Error("Expected null");


console.log("✓ ArrayExpr.len tests passed!");
