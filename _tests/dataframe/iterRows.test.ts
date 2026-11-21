import { DataFrame } from "df-script";

console.log("Running iterRows tests...");

const df = new DataFrame([
    { name: "Alice", age: 30, city: "NY" },
    { name: "Bob", age: 25, city: "SF" }
]);

// 1. Unnamed tuple rows
const rows = Array.from(df.iterRows());
if (rows.length !== 2) throw new Error("Length mismatch");
const r1 = rows[0] as any[];
const r2 = rows[1] as any[];
if (r1[0] !== "Alice" || r1[1] !== 30 || r1[2] !== "NY") {
    throw new Error("First row mismatch");
}

// 2. Named rows
const namedRows = Array.from(df.iterRows({ named: true }));
if (namedRows.length !== 2) throw new Error("Named rows length mismatch");
const nr1 = namedRows[0] as Record<string, any>;
if (nr1.name !== "Alice" || nr1.age !== 30 || nr1.city !== "NY") {
    throw new Error("First named row mismatch");
}

// 3. Early termination
let count = 0;
for (const _ of df.iterRows()) {
    count++;
    break;
}
if (count !== 1) throw new Error("Early termination break loop failed");

console.log("✓ iterRows tests passed!");
