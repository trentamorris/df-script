declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.and tests...");

// 1. Canonical Kleene 3-valued logic truth table (9 combinations)
const kleeneDf = $df.data({
    a: [true,  true,  true,  false, false, false, null,  null,  null],
    b: [true,  false, null,  true,  false, null,  true,  false, null]
});

const kleeneRes = kleeneDf.select([$df.col("a").and($df.col("b")).alias("c")]).toArray("c");
const expectedKleene = [
    true,  // true AND true => true
    false, // true AND false => false
    null,  // true AND null => null
    false, // false AND true => false
    false, // false AND false => false
    false, // false AND null => false
    null,  // null AND true => null
    false, // null AND false => false
    null   // null AND null => null
];

for (let i = 0; i < expectedKleene.length; i++) {
    if (kleeneRes[i] !== expectedKleene[i]) {
        throw new Error(`Kleene truth table failed at row ${i}: expected ${expectedKleene[i]}, got ${kleeneRes[i]}`);
    }
}

// 2. Scalar boolean literal: .and(true)
const dfTrue = $df.data({ a: [true, false, null] });
const resTrue = dfTrue.select([$df.col("a").and(true).alias("c")]).toArray("c");
if (resTrue[0] !== true || resTrue[1] !== false || resTrue[2] !== null) {
    throw new Error("Scalar .and(true) failed");
}

// 3. Scalar boolean literal: .and(false)
const resFalse = dfTrue.select([$df.col("a").and(false).alias("c")]).toArray("c");
if (resFalse[0] !== false || resFalse[1] !== false || resFalse[2] !== false) {
    throw new Error("Scalar .and(false) failed: expected all false");
}

// 4. Scalar null literal: .and(null)
const resNull = dfTrue.select([$df.col("a").and(null).alias("c")]).toArray("c");
if (resNull[0] !== null || resNull[1] !== false || resNull[2] !== null) {
    throw new Error("Scalar .and(null) failed");
}

// 5. Scalar undefined literal: .and(undefined)
const resUndefined = dfTrue.select([$df.col("a").and(undefined).alias("c")]).toArray("c");
if (resUndefined[0] !== null || resUndefined[1] !== false || resUndefined[2] !== null) {
    throw new Error("Scalar .and(undefined) failed");
}

// 6. Another ColumnExpression: .and($df.col("b"))
const dfCols = $df.data({ a: [true, false, true], b: [true, true, false] });
const resColExpr = dfCols.select([$df.col("a").and($df.col("b")).alias("c")]).toArray("c");
if (resColExpr[0] !== true || resColExpr[1] !== false || resColExpr[2] !== false) {
    throw new Error(".and($df.col('b')) column expression failed");
}

// 7. Self-and (idempotence / tautology)
const resSelf = dfCols.select([$df.col("a").and($df.col("a")).alias("c")]).toArray("c");
if (resSelf[0] !== true || resSelf[1] !== false || resSelf[2] !== true) {
    throw new Error("Self .and() failed");
}

// 8. Chained .and().and()
const dfChained = $df.data({ a: [true, true, true], b: [true, true, false], c: [true, false, true] });
const resChained = dfChained.select([$df.col("a").and($df.col("b")).and($df.col("c")).alias("out")]).toArray("out");
if (resChained[0] !== true || resChained[1] !== false || resChained[2] !== false) {
    throw new Error("Chained .and().and() failed");
}

// 9. Empty DataFrame edge case
const emptyDf = $df.data({ a: [] as boolean[], b: [] as boolean[] });
const resEmpty = emptyDf.select([$df.col("a").and($df.col("b")).alias("c")]).toArray("c");
if (resEmpty.length !== 0) {
    throw new Error("Empty DataFrame .and() failed: expected length 0");
}

// 10. Single row edge case
const singleDf = $df.data({ a: [false], b: [null] });
const resSingle = singleDf.select([$df.col("a").and($df.col("b")).alias("c")]).toArray("c");
if (resSingle[0] !== false) {
    throw new Error("Single row false AND null failed: expected false");
}

console.log("✓ StandardExpr.and tests passed (all 10/10 edge case suites)! (19 assertions)");
