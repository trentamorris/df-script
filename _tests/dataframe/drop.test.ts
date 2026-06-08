import { DataFrame } from "../../src/dataframe";

console.log("Running drop tests...");

const df = new DataFrame([
    { id: 1, name: "Alice", active: true }
]);

const dfDropped = df.drop("active");

if (dfDropped.get_schema().active !== undefined) {
    throw new Error("Dropped column active still exists in schema");
}

const collected = dfDropped.to_dicts() as any[];
if (collected[0].active !== undefined) {
    throw new Error("Dropped column active still exists in collected row");
}
if (collected[0].name !== "Alice" || collected[0].id !== 1) {
    throw new Error("Remaining columns values mismatch");
}

console.log("✓ drop tests passed!");

