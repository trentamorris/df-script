declare const process: any;
import { $df } from "../../../../src";

console.log("Running StandardExpr.arctan2 tests...");

// 1. All 4 Quadrants, Zero & Null Handling
const df1 = $df.data({
    y: [1, 1, -1, -1, 0, 1, null, 2],
    x: [1, -1, 1, -1, 1, 0, 3, null]
});
const res1 = df1.select([$df.col("y").arctan2($df.col("x")).alias("a")]).toDicts() as any[];

if (Math.abs(res1[0].a - Math.PI / 4) > 1e-6) throw new Error("Quadrant I failed");
if (Math.abs(res1[1].a - (3 * Math.PI / 4)) > 1e-6) throw new Error("Quadrant II failed");
if (Math.abs(res1[2].a - (-Math.PI / 4)) > 1e-6) throw new Error("Quadrant IV failed");
if (Math.abs(res1[3].a - (-3 * Math.PI / 4)) > 1e-6) throw new Error("Quadrant III failed");
if (res1[4].a !== 0) throw new Error("arctan2(0, 1) should be 0");
if (Math.abs(res1[5].a - Math.PI / 2) > 1e-6) throw new Error("arctan2(1, 0) should be pi/2");
if (res1[6].a !== null) throw new Error("arctan2(null, x) should be null");
if (res1[7].a !== null) throw new Error("arctan2(y, null) should be null");

// 2. Scalar Argument
const dfScalar = $df.data({ y: [3, -3, null] });
const resScalar = dfScalar.select([$df.col("y").arctan2(4).alias("a")]).toDicts() as any[];
if (Math.abs(resScalar[0].a - Math.atan2(3, 4)) > 1e-6) throw new Error("Scalar arctan2 positive failed");
if (Math.abs(resScalar[1].a - Math.atan2(-3, 4)) > 1e-6) throw new Error("Scalar arctan2 negative failed");
if (resScalar[2].a !== null) throw new Error("Scalar arctan2 null failed");

// 3. Empty DataFrame
const dfEmpty = $df.data({ y: [], x: [] });
const resEmpty = dfEmpty.select([$df.col("y").arctan2($df.col("x")).alias("a")]).toDicts() as any[];
if (resEmpty.length !== 0) throw new Error("arctan2 on empty dataframe should return empty result");

console.log("✓ StandardExpr.arctan2 tests passed!");
