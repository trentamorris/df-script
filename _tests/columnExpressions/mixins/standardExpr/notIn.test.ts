declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.notIn edge-case tests...");

// -------------------------------------------------------------
// Case 1: Standard array of candidates
// -------------------------------------------------------------
const dfBasic = $df.data([
    { val: 10 },
    { val: 25 },
    { val: null }
]);
const resBasic = dfBasic.select([
    $df.col("val").notIn([10, 20, 30]).alias("n")
]).toDicts() as any[];
if (resBasic[0].n !== false || resBasic[1].n !== true || resBasic[2].n !== null) {
    throw new Error("Case 1 failed: standard array notIn");
}

// -------------------------------------------------------------
// Case 2: Single scalar candidate (number / string)
// -------------------------------------------------------------
const resScalar = dfBasic.select([
    $df.col("val").notIn(10).alias("n1"),
    $df.col("val").notIn(99).alias("n2")
]).toDicts() as any[];
if (resScalar[0].n1 !== false || resScalar[1].n1 !== true || resScalar[2].n1 !== null) {
    throw new Error("Case 2 failed: single scalar notIn(10)");
}
if (resScalar[0].n2 !== true || resScalar[1].n2 !== true || resScalar[2].n2 !== null) {
    throw new Error("Case 2 failed: single scalar notIn(99)");
}

// -------------------------------------------------------------
// Case 3: Column expression as target candidate list
// -------------------------------------------------------------
const dfExprCol = $df.data([
    { item: "apple", target: "apple" },
    { item: "banana", target: "apple" }
]);
const resExprCol = dfExprCol.select([
    $df.col("item").notIn($df.col("target")).alias("n")
]).toDicts() as any[];
if (resExprCol[0].n !== false || resExprCol[1].n !== true) {
    throw new Error("Case 3 failed: column expression target in notIn");
}

// -------------------------------------------------------------
// Case 4: NaN membership in candidate list
// -------------------------------------------------------------
const dfNaN = $df.data([
    { val: NaN },
    { val: 10 },
    { val: null }
]);
const resNaN = dfNaN.select([
    $df.col("val").notIn([NaN, 20]).alias("n")
]).toDicts() as any[];
// NaN matches NaN in candidate list -> notIn is false
if (resNaN[0].n !== false || resNaN[1].n !== true || resNaN[2].n !== null) {
    throw new Error("Case 4 failed: NaN membership in notIn");
}

// -------------------------------------------------------------
// Case 5: Date instances in candidates
// -------------------------------------------------------------
const d1 = new Date("2026-01-01T00:00:00.000Z");
const d2 = new Date("2026-06-01T00:00:00.000Z");
const d3 = new Date("2026-12-31T00:00:00.000Z");
const dfDates = $df.data([{ d: d1 }, { d: d2 }]);
const resDates = dfDates.select([
    $df.col("d").notIn([d2, d3]).alias("n")
]).toDicts() as any[];
if (resDates[0].n !== true || resDates[1].n !== false) {
    throw new Error("Case 5 failed: date instances in notIn");
}

// -------------------------------------------------------------
// Case 6: BigInt candidate values
// -------------------------------------------------------------
const dfBig = $df.data([{ n: 10n }, { n: 20n }, { n: 30n }]);
const resBig = dfBig.select([
    $df.col("n").notIn([10n, 50n]).alias("n")
]).toDicts() as any[];
if (resBig[0].n !== false || resBig[1].n !== true || resBig[2].n !== true) {
    throw new Error("Case 6 failed: BigInt candidate values");
}

// -------------------------------------------------------------
// Case 7: Empty candidate array (not in empty set is always true for non-nulls)
// -------------------------------------------------------------
const resEmptyCandidates = dfBasic.select([
    $df.col("val").notIn([]).alias("n")
]).toDicts() as any[];
if (resEmptyCandidates[0].n !== true || resEmptyCandidates[1].n !== true || resEmptyCandidates[2].n !== null) {
    throw new Error("Case 7 failed: empty candidates array should yield true for non-nulls");
}

// -------------------------------------------------------------
// Case 8: Multi-column projection ($df.col(["a", "b"]).notIn([1, 2]))
// -------------------------------------------------------------
const dfMulti = $df.data([
    { a: 1, b: 3 },
    { a: 2, b: 2 }
]);
const resMulti = dfMulti.select([
    $df.col(["a", "b"]).notIn([1, 2])
]).toDicts() as any[];
if (resMulti[0].a !== false || resMulti[0].b !== true) throw new Error("Case 8 failed: multi-col row 0");
if (resMulti[1].a !== false || resMulti[1].b !== false) throw new Error("Case 8 failed: multi-col row 1");

// -------------------------------------------------------------
// Case 9: Empty DataFrame with schema preserved
// -------------------------------------------------------------
const dfEmpty = $df.data([{ val: 1 }]).filter($df.col("val").eq(999));
const resEmpty = dfEmpty.select([
    $df.col("val").notIn([1, 2]).alias("n")
]).toDicts();
if (resEmpty.length !== 0) throw new Error("Case 9 failed: empty DataFrame notIn");

// -------------------------------------------------------------
// Case 10: Downstream expression chaining (.notIn().not())
// -------------------------------------------------------------
const resChain = dfBasic.select([
    $df.col("val").notIn([10, 20]).not().alias("is_in")
]).toDicts() as any[];
if (resChain[0].is_in !== true || resChain[1].is_in !== false || resChain[2].is_in !== null) {
    throw new Error("Case 10 failed: chaining after notIn");
}

console.log("✓ StandardExpr.notIn tests passed!");
