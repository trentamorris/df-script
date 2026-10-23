declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.rand tests...");


const df = $df.data([{ val: 1 }, { val: 2 }]);
const res = df.select([
    $df.col("val").rand().alias("r_unseeded"),
    $df.col("val").rand(42).alias("r_s1"),
    $df.col("val").rand(42).alias("r_s2")
]).toDicts() as any[];
if (res[0].r_unseeded < 0 || res[0].r_unseeded >= 1) throw new Error("rand unseeded failed");
if (res[0].r_s1 !== res[0].r_s2) throw new Error("rand seed consistency failed");


console.log("✓ StandardExpr.rand tests passed!");
