declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.shift tests...");

const df = $df.data([
    { a: 10 },
    { a: 20 },
    { a: 30 }
]);

// 1. Shift positive (down by 1)
const resDown = df.select([$df.col("a").shift(1).alias("s")]).toDicts() as any[];
if (resDown[0].s !== null || resDown[1].s !== 10 || resDown[2].s !== 20) {
    throw new Error("StandardExpr.shift(1) failed");
}

// 2. Shift negative (up by 1)
const resUp = df.select([$df.col("a").shift(-1).alias("s")]).toDicts() as any[];
if (resUp[0].s !== 20 || resUp[1].s !== 30 || resUp[2].s !== null) {
    throw new Error("StandardExpr.shift(-1) failed");
}

// 3. Shift with window partition (.over)
const dfGrouped = $df.data([
    { group: "A", val: 1 },
    { group: "A", val: 2 },
    { group: "B", val: 3 },
    { group: "B", val: 4 }
]);

const resOver = dfGrouped.withColumns(
    $df.col("val").shift(1).over("group").alias("shifted")
).toDicts() as any[];

if (resOver[0].shifted !== null || resOver[1].shifted !== 1) {
    throw new Error("StandardExpr.shift over group A failed");
}
if (resOver[2].shifted !== null || resOver[3].shifted !== 3) {
    throw new Error("StandardExpr.shift over group B failed");
}

// 4. Shift with custom fillValue (strings, numbers, booleans, undefined)
const resFilled = df.select([$df.col("a").shift(1, { fillValue: -1 }).alias("s")]).toDicts() as any[];
if (resFilled[0].s !== -1 || resFilled[1].s !== 10) {
    throw new Error("StandardExpr.shift with fillValue failed");
}

// 5. Shift 0 (identity check)
const resZero = df.select([$df.col("a").shift(0).alias("s")]).toDicts() as any[];
if (resZero[0].s !== 10 || resZero[1].s !== 20 || resZero[2].s !== 30) {
    throw new Error("StandardExpr.shift(0) failed");
}

// 6. Shift positive beyond length
const resBeyondPos = df.select([$df.col("a").shift(10, { fillValue: "fill" }).alias("s")]).toDicts() as any[];
if (resBeyondPos[0].s !== "fill" || resBeyondPos[1].s !== "fill" || resBeyondPos[2].s !== "fill") {
    throw new Error("StandardExpr.shift beyond length positive failed");
}

// 7. Shift negative beyond length
const resBeyondNeg = df.select([$df.col("a").shift(-10, { fillValue: "fill" }).alias("s")]).toDicts() as any[];
if (resBeyondNeg[0].s !== "fill" || resBeyondNeg[1].s !== "fill" || resBeyondNeg[2].s !== "fill") {
    throw new Error("StandardExpr.shift beyond length negative failed");
}

// 8. Shift exact length positive & negative
const resExactPos = df.select([$df.col("a").shift(3).alias("s")]).toDicts() as any[];
if (resExactPos[0].s !== null || resExactPos[1].s !== null || resExactPos[2].s !== null) {
    throw new Error("StandardExpr.shift exact length positive failed");
}
const resExactNeg = df.select([$df.col("a").shift(-3).alias("s")]).toDicts() as any[];
if (resExactNeg[0].s !== null || resExactNeg[1].s !== null || resExactNeg[2].s !== null) {
    throw new Error("StandardExpr.shift exact length negative failed");
}

// 9. Shift with non-integer floats (should truncate)
const resFloat = df.select([$df.col("a").shift(1.9).alias("s")]).toDicts() as any[];
if (resFloat[0].s !== null || resFloat[1].s !== 10 || resFloat[2].s !== 20) {
    throw new Error("StandardExpr.shift(1.9) truncation failed");
}
const resFloatNeg = df.select([$df.col("a").shift(-1.9).alias("s")]).toDicts() as any[];
if (resFloatNeg[0].s !== 20 || resFloatNeg[1].s !== 30 || resFloatNeg[2].s !== null) {
    throw new Error("StandardExpr.shift(-1.9) truncation failed");
}

// 10. Shift with NaN (should act as 0 / return this)
const resNan = df.select([$df.col("a").shift(NaN).alias("s")]).toDicts() as any[];
if (resNan[0].s !== 10 || resNan[1].s !== 20 || resNan[2].s !== 30) {
    throw new Error("StandardExpr.shift(NaN) failed");
}

// 11. Empty DataFrame edge case
const emptyDf = $df.data([] as { a: number }[]);
const resEmpty = emptyDf.select([$df.col("a").shift(1).alias("s")]).toDicts() as any[];
if (resEmpty.length !== 0) {
    throw new Error("StandardExpr.shift empty df failed");
}

// 12. Single row DataFrame
const singleRowDf = $df.data([{ a: 42 }]);
const resSingleShift1 = singleRowDf.select([$df.col("a").shift(1).alias("s")]).toDicts() as any[];
if (resSingleShift1[0].s !== null) {
    throw new Error("StandardExpr.shift single row shift(1) failed");
}
const resSingleShiftNeg1 = singleRowDf.select([$df.col("a").shift(-1).alias("s")]).toDicts() as any[];
if (resSingleShiftNeg1[0].s !== null) {
    throw new Error("StandardExpr.shift single row shift(-1) failed");
}

console.log("✓ StandardExpr.shift tests passed!");
