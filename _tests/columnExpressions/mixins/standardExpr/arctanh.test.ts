declare const process: any;
import { $df } from "../../../../src";

console.log("Running StandardExpr.arctanh tests...");

// 1. Valid Open Interval Domain (-1, 1), Zero & Null
const df1 = $df.data({
    val: [0, 0.5, -0.5, 0.99, -0.99, null]
});
const res1 = df1.select([$df.col("val").arctanh().alias("a")]).toDicts() as any[];

if (res1[0].a !== 0) throw new Error("arctanh(0) should be 0");
if (Math.abs(res1[1].a - Math.atanh(0.5)) > 1e-6) throw new Error("arctanh(0.5) failed");
if (Math.abs(res1[2].a - Math.atanh(-0.5)) > 1e-6) throw new Error("arctanh(-0.5) failed");
if (Math.abs(res1[3].a - Math.atanh(0.99)) > 1e-6) throw new Error("arctanh(0.99) failed");
if (Math.abs(res1[4].a - Math.atanh(-0.99)) > 1e-6) throw new Error("arctanh(-0.99) failed");
if (res1[5].a !== null) throw new Error("arctanh(null) should be null");

// 2. Boundaries & Out-of-bounds (<= -1 or >= 1) -> Cleanly return null
const dfOob = $df.data({
    val: [1, -1, 1.0001, -1.0001, 10, -10, Infinity, -Infinity]
});
const resOob = dfOob.select([$df.col("val").arctanh().alias("a")]).toDicts() as any[];
for (let i = 0; i < resOob.length; i++) {
    if (resOob[i].a !== null) throw new Error(`arctanh boundary/out-of-bounds at index ${i} expected null, got ${resOob[i].a}`);
}

// 3. NaN Input retains NaN
const dfNan = $df.data({ val: [NaN] });
const resNan = dfNan.select([$df.col("val").arctanh().alias("a")]).toDicts() as any[];
if (!Number.isNaN(resNan[0].a)) throw new Error("arctanh(NaN) should be NaN");

// 4. Empty DataFrame
const dfEmpty = $df.data({ val: [] });
const resEmpty = dfEmpty.select([$df.col("val").arctanh().alias("a")]).toDicts() as any[];
if (resEmpty.length !== 0) throw new Error("arctanh on empty dataframe should return empty result");

console.log("✓ StandardExpr.arctanh tests passed!");
