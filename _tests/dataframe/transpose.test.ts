import { DataFrame } from "../../src";

console.log("Running transpose tests...");

// Helper for checking exceptions
function assertThrows(fn: () => void, expectedPhrase: string) {
    try {
        fn();
        throw new Error("Expected function to throw, but it succeeded.");
    } catch (e: any) {
        if (!e.message.includes(expectedPhrase)) {
            throw new Error(`Expected error containing "${expectedPhrase}", but got: "${e.message}"`);
        }
    }
}

// 1. Basic Transpose (Sequential Column Names)
const df = new DataFrame({
    a: [1, 2, 3],
    b: [4, 5, 6]
});
const t = df.transpose();
if (t.height !== 2) throw new Error("Expected height 2");
if (t.columns.length !== 3) throw new Error("Expected 3 columns");
if (t.columns[0] !== "column_0" || t.columns[1] !== "column_1" || t.columns[2] !== "column_2") {
    throw new Error("Expected sequential column names");
}
if (t.item(0, "column_0") !== 1) throw new Error("Expected 1");
if (t.item(0, "column_1") !== 2) throw new Error("Expected 2");
if (t.item(0, "column_2") !== 3) throw new Error("Expected 3");
if (t.item(1, "column_0") !== 4) throw new Error("Expected 4");
if (t.item(1, "column_1") !== 5) throw new Error("Expected 5");
if (t.item(1, "column_2") !== 6) throw new Error("Expected 6");

// 2. Transpose with include_header & header_name
const t2 = df.transpose({ include_header: true, header_name: "original_names" });
if (t2.height !== 2) throw new Error("Expected height 2");
if (t2.columns.length !== 4) throw new Error("Expected 4 columns");
if (t2.columns[0] !== "original_names") throw new Error("Expected column 0 to be original_names");
if (t2.item(0, "original_names") !== "a") throw new Error("Expected 'a'");
if (t2.item(1, "original_names") !== "b") throw new Error("Expected 'b'");
if (t2.item(0, "column_0") !== 1) throw new Error("Expected 1");
if (t2.item(1, "column_0") !== 4) throw new Error("Expected 4");

// 3. Transpose with column_names pointing to existing column
const df2 = new DataFrame({
    id: ["i", "j", "k"],
    a: [1, 2, 3],
    b: [4, 5, 6]
});
const t3 = df2.transpose({ column_names: "id" });
if (t3.height !== 2) throw new Error("Expected height 2");
if (t3.columns.length !== 3) throw new Error("Expected 3 columns");
if (t3.columns[0] !== "i" || t3.columns[1] !== "j" || t3.columns[2] !== "k") {
    throw new Error("Expected column names from 'id' column values");
}
if (t3.item(0, "i") !== 1) throw new Error("Expected 1");
if (t3.item(0, "k") !== 3) throw new Error("Expected 3");
if (t3.item(1, "i") !== 4) throw new Error("Expected 4");
if (t3.item(1, "k") !== 6) throw new Error("Expected 6");

// 4. Transpose with column_names pointing to existing column and include_header: true
const t4 = df2.transpose({ column_names: "id", include_header: true, header_name: "my_header" });
if (t4.height !== 2) throw new Error("Expected height 2");
if (t4.columns.length !== 4) throw new Error("Expected 4 columns");
if (t4.columns[0] !== "my_header") throw new Error("Expected 'my_header'");
if (t4.item(0, "my_header") !== "a") throw new Error("Expected 'a'");
if (t4.item(1, "my_header") !== "b") throw new Error("Expected 'b'");
if (t4.item(0, "i") !== 1) throw new Error("Expected 1");

// 5. Transpose with column_names as explicit array
const t5 = df.transpose({ column_names: ["rowA", "rowB", "rowC"] });
if (t5.columns.length !== 3) throw new Error("Expected 3 columns");
if (t5.columns[0] !== "rowA" || t5.columns[1] !== "rowB" || t5.columns[2] !== "rowC") {
    throw new Error("Expected explicit column names");
}
if (t5.item(0, "rowA") !== 1) throw new Error("Expected 1");
if (t5.item(1, "rowC") !== 6) throw new Error("Expected 6");

// 6. Duplicate column names checks
assertThrows(() => {
    df.transpose({ column_names: ["colA", "colA", "colB"] });
}, "Duplicate column name in transposed DataFrame");

assertThrows(() => {
    df.transpose({ include_header: true, header_name: "column_0" });
}, "Duplicate column name in transposed DataFrame");

// 7. Error boundaries & parameter validation
assertThrows(() => {
    df2.transpose({ column_names: "non_existent" });
}, "does not exist");

assertThrows(() => {
    df2.transpose({ column_names: ["only_one"] });
}, "column_names length (1) must match the height of the DataFrame (3)");

// 8. Null validation in key column
const dfWithNull = new DataFrame({
    id: ["i", null, "k"],
    a: [1, 2, 3]
});
assertThrows(() => {
    dfWithNull.transpose({ column_names: "id" });
}, "contains null/undefined");

// 9. Empty DataFrame transposing
const emptyDf = new DataFrame({
    a: []
});
const emptyT = emptyDf.transpose({ include_header: true, header_name: "h" });
if (emptyT.height !== 0) throw new Error("Expected empty transposed height to be 0");
if (emptyT.columns.length !== 1 || emptyT.columns[0] !== "h") {
    throw new Error("Expected only header column for empty transpose with header");
}

const emptyT2 = emptyDf.transpose();
if (emptyT2.height !== 0) throw new Error("Expected empty transposed height to be 0");
if (emptyT2.columns.length !== 0) throw new Error("Expected empty transpose to have 0 columns");

// 10. Type coercion check
const mixDf = new DataFrame({
    a: [1, 2],
    b: ["three", "four"]
});
const mixT = mixDf.transpose();
const schema = mixT.get_schema();
if (schema["column_0"].name !== "Utf8") {
    throw new Error(`Expected column_0 to be Utf8, got ${schema["column_0"].name}`);
}
if (schema["column_1"].name !== "Utf8") {
    throw new Error(`Expected column_1 to be Utf8, got ${schema["column_1"].name}`);
}
if (mixT.item(0, "column_0") !== "1") throw new Error("Expected '1'");
if (mixT.item(1, "column_0") !== "three") throw new Error("Expected 'three'");
if (mixT.item(0, "column_1") !== "2") throw new Error("Expected '2'");
if (mixT.item(1, "column_1") !== "four") throw new Error("Expected 'four'");

// 11. Custom iterables for column_names (Set and Generator)
const setNames = new Set(["colX", "colY", "colZ"]);
const tSet = df.transpose({ column_names: setNames });
if (tSet.columns[0] !== "colX" || tSet.columns[1] !== "colY" || tSet.columns[2] !== "colZ") {
    throw new Error("Expected custom Set column names");
}
if (tSet.item(0, "colX") !== 1) throw new Error("Expected 1");

function* genNames() {
    yield "genA";
    yield "genB";
    yield "genC";
}
const tGen = df.transpose({ column_names: genNames() });
if (tGen.columns[0] !== "genA" || tGen.columns[1] !== "genB" || tGen.columns[2] !== "genC") {
    throw new Error("Expected custom Generator column names");
}
if (tGen.item(1, "genC") !== 6) throw new Error("Expected 6");

console.log("✓ transpose tests passed!");
