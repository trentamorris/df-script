import { DataFrame } from "../../src/dataframe";
import { $df } from "../../src/api";

console.log("Running with_columns tests...");

const df = new DataFrame([
    { name: "Alice", age: 30 },
    { name: "Bob", age: 25 }
]);

// 1. Add static values and expressions using a record
const dfWithRecord = df.with_columns({
    status: "active",
    doubleAge: $df.col("age").mul(2)
});

if (dfWithRecord.height !== 2) throw new Error("Expected height 2");

const schemaRecord = dfWithRecord.get_schema();
if (schemaRecord.status === undefined || schemaRecord.doubleAge === undefined) {
    throw new Error("New columns missing in schema from record input");
}

const collectedRecord = dfWithRecord.to_dicts() as any[];
if (
    collectedRecord[0].status !== "active" ||
    collectedRecord[0].doubleAge !== 60 ||
    collectedRecord[1].status !== "active" ||
    collectedRecord[1].doubleAge !== 50
) {
    throw new Error("Values mismatch from record input");
}

// 2. Add column using alias expression directly
const dfWithExpr = df.with_columns(
    $df.col("age").add(5).alias("agePlusFive")
);
const schemaExpr = dfWithExpr.get_schema();
if (schemaExpr.agePlusFive === undefined) {
    throw new Error("New column missing in schema from expression input");
}
const collectedExpr = dfWithExpr.to_dicts() as any[];
if (collectedExpr[0].agePlusFive !== 35 || collectedExpr[1].agePlusFive !== 30) {
    throw new Error("Values mismatch from expression input");
}

console.log("✓ with_columns tests passed!");

