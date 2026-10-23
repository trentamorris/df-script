declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running ArrayExpr.sort tests...");


const df = $df.data([
    { numbers: [3, null, 1, 4, 1, 5] },
    { numbers: null }
]);

const res = df.select([
    $df.col("numbers").arr.sort().alias("asc"),
    $df.col("numbers").arr.sort({ descending: true }).alias("desc"),
    $df.col("numbers").arr.sort({ descending: false, nullsLast: false }).alias("nulls_first")
]).toDicts() as any[];

if (res[0].asc[0] !== 1 || res[0].asc[4] !== 5 || res[0].asc[5] !== null) throw new Error("asc sort failed");
if (res[0].desc[0] !== 5 || res[0].desc[4] !== 1 || res[0].desc[5] !== null) throw new Error("desc sort failed");
if (res[0].nulls_first[0] !== null || res[0].nulls_first[1] !== 1) throw new Error("nulls_first sort failed");
if (res[1].asc !== null) throw new Error("null array sort failed");


console.log("✓ ArrayExpr.sort tests passed!");
