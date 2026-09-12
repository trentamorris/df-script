declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.fillNull tests...");

const df = $df.data([
    { val: 10, other: 100 },
    { val: null, other: 200 },
    { val: 30, other: 300 }
]);

const res = df.select([
    $df.col("val").fillNull({ value: 99 }).alias("f_val"),
    $df.col("val").fillNull({ value: $df.col("other") }).alias("f_col"),
    $df.col("val").fillNull({ strategy: "zero" }).alias("f_zero"),
    $df.col("val").fillNull({ strategy: "one" }).alias("f_one"),
    $df.col("val").fillNull({ strategy: "mean" }).alias("f_mean"),
    $df.col("val").fillNull({ strategy: "min" }).alias("f_min"),
    $df.col("val").fillNull({ strategy: "max" }).alias("f_max"),
    $df.col("val").fillNull({ strategy: "forward" }).alias("f_fwd"),
    $df.col("val").fillNull({ strategy: "backward" }).alias("f_bwd")
]).toDicts() as any[];

if (res[0].f_val !== 10 || res[1].f_val !== 99 || res[2].f_val !== 30) throw new Error("fillNull value failed");
if (res[1].f_col !== 200) throw new Error("fillNull column expr failed");
if (res[1].f_zero !== 0) throw new Error("fillNull zero failed");
if (res[1].f_one !== 1) throw new Error("fillNull one failed");
if (res[1].f_mean !== 20) throw new Error("fillNull mean failed");
if (res[1].f_min !== 10) throw new Error("fillNull min failed");
if (res[1].f_max !== 30) throw new Error("fillNull max failed");
if (res[1].f_fwd !== 10) throw new Error("fillNull forward failed");
if (res[1].f_bwd !== 30) throw new Error("fillNull backward failed");

// Test forward limit
const dfLimit = $df.data([{ val: 5 }, { val: null }, { val: null }, { val: null }]);
const resLimit = dfLimit.select([
    $df.col("val").fillNull({ strategy: "forward", limit: 1 }).alias("f_fwd_l1")
]).toDicts() as any[];

if (resLimit[1].f_fwd_l1 !== 5 || resLimit[2].f_fwd_l1 !== null || resLimit[3].f_fwd_l1 !== null) {
    throw new Error("fillNull forward limit failed");
}

// Test unsupported strategy throws
let threw = false;
try {
    df.select([$df.col("val").fillNull({ strategy: "invalid" as any })]).toDicts();
} catch (e: any) {
    threw = true;
}
if (!threw) throw new Error("fillNull should throw on invalid strategy");

console.log("✓ StandardExpr.fillNull tests passed!");
