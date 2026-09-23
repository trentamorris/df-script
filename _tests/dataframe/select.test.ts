declare const process: any;
import { DataFrame } from "../../src/dataframe";
import { $df } from "../../src/api";
import { DataTypeRegistry } from "../../src/datatypes";

console.log("Running select tests...");

const df = new DataFrame([
    { name: "Alice", age: 30, city: "NY" },
    { name: "Bob", age: 25, city: "SF" }
]);

// 1. Simple selection of columns by name
const df1 = df.select("name", "city");
if (df1.height !== 2) throw new Error("Expected height 2");
const schema1 = df1.schema;
if (schema1.name === undefined || schema1.city === undefined || schema1.age !== undefined) {
    throw new Error("Columns mismatch on simple selection schema");
}
const collected1 = df1.toDicts();
if (collected1[0].name !== "Alice" || collected1[0].city !== "NY" || (collected1[0] as any).age !== undefined) {
    throw new Error("Values mismatch on simple selection");
}

// 2. Select using column expressions and aliasing
const df2 = df.select($df.col("age").alias("years"), "name");
const schema2 = df2.schema;
if (schema2.years === undefined || schema2.name === undefined || schema2.age !== undefined) {
    throw new Error("Columns mismatch on expression selection schema");
}
const collected2 = df2.toDicts();
if (collected2[0].years !== 30 || collected2[0].name !== "Alice") {
    throw new Error("Values mismatch on expression selection");
}

// 4. Edge Case: Empty selection (select() with 0 arguments)
const dfEmptySelect = df.select();
if (dfEmptySelect.height !== 2 || dfEmptySelect.columns.length !== 0) {
    throw new Error("Empty select() should preserve height and have 0 columns");
}

// 5. Edge Case: Selection with pure literals & global aggregations collapsing height to 1
const dfAggLit = df.select(
    $df.col("age").sum().alias("total_age"),
    $df.lit("ALL_USERS").alias("report_type")
);
if (dfAggLit.height !== 1) {
    throw new Error(`Expected global aggregation select to collapse height to 1, got ${dfAggLit.height}`);
}
const aggLitDicts = dfAggLit.toDicts();
if (aggLitDicts[0].total_age !== 55 || aggLitDicts[0].report_type !== "ALL_USERS") {
    throw new Error("Global agg + literal values mismatch");
}

// 6. Edge Case: Exploding column selection with parallel alignment
const dfExplodeSelect = new DataFrame([
    { group: "A", items: [1, 2], labels: ["x", "y"] },
    { group: "B", items: [3], labels: ["z"] }
]);
const dfExploded = dfExplodeSelect.select(
    "group",
    $df.col("items").arr.explode(),
    $df.col("labels").arr.explode()
);
if (dfExploded.height !== 3) {
    throw new Error(`Explode selection height mismatch: expected 3, got ${dfExploded.height}`);
}
const explodedDicts = dfExploded.toDicts();
if (explodedDicts[0].items !== 1 || explodedDicts[0].labels !== "x" || explodedDicts[0].group !== "A") {
    throw new Error("Explode selection row 0 mismatch");
}
if (explodedDicts[2].items !== 3 || explodedDicts[2].labels !== "z" || explodedDicts[2].group !== "B") {
    throw new Error("Explode selection row 2 mismatch");
}

// 7. Edge Case: Mismatched explode heights error thrown
let threwMismatchedExplode = false;
try {
    const mismatchDf = new DataFrame([
        { a: [1, 2], b: [10] }
    ]);
    mismatchDf.select($df.col("a").arr.explode(), $df.col("b").arr.explode());
} catch (e: any) {
    if (e.message.includes("Mismatched explode heights")) {
        threwMismatchedExplode = true;
    }
}
if (!threwMismatchedExplode) {
    throw new Error("Expected Mismatched explode heights error was not thrown");
}

// 8. Edge Case: Duplicate column selection error thrown
let threwDuplicate = false;
try {
    df.select("name", "name");
} catch (e: any) {
    if (e.message.includes("Duplicate column selection")) {
        threwDuplicate = true;
    }
}
if (!threwDuplicate) {
    throw new Error("Expected Duplicate column selection error was not thrown");
}

// 9. Edge Case: Selecting on empty DataFrame (height 0) with columns
const emptyDf = new DataFrame({ a: [], b: [] });
const emptySelect = emptyDf.select("a");
if (emptySelect.height !== 0 || emptySelect.columns.length !== 1 || emptySelect.columns[0] !== "a") {
    throw new Error("Selection on empty DataFrame failed");
}

// 10. Edge Case: Select with nested array of expressions / column lists
const dfNestedArgs = df.select(["name", ["city"]], [$df.col("age").alias("a")]);
if (dfNestedArgs.width !== 3 || dfNestedArgs.height !== 2) {
    throw new Error("Nested array argument select failed");
}

// 11. Edge Case: Select with Record mapping syntax { targetColName: expr/literal }
const dfRecordMap = df.select({
    person_name: $df.col("name"),
    person_age: $df.col("age").add(5)
});
if (dfRecordMap.columns[0] !== "person_name" || dfRecordMap.columns[1] !== "person_age") {
    throw new Error("Record dictionary mapping selection keys mismatch");
}
const recordDicts = dfRecordMap.toDicts();
if (recordDicts[0].person_name !== "Alice" || recordDicts[0].person_age !== 35) {
    throw new Error("Record dictionary mapping selection values mismatch");
}

// 12. Edge Case: All-literal selection (should collapse to height 1)
const dfAllLiterals = df.select(
    $df.lit(100).alias("const_num"),
    $df.lit("static").alias("const_str"),
    $df.lit(true).alias("const_bool")
);
if (dfAllLiterals.height !== 1 || dfAllLiterals.width !== 3) {
    throw new Error("All-literal select must collapse height to 1");
}
const allLitDict = dfAllLiterals.toDicts()[0];
if (allLitDict.const_num !== 100 || allLitDict.const_str !== "static" || allLitDict.const_bool !== true) {
    throw new Error("All-literal values mismatch");
}

// 13. Edge Case: Single Row DataFrame with null values
const dfSingleNull = new DataFrame([{ a: null, b: undefined, c: 42 }]);
const selectNulls = dfSingleNull.select("a", "b", "c");
if (selectNulls.height !== 1 || selectNulls.width !== 3) {
    throw new Error("Single null DataFrame select height/width mismatch");
}
const singleNullDict = selectNulls.toDicts()[0];
if (singleNullDict.a !== null || singleNullDict.b !== null || singleNullDict.c !== 42) {
    throw new Error("Single null DataFrame select values mismatch");
}

// 14. Edge Case: Select with Type Selectors ($df.col($df.Utf8))
const dfMixedTypes = new DataFrame([
    { strCol: "hello", numCol: 123, boolCol: true }
]);
const dfOnlyStr = dfMixedTypes.select($df.col($df.Utf8));
if (dfOnlyStr.columns.length !== 1 || dfOnlyStr.columns[0] !== "strCol") {
    throw new Error("Type selector $df.col($df.Utf8) select failed");
}

// 16. Edge Case: Duplicate selection error in select
let duplicateThrew = false;
try {
    df.select("name", "name");
} catch (e: any) {
    if (e.message.includes("Duplicate column selection")) {
        duplicateThrew = true;
    }
}
if (!duplicateThrew) throw new Error("Expected duplicate selection to throw error");

// =========================================================================
// 10/10 DIFFICULTY EDGE CASES: SELECT COLUMNS BY DATATYPE
// =========================================================================

// Edge Case A: Direct DataType passed to df.select without $df.col wrapper
const dfA = new DataFrame([
    { a: 1.5, b: "text", c: 2.5 }
]);
const dfASel = dfA.select(DataTypeRegistry.Float64);
if (dfASel.columns.length !== 2 || dfASel.columns[0] !== "a" || dfASel.columns[1] !== "c") {
    throw new Error(`Edge Case A failed: expected ['a', 'c'], got ${JSON.stringify(dfASel.columns)}`);
}

// Edge Case B: Direct DataType constructor class passed to df.select
const dfBSel = dfA.select(DataTypeRegistry.Utf8);
if (dfBSel.columns.length !== 1 || dfBSel.columns[0] !== "b") {
    throw new Error(`Edge Case B failed: expected ['b'], got ${JSON.stringify(dfBSel.columns)}`);
}

// Edge Case C: Abstract base selector DataTypeRegistry.Numeric matches Int8, Int16, Int32, Float32, Float64, Decimal
const dfNumeric = new DataFrame(
    {
        i8Col: [10, 20],
        i32Col: [100, 200],
        f64Col: [1.1, 2.2],
        decCol: [10.5, 20.5],
        strCol: ["x", "y"],
        boolCol: [true, false]
    },
    {
        i8Col: DataTypeRegistry.Int8,
        i32Col: DataTypeRegistry.Int32,
        f64Col: DataTypeRegistry.Float64,
        decCol: DataTypeRegistry.Decimal(10, 2),
        strCol: DataTypeRegistry.Utf8,
        boolCol: DataTypeRegistry.Boolean
    }
);
const dfNumSelected = dfNumeric.select($df.col(DataTypeRegistry.Numeric));
if (dfNumSelected.columns.length !== 4) {
    throw new Error(`Edge Case C failed: expected 4 numeric columns, got ${JSON.stringify(dfNumSelected.columns)}`);
}
if (!dfNumSelected.columns.includes("i8Col") || !dfNumSelected.columns.includes("i32Col") ||
    !dfNumSelected.columns.includes("f64Col") || !dfNumSelected.columns.includes("decCol")) {
    throw new Error(`Edge Case C failed columns match: ${JSON.stringify(dfNumSelected.columns)}`);
}

// Edge Case D: Abstract base selector DataTypeRegistry.Integer matches only integer types, excludes Float/Decimal
const dfIntSelected = dfNumeric.select($df.col(DataTypeRegistry.Integer));
if (dfIntSelected.columns.length !== 2 || !dfIntSelected.columns.includes("i8Col") || !dfIntSelected.columns.includes("i32Col")) {
    throw new Error(`Edge Case D failed: expected ['i8Col', 'i32Col'], got ${JSON.stringify(dfIntSelected.columns)}`);
}

// Edge Case E: Abstract base selector DataTypeRegistry.Temporal matches Date, Datetime, Time, Duration
const dfTemporal = new DataFrame(
    {
        dateCol: [new Date("2026-01-01")],
        timeCol: ["12:00:00"],
        durCol: [5000],
        numCol: [42]
    },
    {
        dateCol: DataTypeRegistry.Datetime,
        timeCol: DataTypeRegistry.Time,
        durCol: DataTypeRegistry.Duration,
        numCol: DataTypeRegistry.Int32
    }
);
const dfTempSelected = dfTemporal.select($df.col(DataTypeRegistry.Temporal));
if (dfTempSelected.columns.length !== 3 || dfTempSelected.columns.includes("numCol")) {
    throw new Error(`Edge Case E failed: expected 3 temporal columns, got ${JSON.stringify(dfTempSelected.columns)}`);
}

// Edge Case F: Multi-type array selector in $df.col([Type1, Type2])
const dfMultiType = dfNumeric.select($df.col([DataTypeRegistry.Boolean, DataTypeRegistry.Utf8]));
if (dfMultiType.columns.length !== 2 || !dfMultiType.columns.includes("boolCol") || !dfMultiType.columns.includes("strCol")) {
    throw new Error(`Edge Case F failed: expected ['strCol', 'boolCol'], got ${JSON.stringify(dfMultiType.columns)}`);
}

// Edge Case G: Chained operations across all columns matched by DataType selector
const dfChained = dfNumeric.select($df.col(DataTypeRegistry.Integer).mul(2));
if (dfChained.columns.length !== 2 || dfChained.columns[0] !== "i8Col" || dfChained.columns[1] !== "i32Col") {
    throw new Error(`Edge Case G failed columns: ${JSON.stringify(dfChained.columns)}`);
}
const chainedRows = dfChained.toDicts();
if (chainedRows[0].i8Col !== 20 || chainedRows[0].i32Col !== 200 ||
    chainedRows[1].i8Col !== 40 || chainedRows[1].i32Col !== 400) {
    throw new Error(`Edge Case G failed values: ${JSON.stringify(chainedRows)}`);
}

// Edge Case H: Chained global aggregations on DataType selector collapsing height to 1
const dfAggType = dfNumeric.select($df.col(DataTypeRegistry.Integer).sum());
if (dfAggType.height !== 1 || dfAggType.columns.length !== 2) {
    throw new Error(`Edge Case H failed height/cols: height=${dfAggType.height}, cols=${JSON.stringify(dfAggType.columns)}`);
}
const aggRows = dfAggType.toDicts();
if (aggRows[0].i8Col !== 30 || aggRows[0].i32Col !== 300) {
    throw new Error(`Edge Case H failed aggregated values: ${JSON.stringify(aggRows)}`);
}

// Edge Case I: Zero-match DataType selector (type not present in schema) preserves height with 0 columns
const dfZeroMatch = dfNumeric.select($df.col(DataTypeRegistry.Binary));
if (dfZeroMatch.height !== 2 || dfZeroMatch.columns.length !== 0) {
    throw new Error(`Edge Case I failed: expected height 2 and 0 cols, got height=${dfZeroMatch.height}, cols=${dfZeroMatch.columns.length}`);
}

// Edge Case J: Zero-match combined with explicit other columns
const dfZeroMatchWithOther = dfNumeric.select("strCol", $df.col(DataTypeRegistry.Binary));
if (dfZeroMatchWithOther.columns.length !== 1 || dfZeroMatchWithOther.columns[0] !== "strCol") {
    throw new Error(`Edge Case J failed: expected only ['strCol'], got ${JSON.stringify(dfZeroMatchWithOther.columns)}`);
}

// Edge Case K: Empty DataFrame (height 0) selecting by DataType preserves empty column arrays & schema
const emptyTypedDf = new DataFrame(
    { numA: [], strB: [] },
    { numA: DataTypeRegistry.Float64, strB: DataTypeRegistry.Utf8 }
);
const emptySel = emptyTypedDf.select(DataTypeRegistry.Float64);
if (emptySel.height !== 0 || emptySel.columns.length !== 1 || emptySel.columns[0] !== "numA") {
    throw new Error(`Edge Case K failed on height 0 DataFrame: ${JSON.stringify(emptySel.columns)}`);
}
if (emptySel.schema.numA.name !== "Float64") {
    throw new Error(`Edge Case K schema mismatch: ${emptySel.schema.numA.name}`);
}

// Edge Case L: Nested DataType matching with DataTypeRegistry.Nested
const dfNested = new DataFrame(
    {
        arrCol: [[1, 2], [3, 4]],
        simpleCol: [10, 20]
    },
    {
        arrCol: DataTypeRegistry.Array(DataTypeRegistry.Int32),
        simpleCol: DataTypeRegistry.Int32
    }
);
const dfNestedSel = dfNested.select($df.col(DataTypeRegistry.Nested));
if (dfNestedSel.columns.length !== 1 || dfNestedSel.columns[0] !== "arrCol") {
    throw new Error(`Edge Case L failed: expected ['arrCol'], got ${JSON.stringify(dfNestedSel.columns)}`);
}

// Edge Case M: Duplicate column selection error when explicit string and DataType match same column
let threwDuplicateType = false;
try {
    dfNumeric.select("i8Col", $df.col(DataTypeRegistry.Integer));
} catch (e: any) {
    if (e.message.includes("Duplicate column selection")) {
        threwDuplicateType = true;
    }
}
if (!threwDuplicateType) {
    throw new Error("Edge Case M failed: expected duplicate column error when explicit column overlaps DataType match");
}

// Edge Case N: Selecting with array of mixed DataTypes directly in df.select
const dfMixedDirect = dfNumeric.select([DataTypeRegistry.Utf8, DataTypeRegistry.Boolean]);
if (dfMixedDirect.columns.length !== 2 || !dfMixedDirect.columns.includes("strCol") || !dfMixedDirect.columns.includes("boolCol")) {
    throw new Error(`Edge Case N failed: expected ['strCol', 'boolCol'], got ${JSON.stringify(dfMixedDirect.columns)}`);
}

// Edge Case O: Decimal parametric matching: unparameterized Decimal matches Decimal(10, 2)
const dfDecMatch = dfNumeric.select($df.col(DataTypeRegistry.Decimal()));
if (dfDecMatch.columns.length !== 1 || dfDecMatch.columns[0] !== "decCol") {
    throw new Error(`Edge Case O failed: expected ['decCol'], got ${JSON.stringify(dfDecMatch.columns)}`);
}

// Edge Case P: Direct $df.<Type> property access without DataTypeRegistry ($df.Boolean, $df.Float64, $df.Numeric, etc.)
const dfDirectShortP = dfNumeric.select($df.Boolean, $df.col($df.Float64), $df.col($df.Integer));
if (dfDirectShortP.columns.length !== 4) {
    throw new Error(`Edge Case P failed count: expected 4, got ${dfDirectShortP.columns.length}`);
}
if (!dfDirectShortP.columns.includes("boolCol") || !dfDirectShortP.columns.includes("f64Col") ||
    !dfDirectShortP.columns.includes("i8Col") || !dfDirectShortP.columns.includes("i32Col")) {
    throw new Error(`Edge Case P failed columns: ${JSON.stringify(dfDirectShortP.columns)}`);
}

// Edge Case Q: Direct $df.<Category> abstract types ($df.Numeric, $df.Temporal)
const dfDirectTempQ = dfTemporal.select($df.Temporal);
if (dfDirectTempQ.columns.length !== 3 || dfDirectTempQ.columns.includes("numCol")) {
    throw new Error(`Edge Case Q failed: expected 3 temporal cols, got ${JSON.stringify(dfDirectTempQ.columns)}`);
}

// ============================================================================
// 10/10 COMPLEX NESTED STRUCT & ARRAY SELECTION EDGE CASES
// ============================================================================

// Define rich nested schemas
const userStructType = $df.Struct({
    id: $df.Int32,
    meta: $df.Struct({
        tier: $df.Utf8,
        scores: $df.Array($df.Float64)
    })
});

const legacyUserStructType = $df.Struct({
    id: $df.Int32,
    meta: $df.Struct({
        tier: $df.Utf8,
        scores: $df.Array($df.Int32) // differs in inner array element type
    })
});

const complexNestedDf = $df.data([
    {
        arrInt: [1, 2, 3],
        arrFloat: [1.1, 2.2],
        arrArrInt: [[1, 2], [3, 4]],
        arrStruct: [{ id: 10, name: "item1" }],
        userStruct: { id: 1, meta: { tier: "gold", scores: [9.5, 8.7] } },
        legacyStruct: { id: 2, meta: { tier: "silver", scores: [9, 8] } },
        scalarInt: 42
    }
], {
    arrInt: $df.Array($df.Int32),
    arrFloat: $df.Array($df.Float64),
    arrArrInt: $df.Array($df.Array($df.Int32)),
    arrStruct: $df.Array($df.Struct({ id: $df.Int32, name: $df.Utf8 })),
    userStruct: userStructType,
    legacyStruct: legacyUserStructType,
    scalarInt: $df.Int32
});

// Edge Case R1: General Struct selector ($df.Struct) selects ALL struct columns regardless of inner schema
const dfAllStructs = complexNestedDf.select($df.Struct);
if (dfAllStructs.columns.length !== 2 || !dfAllStructs.columns.includes("userStruct") || !dfAllStructs.columns.includes("legacyStruct")) {
    throw new Error(`Edge Case R1 failed: expected ['userStruct', 'legacyStruct'], got ${JSON.stringify(dfAllStructs.columns)}`);
}

// Edge Case R2: General Array selector ($df.Array) selects ALL array columns (including 2D arrays & arrays of structs)
const dfAllArrays = complexNestedDf.select($df.col($df.Array));
if (dfAllArrays.columns.length !== 4) {
    throw new Error(`Edge Case R2 failed count: expected 4 array columns, got ${dfAllArrays.columns.length}`);
}
if (!dfAllArrays.columns.includes("arrInt") || !dfAllArrays.columns.includes("arrFloat") ||
    !dfAllArrays.columns.includes("arrArrInt") || !dfAllArrays.columns.includes("arrStruct")) {
    throw new Error(`Edge Case R2 failed columns: ${JSON.stringify(dfAllArrays.columns)}`);
}

// Edge Case R3: Specific 1D Array type selector selects ONLY matching inner type
const dfOnlyFloatArr = complexNestedDf.select($df.Array($df.Float64));
if (dfOnlyFloatArr.columns.length !== 1 || dfOnlyFloatArr.columns[0] !== "arrFloat") {
    throw new Error(`Edge Case R3 failed: expected ['arrFloat'], got ${JSON.stringify(dfOnlyFloatArr.columns)}`);
}

// Edge Case R4: Nested 2D Array selector ($df.Array($df.Array($df.Int32)))
const df2DArr = complexNestedDf.select($df.col($df.Array($df.Array($df.Int32))));
if (df2DArr.columns.length !== 1 || df2DArr.columns[0] !== "arrArrInt") {
    throw new Error(`Edge Case R4 failed: expected ['arrArrInt'], got ${JSON.stringify(df2DArr.columns)}`);
}

// Edge Case R5: Array of Struct selector ($df.Array($df.Struct(...)))
const dfArrStruct = complexNestedDf.select($df.Array($df.Struct({ id: $df.Int32, name: $df.Utf8 })));
if (dfArrStruct.columns.length !== 1 || dfArrStruct.columns[0] !== "arrStruct") {
    throw new Error(`Edge Case R5 failed: expected ['arrStruct'], got ${JSON.stringify(dfArrStruct.columns)}`);
}

// Edge Case R6: Deeply nested Struct exact match differentiation
// userStruct has scores: Array(Float64), whereas legacyStruct has scores: Array(Int32)
const dfUserStructOnly = complexNestedDf.select($df.col(userStructType));
if (dfUserStructOnly.columns.length !== 1 || dfUserStructOnly.columns[0] !== "userStruct") {
    throw new Error(`Edge Case R6 failed: expected ['userStruct'], got ${JSON.stringify(dfUserStructOnly.columns)}`);
}

const dfLegacyStructOnly = complexNestedDf.select(legacyUserStructType);
if (dfLegacyStructOnly.columns.length !== 1 || dfLegacyStructOnly.columns[0] !== "legacyStruct") {
    throw new Error(`Edge Case R7 failed: expected ['legacyStruct'], got ${JSON.stringify(dfLegacyStructOnly.columns)}`);
}

// Edge Case R8: Struct field key-ordering invariance (Struct with same fields in different key order must match)
const userStructReordered = $df.Struct({
    meta: $df.Struct({
        scores: $df.Array($df.Float64),
        tier: $df.Utf8
    }),
    id: $df.Int32
});
const dfReordered = complexNestedDf.select(userStructReordered);
if (dfReordered.columns.length !== 1 || dfReordered.columns[0] !== "userStruct") {
    throw new Error(`Edge Case R8 failed: reordered struct failed to match userStruct, got ${JSON.stringify(dfReordered.columns)}`);
}

// Edge Case R9: Combining exact nested Struct, specific Array, and general scalar into a single select
const dfCombinedNested = complexNestedDf.select(
    $df.col(userStructType),
    $df.Array($df.Int32),
    "scalarInt"
);
if (dfCombinedNested.columns.length !== 3 ||
    dfCombinedNested.columns[0] !== "userStruct" ||
    dfCombinedNested.columns[1] !== "arrInt" ||
    dfCombinedNested.columns[2] !== "scalarInt") {
    throw new Error(`Edge Case R9 failed: got ${JSON.stringify(dfCombinedNested.columns)}`);
}

// Edge Case R10: Struct matching with mismatched field names or extra/missing fields should NOT match
const structPartial = $df.Struct({
    id: $df.Int32
});
const dfPartial = complexNestedDf.select(structPartial);
if (dfPartial.columns.length !== 0) {
    throw new Error(`Edge Case R10 failed: expected 0 columns for partial struct schema, got ${JSON.stringify(dfPartial.columns)}`);
}

// ============================================================================
// 10/10 ULTRA-HARDCORE NESTED SELECTION EDGE CASES
// ============================================================================

// Edge Case S1: 4-Level Deep Nested Complex Hierarchy (Struct -> Array -> Struct -> Array)
const deepSchemaA = $df.Struct({
    level1: $df.Array($df.Struct({
        level2: $df.Array($df.Struct({
            val: $df.Float64
        }))
    }))
});

const deepSchemaB = $df.Struct({
    level1: $df.Array($df.Struct({
        level2: $df.Array($df.Struct({
            val: $df.Int32 // Intentionally differs only at level 4 leaf type
        }))
    }))
});

const dfDeepTree = $df.data([
    {
        colA: { level1: [{ level2: [{ val: 1.23 }] }] },
        colB: { level1: [{ level2: [{ val: 456 }] }] }
    }
], {
    colA: deepSchemaA,
    colB: deepSchemaB
});

const dfDeepSelectedA = dfDeepTree.select(deepSchemaA);
if (dfDeepSelectedA.columns.length !== 1 || dfDeepSelectedA.columns[0] !== "colA") {
    throw new Error(`Edge Case S1 failed: expected only ['colA'], got ${JSON.stringify(dfDeepSelectedA.columns)}`);
}

const dfDeepSelectedB = dfDeepTree.select($df.col(deepSchemaB));
if (dfDeepSelectedB.columns.length !== 1 || dfDeepSelectedB.columns[0] !== "colB") {
    throw new Error(`Edge Case S1 (colB) failed: expected only ['colB'], got ${JSON.stringify(dfDeepSelectedB.columns)}`);
}

// Edge Case S2: Empty Struct vs Populated Struct
const emptyStructType = $df.Struct({});
const dfWithEmptyStruct = $df.data([
    { emptyCol: {}, filledCol: { a: 1 } }
], {
    emptyCol: emptyStructType,
    filledCol: $df.Struct({ a: $df.Int32 })
});

const dfEmptyMatch = dfWithEmptyStruct.select(emptyStructType);
if (dfEmptyMatch.columns.length !== 1 || dfEmptyMatch.columns[0] !== "emptyCol") {
    throw new Error(`Edge Case S2 failed: expected ['emptyCol'], got ${JSON.stringify(dfEmptyMatch.columns)}`);
}

// Edge Case S3: Nested Array Selection Combined with Exclusion ($df.exclude)
const dfMultiArray = $df.data([
    { a1: [1], a2: [2.5], a3: ["str"], s1: { x: 1 } }
], {
    a1: $df.Array($df.Int32),
    a2: $df.Array($df.Float64),
    a3: $df.Array($df.Utf8),
    s1: $df.Struct({ x: $df.Int32 })
});

// Select all Array columns EXCEPT a2 and s1
const dfExclArray = dfMultiArray.select($df.exclude(["a2", "s1"]));
if (dfExclArray.columns.length !== 2 || !dfExclArray.columns.includes("a1") || !dfExclArray.columns.includes("a3")) {
    throw new Error(`Edge Case S3 failed: expected ['a1', 'a3'], got ${JSON.stringify(dfExclArray.columns)}`);
}

// Edge Case S4: Multi-type Selector array matching heterogeneous nested types in one expression
// [$df.Array($df.Int32), $df.Struct({ x: $df.Int32 })]
const dfHeteroSelect = dfMultiArray.select($df.col([$df.Array($df.Int32), $df.Struct({ x: $df.Int32 })]));
if (dfHeteroSelect.columns.length !== 2 || !dfHeteroSelect.columns.includes("a1") || !dfHeteroSelect.columns.includes("s1")) {
    throw new Error(`Edge Case S4 failed: expected ['a1', 's1'], got ${JSON.stringify(dfHeteroSelect.columns)}`);
}

// Edge Case S5: Duplicate Detection between Nested Type Selector and Concrete String Reference
let threwDuplicateNested = false;
try {
    dfMultiArray.select("a1", $df.Array($df.Int32));
} catch (e: any) {
    if (e.message.includes("Duplicate column selection")) {
        threwDuplicateNested = true;
    }
}
if (!threwDuplicateNested) {
    throw new Error("Edge Case S5 failed: expected duplicate selection error when explicit column overlaps nested type match");
}

// Edge Case S6: Aliasing Nested DataType Selectors with .name.map() style naming or .alias()
const dfAliasedNested = complexNestedDf.select(
    $df.col(userStructType).alias("user_aliased")
);
if (dfAliasedNested.columns.length !== 1 || dfAliasedNested.columns[0] !== "user_aliased") {
    throw new Error(`Edge Case S6 failed: expected ['user_aliased'], got ${JSON.stringify(dfAliasedNested.columns)}`);
}
const aliasedData = dfAliasedNested.toDicts()[0].user_aliased;
if (!aliasedData || aliasedData.id !== 1 || aliasedData.meta.tier !== "gold") {
    throw new Error(`Edge Case S6 data integrity failed: ${JSON.stringify(aliasedData)}`);
}

// Edge Case S7: Multiple Nested Array/Struct matches with Wildcards / All
// Since $df.all() already selected userStruct, selecting $df.Struct afterwards must throw duplicate error
let threwWildcardDup = false;
try {
    complexNestedDf.select($df.all(), $df.Struct);
} catch (e: any) {
    if (e.message.includes("Duplicate column selection")) {
        threwWildcardDup = true;
    }
}
if (!threwWildcardDup) {
    throw new Error("Edge Case S7 failed: expected duplicate selection error when $df.all() precedes $df.Struct");
}

// ============================================================================
// 10/10 REGEX PATTERN COLUMN SELECTOR TESTS
// ============================================================================

const dfPattern = $df.data([
    {
        user_id: 1,
        user_name: "Alice",
        user_age: 30,
        score_math: 95,
        score_physics: 88,
        score_chemistry: 92,
        extra_meta: "xyz",
        num_1: 10,
        num_2: 20
    }
]);

// Edge Case T1: Direct regex in df.select() matching prefixes
const dfUserCols = dfPattern.select(/^user_/);
if (dfUserCols.columns.length !== 3 ||
    !dfUserCols.columns.includes("user_id") ||
    !dfUserCols.columns.includes("user_name") ||
    !dfUserCols.columns.includes("user_age")) {
    throw new Error(`Edge Case T1 failed: expected 3 user columns, got ${JSON.stringify(dfUserCols.columns)}`);
}

// Edge Case T2: $df.col(RegExp) with transformation expressions
const dfScores = dfPattern.select($df.col(/^score_/).add(5));
if (dfScores.columns.length !== 3 ||
    !dfScores.columns.includes("score_math") ||
    !dfScores.columns.includes("score_physics") ||
    !dfScores.columns.includes("score_chemistry")) {
    throw new Error(`Edge Case T2 failed columns: ${JSON.stringify(dfScores.columns)}`);
}
const scoresRow = dfScores.toDicts()[0];
if (scoresRow.score_math !== 100 || scoresRow.score_physics !== 93 || scoresRow.score_chemistry !== 97) {
    throw new Error(`Edge Case T2 failed data: ${JSON.stringify(scoresRow)}`);
}

// Edge Case T3: Array of multiple regex patterns [$df.col([/^user_/, /^num_/])]
const dfMultiPattern = dfPattern.select($df.col([/^user_/, /^num_/]));
if (dfMultiPattern.columns.length !== 5 ||
    !dfMultiPattern.columns.includes("user_id") ||
    !dfMultiPattern.columns.includes("num_1")) {
    throw new Error(`Edge Case T3 failed: expected 5 cols, got ${JSON.stringify(dfMultiPattern.columns)}`);
}

// Edge Case T4: Mixed array containing strings and regex: ["extra_meta", /^num_/]
const dfMixedStringRegex = dfPattern.select(["extra_meta", /^num_/]);
if (dfMixedStringRegex.columns.length !== 3 ||
    dfMixedStringRegex.columns[0] !== "extra_meta" ||
    !dfMixedStringRegex.columns.includes("num_1") ||
    !dfMixedStringRegex.columns.includes("num_2")) {
    throw new Error(`Edge Case T4 failed: expected ['extra_meta', 'num_1', 'num_2'], got ${JSON.stringify(dfMixedStringRegex.columns)}`);
}

// Edge Case T5: Regex with no matches returns 0 columns preserving height
const dfNoMatchRegex = dfPattern.select(/^nonexistent_/);
if (dfNoMatchRegex.height !== 1 || dfNoMatchRegex.columns.length !== 0) {
    throw new Error(`Edge Case T5 failed: expected 0 cols, got ${JSON.stringify(dfNoMatchRegex.columns)}`);
}

// Edge Case T6: Regex with global flag (/g) resets lastIndex properly across multiple columns
const globalRegex = /score/g;
const dfGlobal = dfPattern.select(globalRegex);
if (dfGlobal.columns.length !== 3) {
    throw new Error(`Edge Case T6 failed: expected 3 cols with global regex, got ${dfGlobal.columns.length}`);
}

// Edge Case T7: Duplicate detection between regex selector and explicit string
let threwRegexDup = false;
try {
    dfPattern.select("user_id", /^user_/);
} catch (e: any) {
    if (e.message.includes("Duplicate column selection")) {
        threwRegexDup = true;
    }
}
if (!threwRegexDup) {
    throw new Error("Edge Case T7 failed: expected duplicate error between explicit string and regex match");
}

// Edge Case T8: $df.col([string, RegExp]) mixed array partitioning in ColumnExpr
const dfColMixed = dfPattern.select($df.col(["extra_meta", /^num_/]));
if (dfColMixed.columns.length !== 3 ||
    dfColMixed.columns[0] !== "extra_meta" ||
    !dfColMixed.columns.includes("num_1") ||
    !dfColMixed.columns.includes("num_2")) {
    throw new Error(`Edge Case T8 failed: expected $df.col(['extra_meta', /^num_/]) to select 3 columns, got ${JSON.stringify(dfColMixed.columns)}`);
}

// Edge Case T9: $df.col([RegExp, RegExp]) multiple regex patterns in ColumnExpr
const dfColMultiRegex = dfPattern.select($df.col([/^num_1$/, /^score_math$/]));
if (dfColMultiRegex.columns.length !== 2 ||
    !dfColMultiRegex.columns.includes("num_1") ||
    !dfColMultiRegex.columns.includes("score_math")) {
    throw new Error(`Edge Case T9 failed: expected $df.col with multiple regex patterns to select 2 columns, got ${JSON.stringify(dfColMultiRegex.columns)}`);
}

console.log("✓ select tests passed!");
