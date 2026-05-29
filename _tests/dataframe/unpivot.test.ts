import { DataFrame } from "../../src/dataframe";

console.log("Running unpivot tests...");

const df = new DataFrame([
    { id: 1, math: 90, science: 85 },
    { id: 2, math: 80, science: 95 }
]);

const dfUnpivoted = df.unpivot({ idVars: "id", valueVars: ["math", "science"], varName: "subject", valueName: "score" });

if (dfUnpivoted.height !== 4) {
    throw new Error(`Expected height 4, got ${dfUnpivoted.height}`);
}

const schema = dfUnpivoted.getSchema();
if (schema.id === undefined || schema.subject === undefined || schema.score === undefined) {
    throw new Error("Schema keys missing on unpivot");
}
if (schema.subject.name !== "Utf8") {
    throw new Error(`Expected subject type Utf8, got ${schema.subject.name}`);
}

const collected = dfUnpivoted.collect();
const row1math = collected.find(r => r.id === 1 && r.subject === "math");
const row2sci = collected.find(r => r.id === 2 && r.subject === "science");

if (!row1math || row1math.score !== 90) {
    throw new Error("Row 1 math score mismatch");
}
if (!row2sci || row2sci.score !== 95) {
    throw new Error("Row 2 science score mismatch");
}

console.log("✓ unpivot tests passed!");

