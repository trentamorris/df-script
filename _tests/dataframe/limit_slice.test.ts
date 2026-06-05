import { DataFrame } from "../../src/dataframe";

console.log("Running limit and slice tests...");

const df = new DataFrame([
    { val: 1 },
    { val: 2 },
    { val: 3 },
    { val: 4 },
    { val: 5 }
]);

// 1. Limit
const dfLim = df.limit(2);
if (dfLim.height !== 2) throw new Error("Limit height mismatch");

// 1.1 Limit with partial options (verifying default offset = 0 in argument)
const dfLimPartial = df.limit(3, { from: "end" });
if (dfLimPartial.height !== 3) throw new Error("Limit with partial options height mismatch");
const collectedLimPartial = dfLimPartial.to_dicts();
if (collectedLimPartial[0].val !== 3 || collectedLimPartial[2].val !== 5) {
    throw new Error("Limit with partial options values mismatch");
}

// 1.2 Limit with NaN handling
const dfLimNaN = df.limit(NaN, { offset: NaN });
if (dfLimNaN.height !== 0) throw new Error("Limit with NaN height mismatch");


// 2. Slice
const dfSlice = df.slice(1, 4);
if (dfSlice.height !== 3) throw new Error("Slice height mismatch");
const collectedSlice = dfSlice.to_dicts();
if (collectedSlice[0].val !== 2 || collectedSlice[2].val !== 4) {
    throw new Error("Slice values mismatch");
}

// 3. Head & Tail
if (df.head(2).height !== 2) throw new Error("Head failed");
if (df.tail(2).height !== 2) throw new Error("Tail failed");

console.log("✓ limit and slice tests passed!");

