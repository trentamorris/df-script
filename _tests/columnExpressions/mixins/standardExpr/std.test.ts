declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.std tests...");


const df = $df.data([{ val: 10 }, { val: 20 }, { val: 30 }]);
const res = df.select([$df.col("val").std().alias("s")]).toDicts() as any[];
if (Math.abs(res[0].s - 10) > 1e-6) throw new Error("std failed: " + res[0].s);

// NaN edge cases: NaN values are skipped like missing values in std calculation
const dfNaN = $df.data([{ val: 10 }, { val: NaN }, { val: 20 }, { val: null }, { val: 30 }]);
const resNaN = dfNaN.select([$df.col("val").std().alias("s")]).toDicts() as any[];
if (Math.abs(resNaN[0].s - 10) > 1e-6) throw new Error("std with NaN failed: " + resNaN[0].s);

// Single non-NaN element + NaNs => std is 0
const dfSingleValid = $df.data([{ val: 10 }, { val: NaN }, { val: null }]);
const resSingleValid = dfSingleValid.select([$df.col("val").std().alias("s")]).toDicts() as any[];
if (resSingleValid[0].s !== 0) throw new Error("std with single valid item should be 0: " + resSingleValid[0].s);

// All NaNs => std is 0
const dfAllNaN = $df.data([{ val: NaN }, { val: NaN }]);
const resAllNaN = dfAllNaN.select([$df.col("val").std().alias("s")]).toDicts() as any[];
if (resAllNaN[0].s !== 0) throw new Error("std with all NaNs should be 0: " + resAllNaN[0].s);

// Grouped std with NaNs
const dfGroupNaN = $df.data([
    { group: "A", val: 10 },
    { group: "A", val: NaN },
    { group: "A", val: 30 },
    { group: "B", val: NaN },
    { group: "B", val: 5 },
]);
const resGroupNaN = dfGroupNaN.groupBy("group").agg($df.col("val").std().alias("s")).toDicts() as any[];
const aRow = resGroupNaN.find(r => r.group === "A");
const bRow = resGroupNaN.find(r => r.group === "B");
if (Math.abs(aRow.s - 14.1421356) > 1e-4) throw new Error("grouped std with NaN failed: " + aRow.s);
if (bRow.s !== 0) throw new Error("grouped std with single valid and NaN should be 0: " + bRow.s);

console.log("✓ StandardExpr.std tests passed!");
