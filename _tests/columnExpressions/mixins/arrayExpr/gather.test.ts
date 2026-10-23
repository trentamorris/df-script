declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running ArrayExpr.gather tests...");


const df = $df.data([
    { numbers: [10, 20, 30, 40, 50] },
    { numbers: null }
]);

const res = df.select([
    $df.col("numbers").arr.gather([0, 2, -1]).alias("g1"),
    $df.col("numbers").arr.gather(new Int32Array([1, 3])).alias("g2")
]).toDicts() as any[];

if (res[0].g1[0] !== 10 || res[0].g1[1] !== 30 || res[0].g1[2] !== 50) throw new Error("gather g1 failed");
if (res[0].g2[0] !== 20 || res[0].g2[1] !== 40) throw new Error("gather g2 failed");
if (res[1].g1 !== null) throw new Error("gather null failed");


console.log("✓ ArrayExpr.gather tests passed!");
