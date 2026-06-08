import { DataFrame } from "../../src/dataframe";

console.log("Running rename tests...");

const df = new DataFrame([
    { id: 1, first_name: "Alice" }
]);

const dfRenamed = df.rename({ first_name: "firstName" });

if (dfRenamed.get_schema().firstName === undefined) {
    throw new Error("Renamed column firstName schema missing");
}
if (dfRenamed.get_schema().first_name !== undefined) {
    throw new Error("Old column first_name schema still exists");
}

const collected = dfRenamed.to_dicts() as any[];
if (collected[0].firstName !== "Alice") {
    throw new Error(`Expected Alice, got ${collected[0].firstName}`);
}
if (collected[0].first_name !== undefined) {
    throw new Error("Old column first_name still exists in collected row");
}

console.log("✓ rename tests passed!");

