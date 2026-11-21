import { DataFrame } from "df-script";
import { $df } from "df-script";

console.log("Running withColumns tests...");

const df = new DataFrame([
    { name: "Alice", age: 30 },
    { name: "Bob", age: 25 }
]);

// 1. Add static values and expressions using a record
const dfWithRecord = df.withColumns({
    status: "active",
    doubleAge: $df.col("age").mul(2)
});

if (dfWithRecord.height !== 2) throw new Error("Expected height 2");

const schemaRecord = dfWithRecord.schema;
if (schemaRecord.status === undefined || schemaRecord.doubleAge === undefined) {
    throw new Error("New columns missing in schema from record input");
}

const collectedRecord = dfWithRecord.toDicts() as any[];
if (
    collectedRecord[0].status !== "active" ||
    collectedRecord[0].doubleAge !== 60 ||
    collectedRecord[1].status !== "active" ||
    collectedRecord[1].doubleAge !== 50
) {
    throw new Error("Values mismatch from record input");
}

// 2. Add column using alias expression directly
const dfWithExpr = df.withColumns(
    $df.col("age").add(5).alias("agePlusFive")
);
const schemaExpr = dfWithExpr.schema;
if (schemaExpr.agePlusFive === undefined) {
    throw new Error("New column missing in schema from expression input");
}
const collectedExpr = dfWithExpr.toDicts() as any[];
if (collectedExpr[0].agePlusFive !== 35 || collectedExpr[1].agePlusFive !== 30) {
    throw new Error("Values mismatch from expression input");
}

// 3. Multi-column modification via array ColumnExpr
const dfMultiInput = new DataFrame([
    { name: "Alice", status: "active", age: 30 },
    { name: "Bob", status: "inactive", age: 25 }
]);

const dfMultiOutput = dfMultiInput.withColumns(
    $df.col(["name", "status"]).str.upper()
);

const collectedMulti = dfMultiOutput.toDicts() as any[];
if (
    collectedMulti[0].name !== "ALICE" ||
    collectedMulti[0].status !== "ACTIVE" ||
    collectedMulti[1].name !== "BOB" ||
    collectedMulti[1].status !== "INACTIVE"
) {
    throw new Error("Multi-column modification via array ColumnExpr failed");
}

console.log("✓ withColumns tests passed!");

