import { DataFrame } from "df-script";

console.log("Running slice tests...");

const df = new DataFrame([
    { val: 1 },
    { val: 2 },
    { val: 3 },
    { val: 4 },
    { val: 5 }
]);

// 1. Basic slice
const dfSlice = df.slice(1, 4);
if (dfSlice.height !== 3) throw new Error("Slice height mismatch");
const collectedSlice = dfSlice.toDicts();
if (collectedSlice[0].val !== 2 || collectedSlice[2].val !== 4) {
    throw new Error("Slice values mismatch");
}

console.log("✓ slice tests passed!");
