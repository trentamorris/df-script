import { DataFrame } from "df-script";

console.log("Running drop tests...");

const df = new DataFrame([
    { id: 1, name: "Alice", active: true }
]);

const dfDropped = df.drop("active");

if (dfDropped.schema.active !== undefined) {
    throw new Error("Dropped column active still exists in schema");
}

// 2. Edge Case: Dropping with nested arrays and multiple parameters
const dfMulti = new DataFrame([
    { a: 1, b: 2, c: 3, d: 4 }
]);
const dfDroppedMulti = dfMulti.drop(["a", "b"] as any, "c");
if (dfDroppedMulti.columns.length !== 1 || dfDroppedMulti.columns[0] !== "d") {
    throw new Error("Dropping with nested array arguments failed");
}

// 3. Edge Case: Dropping non-existent columns (no-op on schema/data)
const dfDropNonExistent = dfMulti.drop("non_existent" as any);
if (dfDropNonExistent.columns.length !== 4) {
    throw new Error("Dropping non-existent column should preserve existing columns");
}

// 5. Edge Case: Dropping on an empty DataFrame (height 0)
const dfEmpty = new DataFrame<{ a: number; b: string }>([]);
const dfDroppedEmpty = dfEmpty.drop("a");
if (dfDroppedEmpty.height !== 0 || dfDroppedEmpty.columns.length !== 0) {
    throw new Error("Dropping on empty dataframe failed");
}

// 6. Edge Case: Dropping columns in DataFrame with TypedArray backing
const dfTyped = new DataFrame({
    x: new Int32Array([10, 20]),
    y: new Float64Array([1.5, 2.5]),
    z: ["a", "b"]
});
const dfDroppedTyped = dfTyped.drop("y");
if (dfDroppedTyped.columns.length !== 2 || dfDroppedTyped.columns[0] !== "x" || dfDroppedTyped.columns[1] !== "z") {
    throw new Error("Dropping from TypedArray DataFrame columns mismatch");
}
if (!(dfDroppedTyped._columns.x instanceof Int32Array) || dfDroppedTyped._columns.x[0] !== 10) {
    throw new Error("TypedArray backing structure lost after drop");
}

// 7. Edge Case: Duplicate drop arguments
const dfDuplicateArgs = dfMulti.drop("a", "a", ["a"] as any);
if (dfDuplicateArgs.columns.length !== 3 || dfDuplicateArgs.columns.includes("a")) {
    throw new Error("Duplicate drop arguments handling failed");
}

// 8. Edge Case: Drop called with empty arguments (no-op)
const dfNoOp = dfMulti.drop();
if (dfNoOp.columns.length !== 4 || dfNoOp.height !== 1) {
    throw new Error("Empty drop() arguments should be a clean no-op");
}

console.log("✓ drop tests passed!");



