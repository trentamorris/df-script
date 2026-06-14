import { DataFrame } from "../../src/dataframe";

console.log("Running with_row_index tests...");

const df = new DataFrame([
    { name: "Alice", age: 30 },
    { name: "Bob", age: 25 },
    { name: "Charlie", age: 35 }
]);

// 1. Basic usage: defaults to "index" and offset 0
const dfIndex = df.with_row_index();
if (dfIndex.height !== 3) throw new Error("Expected height 3");
const schemaIndex = dfIndex.get_schema();
if (schemaIndex.index === undefined) throw new Error("Expected index column in schema");
const colsIndex = dfIndex.columns;
if (colsIndex[0] !== "index" || colsIndex[1] !== "name" || colsIndex[2] !== "age") {
    throw new Error(`Unexpected column order: ${JSON.stringify(colsIndex)}`);
}
const dictsIndex = dfIndex.to_dicts() as any[];
if (dictsIndex[0].index !== 0 || dictsIndex[1].index !== 1 || dictsIndex[2].index !== 2) {
    throw new Error("Incorrect index values");
}

// 2. Custom name and custom offset
const dfOffset = df.with_row_index("row_nr", 10);
const colsOffset = dfOffset.columns;
if (colsOffset[0] !== "row_nr") throw new Error("Expected custom name 'row_nr'");
const dictsOffset = dfOffset.to_dicts() as any[];
if (dictsOffset[0].row_nr !== 10 || dictsOffset[1].row_nr !== 11 || dictsOffset[2].row_nr !== 12) {
    throw new Error("Incorrect offset index values");
}

// 3. Overwriting existing column
const dfOverwrite = df.with_row_index("name", 1);
const colsOverwrite = dfOverwrite.columns;
if (colsOverwrite[0] !== "name" || colsOverwrite[1] !== "age") {
    throw new Error(`Expected overridden column first and others preserved, got: ${JSON.stringify(colsOverwrite)}`);
}
const dictsOverwrite = dfOverwrite.to_dicts() as any[];
if (dictsOverwrite[0].name !== 1 || dictsOverwrite[1].name !== 2 || dictsOverwrite[2].name !== 3) {
    throw new Error("Expected name column to be overwritten with row numbers starting from 1");
}

console.log("✓ with_row_index tests passed!");
