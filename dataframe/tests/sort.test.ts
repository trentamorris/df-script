import { DataFrame } from "../dataframe";

console.log("Running sort tests...");

const df = new DataFrame([
    { name: "Alice", age: 30 },
    { name: "Bob", age: 25 },
    { name: "Charlie", age: null },
    { name: "Dave", age: 35 }
]);

// 1. Sort by age ascending (nulls last by default)
const dfSortedAsc = df.sort({ by: "age", descending: false });
const collectedAsc = dfSortedAsc.collect();
if (
    collectedAsc[0].name !== "Bob" || // age 25
    collectedAsc[1].name !== "Alice" || // age 30
    collectedAsc[2].name !== "Dave" || // age 35
    collectedAsc[3].name !== "Charlie" // age null (nulls last)
) {
    throw new Error("Sort ascending with nulls last failed");
}

// 2. Sort by age descending (nulls last by default)
const dfSortedDesc = df.sort({ by: "age", descending: true });
const collectedDesc = dfSortedDesc.collect();
if (
    collectedDesc[0].name !== "Dave" || // age 35
    collectedDesc[1].name !== "Alice" || // age 30
    collectedDesc[2].name !== "Bob" || // age 25
    collectedDesc[3].name !== "Charlie" // age null (nulls last)
) {
    throw new Error("Sort descending with nulls last failed");
}

// 3. Sort by age ascending, nulls first (nullsLast: false)
const dfNullsFirst = df.sort({ by: "age", descending: false, nullsLast: false });
const collectedNullsFirst = dfNullsFirst.collect();
if (
    collectedNullsFirst[0].name !== "Charlie" || // age null
    collectedNullsFirst[1].name !== "Bob" ||
    collectedNullsFirst[2].name !== "Alice" ||
    collectedNullsFirst[3].name !== "Dave"
) {
    throw new Error("Sort ascending with nulls first failed");
}

// 4. Custom comparator: sort names by length ascending
const dfCustom = df.sort({
    by: "name",
    custom: {
        name: (a: string, b: string) => a.length - b.length
    }
});
const collectedCustom = dfCustom.collect();
if (
    collectedCustom[0].name !== "Bob" || // length 3
    collectedCustom[1].name !== "Dave" || // length 4
    collectedCustom[2].name !== "Alice" || // length 5
    collectedCustom[3].name !== "Charlie" // length 7
) {
    throw new Error("Custom comparator sort failed");
}

console.log("✓ sort tests passed!");
