declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running ArrayExpr.shift tests...");


const df = $df.data([
    { numbers: [1, 2, 3, 4, 5] },
    { numbers: null }
]);

const res = df.select([
    $df.col("numbers").arr.shift(2).alias("s2"),
    $df.col("numbers").arr.shift(-1).alias("s_neg1")
]).toDicts() as any[];

if (res[0].s2[0] !== null || res[0].s2[1] !== null || res[0].s2[2] !== 1) throw new Error("shift 2 failed");
if (res[0].s_neg1[0] !== 2 || res[0].s_neg1[4] !== null) throw new Error("shift -1 failed");
if (res[1].s2 !== null) throw new Error("null array shift failed");


console.log("✓ ArrayExpr.shift tests passed!");
