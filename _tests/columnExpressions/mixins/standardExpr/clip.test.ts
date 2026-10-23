declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.clip tests...");


const df = $df.data([{ val: -5.5 }, { val: 4.88 }, { val: 10 }, { val: null }]);
const res = df.select([
    $df.col("val").clip(-5, 5).alias("both"),
    $df.col("val").clip(-2, null).alias("lower"),
    $df.col("val").clip(null, 2).alias("upper")
]).toDicts() as any[];
if (res[0].both !== -5 || res[0].lower !== -2 || res[0].upper !== -5.5) throw new Error("clip 0 failed");
if (res[1].both !== 4.88 || res[1].lower !== 4.88 || res[1].upper !== 2) throw new Error("clip 1 failed");
if (res[2].both !== 5) throw new Error("clip 2 failed");
if (res[3].both !== null) throw new Error("clip null failed");


console.log("✓ StandardExpr.clip tests passed!");
