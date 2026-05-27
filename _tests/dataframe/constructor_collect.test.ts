import { DataFrame } from "../../dataframe";

console.log("Running constructor and collect tests...");

const data = [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" }
];

const df = new DataFrame(data);

// Verify height
if (df.height !== 2) {
    throw new Error(`Expected height 2, got ${df.height}`);
}

// Verify schema inference
const schema = df.getSchema();
if (schema.id.name !== "Int32") {
    throw new Error(`Expected id to be Int32, got ${schema.id.name}`);
}
if (schema.name.name !== "Utf8") {
    throw new Error(`Expected name to be Utf8, got ${schema.name.name}`);
}

// Verify collect
const collected = df.collect();
if (collected.length !== 2) {
    throw new Error(`Expected collected length 2, got ${collected.length}`);
}
if (collected[0].name !== "Alice" || collected[1].id !== 2) {
    throw new Error("Collected values mismatch");
}

console.log("✓ constructor and collect tests passed!");

