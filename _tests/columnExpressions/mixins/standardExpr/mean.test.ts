declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.mean tests...");


const df = $df.data([{ val: 10 }, { val: 20 }, { val: 30 }]);
const res = df.select([$df.col("val").mean().alias("m")]).toDicts() as any[];
if (res[0].m !== 20) throw new Error("mean failed");

// NaN edge cases: NaN values are skipped like missing values in mean
const dfNaN = $df.data([{ val: 10 }, { val: NaN }, { val: 20 }, { val: null }, { val: 30 }]);
const resNaN = dfNaN.select([$df.col("val").mean().alias("m")]).toDicts() as any[];
if (resNaN[0].m !== 20) throw new Error("mean with NaN failed: " + resNaN[0].m);

const dfAllNaN = $df.data([{ val: NaN }, { val: NaN }]);
const resAllNaN = dfAllNaN.select([$df.col("val").mean().alias("m")]).toDicts() as any[];
if (resAllNaN[0].m !== null) throw new Error("mean with all NaNs should be null: " + resAllNaN[0].m);

const dfNaNAndNull = $df.data([{ val: NaN }, { val: null }]);
const resNaNAndNull = dfNaNAndNull.select([$df.col("val").mean().alias("m")]).toDicts() as any[];
if (resNaNAndNull[0].m !== null) throw new Error("mean with NaN and null should be null: " + resNaNAndNull[0].m);

// Grouped NaN aggregation
const dfGroupNaN = $df.data([
    { group: "A", val: 10 },
    { group: "A", val: NaN },
    { group: "A", val: 30 },
    { group: "B", val: NaN },
    { group: "B", val: null },
]);
const resGroupNaN = dfGroupNaN.groupBy("group").agg($df.col("val").mean().alias("m")).toDicts() as any[];
const aRow = resGroupNaN.find(r => r.group === "A");
const bRow = resGroupNaN.find(r => r.group === "B");
if (aRow.m !== 20) throw new Error("grouped mean with NaN failed: " + aRow.m);
if (bRow.m !== null) throw new Error("grouped mean with all NaN/null failed: " + bRow.m);

console.log("✓ StandardExpr.mean tests passed!");
