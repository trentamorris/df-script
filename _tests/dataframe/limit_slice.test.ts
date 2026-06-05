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

// 4. Gather
import { DataFrameError } from "../../src/exceptions";

// 4.1 Basic gather
const dfGather = df.gather([0, 2, 4]);
if (dfGather.height !== 3) throw new Error("Gather height mismatch");
const collectedGather = dfGather.to_dicts();
if (collectedGather[0].val !== 1 || collectedGather[1].val !== 3 || collectedGather[2].val !== 5) {
    throw new Error("Gather values mismatch");
}

// 4.2 Single index gather
const dfGatherSingle = df.gather(1);
if (dfGatherSingle.height !== 1) throw new Error("Gather single height mismatch");
if (dfGatherSingle.to_dicts()[0].val !== 2) throw new Error("Gather single value mismatch");

// 4.3 Negative index gather
const dfGatherNeg = df.gather([-1, -3]);
if (dfGatherNeg.height !== 2) throw new Error("Gather negative height mismatch");
const collectedGatherNeg = dfGatherNeg.to_dicts();
if (collectedGatherNeg[0].val !== 5 || collectedGatherNeg[1].val !== 3) {
    throw new Error("Gather negative values mismatch");
}

// 4.4 Out of bounds throws
let threwOob = false;
try {
    df.gather([5]);
} catch (e: any) {
    if (e instanceof DataFrameError || (e.message && e.message.includes("out of bounds"))) {
        threwOob = true;
    }
}
if (!threwOob) throw new Error("Expected out of bounds index to throw in gather");

// 4.5 null_on_oob
const dfGatherNullOob = df.gather([1, 5, -10], { null_on_oob: true });
if (dfGatherNullOob.height !== 3) throw new Error("Gather null_on_oob height mismatch");
const collectedNullOob = dfGatherNullOob.to_dicts();
if (collectedNullOob[0].val !== 2 || collectedNullOob[1].val !== null || collectedNullOob[2].val !== null) {
    throw new Error("Gather null_on_oob values mismatch");
}

// 4.6 Gather on typed arrays with null fallback
const dfTyped = new DataFrame({
    val: new Int32Array([10, 20, 30])
});
const dfTypedGather = dfTyped.gather([1, 100], { null_on_oob: true });
const collectedTyped = dfTypedGather.to_dicts();
if (collectedTyped[0].val !== 20 || collectedTyped[1].val !== null) {
    throw new Error("Gather on typed array with null_on_oob failed");
}

console.log("✓ limit and slice tests passed!");

