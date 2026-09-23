import { DataFrame } from "../../src/dataframe";

console.log("Running iterColumns tests...");

const df = new DataFrame([
    { name: "Alice", age: 30, city: "NY" },
    { name: "Bob", age: 25, city: "SF" }
]);

// 1. Basic iterColumns
const colsIterator = df.iterColumns();
const cols = Array.from(colsIterator);

if (cols.length !== 3) {
    throw new Error(`Expected 3 columns, got ${cols.length}`);
}

if (cols[0][0] !== "Alice" || cols[0][1] !== "Bob") {
    throw new Error("First column mismatch");
}
if (cols[1][0] !== 30 || cols[1][1] !== 25) {
    throw new Error("Second column mismatch");
}
if (cols[2][0] !== "NY" || cols[2][1] !== "SF") {
    throw new Error("Third column mismatch");
}

// 2. Empty DataFrame
const emptyDf = new DataFrame([]);
const emptyCols = Array.from(emptyDf.iterColumns());
if (emptyCols.length !== 0) {
    throw new Error(`Expected 0 cols for empty DataFrame, got ${emptyCols.length}`);
}

// 3. TypedArray columns iteration
const dfTyped = new DataFrame({
    i32: new Int32Array([10, 20, 30]),
    f64: new Float64Array([1.1, 2.2, 3.3])
});
const typedCols = Array.from(dfTyped.iterColumns());
if (typedCols.length !== 2 || !(typedCols[0] instanceof Int32Array) || !(typedCols[1] instanceof Float64Array)) {
    throw new Error("3. TypedArray iterColumns mismatch");
}

// 4. Partial iteration via for...of loop break
let count = 0;
for (const col of df.iterColumns()) {
    count++;
    if (count === 1) break;
}
if (count !== 1) throw new Error("4. Early break in iterColumns loop failed");

console.log("✓ iterColumns tests passed!");
