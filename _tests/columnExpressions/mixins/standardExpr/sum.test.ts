declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.sum tests...");


const df = $df.data([{ val: 10 }, { val: 20 }, { val: 30 }]);
const res = df.select([$df.col("val").sum().alias("s")]).toDicts() as any[];
if (res[0].s !== 60) throw new Error("sum failed: " + res[0].s);

// NaN edge cases: NaN values are skipped like missing values according to getArrayStats
const dfNaN = $df.data([{ val: 10 }, { val: NaN }, { val: 20 }, { val: null }, { val: 30 }]);
const resNaN = dfNaN.select([$df.col("val").sum().alias("s")]).toDicts() as any[];
if (resNaN[0].s !== 60) throw new Error("sum with NaN failed: " + resNaN[0].s);

const dfAllNaN = $df.data([{ val: NaN }, { val: NaN }]);
const resAllNaN = dfAllNaN.select([$df.col("val").sum().alias("s")]).toDicts() as any[];
if (resAllNaN[0].s !== null) throw new Error("sum with all NaNs should be null: " + resAllNaN[0].s);

const dfNaNAndNull = $df.data([{ val: NaN }, { val: null }]);
const resNaNAndNull = dfNaNAndNull.select([$df.col("val").sum().alias("s")]).toDicts() as any[];
if (resNaNAndNull[0].s !== null) throw new Error("sum with NaN and null should be null: " + resNaNAndNull[0].s);

// Grouped NaN aggregation
const dfGroupNaN = $df.data([
    { group: "A", val: 10 },
    { group: "A", val: NaN },
    { group: "A", val: 20 },
    { group: "B", val: NaN },
    { group: "B", val: null },
]);
const resGroupNaN = dfGroupNaN.groupBy("group").agg($df.col("val").sum().alias("s")).toDicts() as any[];
const aRow = resGroupNaN.find(r => r.group === "A");
const bRow = resGroupNaN.find(r => r.group === "B");
if (aRow.s !== 30) throw new Error("grouped sum with NaN failed: " + aRow.s);
if (bRow.s !== null) throw new Error("grouped sum with all NaN/null failed: " + bRow.s);

console.log("✓ StandardExpr.sum tests passed!");
