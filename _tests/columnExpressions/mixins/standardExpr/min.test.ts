declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.min tests...");


const df = $df.data([{ val: 10 }, { val: 50 }, { val: 20 }]);
const res = df.select([$df.col("val").min().alias("m")]).toDicts() as any[];
if (res[0].m !== 10) throw new Error("min failed");

// NaN edge cases: standard min ignores NaN (unlike nanMin which propagates NaN)
const dfNaN = $df.data([{ val: 10 }, { val: NaN }, { val: 50 }, { val: null }, { val: 20 }]);
const resNaN = dfNaN.select([$df.col("val").min().alias("m")]).toDicts() as any[];
if (resNaN[0].m !== 10) throw new Error("min with NaN failed: " + resNaN[0].m);

const dfAllNaN = $df.data([{ val: NaN }, { val: NaN }]);
const resAllNaN = dfAllNaN.select([$df.col("val").min().alias("m")]).toDicts() as any[];
if (resAllNaN[0].m !== null) throw new Error("min with all NaNs should be null: " + resAllNaN[0].m);

const dfNaNAndNull = $df.data([{ val: NaN }, { val: null }]);
const resNaNAndNull = dfNaNAndNull.select([$df.col("val").min().alias("m")]).toDicts() as any[];
if (resNaNAndNull[0].m !== null) throw new Error("min with NaN and null should be null: " + resNaNAndNull[0].m);

// Grouped min with NaNs
const dfGroupNaN = $df.data([
    { group: "A", val: 10 },
    { group: "A", val: NaN },
    { group: "A", val: 5 },
    { group: "B", val: NaN },
    { group: "B", val: null },
]);
const resGroupNaN = dfGroupNaN.groupBy("group").agg($df.col("val").min().alias("m")).toDicts() as any[];
const aRow = resGroupNaN.find(r => r.group === "A");
const bRow = resGroupNaN.find(r => r.group === "B");
if (aRow.m !== 5) throw new Error("grouped min with NaN failed: " + aRow.m);
if (bRow.m !== null) throw new Error("grouped min with all NaN/null failed: " + bRow.m);

console.log("✓ StandardExpr.min tests passed!");
