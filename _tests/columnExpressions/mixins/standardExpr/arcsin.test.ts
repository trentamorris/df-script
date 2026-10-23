declare const process: any;
import { $df } from "../../../../src";

console.log("Running StandardExpr.arcsin tests...");

// 1. Standard Domain [-1, 1] Boundaries, Center & Null Values
const df1 = $df.data({
    val: [1, 0, -1, 0.5, -0.5, null]
});
const res1 = df1.select([$df.col("val").arcsin().alias("a")]).toDicts() as any[];

if (Math.abs(res1[0].a - Math.PI / 2) > 1e-6) throw new Error("arcsin(1) should be pi/2");
if (res1[1].a !== 0) throw new Error("arcsin(0) should be 0");
if (Math.abs(res1[2].a - (-Math.PI / 2)) > 1e-6) throw new Error("arcsin(-1) should be -pi/2");
if (Math.abs(res1[3].a - Math.PI / 6) > 1e-6) throw new Error("arcsin(0.5) should be pi/6");
if (Math.abs(res1[4].a - (-Math.PI / 6)) > 1e-6) throw new Error("arcsin(-0.5) should be -pi/6");
if (res1[5].a !== null) throw new Error("arcsin(null) should be null");

// 2. Out-of-bounds Domain Inputs (< -1 or > 1) -> Should cleanly return null
const dfOob = $df.data({
    val: [1.0001, -1.0001, 100, -100, Infinity, -Infinity]
});
const resOob = dfOob.select([$df.col("val").arcsin().alias("a")]).toDicts() as any[];
for (let i = 0; i < resOob.length; i++) {
    if (resOob[i].a !== null) throw new Error(`arcsin out-of-bounds at index ${i} expected null, got ${resOob[i].a}`);
}

// 3. NaN Input retains NaN
const dfNan = $df.data({ val: [NaN] });
const resNan = dfNan.select([$df.col("val").arcsin().alias("a")]).toDicts() as any[];
if (!Number.isNaN(resNan[0].a)) throw new Error("arcsin(NaN) should be NaN");

// 4. Empty DataFrame
const dfEmpty = $df.data({ val: [] });
const resEmpty = dfEmpty.select([$df.col("val").arcsin().alias("a")]).toDicts() as any[];
if (resEmpty.length !== 0) throw new Error("arcsin on empty dataframe should return empty result");

console.log("✓ StandardExpr.arcsin tests passed!");
