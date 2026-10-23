declare const process: any;
import { $df } from "../../../../src";

console.log("Running StandardExpr.arccos tests...");

// 1. Standard Domain [-1, 1] Boundaries, Center & Null Values
const df1 = $df.data({
    val: [1, 0, -1, 0.5, -0.5, null]
});
const res1 = df1.select([$df.col("val").arccos().alias("a")]).toDicts() as any[];

if (res1[0].a !== 0) throw new Error("arccos(1) should be 0");
if (Math.abs(res1[1].a - Math.PI / 2) > 1e-6) throw new Error("arccos(0) should be pi/2");
if (Math.abs(res1[2].a - Math.PI) > 1e-6) throw new Error("arccos(-1) should be pi");
if (Math.abs(res1[3].a - Math.PI / 3) > 1e-6) throw new Error("arccos(0.5) should be pi/3");
if (Math.abs(res1[4].a - (2 * Math.PI / 3)) > 1e-6) throw new Error("arccos(-0.5) should be 2*pi/3");
if (res1[5].a !== null) throw new Error("arccos(null) should be null");

// 2. Out-of-bounds Domain Inputs (< -1 or > 1) -> Should cleanly return null
const dfOob = $df.data({
    val: [1.0001, -1.0001, 100, -100, Infinity, -Infinity]
});
const resOob = dfOob.select([$df.col("val").arccos().alias("a")]).toDicts() as any[];
for (let i = 0; i < resOob.length; i++) {
    if (resOob[i].a !== null) throw new Error(`arccos out-of-bounds at index ${i} expected null, got ${resOob[i].a}`);
}

// 3. NaN Input retains NaN
const dfNan = $df.data({ val: [NaN] });
const resNan = dfNan.select([$df.col("val").arccos().alias("a")]).toDicts() as any[];
if (!Number.isNaN(resNan[0].a)) throw new Error("arccos(NaN) should be NaN");

// 4. Empty DataFrame
const dfEmpty = $df.data({ val: [] });
const resEmpty = dfEmpty.select([$df.col("val").arccos().alias("a")]).toDicts() as any[];
if (resEmpty.length !== 0) throw new Error("arccos on empty dataframe should return empty result");

// 5. GroupBy aggregation context / expression evaluation
const dfGrouped = $df.data({
    group: ["g1", "g1", "g2", "g2"],
    val: [1, 0, -1, null]
});
const resGrouped = dfGrouped.withColumns($df.col("val").arccos().alias("acos_val")).toDicts() as any[];
if (resGrouped[0].acos_val !== 0) throw new Error("Grouped arccos(1) failed");
if (Math.abs(resGrouped[1].acos_val - Math.PI / 2) > 1e-6) throw new Error("Grouped arccos(0) failed");
if (Math.abs(resGrouped[2].acos_val - Math.PI) > 1e-6) throw new Error("Grouped arccos(-1) failed");
if (resGrouped[3].acos_val !== null) throw new Error("Grouped arccos(null) failed");

console.log("✓ StandardExpr.arccos tests passed!");
