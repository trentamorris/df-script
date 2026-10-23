declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.between tests...");


const df = $df.data([
    { val: 15, lower: 10, upper: 20 },
    { val: 10, lower: 10, upper: 20 },
    { val: 20, lower: 10, upper: 20 },
    { val: 5, lower: 10, upper: 20 },
    { val: 25, lower: 10, upper: 20 }
]);
const res = df.select([
    $df.col("val").between(10, 20).alias("both"),
    $df.col("val").between(10, 20, "left").alias("left"),
    $df.col("val").between(10, 20, "right").alias("right"),
    $df.col("val").between(10, 20, "none").alias("none")
]).toDicts() as any[];
if (res[0].both !== true || res[1].both !== true || res[2].both !== true || res[3].both !== false) throw new Error("between both failed");
if (res[2].left !== false || res[1].left !== true) throw new Error("between left failed");
if (res[1].right !== false || res[2].right !== true) throw new Error("between right failed");
if (res[1].none !== false || res[2].none !== false || res[0].none !== true) throw new Error("between none failed");


console.log("✓ StandardExpr.between tests passed!");
