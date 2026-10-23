declare const process: any;
import { $df } from "../../../../src";

console.log("Running StandardExpr.arccosh tests...");

// 1. Valid Domain [1, +Infinity) Boundaries, Values & Nulls
const df1 = $df.data({
    val: [1, 2.71828, 10, 100, null]
});
const res1 = df1.select([$df.col("val").arccosh().alias("a")]).toDicts() as any[];

if (res1[0].a !== 0) throw new Error("arccosh(1) should be 0");
if (Math.abs(res1[1].a - Math.acosh(2.71828)) > 1e-6) throw new Error("arccosh(e) failed");
if (Math.abs(res1[2].a - Math.acosh(10)) > 1e-6) throw new Error("arccosh(10) failed");
if (Math.abs(res1[3].a - Math.acosh(100)) > 1e-6) throw new Error("arccosh(100) failed");
if (res1[4].a !== null) throw new Error("arccosh(null) should be null");

// 2. Out-of-bounds Domain Inputs (< 1) -> Should cleanly return null
const dfOob = $df.data({
    val: [0.9999, 0, -0.5, -1, -100, -Infinity]
});
const resOob = dfOob.select([$df.col("val").arccosh().alias("a")]).toDicts() as any[];
for (let i = 0; i < resOob.length; i++) {
    if (resOob[i].a !== null) throw new Error(`arccosh out-of-bounds at index ${i} expected null, got ${resOob[i].a}`);
}

// 3. Positive Infinity Edge Case
const dfInf = $df.data({ val: [Infinity] });
const resInf = dfInf.select([$df.col("val").arccosh().alias("a")]).toDicts() as any[];
if (resInf[0].a !== Infinity) throw new Error("arccosh(Infinity) should be Infinity");

// 4. NaN Input retains NaN
const dfNan = $df.data({ val: [NaN] });
const resNan = dfNan.select([$df.col("val").arccosh().alias("a")]).toDicts() as any[];
if (!Number.isNaN(resNan[0].a)) throw new Error("arccosh(NaN) should be NaN");

// 5. Empty DataFrame
const dfEmpty = $df.data({ val: [] });
const resEmpty = dfEmpty.select([$df.col("val").arccosh().alias("a")]).toDicts() as any[];
if (resEmpty.length !== 0) throw new Error("arccosh on empty dataframe should return empty result");

console.log("✓ StandardExpr.arccosh tests passed!");
