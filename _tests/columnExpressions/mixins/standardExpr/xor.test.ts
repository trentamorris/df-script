declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.xor edge-case tests...");

// -------------------------------------------------------------
// Case 1: Column vs Column boolean logic
// -------------------------------------------------------------
const dfCol = $df.data([
    { a: true, b: false },
    { a: true, b: true },
    { a: false, b: false },
    { a: false, b: true }
]);
const resCol = dfCol.select([
    $df.col("a").xor($df.col("b")).alias("x")
]).toDicts() as any[];
if (resCol[0].x !== true || resCol[1].x !== false || resCol[2].x !== false || resCol[3].x !== true) {
    throw new Error("Case 1 failed: col vs col xor");
}

// -------------------------------------------------------------
// Case 2: Boolean literal true/false argument
// -------------------------------------------------------------
const resLit = dfCol.select([
    $df.col("a").xor(true).alias("xor_true"),
    $df.col("a").xor(false).alias("xor_false")
]).toDicts() as any[];
if (resLit[0].xor_true !== false || resLit[1].xor_true !== false || resLit[2].xor_true !== true || resLit[3].xor_true !== true) {
    throw new Error("Case 2 failed: xor with literal true");
}
if (resLit[0].xor_false !== true || resLit[1].xor_false !== true || resLit[2].xor_false !== false || resLit[3].xor_false !== false) {
    throw new Error("Case 2 failed: xor with literal false");
}

// -------------------------------------------------------------
// Case 3: Boolean array / vector argument
// -------------------------------------------------------------
const resArray = dfCol.select([
    $df.col("a").xor([false, true, true, false]).alias("x")
]).toDicts() as any[];
// a = [true, true, false, false] ^ [false, true, true, false] = [true, false, true, false]
if (resArray[0].x !== true || resArray[1].x !== false || resArray[2].x !== true || resArray[3].x !== false) {
    throw new Error("Case 3 failed: vector array xor");
}

// -------------------------------------------------------------
// Case 4: Null propagation (Kleene / SQL 3-valued logic: null yields null)
// -------------------------------------------------------------
const dfNull = $df.data([
    { a: null, b: true },
    { a: false, b: null },
    { a: null, b: null }
]);
const resNull = dfNull.select([
    $df.col("a").xor($df.col("b")).alias("x"),
    $df.col("a").xor(null).alias("x_lit")
]).toDicts() as any[];
if (resNull[0].x !== null || resNull[1].x !== null || resNull[2].x !== null) {
    throw new Error("Case 4 failed: null column propagation in xor");
}
if (resNull[0].x_lit !== null || resNull[1].x_lit !== null || resNull[2].x_lit !== null) {
    throw new Error("Case 4 failed: xor(null) literal should yield null");
}

// -------------------------------------------------------------
// Case 5: Truthy / Falsy primitives (numbers 1 and 0 coerced via !!)
// -------------------------------------------------------------
const dfNumeric = $df.data([
    { a: 1, b: 0 },
    { a: 1, b: 1 },
    { a: 0, b: 0 }
]);
const resNumeric = dfNumeric.select([
    $df.col("a").xor($df.col("b")).alias("x")
]).toDicts() as any[];
if (resNumeric[0].x !== true || resNumeric[1].x !== false || resNumeric[2].x !== false) {
    throw new Error("Case 5 failed: truthy numeric xor");
}

// -------------------------------------------------------------
// Case 6: Multi-column projection with xor
// -------------------------------------------------------------
const dfMulti = $df.data([
    { a: true, b: false },
    { a: false, b: true }
]);
const resMulti = dfMulti.select([
    $df.col(["a", "b"]).xor(true)
]).toDicts() as any[];
if (resMulti[0].a !== false || resMulti[0].b !== true) throw new Error("Case 6 failed: multi-column row 0");
if (resMulti[1].a !== true || resMulti[1].b !== false) throw new Error("Case 6 failed: multi-column row 1");

// -------------------------------------------------------------
// Case 7: Expression chaining after xor (.xor().not(), etc.)
// -------------------------------------------------------------
const resChain = dfCol.select([
    $df.col("a").xor($df.col("b")).not().alias("x_not")
]).toDicts() as any[];
// Inverted from [true, false, false, true] -> [false, true, true, false]
if (resChain[0].x_not !== false || resChain[1].x_not !== true || resChain[2].x_not !== true || resChain[3].x_not !== false) {
    throw new Error("Case 7 failed: expression chaining after xor");
}

// -------------------------------------------------------------
// Case 8: Single-row DataFrame
// -------------------------------------------------------------
const dfSingle = $df.data([{ a: true, b: false }]);
const resSingle = dfSingle.select([$df.col("a").xor($df.col("b")).alias("x")]).toDicts() as any[];
if (resSingle[0].x !== true) throw new Error("Case 8 failed: single row xor");

// -------------------------------------------------------------
// Case 9: Empty DataFrame (schema preserved)
// -------------------------------------------------------------
const dfEmpty = $df.data([{ a: true, b: false }]).filter($df.col("a").eq(false));
const resEmpty = dfEmpty.select([$df.col("a").xor($df.col("b")).alias("x")]).toDicts();
if (resEmpty.length !== 0) throw new Error("Case 9 failed: empty DataFrame xor");

// -------------------------------------------------------------
// Case 10: Chaining multiple xors: a.xor(b).xor(c)
// -------------------------------------------------------------
const dfTriple = $df.data([
    { a: true, b: true, c: true },   // (T ^ T) ^ T = F ^ T = T
    { a: true, b: true, c: false },  // (T ^ T) ^ F = F ^ F = F
    { a: true, b: false, c: false }, // (T ^ F) ^ F = T ^ F = T
    { a: false, b: false, c: false } // (F ^ F) ^ F = F ^ F = F
]);
const resTriple = dfTriple.select([
    $df.col("a").xor($df.col("b")).xor($df.col("c")).alias("x")
]).toDicts() as any[];
if (resTriple[0].x !== true || resTriple[1].x !== false || resTriple[2].x !== true || resTriple[3].x !== false) {
    throw new Error("Case 10 failed: triple chained xor");
}

console.log("✓ StandardExpr.xor tests passed!");
