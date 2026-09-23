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
const collected = dfFiltered2.toDicts();
if (collected[0].name !== "Alice" || collected[1].name !== "Charlie") {
    throw new Error("Filtered values mismatch");
}

// 3. Combined multiple expressions (AND behavior via multiple args)
const dfMultipleExprs = df.filter(
    $df.col("age").ge(25),
    $df.col("name").eq("Alice")
);
if (dfMultipleExprs.height !== 1 || dfMultipleExprs.toDicts()[0].name !== "Alice") {
    throw new Error("Combined multiple expressions filter failed");
}

// 4. Logical .and() expression
const dfAndExpr = df.filter(
    $df.col("age").ge(25).and($df.col("name").eq("Alice"))
);
if (dfAndExpr.height !== 1 || dfAndExpr.toDicts()[0].name !== "Alice") {
    throw new Error(".and() expression filter failed");
}

// 5. Logical .or() expression
const dfOrExpr = df.filter(
    $df.col("name").eq("Alice").or($df.col("name").eq("Bob"))
);
if (dfOrExpr.height !== 2) {
    throw new Error(".or() expression filter failed");
}

// 6. Combined expression + callback function
const dfCombined = df.filter(
    $df.col("age").gt(20),
    (row: any) => row.name.startsWith("C")
);
if (dfCombined.height !== 1 || dfCombined.toDicts()[0].name !== "Charlie") {
    throw new Error("Combined expression and predicate function failed");
}

// 5. Edge Case: Filter matches no rows (height 0 result)
const dfNone = df.filter($df.col("age").gt(100));
if (dfNone.height !== 0 || dfNone.width !== 2) {
    throw new Error("Empty filter result shape mismatch");
}

// 6. Edge Case: Filter matches all rows (full height result)
const dfAll = df.filter($df.col("age").gt(0));
if (dfAll.height !== 3 || dfAll.width !== 2) {
    throw new Error("Full match filter result shape mismatch");
}

// 7. Edge Case: Filter on empty DataFrame (height 0 input)
const dfEmpty = new DataFrame({ a: [], b: [] });
const dfFilteredEmpty = dfEmpty.filter($df.col("a").gt(10));
if (dfFilteredEmpty.height !== 0 || dfFilteredEmpty.width !== 2) {
    throw new Error("Filter on empty DataFrame failed");
}

// 8. Edge Case: Filter with nulls / NaNs (truthy check should exclude nulls & NaNs)
const dfNulls = new DataFrame([
    { a: 1, val: 10 },
    { a: 2, val: null },
    { a: 3, val: NaN },
    { a: 4, val: undefined }
]);
const dfFilteredNulls = dfNulls.filter($df.col("val").gt(5));
if (dfFilteredNulls.height !== 1 || dfFilteredNulls.toDicts()[0].a !== 1) {
    throw new Error("Filter with nulls and NaNs failed");
}

// 9. Edge Case: Filter with column expression returning string/truthy objects
const dfTruthy = new DataFrame([
    { tag: "active", id: 1 },
    { tag: "", id: 2 },
    { tag: null, id: 3 }
]);
const dfFilteredTruthy = dfTruthy.filter($df.col("tag").isNotNull());
if (dfFilteredTruthy.height !== 2) {
    throw new Error("Filter with isNotNull failed");
}

// 11. Edge Case: Filter custom proxy compatibility (Object.keys / Object.getOwnPropertyDescriptor / in)
const dfFilterTest = new DataFrame([
    { a: 1, b: 2 },
    { a: 3, b: 4 }
]);
const dfFilteredProxy = dfFilterTest.filter((row: any) => {
    const keys = Object.keys(row);
    if (keys.length !== 2 || !keys.includes("a") || !keys.includes("b")) {
        throw new Error("Object.keys failed on row proxy");
    }
    if (!("a" in row)) throw new Error("'in' operator failed on row proxy");
    const desc = Object.getOwnPropertyDescriptor(row, "a");
    if (desc === undefined || desc.enumerable !== true) {
        throw new Error("getOwnPropertyDescriptor failed on row proxy");
    }
    return row.a > 2;
});
if (dfFilteredProxy.height !== 1 || dfFilteredProxy.toDicts()[0].a !== 3) {
    throw new Error("Filtered proxy logic execution failed");
}

// 12. Edge Case: Filter with boolean expression ($df.lit(true) / $df.lit(false)) & predicate functions
const dfLitTrue = df.filter($df.lit(true));
if (dfLitTrue.height !== 3) throw new Error("12. Filter true literal failed");
const dfLitFalse = df.filter($df.lit(false));
if (dfLitFalse.height !== 0) throw new Error("12. Filter false literal failed");
const dfFnTrue = df.filter(() => true);
if (dfFnTrue.height !== 3) throw new Error("12. Filter fn true failed");
const dfFnFalse = df.filter(() => false);
if (dfFnFalse.height !== 0) throw new Error("12. Filter fn false failed");

// 13. Edge Case: Filter with TypedArray columns
const dfTypedCols = new DataFrame({
    floats: new Float64Array([10.5, 20.5, 30.5, 40.5]),
    ints: new Int32Array([1, 2, 3, 4])
});
const dfFilteredTyped = dfTypedCols.filter($df.col("floats").gt(25));
if (dfFilteredTyped.height !== 2) throw new Error("13. Filter with TypedArray failed");
const typedDicts = dfFilteredTyped.toDicts();
if (typedDicts[0].floats !== 30.5 || typedDicts[1].ints !== 4) throw new Error("13. Filter TypedArray values failed");

// 14. Edge Case: Filter with Date objects
const d1 = new Date("2026-01-01T00:00:00Z");
const d2 = new Date("2026-06-01T00:00:00Z");
const dfDates = new DataFrame({
    date: [d1, d2],
    tag: ["old", "new"]
});
const dfFilteredDate = dfDates.filter($df.col("date").gt(new Date("2026-03-01T00:00:00Z")));
if (dfFilteredDate.height !== 1 || dfFilteredDate.toDicts()[0].tag !== "new") {
    throw new Error("14. Date filter failed");
}

// 15. Edge Case: Filter with multiple columns having mixed nulls/NaNs
const dfMixedCols = new DataFrame({
    a: [1, null, 3, NaN, 5],
    b: [10, 20, null, 40, NaN]
});
const dfCleanBoth = dfMixedCols.filter($df.col("a").isNotNull(), $df.col("a").isNotNan(), $df.col("b").isNotNull(), $df.col("b").isNotNan());
if (dfCleanBoth.height !== 1 || dfCleanBoth.toDicts()[0].a !== 1) {
    throw new Error("15. Multi-column clean filter failed");
}

// 16. Edge Case: Chained .filter().filter() calls
const dfChained = df.filter($df.col("age").gt(20)).filter($df.col("name").eq("Alice"));
if (dfChained.height !== 1 || dfChained.toDicts()[0].name !== "Alice") {
    throw new Error("16. Chained filter calls failed");
}

// 17. Edge Case: Zero and signed zero preservation
const dfZeroTable = new DataFrame({
    v: [0, -0, +0, 10, -5],
    id: [1, 2, 3, 4, 5]
});
const dfFilteredZeros = dfZeroTable.filter($df.col("v").eq(0));
if (dfFilteredZeros.height !== 3) {
    throw new Error("17. Zero row filtering failed");
}

// 18. Edge Case: Empty strings vs null strings
const dfStrTable = new DataFrame({
    s: ["", "hello", "", "world", null]
});
const dfEmptyOnly = dfStrTable.filter($df.col("s").eq(""));
if (dfEmptyOnly.height !== 2) {
    throw new Error("18. Empty string filtering failed");
}

// 19. Edge Case: Single row DataFrame
const dfSingleRow = new DataFrame([{ x: 42, y: "single" }]);
if (dfSingleRow.filter($df.col("x").eq(42)).height !== 1) throw new Error("19. Single row match failed");
if (dfSingleRow.filter($df.col("x").ne(42)).height !== 0) throw new Error("19. Single row mismatch failed");

// 20. Edge Case: Large scale 10,000 row DataFrame filtering
const largeN = 10000;
const dfLargeTable = new DataFrame({
    id: Array.from({ length: largeN }, (_, i) => i),
    val: Array.from({ length: largeN }, (_, i) => `row_${i}`)
});
const dfFilteredLarge = dfLargeTable.filter($df.col("id").ge(9500));
if (dfFilteredLarge.height !== 500) {
    throw new Error(`20. Large table filter failed: expected 500 rows, got ${dfFilteredLarge.height}`);
}
if (dfFilteredLarge.toDicts()[0].id !== 9500 || dfFilteredLarge.toDicts()[499].id !== 9999) {
    throw new Error("20. Large table filter values failed");
}

// 21. Edge Case: DataFrame immutability check
const origHeight = df.height;
df.filter($df.col("age").gt(25));
if (df.height !== origHeight) {
    throw new Error("21. Immutability violation: original DataFrame height modified");
}

// 22. Edge Case: Nested expression arrays & string column names (via _normalizeArgs)
const dfNestedFilter = df.filter([
    $df.col("age").gt(20),
    $df.col("name").ne("Bob")
]);
if (dfNestedFilter.height !== 2) {
    throw new Error("22. Nested array of filter expressions failed");
}

console.log("✓ filter tests passed!");



