import { DataFrame } from "../../dataframe";

console.log("Running unique tests...");

const df = new DataFrame([
    { a: 1, b: 2, c: 3 },
    { a: 1, b: 2, c: 4 }, // duplicated on (a, b) but not full row
    { a: 2, b: 3, c: 5 },
    { a: 1, b: 2, c: 3 }  // exact duplicate of first row
]);

// 1. Unique by full row
const dfUniqueAll = df.unique();
if (dfUniqueAll.height !== 3) {
    throw new Error(`Expected height 3, got ${dfUniqueAll.height}`);
}
const colAll = dfUniqueAll.collect();
// The last row should be omitted
if (colAll.filter(r => r.a === 1 && r.b === 2 && r.c === 3).length !== 1) {
    throw new Error("Full row duplicate not removed or too many removed");
}

// 2. Unique by specific column(s)
const dfUniqueAB = df.unique(["a", "b"]);
if (dfUniqueAB.height !== 2) {
    throw new Error(`Expected height 2, got ${dfUniqueAB.height}`);
}
const colAB = dfUniqueAB.collect();
// There should only be one row with a=1, b=2, and one with a=2, b=3
if (colAB.filter(r => r.a === 1 && r.b === 2).length !== 1) {
    throw new Error("Duplicate on column subset (a, b) not handled");
}

console.log("✓ unique tests passed!");

