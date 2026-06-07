import { DataFrame } from "../../src/dataframe";
import { $df } from "../../src/api";

console.log("Running DataFrame robustness and edge-case tests...");

// Helper assert function
function assert(condition: boolean, msg: string) {
    if (!condition) {
        throw new Error(`Assertion failed: ${msg}`);
    }
}

// Helper for checking exceptions
function assertThrows(fn: () => void, expectedPhrase?: string) {
    try {
        fn();
        throw new Error("Expected function to throw, but it succeeded.");
    } catch (e: any) {
        if (expectedPhrase && !e.message.includes(expectedPhrase)) {
            throw new Error(`Expected error containing "${expectedPhrase}", but got: "${e.message}"`);
        }
    }
}

// 1. Sparse JSON / records support
const sparseData = [
    { name: "Alice", age: 30 },
    { name: "Bob", city: "NY" }, // missing age, has city
];
const dfSparse = new DataFrame(sparseData);
assert(dfSparse.height === 2, "Sparse data height should be 2");
const schemaSparse = dfSparse.getSchema();
assert("name" in schemaSparse, "Sparse schema should contain name");
assert("age" in schemaSparse, "Sparse schema should contain age");
assert("city" in schemaSparse, "Sparse schema should contain city");
const collectedSparse = dfSparse.to_dicts() as any[];
assert(collectedSparse[0].city === null, "Missing field in first row should be null");
assert(collectedSparse[1].age === null, "Missing field in second row should be null");

// 2. Mismatched column heights in Record passed to constructor
assertThrows(() => {
    new DataFrame({
        a: [1, 2],
        b: [1, 2, 3],
    });
}, "Column height mismatch");

// 3. Schema alignment (dropping extra columns)
const explicitSchema = {
    name: $df.DataType.Utf8,
    age: $df.DataType.Int32,
};
const dfAligned = new DataFrame(sparseData, explicitSchema);
const alignedSchema = dfAligned.getSchema();
assert("name" in alignedSchema && "age" in alignedSchema, "Aligned schema should contain name and age");
assert(!("city" in alignedSchema), "Aligned schema should drop city");
const alignedColumns = Object.keys(dfAligned._columns);
assert(alignedColumns.length === 2 && alignedColumns.includes("name") && alignedColumns.includes("age"), "Extra columns must be dropped");

// 4. Guards throwing on non-existent columns
const dfDummy = new DataFrame([{ a: 1, b: 2 }]);
assertThrows(() => dfDummy.groupby("c" as any), "Grouping key \"c\" does not exist");
assertThrows(() => dfDummy.groupby(["a", "c"] as any), "Grouping key \"c\" does not exist");
assertThrows(() => dfDummy.join({ other: dfDummy, on: "c" as any }), "Join key \"c\" does not exist");
assertThrows(() => dfDummy.pivot({ index: "a" as any, columns: "c" as any, values: "b" as any }), "Pivot column key \"c\" does not exist");
assertThrows(() => dfDummy.unique("c" as any), "Unique column key \"c\" does not exist");
assertThrows(() => dfDummy.unpivot({ idVars: "a" as any, valueVars: "c" as any }), "Unpivot value variable key \"c\" does not exist");
assertThrows(() => dfDummy.sort({ by: "c" as any }), "Sort key \"c\" does not exist");
assertThrows(() => dfDummy.to_list("c" as any), "Column \"c\" does not exist");

// 5. Duplicate selection error in select
assertThrows(() => dfDummy.select("a", "a"), "Duplicate column selection");
assertThrows(() => dfDummy.select($df.col("a").alias("b"), $df.col("b").alias("b")), "Duplicate column selection");

// 6. Rename collision detection
assertThrows(() => dfDummy.rename({ a: "b" }), "Rename collision");

// 7. Height-0 DataFrame schema preservation
const dfEmpty = new DataFrame([{ a: 1, b: 2 }]).limit(0);
assert(dfEmpty.height === 0, "Limit(0) should yield height 0");
assert(Object.keys(dfEmpty.getSchema()).length === 2, "Height-0 should preserve original schema");

// 7.1 select on height-0
const dfEmptySelected = dfEmpty.select("a");
assert(dfEmptySelected.height === 0, "Select on height-0 should have height 0");
assert(Object.keys(dfEmptySelected.getSchema()).length === 1 && "a" in dfEmptySelected.getSchema(), "Select on height-0 should preserve schema selection");

// 7.2 drop on height-0
const dfEmptyDropped = dfEmpty.drop("a");
assert(dfEmptyDropped.height === 0, "Drop on height-0 should have height 0");
assert(Object.keys(dfEmptyDropped.getSchema()).length === 1 && "b" in dfEmptyDropped.getSchema(), "Drop on height-0 should preserve schema");

// 7.3 rename on height-0
const dfEmptyRenamed = dfEmpty.rename({ a: "c" });
assert(dfEmptyRenamed.height === 0, "Rename on height-0 should have height 0");
assert(Object.keys(dfEmptyRenamed.getSchema()).length === 2 && "c" in dfEmptyRenamed.getSchema(), "Rename on height-0 should preserve schema");

// 7.4 with_columns on height-0
const dfEmptyWithCols = dfEmpty.with_columns({
    c: 5,
    d: $df.col("a").add(10),
});
assert(dfEmptyWithCols.height === 0, "With_columns on height-0 should have height 0");
assert(Object.keys(dfEmptyWithCols.getSchema()).length === 4, "With_columns on height-0 should append new columns to schema");

// 7.5 unpivot on height-0
const dfEmptyUnpivoted = dfEmpty.unpivot({ idVars: "a", valueVars: "b", varName: "var", valueName: "val" });
assert(dfEmptyUnpivoted.height === 0, "Unpivot on height-0 should have height 0");
const unpivotedSchema = dfEmptyUnpivoted.getSchema();
assert("a" in unpivotedSchema && "var" in unpivotedSchema && "val" in unpivotedSchema, "Unpivot on height-0 should preserve unpivoted schema");

// 8. Filter custom proxy compatibility (Object.keys / Object.getOwnPropertyDescriptor / in)
const dfFilterTest = new DataFrame([
    { a: 1, b: 2 },
    { a: 3, b: 4 },
]);
const dfFiltered = dfFilterTest.filter((row: any) => {
    const keys = Object.keys(row);
    assert(keys.length === 2 && keys.includes("a") && keys.includes("b"), "Object.keys should work on row proxy");
    assert("a" in row, "'in' operator should work on row proxy");
    const desc = Object.getOwnPropertyDescriptor(row, "a");
    assert(desc !== undefined && desc.enumerable === true, "getOwnPropertyDescriptor should work on row proxy");
    return row.a > 2;
});
assert(dfFiltered.height === 1 && dfFiltered.to_dicts()[0].a === 3, "Filtered proxy logic should execute correctly");

// 9. Diagonal concat pre-allocation correctness
const dfDiag1 = new DataFrame([{ a: 1 }]);
const dfDiag2 = new DataFrame([{ b: 2 }]);
const dfDiagConcat = $df.concat([dfDiag1, dfDiag2], { how: "diagonal" });
assert(dfDiagConcat.height === 2, "Diagonal concat height should be 2");
const collectedDiag = dfDiagConcat.to_dicts() as any[];
assert(collectedDiag[0].a === 1 && collectedDiag[0].b === null, "First diagonal row values correct");
assert(collectedDiag[1].a === null && collectedDiag[1].b === 2, "Second diagonal row values correct");

console.log("✓ DataFrame robustness and edge-case tests passed!");
