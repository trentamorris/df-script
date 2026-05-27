import { DataFrame } from "../../dataframe";
import { $tbl } from "../../api";

console.log("Running filter tests...");

const df = new DataFrame([
    { name: "Alice", age: 30 },
    { name: "Bob", age: 20 },
    { name: "Charlie", age: 25 }
]);

// Filter using raw predicate function
const dfFiltered1 = df.filter(row => row.age >= 25);
if (dfFiltered1.height !== 2) throw new Error("Filter by predicate height mismatch");

// Filter using expression
const dfFiltered2 = df.filter($tbl.col("age").ge(25));
if (dfFiltered2.height !== 2) throw new Error("Filter by expression height mismatch");
const collected = dfFiltered2.collect();
if (collected[0].name !== "Alice" || collected[1].name !== "Charlie") {
    throw new Error("Filtered values mismatch");
}

console.log("✓ filter tests passed!");

