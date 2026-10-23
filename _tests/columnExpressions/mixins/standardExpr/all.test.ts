declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.all tests...");


const df = $df.data([{ val: true }, { val: true }, { val: false }]);
const res1 = df.select([$df.col("val").all().alias("a")]).toDicts() as any[];
if (res1[0].a !== false) throw new Error("all failed");
const df2 = $df.data([{ val: true }, { val: true }]);
const res2 = df2.select([$df.col("val").all().alias("a")]).toDicts() as any[];
if (res2[0].a !== true) throw new Error("all 2 failed");


console.log("✓ StandardExpr.all tests passed!");
