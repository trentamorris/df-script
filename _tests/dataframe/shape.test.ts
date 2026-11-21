import { DataFrame } from "df-script";

console.log("Running shape tests...");

// 1. Basic shape [height, width] tuple
const df = new DataFrame([
    { a: 1, b: "x", c: true },
    { a: 2, b: "y", c: false }
]);

const shape = df.shape;
if (!Array.isArray(shape) || shape[0] !== 2 || shape[1] !== 3) {
    throw new Error(`Shape mismatch: expected [2, 3], got ${JSON.stringify(shape)}`);
}

// 2. Empty DataFrame shape
const emptyDf = new DataFrame([]);
const emptyShape = emptyDf.shape;
if (!Array.isArray(emptyShape) || emptyShape[0] !== 0 || emptyShape[1] !== 0) {
    throw new Error("Empty DataFrame shape mismatch");
}

console.log("✓ shape tests passed!");
