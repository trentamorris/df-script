import { DataFrame } from "../../src/dataframe";
import { $df } from "../../src/api";

console.log("Running reverse tests...");

// 1. Basic reverse test
const df = new DataFrame([
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
    { id: 3, name: "Charlie" }
]);

const dfReversed = df.reverse();

// Verify original DataFrame was not mutated
const origCollected = df.to_dicts();
if (origCollected[0].id !== 1 || origCollected[2].id !== 3) {
    throw new Error("Original DataFrame was mutated by reverse()!");
}

// Verify reversed order
const collected = dfReversed.to_dicts();
if (collected.length !== 3) {
    throw new Error(`Expected length 3, got ${collected.length}`);
}
if (collected[0].id !== 3 || collected[0].name !== "Charlie") {
    throw new Error(`Expected first row to be Charlie, got ${JSON.stringify(collected[0])}`);
}
if (collected[1].id !== 2 || collected[1].name !== "Bob") {
    throw new Error(`Expected second row to be Bob, got ${JSON.stringify(collected[1])}`);
}
if (collected[2].id !== 1 || collected[2].name !== "Alice") {
    throw new Error(`Expected third row to be Alice, got ${JSON.stringify(collected[2])}`);
}

// 2. Empty DataFrame reverse test
const emptyDf = new DataFrame<any>([], {});
const reversedEmpty = emptyDf.reverse();
if (reversedEmpty !== emptyDf) {
    throw new Error("Reversing empty DataFrame should return the same instance");
}

// 3. Reverse using column expressions (reverse only column "name" inside with_columns)
const dfExprReversed = df.with_columns(
    $df.col("name").reverse().alias("reversed_name")
);
const exprCollected = dfExprReversed.to_dicts();
if (exprCollected[0].id !== 1 || exprCollected[0].reversed_name !== "Charlie") {
    throw new Error(`Expected id=1, reversed_name=Charlie, got ${JSON.stringify(exprCollected[0])}`);
}
if (exprCollected[1].id !== 2 || exprCollected[1].reversed_name !== "Bob") {
    throw new Error(`Expected id=2, reversed_name=Bob, got ${JSON.stringify(exprCollected[1])}`);
}
if (exprCollected[2].id !== 3 || exprCollected[2].reversed_name !== "Alice") {
    throw new Error(`Expected id=3, reversed_name=Alice, got ${JSON.stringify(exprCollected[2])}`);
}

console.log("✓ reverse tests passed!");
