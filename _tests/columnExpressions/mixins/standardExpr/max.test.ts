declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.max tests...");


const df = $df.data([{ val: 10 }, { val: 50 }, { val: 20 }]);
const res = df.select([$df.col("val").max().alias("m")]).toDicts() as any[];
if (res[0].m !== 50) throw new Error("max failed");

// NaN edge cases: standard max ignores NaN (unlike nanMax which propagates NaN)
const dfNaN = $df.data([{ val: 10 }, { val: NaN }, { val: 50 }, { val: null }, { val: 20 }]);
const resNaN = dfNaN.select([$df.col("val").max().alias("m")]).toDicts() as any[];
if (resNaN[0].m !== 50) throw new Error("max with NaN failed: " + resNaN[0].m);

const dfAllNaN = $df.data([{ val: NaN }, { val: NaN }]);
const resAllNaN = dfAllNaN.select([$df.col("val").max().alias("m")]).toDicts() as any[];
if (resAllNaN[0].m !== null) throw new Error("max with all NaNs should be null: " + resAllNaN[0].m);

const dfNaNAndNull = $df.data([{ val: NaN }, { val: null }]);
const resNaNAndNull = dfNaNAndNull.select([$df.col("val").max().alias("m")]).toDicts() as any[];
if (resNaNAndNull[0].m !== null) throw new Error("max with NaN and null should be null: " + resNaNAndNull[0].m);

// Grouped max with NaNs
const dfGroupNaN = $df.data([
    { group: "A", val: 10 },
    { group: "A", val: NaN },
    { group: "A", val: 75 },
    { group: "B", val: NaN },
    { group: "B", val: null },
]);
const resGroupNaN = dfGroupNaN.groupBy("group").agg($df.col("val").max().alias("m")).toDicts() as any[];
const aRow = resGroupNaN.find(r => r.group === "A");
const bRow = resGroupNaN.find(r => r.group === "B");
if (aRow.m !== 75) throw new Error("grouped max with NaN failed: " + aRow.m);
if (bRow.m !== null) throw new Error("grouped max with all NaN/null failed: " + bRow.m);

console.log("✓ StandardExpr.max tests passed!");
