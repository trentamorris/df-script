declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.round edge-case tests...");

// -------------------------------------------------------------
// Case 1: Default scale (0 decimal places)
// -------------------------------------------------------------
const dfBasic = $df.data([
    { val: 4.2 },
    { val: 4.88 },
    { val: -5.5 },
    { val: -5.2 }
]);
const res0 = dfBasic.select([
    $df.col("val").round().alias("r0")
]).toDicts() as any[];
if (res0[0].r0 !== 4 || res0[1].r0 !== 5 || res0[2].r0 !== -5 || res0[3].r0 !== -5) {
    throw new Error("Case 1 failed: default round(0)");
}

// -------------------------------------------------------------
// Case 2: Positive decimal places (e.g. 1 and 2)
// -------------------------------------------------------------
const resPos = dfBasic.select([
    $df.col("val").round(1).alias("r1")
]).toDicts() as any[];
if (resPos[0].r1 !== 4.2 || resPos[1].r1 !== 4.9 || resPos[2].r1 !== -5.5) {
    throw new Error("Case 2 failed: round(1)");
}

// -------------------------------------------------------------
// Case 3: Negative decimal places (rounding to tens, hundreds: e.g. -1, -2)
// -------------------------------------------------------------
const dfLargeNums = $df.data([
    { val: 1234.56 },
    { val: 1289.10 },
    { val: 55 }
]);
const resNeg = dfLargeNums.select([
    $df.col("val").round(-1).alias("r_tens"),
    $df.col("val").round(-2).alias("r_hundreds")
]).toDicts() as any[];
// 1234.56 -> 1230, 1289.10 -> 1290, 55 -> 60
if (resNeg[0].r_tens !== 1230 || resNeg[1].r_tens !== 1290 || resNeg[2].r_tens !== 60) {
    throw new Error("Case 3 failed: round(-1) tens");
}
if (resNeg[0].r_hundreds !== 1200 || resNeg[1].r_hundreds !== 1300 || resNeg[2].r_hundreds !== 100) {
    throw new Error("Case 3 failed: round(-2) hundreds");
}

// -------------------------------------------------------------
// Case 4: Null and NaN preservation
// -------------------------------------------------------------
const dfMissing = $df.data([
    { val: null },
    { val: NaN }
]);
const resMissing = dfMissing.select([
    $df.col("val").round(2).alias("r")
]).toDicts() as any[];
if (resMissing[0].r !== null) throw new Error("Case 4 failed: round on null should return null");
if (!Number.isNaN(resMissing[1].r)) throw new Error("Case 4 failed: round on NaN should return NaN");

// -------------------------------------------------------------
// Case 5: Signed zero and zero preservation
// -------------------------------------------------------------
const dfZeros = $df.data([
    { val: 0 },
    { val: -0 },
    { val: 0.00001 }
]);
const resZeros = dfZeros.select([
    $df.col("val").round(2).alias("r")
]).toDicts() as any[];
if (resZeros[0].r !== 0 || resZeros[1].r !== 0 || resZeros[2].r !== 0) {
    throw new Error("Case 5 failed: zero handling");
}

// -------------------------------------------------------------
// Case 6: Precision edge cases with floating point representation (e.g. 1.005)
// -------------------------------------------------------------
const dfFloat = $df.data([
    { val: 1.005 },
    { val: 2.175 }
]);
const resFloat = dfFloat.select([
    $df.col("val").round(2).alias("r")
]).toDicts() as any[];
if (Math.abs(resFloat[0].r - 1.01) > 1e-6 || Math.abs(resFloat[1].r - 2.18) > 1e-6) {
    throw new Error("Case 6 failed: floating point precision rounding");
}

// -------------------------------------------------------------
// Case 7: Multi-column projection ($df.col(["a", "b"]).round(1))
// -------------------------------------------------------------
const dfMulti = $df.data([
    { a: 1.25, b: 9.84 },
    { a: 3.44, b: 5.67 }
]);
const resMulti = dfMulti.select([
    $df.col(["a", "b"]).round(1)
]).toDicts() as any[];
if (resMulti[0].a !== 1.3 || resMulti[0].b !== 9.8 || resMulti[1].a !== 3.4 || resMulti[1].b !== 5.7) {
    throw new Error("Case 7 failed: multi-column projection round");
}

// -------------------------------------------------------------
// Case 8: Single-row DataFrame
// -------------------------------------------------------------
const dfSingle = $df.data([{ val: 3.14159 }]);
const resSingle = dfSingle.select([
    $df.col("val").round(4).alias("pi")
]).toDicts() as any[];
if (resSingle[0].pi !== 3.1416) {
    throw new Error("Case 8 failed: single row round");
}

// -------------------------------------------------------------
// Case 9: Empty DataFrame with schema preserved
// -------------------------------------------------------------
const dfEmpty = $df.data([{ val: 1.1 }]).filter($df.col("val").eq(999));
const resEmpty = dfEmpty.select([
    $df.col("val").round(2).alias("r")
]).toDicts();
if (resEmpty.length !== 0) {
    throw new Error("Case 9 failed: empty DataFrame round");
}

// -------------------------------------------------------------
// Case 10: Downstream expression chaining (.round().mul(10).add(1))
// -------------------------------------------------------------
const resChain = dfSingle.select([
    $df.col("val").round(2).mul(10).add(1).alias("calc")
]).toDicts() as any[];
// 3.14 * 10 + 1 = 32.4
if (Math.abs(resChain[0].calc - 32.4) > 1e-6) {
    throw new Error("Case 10 failed: downstream expression chaining after round");
}

console.log("✓ StandardExpr.round tests passed!");
