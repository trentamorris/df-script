declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running ArrayExpr.slice tests...");


const df = $df.data([
    { numbers: [10, 20, 30, 40, 50] },
    { numbers: null }
]);

const res = df.select([
    $df.col("numbers").arr.slice(1, 4).alias("s1"),
    $df.col("numbers").arr.slice(-3, -1).alias("s2")
]).toDicts() as any[];

if (res[0].s1.length !== 3 || res[0].s1[0] !== 20 || res[0].s1[2] !== 40) throw new Error("slice s1 failed");
if (res[0].s2.length !== 2 || res[0].s2[0] !== 30 || res[0].s2[1] !== 40) throw new Error("slice s2 failed");
if (res[1].s1 !== null) throw new Error("null array slice failed");


console.log("✓ ArrayExpr.slice tests passed!");
