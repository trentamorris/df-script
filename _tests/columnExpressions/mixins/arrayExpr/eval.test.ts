declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running ArrayExpr.eval tests...");


const df = $df.data([
    { numbers: [1, 2, 3] },
    { numbers: [10, 20] },
    { numbers: null }
]);

const res = df.select([
    $df.col("numbers").arr.eval($df.element().mul(2)).alias("doubled")
]).toDicts() as any[];

if (res[0].doubled[0] !== 2 || res[0].doubled[2] !== 6) throw new Error("Expected [2, 4, 6]");
if (res[1].doubled[0] !== 20 || res[1].doubled[1] !== 40) throw new Error("Expected [20, 40]");
if (res[2].doubled !== null) throw new Error("Expected null");


console.log("✓ ArrayExpr.eval tests passed!");
