import { DataFrame } from "df-script";

console.log("Running height tests...");

// 1. Populated DataFrame
const df = new DataFrame([
    { a: 1, b: "x" },
    { a: 2, b: "y" },
    { a: 3, b: "z" }
]);
if (df.height !== 3) throw new Error(`Expected height 3, got ${df.height}`);

// 2. Empty DataFrame
const emptyDf = new DataFrame([]);
if (emptyDf.height !== 0) throw new Error(`Expected height 0, got ${emptyDf.height}`);

// 4. Mismatched column heights in Record passed to constructor throws
let didThrowMismatch = false;
try {
    new DataFrame({ a: [1, 2], b: [1, 2, 3] });
} catch (e: any) {
    didThrowMismatch = e.message.includes("Column height mismatch") || e.message.includes("height");
}
if (!didThrowMismatch) throw new Error("Expected mismatched column heights to throw");

// 5. Height-0 DataFrame schema preservation and operations
const dfHeight0 = new DataFrame([{ a: 1, b: 2 }]).limit(0);
if (dfHeight0.height !== 0 || Object.keys(dfHeight0.schema).length !== 2) {
    throw new Error("Height-0 should preserve original schema");
}
const dfH0Selected = dfHeight0.select("a");
if (dfH0Selected.height !== 0 || Object.keys(dfH0Selected.schema).length !== 1) {
    throw new Error("Select on height-0 failed");
}
const dfH0Dropped = dfHeight0.drop("a");
if (dfH0Dropped.height !== 0 || Object.keys(dfH0Dropped.schema).length !== 1) {
    throw new Error("Drop on height-0 failed");
}
const dfH0Renamed = dfHeight0.rename({ a: "c" });
if (dfH0Renamed.height !== 0 || !("c" in dfH0Renamed.schema)) {
    throw new Error("Rename on height-0 failed");
}
const dfH0WithCols = dfHeight0.withColumns({ c: 5 });
if (dfH0WithCols.height !== 0 || Object.keys(dfH0WithCols.schema).length !== 3) {
    throw new Error("withColumns on height-0 failed");
}

console.log("✓ height tests passed!");
