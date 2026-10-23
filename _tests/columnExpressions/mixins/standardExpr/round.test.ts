declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.round tests...");


const df = $df.data([{ val: -5.5 }, { val: 4.88 }, { val: null }]);
const res = df.select([
    $df.col("val").round().alias("r0"),
    $df.col("val").round(1).alias("r1"),
    $df.col("val").round({ decimals: 1 }).alias("r1_opts"),
    $df.col("val").round({}).alias("r0_opts")
]).toDicts() as any[];
if (res[0].r0 !== -5 || res[0].r1 !== -5.5) throw new Error("round 0 failed");
if (res[1].r0 !== 5 || res[1].r1 !== 4.9) throw new Error("round 1 failed");
if (res[2].r0 !== null) throw new Error("round null failed");
if (res[0].r1_opts !== -5.5 || res[1].r1_opts !== 4.9 || res[2].r1_opts !== null) throw new Error("round options decimals failed");
if (res[0].r0_opts !== -5 || res[1].r0_opts !== 5 || res[2].r0_opts !== null) throw new Error("round empty options failed");


console.log("✓ StandardExpr.round tests passed!");
