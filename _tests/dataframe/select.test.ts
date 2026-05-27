import { DataFrame } from "../../dataframe";
import { $tbl } from "../../api";

console.log("Running select tests...");

const df = new DataFrame([
    { name: "Alice", age: 30, city: "NY" },
    { name: "Bob", age: 25, city: "SF" }
]);

// 1. Simple selection of columns by name
const df1 = df.select("name", "city");
if (df1.height !== 2) throw new Error("Expected height 2");
const schema1 = df1.getSchema();
if (schema1.name === undefined || schema1.city === undefined || schema1.age !== undefined) {
    throw new Error("Columns mismatch on simple selection schema");
}
const collected1 = df1.collect();
if (collected1[0].name !== "Alice" || collected1[0].city !== "NY" || (collected1[0] as any).age !== undefined) {
    throw new Error("Values mismatch on simple selection");
}

// 2. Select using column expressions and aliasing
const df2 = df.select($tbl.col("age").alias("years"), "name");
const schema2 = df2.getSchema();
if (schema2.years === undefined || schema2.name === undefined || schema2.age !== undefined) {
    throw new Error("Columns mismatch on expression selection schema");
}
const collected2 = df2.collect();
if (collected2[0].years !== 30 || collected2[0].name !== "Alice") {
    throw new Error("Values mismatch on expression selection");
}

// 3. Select all except some columns (using AllColumnsExpr with exclude)
const df3 = df.select($tbl.all().exclude("city"));
const schema3 = df3.getSchema();
if (schema3.name === undefined || schema3.age === undefined || schema3.city !== undefined) {
    throw new Error("Columns mismatch on all-exclude selection schema");
}

console.log("✓ select tests passed!");

