declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running ArrayExpr.gatherEvery tests...");


const df = $df.data([
    { numbers: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
    { numbers: null }
]);

const res = df.select([
    $df.col("numbers").arr.gatherEvery({ step: 2 }).alias("every_2"),
    $df.col("numbers").arr.gatherEvery({ step: 3, offsetStart: 1 }).alias("every_3_off_1"),
    $df.col("numbers").arr.gatherEvery({ step: 2, maxItemsGathered: 3 }).alias("every_2_lim_3")
]).toDicts() as any[];

if (res[0].every_2.length !== 5 || res[0].every_2[1] !== 2) throw new Error("every_2 failed");
if (res[0].every_3_off_1[0] !== 1 || res[0].every_3_off_1[1] !== 4) throw new Error("every_3_off_1 failed");
if (res[0].every_2_lim_3.length !== 3) throw new Error("every_2_lim_3 failed");
if (res[1].every_2 !== null) throw new Error("null array failed");


console.log("✓ ArrayExpr.gatherEvery tests passed!");
