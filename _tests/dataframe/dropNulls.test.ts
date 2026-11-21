import { DataFrame } from "df-script";

console.log("Running dropNulls tests...");

// Helper for checking exceptions
function assertThrows(fn: () => void, expectedPhrase: string) {
    try {
        fn();
        throw new Error("Expected function to throw, but it succeeded.");
    } catch (e: any) {
        if (!e.message.includes(expectedPhrase)) {
            throw new Error(`Expected error containing "${expectedPhrase}", but got: "${e.message}"`);
        }
    }
}

const df = new DataFrame({
    a: [1, null, 3, 4],
    b: ["x", "y", null, "w"],
    c: [true, true, true, null]
});

// 1. Global dropNulls (drops any row with null in a, b, or c)
// Only row 0 (1, "x", true) has no nulls.
const resGlobal = df.dropNulls();
if (resGlobal.height !== 1) throw new Error(`Expected height 1, got ${resGlobal.height}`);
if (resGlobal.item(0, "a") !== 1) throw new Error("Expected 1");

// 2. Subset dropNulls for "a" (drops row 1)
const resA = df.dropNulls("a");
if (resA.height !== 3) throw new Error(`Expected height 3, got ${resA.height}`);
if (resA.item(0, "a") !== 1 || resA.item(1, "a") !== 3 || resA.item(2, "a") !== 4) {
    throw new Error("Expected remaining rows to match subset");
}

// 3. Subset dropNulls for "a" and "b" (drops row 1 and row 2)
const resAB = df.dropNulls(["a", "b"]);
if (resAB.height !== 2) throw new Error(`Expected height 2, got ${resAB.height}`);
if (resAB.item(0, "a") !== 1 || resAB.item(1, "a") !== 4) {
    throw new Error("Expected remaining rows to match subset a & b");
}

// 4. Non-existent column error checking
assertThrows(() => {
    df.dropNulls("non_existent");
}, "does not exist");

// 5. Empty DataFrame case
const emptyDf = new DataFrame({ a: [] });
const resEmpty = emptyDf.dropNulls();
if (resEmpty.height !== 0) throw new Error("Expected empty DataFrame height to be 0");

console.log("✓ dropNulls tests passed!");
