declare const process: any;
import { $df } from "../../../../src";

console.log("Running StandardExpr.arctan tests...");

// 1. Valid Domain (-Infinity, +Infinity) Real Values & Null
const df1 = $df.data({
    val: [0, 1, -1, 100, -100, null]
});
const res1 = df1.select([$df.col("val").arctan().alias("a")]).toDicts() as any[];

if (res1[0].a !== 0) throw new Error("arctan(0) should be 0");
if (Math.abs(res1[1].a - Math.PI / 4) > 1e-6) throw new Error("arctan(1) should be pi/4");
if (Math.abs(res1[2].a - (-Math.PI / 4)) > 1e-6) throw new Error("arctan(-1) should be -pi/4");
if (Math.abs(res1[3].a - Math.atan(100)) > 1e-6) throw new Error("arctan(100) failed");
if (Math.abs(res1[4].a - Math.atan(-100)) > 1e-6) throw new Error("arctan(-100) failed");
if (res1[5].a !== null) throw new Error("arctan(null) should be null");

// 2. Infinities and NaN
const dfInf = $df.data({
    val: [Infinity, -Infinity, NaN]
});
const resInf = dfInf.select([$df.col("val").arctan().alias("a")]).toDicts() as any[];
if (Math.abs(resInf[0].a - Math.PI / 2) > 1e-6) throw new Error("arctan(Infinity) should be pi/2");
if (Math.abs(resInf[1].a - (-Math.PI / 2)) > 1e-6) throw new Error("arctan(-Infinity) should be -pi/2");
if (!Number.isNaN(resInf[2].a)) throw new Error("arctan(NaN) should be NaN");

// 3. Empty DataFrame
const dfEmpty = $df.data({ val: [] });
const resEmpty = dfEmpty.select([$df.col("val").arctan().alias("a")]).toDicts() as any[];
if (resEmpty.length !== 0) throw new Error("arctan on empty dataframe should return empty result");

console.log("✓ StandardExpr.arctan tests passed!");
