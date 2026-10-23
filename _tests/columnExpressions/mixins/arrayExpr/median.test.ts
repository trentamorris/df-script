declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running ArrayExpr.median tests...");


const df = $df.data([
    { numbers: [10, 20, 30, 40, 50] },
    { numbers: [10, 20, 30, 40] },
    { numbers: null }
]);

const res = df.select([$df.col("numbers").arr.median().alias("med")]).toDicts() as any[];
if (res[0].med !== 30) throw new Error("Expected 30");
if (res[1].med !== 25) throw new Error("Expected 25");
if (res[2].med !== null) throw new Error("Expected null");


console.log("✓ ArrayExpr.median tests passed!");
