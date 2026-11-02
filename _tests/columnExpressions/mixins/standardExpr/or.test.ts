declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.or edge-case tests...");

// -------------------------------------------------------------
// Case 1: Column vs Column boolean logic
// -------------------------------------------------------------
const dfCol = $df.data([
    { a: true, b: false },
    { a: false, b: false },
    { a: true, b: true },
    { a: false, b: true }
]);
const resCol = dfCol.select([
    $df.col("a").or($df.col("b")).alias("c")
]).toDicts() as any[];
if (resCol[0].c !== true || resCol[1].c !== false || resCol[2].c !== true || resCol[3].c !== true) {
    throw new Error("Case 1 failed: col vs col or");
}

// -------------------------------------------------------------
// Case 2: Boolean literals (true / false)
// -------------------------------------------------------------
const resLit = dfCol.select([
    $df.col("a").or(true).alias("or_true"),
    $df.col("a").or(false).alias("or_false")
]).toDicts() as any[];
// anything or true is true
if (resLit[0].or_true !== true || resLit[1].or_true !== true || resLit[2].or_true !== true || resLit[3].or_true !== true) {
    throw new Error("Case 2 failed: or with literal true");
}
// a or false is a
if (resLit[0].or_false !== true || resLit[1].or_false !== false || resLit[2].or_false !== true || resLit[3].or_false !== false) {
    throw new Error("Case 2 failed: or with literal false");
}

// -------------------------------------------------------------
// Case 3: Vector / Array boolean argument
// -------------------------------------------------------------
const resArr = dfCol.select([
    $df.col("a").or([false, true, false, false]).alias("c")
]).toDicts() as any[];
// a = [T, F, T, F] | [F, T, F, F] = [T, T, T, F]
if (resArr[0].c !== true || resArr[1].c !== true || resArr[2].c !== true || resArr[3].c !== false) {
    throw new Error("Case 3 failed: vector array or");
}

// -------------------------------------------------------------
// Case 4: Kleene 3-valued logic with null
// (true or null is true, false or null is null, null or null is null)
// -------------------------------------------------------------
const dfKleene = $df.data([
    { a: true, b: null },
    { a: false, b: null },
    { a: null, b: null }
]);
const resKleene = dfKleene.select([
    $df.col("a").or($df.col("b")).alias("c"),
    $df.col("a").or(null).alias("c_lit")
]).toDicts() as any[];
if (resKleene[0].c !== true || resKleene[1].c !== null || resKleene[2].c !== null) {
    throw new Error("Case 4 failed: column null in Kleene logic");
}
if (resKleene[0].c_lit !== true || resKleene[1].c_lit !== null || resKleene[2].c_lit !== null) {
    throw new Error("Case 4 failed: literal null in Kleene logic");
}

// -------------------------------------------------------------
// Case 5: Strict boolean comparison (only true yields true, non-booleans are false/null)
// -------------------------------------------------------------
const dfNonBool = $df.data([
    { a: 0, b: 0 },
    { a: "true", b: false }
]);
const resNonBool = dfNonBool.select([
    $df.col("a").or($df.col("b")).alias("c")
]).toDicts() as any[];
if (resNonBool[0].c !== false || resNonBool[1].c !== false) {
    throw new Error("Case 5 failed: non-boolean strict evaluation in or");
}

// -------------------------------------------------------------
// Case 6: Multi-column projection ($df.col(["a", "b"]).or(false))
// -------------------------------------------------------------
const dfMulti = $df.data([
    { a: true, b: false },
    { a: false, b: true }
]);
const resMulti = dfMulti.select([
    $df.col(["a", "b"]).or(false)
]).toDicts() as any[];
if (resMulti[0].a !== true || resMulti[0].b !== false || resMulti[1].a !== false || resMulti[1].b !== true) {
    throw new Error("Case 6 failed: multi-column projection or");
}

// -------------------------------------------------------------
// Case 7: Expression chaining after or (.or().not())
// -------------------------------------------------------------
const resChain = dfCol.select([
    $df.col("a").or($df.col("b")).not().alias("c_not")
]).toDicts() as any[];
// [T, F, T, T] inverted -> [F, T, F, F]
if (resChain[0].c_not !== false || resChain[1].c_not !== true || resChain[2].c_not !== false || resChain[3].c_not !== false) {
    throw new Error("Case 7 failed: expression chaining after or");
}

// -------------------------------------------------------------
// Case 8: Single-row DataFrame
// -------------------------------------------------------------
const dfSingle = $df.data([{ a: false, b: true }]);
const resSingle = dfSingle.select([$df.col("a").or($df.col("b")).alias("c")]).toDicts() as any[];
if (resSingle[0].c !== true) throw new Error("Case 8 failed: single row or");

// -------------------------------------------------------------
// Case 9: Empty DataFrame with schema preserved
// -------------------------------------------------------------
const dfEmpty = $df.data([{ a: true, b: false }]).filter($df.col("a").eq(false));
const resEmpty = dfEmpty.select([$df.col("a").or($df.col("b")).alias("c")]).toDicts();
if (resEmpty.length !== 0) throw new Error("Case 9 failed: empty DataFrame or");

// -------------------------------------------------------------
// Case 10: Triple chained OR: a.or(b).or(c)
// -------------------------------------------------------------
const dfTriple = $df.data([
    { a: false, b: false, c: false },
    { a: false, b: false, c: true },
    { a: false, b: true, c: false },
    { a: true, b: false, c: false }
]);
const resTriple = dfTriple.select([
    $df.col("a").or($df.col("b")).or($df.col("c")).alias("c")
]).toDicts() as any[];
if (resTriple[0].c !== false || resTriple[1].c !== true || resTriple[2].c !== true || resTriple[3].c !== true) {
    throw new Error("Case 10 failed: triple chained or");
}

console.log("✓ StandardExpr.or tests passed!");
