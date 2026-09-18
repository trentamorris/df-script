declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.fillNan tests...");

const df = $df.data([
    { val: 10, other: 100 },
    { val: NaN, other: 200 },
    { val: 30, other: 300 }
]);

const res = df.select([
    $df.col("val").fillNan(99).alias("f_val"),
    $df.col("val").fillNan($df.col("other")).alias("f_col"),
    $df.col("val").fillNan({ strategy: "zero" }).alias("f_zero"),
    $df.col("val").fillNan({ strategy: "one" }).alias("f_one"),
    $df.col("val").fillNan({ strategy: "forward" }).alias("f_fwd"),
    $df.col("val").fillNan({ strategy: "backward" }).alias("f_bwd")
]).toDicts() as any[];

if (res[0].f_val !== 10 || res[1].f_val !== 99 || res[2].f_val !== 30) throw new Error("fillNan value failed");
if (res[1].f_col !== 200) throw new Error("fillNan column expr failed");
if (res[1].f_zero !== 0) throw new Error("fillNan zero failed");
if (res[1].f_one !== 1) throw new Error("fillNan one failed");
if (res[1].f_fwd !== 10) throw new Error("fillNan forward failed");
if (res[1].f_bwd !== 30) throw new Error("fillNan backward failed");

console.log("✓ StandardExpr.fillNan tests passed!");
