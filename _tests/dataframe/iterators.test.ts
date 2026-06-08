import { DataFrame } from "../../src/dataframe";

console.log("Running iter_columns and iter_rows tests...");

const df = new DataFrame([
    { name: "Alice", age: 30, city: "NY" },
    { name: "Bob", age: 25, city: "SF" }
]);

// 1. Test iter_columns
const colsIterator = df.iter_columns();
const cols = Array.from(colsIterator);

if (cols.length !== 3) {
    throw new Error(`Expected 3 columns, got ${cols.length}`);
}

// Verify columns contain the exact values
if (cols[0][0] !== "Alice" || cols[0][1] !== "Bob") {
    throw new Error("First column mismatch");
}
if (cols[1][0] !== 30 || cols[1][1] !== 25) {
    throw new Error("Second column mismatch");
}
if (cols[2][0] !== "NY" || cols[2][1] !== "SF") {
    throw new Error("Third column mismatch");
}

// 2. Test iter_rows (default: unnamed / tuple array)
const rowsIterator = df.iter_rows();
const rows = Array.from(rowsIterator);

if (rows.length !== 2) {
    throw new Error(`Expected 2 rows, got ${rows.length}`);
}

const r1 = rows[0] as any[];
const r2 = rows[1] as any[];

if (r1[0] !== "Alice" || r1[1] !== 30 || r1[2] !== "NY") {
    throw new Error("First row array mismatch");
}
if (r2[0] !== "Bob" || r2[1] !== 25 || r2[2] !== "SF") {
    throw new Error("Second row array mismatch");
}

// 3. Test iter_rows with named: true
const namedRowsIterator = df.iter_rows({ named: true });
const namedRows = Array.from(namedRowsIterator);

if (namedRows.length !== 2) {
    throw new Error(`Expected 2 named rows, got ${namedRows.length}`);
}

const nr1 = namedRows[0] as Record<string, any>;
const nr2 = namedRows[1] as Record<string, any>;

if (nr1.name !== "Alice" || nr1.age !== 30 || nr1.city !== "NY") {
    throw new Error("First named row mismatch");
}
if (nr2.name !== "Bob" || nr2.age !== 25 || nr2.city !== "SF") {
    throw new Error("Second named row mismatch");
}

console.log("✓ iterators tests passed!");
