import { DataFrame } from "../../src/dataframe";
import { $df } from "../../src/api";

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
const dfFiltered2 = df.filter($df.col("age").ge(25));
if (dfFiltered2.height !== 2) throw new Error("Filter by expression height mismatch");
const collected = dfFiltered2.to_dicts();
if (collected[0].name !== "Alice" || collected[1].name !== "Charlie") {
    throw new Error("Filtered values mismatch");
}

console.log("✓ filter tests passed!");

