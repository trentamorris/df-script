import { DataFrame, $df } from "df-script";

console.log("Running item tests...");

const df = new DataFrame([
    { a: 1, b: "x" },
    { a: 2, b: "y" }
]);

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

// 1. Fetch using index coordinates
if (df.item(0, "a") !== 1) throw new Error("Expected 1");
if (df.item(1, "b") !== "y") throw new Error("Expected 'y'");

// 2. Fetch using column index coordinate
if (df.item(0, 0) !== 1) throw new Error("Expected 1");
if (df.item(1, 1) !== "y") throw new Error("Expected 'y'");

// 3. Throw on shape mismatch when no arguments passed
assertThrows(() => {
    df.item();
}, "can only be called without arguments if the shape is (1, 1)");

// 4. Fetch value on (1, 1) shape without arguments
const df1x1 = df.select("a").limit(1);
if (df1x1.item() !== 1) {
    throw new Error(`Expected 1, got ${df1x1.item()}`);
}

// 5. Error boundaries
assertThrows(() => {
    df.item(2, "a");
}, "Row index 2 is out of bounds");

assertThrows(() => {
    df.item(0, 2);
}, "Column index 2 is out of bounds");

assertThrows(() => {
    df.item(0, "c" as any);
}, "Column \"c\" does not exist");

assertThrows(() => {
    df.item(0, undefined);
}, "requires both row and column to be specified");

// 6. Polars Documentation Examples
const dfPolars = new DataFrame([
    { a: 1, b: 4 },
    { a: 2, b: 5 },
    { a: 3, b: 6 }
]);

const resultVal = dfPolars.select(
    $df.col("a").mul($df.col("b")).sum()
).item();

if (resultVal !== 32) {
    throw new Error(`Expected 32, got ${resultVal}`);
}

// 7. Negative and boundary edge cases
assertThrows(() => {
    df.item(-1, "a");
}, "Row index -1 is out of bounds");

assertThrows(() => {
    df.item(-1, 0);
}, "Row index -1 is out of bounds");

// 8. Null value in (1, 1) DataFrame
const dfNull = new DataFrame([{ val: null }]);
if (dfNull.item() !== null) {
    throw new Error(`Expected null, got ${dfNull.item()}`);
}

// 9. Empty DataFrame (0 rows) throws out of bounds
const dfEmpty = new DataFrame({ a: [] as number[] });
assertThrows(() => {
    dfEmpty.item(0, "a");
}, "Row index 0 is out of bounds");

// 10. BigInt and Date values preserved
const d = new Date("2026-01-01T00:00:00.000Z");
const dfTyped = new DataFrame([{ big: 9007199254740993n, dt: d }]);
if (dfTyped.item(0, "big") !== 9007199254740993n) {
    throw new Error("Expected BigInt value");
}
if (!(dfTyped.item(0, "dt") instanceof Date) || dfTyped.item(0, "dt").getTime() !== d.getTime()) {
    throw new Error("Expected Date value");
}

assertThrows(() => {
    df.item(0, -1);
}, "Column index -1 is out of bounds");

assertThrows(() => {
    df.item(undefined as any, "a");
}, "requires both row and column to be specified");

console.log("✓ item tests passed!");


