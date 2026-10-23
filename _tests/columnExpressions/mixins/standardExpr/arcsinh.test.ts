declare const process: any;
import { $df } from "../../../../src";

console.log("Running StandardExpr.arcsinh tests...");

// 1. Valid Domain (-Infinity, +Infinity) Real Values & Null
const df1 = $df.data({
    val: [0, 1, -1, 5.5, -5.5, 100, -100, null]
});
const res1 = df1.select([$df.col("val").arcsinh().alias("a")]).toDicts() as any[];

if (res1[0].a !== 0) throw new Error("arcsinh(0) should be 0");
if (Math.abs(res1[1].a - Math.asinh(1)) > 1e-6) throw new Error("arcsinh(1) failed");
if (Math.abs(res1[2].a - Math.asinh(-1)) > 1e-6) throw new Error("arcsinh(-1) failed");
if (Math.abs(res1[3].a - Math.asinh(5.5)) > 1e-6) throw new Error("arcsinh(5.5) failed");
if (Math.abs(res1[4].a - Math.asinh(-5.5)) > 1e-6) throw new Error("arcsinh(-5.5) failed");
if (Math.abs(res1[5].a - Math.asinh(100)) > 1e-6) throw new Error("arcsinh(100) failed");
if (Math.abs(res1[6].a - Math.asinh(-100)) > 1e-6) throw new Error("arcsinh(-100) failed");
if (res1[7].a !== null) throw new Error("arcsinh(null) should be null");

// 2. Infinities and NaN
const dfInf = $df.data({
    val: [Infinity, -Infinity, NaN]
});
const resInf = dfInf.select([$df.col("val").arcsinh().alias("a")]).toDicts() as any[];
if (resInf[0].a !== Infinity) throw new Error("arcsinh(Infinity) should be Infinity");
if (resInf[1].a !== -Infinity) throw new Error("arcsinh(-Infinity) should be -Infinity");
if (!Number.isNaN(resInf[2].a)) throw new Error("arcsinh(NaN) should be NaN");

// 3. Empty DataFrame
const dfEmpty = $df.data({ val: [] });
const resEmpty = dfEmpty.select([$df.col("val").arcsinh().alias("a")]).toDicts() as any[];
if (resEmpty.length !== 0) throw new Error("arcsinh on empty dataframe should return empty result");

console.log("✓ StandardExpr.arcsinh tests passed!");
