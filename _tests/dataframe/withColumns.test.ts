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

// 4. Multiple variadic expressions
const dfVariadic = df.withColumns(
    $df.col("age").add(1).alias("nextAge"),
    $df.lit("member").alias("role")
);
const collectedVariadic = dfVariadic.toDicts() as any[];
if (
    collectedVariadic[0].nextAge !== 31 ||
    collectedVariadic[0].role !== "member" ||
    collectedVariadic[1].nextAge !== 26 ||
    collectedVariadic[1].role !== "member"
) {
    throw new Error("Variadic expressions in withColumns failed");
}

// 5. Array of expressions
const dfArrayArgs = df.withColumns([
    $df.col("age").sub(1).alias("prevAge"),
    $df.col("name").str.lower().alias("lowerName")
]);
const collectedArrayArgs = dfArrayArgs.toDicts() as any[];
if (
    collectedArrayArgs[0].prevAge !== 29 ||
    collectedArrayArgs[0].lowerName !== "alice" ||
    collectedArrayArgs[1].prevAge !== 24 ||
    collectedArrayArgs[1].lowerName !== "bob"
) {
    throw new Error("Array of expressions in withColumns failed");
}

// 6. Overwriting an existing column (via alias and via record)
const dfOverwriteAlias = df.withColumns($df.col("age").mul(10).alias("age"));
const collectedOverwriteAlias = dfOverwriteAlias.toDicts() as any[];
if (collectedOverwriteAlias[0].age !== 300 || collectedOverwriteAlias[1].age !== 250) {
    throw new Error("Overwriting existing column via alias failed");
}

const dfOverwriteRecord = df.withColumns({ age: $df.col("age").add(100) });
const collectedOverwriteRecord = dfOverwriteRecord.toDicts() as any[];
if (collectedOverwriteRecord[0].age !== 130 || collectedOverwriteRecord[1].age !== 125) {
    throw new Error("Overwriting existing column via record failed");
}

// 7. Zero-argument withColumns preserves original schema and data
const dfNoArgs = df.withColumns();
if (dfNoArgs.height !== 2 || dfNoArgs.columns.length !== 2) {
    throw new Error("Zero-argument withColumns did not preserve DataFrame");
}

// 8. Mixing record and expression arguments
const dfMixed = df.withColumns(
    { tag: "v1" },
    $df.col("age").mul(2).alias("doubleAge")
);
const collectedMixed = dfMixed.toDicts() as any[];
if (
    collectedMixed[0].tag !== "v1" ||
    collectedMixed[0].doubleAge !== 60 ||
    collectedMixed[1].tag !== "v1" ||
    collectedMixed[1].doubleAge !== 50
) {
    throw new Error("Mixing record and expression arguments in withColumns failed");
}

// 9. Literal expression and null values in record
const dfLiterals = df.withColumns({
    score: $df.lit(100),
    empty: null
});
const collectedLiterals = dfLiterals.toDicts() as any[];
if (
    collectedLiterals[0].score !== 100 ||
    collectedLiterals[0].empty !== null ||
    collectedLiterals[1].score !== 100 ||
    collectedLiterals[1].empty !== null
) {
    throw new Error("Literal and null values in withColumns record failed");
}

// 9. Empty DataFrame (height === 0) preserves 0 height and updates schema
const dfEmpty = df.filter($df.lit(false)).withColumns({
    doubleAge: $df.col("age").mul(2),
    tag: "none"
});
if (dfEmpty.height !== 0 || dfEmpty.schema.doubleAge === undefined || dfEmpty.schema.tag === undefined) {
    throw new Error("Empty DataFrame withColumns failed");
}

// 10. Immutability: original DataFrame is not mutated
const dfImmutableCheck = df.withColumns({ extra: 999 });
if ((df.columns as string[]).includes("extra") || !dfImmutableCheck.columns.includes("extra")) {
    throw new Error("withColumns mutated original DataFrame");
}

// 11. Sequential chaining where later withColumns references earlier added column
const dfChained = df
    .withColumns({ step1: $df.col("age").add(10) })
    .withColumns({ step2: $df.col("step1").mul(2) });
const collectedChained = dfChained.toDicts() as any[];
if (collectedChained[0].step1 !== 40 || collectedChained[0].step2 !== 80) {
    throw new Error("Chained withColumns referencing newly added column failed");
}

// 12. Boolean comparison expression
const dfBool = df.withColumns({ isThirty: $df.col("age").eq(30) });
const collectedBool = dfBool.toDicts() as any[];
if (collectedBool[0].isThirty !== true || collectedBool[1].isThirty !== false) {
    throw new Error("Boolean comparison expression in withColumns failed");
}

console.log("✓ withColumns tests passed!");

