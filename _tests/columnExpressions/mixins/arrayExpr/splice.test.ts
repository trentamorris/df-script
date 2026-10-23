declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running ArrayExpr.splice tests...");


const df = $df.data([
    { numbers: [1, 2, 3, 4, 5] },
    { numbers: null }
]);

const res = df.select([
    $df.col("numbers").arr.splice(1, 2, 99, 100).alias("spliced")
]).toDicts() as any[];

if (res[0].spliced[0] !== 1 || res[0].spliced[1] !== 99 || res[0].spliced[2] !== 100 || res[0].spliced[3] !== 4) {
    throw new Error("splice failed");
}
if (res[1].spliced !== null) throw new Error("null array splice failed");


console.log("✓ ArrayExpr.splice tests passed!");
