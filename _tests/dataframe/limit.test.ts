import { DataFrame } from "df-script";

console.log("Running limit tests...");

const df = new DataFrame([
    { val: 1 },
    { val: 2 },
    { val: 3 },
    { val: 4 },
    { val: 5 }
]);

// 1. Basic limit
const dfLim = df.limit(2);
if (dfLim.height !== 2) throw new Error("Limit height mismatch");

// 2. Limit with offset / from end
const dfLimPartial = df.limit(3, { from: "end" });
if (dfLimPartial.height !== 3) throw new Error("Limit with partial options height mismatch");
const collectedLimPartial = dfLimPartial.toDicts();
if (collectedLimPartial[0].val !== 3 || collectedLimPartial[2].val !== 5) {
    throw new Error("Limit with partial options values mismatch");
}

// 3. Limit with NaN handling
const dfLimNaN = df.limit(NaN, { offset: NaN });
if (dfLimNaN.height !== 0) throw new Error("Limit with NaN height mismatch");

console.log("✓ limit tests passed!");
