declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running ArrayExpr.filter tests...");

// 1. Basic numeric filter
const df1 = $df.data([
    { numbers: [3, 1, 4, 1, 5, 9, null, 2] },
    { numbers: null }
]);
const res1 = df1.select([
    $df.col("numbers").arr.filter($df.element().isNotNull()).alias("no_nulls"),
    $df.col("numbers").arr.filter($df.element().gt(3)).alias("gt_3")
]).toDicts() as any[];

if (res1[0].no_nulls.length !== 7 || res1[0].no_nulls.includes(null)) throw new Error("1. no_nulls failed");
if (res1[0].gt_3.length !== 3 || res1[0].gt_3[0] !== 4 || res1[0].gt_3[1] !== 5 || res1[0].gt_3[2] !== 9) throw new Error("1. gt_3 failed");
if (res1[1].no_nulls !== null) throw new Error("1. null array failed");

// 2. Empty array rows
const dfEmpty = $df.data({ a: [[], [1, 2], []] });
const resEmpty = dfEmpty.select([$df.col("a").arr.filter($df.element().gt(0)).alias("f")]).toDicts() as any[];
if (resEmpty[0].f.length !== 0 || resEmpty[1].f.length !== 2 || resEmpty[2].f.length !== 0) {
    throw new Error("2. Empty array rows failed");
}

// 3. Filter matches none in array
const resNone = dfEmpty.select([$df.col("a").arr.filter($df.element().gt(100)).alias("f")]).toDicts() as any[];
if (resNone[0].f.length !== 0 || resNone[1].f.length !== 0 || resNone[2].f.length !== 0) {
    throw new Error("3. Match none in array failed");
}

// 4. Filter matches all in array
const resAll = dfEmpty.select([$df.col("a").arr.filter($df.element().lt(100)).alias("f")]).toDicts() as any[];
if (resAll[0].f.length !== 0 || resAll[1].f.length !== 2 || resAll[2].f.length !== 0) {
    throw new Error("4. Match all in array failed");
}

// 5. String element filtering with .str namespace
const dfStr = $df.data({
    tags: [["apple", "banana", "avocado"], ["cherry", "apricot"], []]
});
const resStr = dfStr.select([
    $df.col("tags").arr.filter($df.element().str.startsWith("a")).alias("a_tags")
]).toDicts() as any[];
if (JSON.stringify(resStr[0].a_tags) !== JSON.stringify(["apple", "avocado"])) throw new Error("5. String startsWith failed for row 0");
if (JSON.stringify(resStr[1].a_tags) !== JSON.stringify(["apricot"])) throw new Error("5. String startsWith failed for row 1");
if (JSON.stringify(resStr[2].a_tags) !== JSON.stringify([])) throw new Error("5. String startsWith failed for empty row");

// 6. Filtering NaNs inside array
const dfNans = $df.data({
    vals: [[1, NaN, 2, NaN, 3], [NaN, NaN], [4, 5]]
});
const resNans = dfNans.select([
    $df.col("vals").arr.filter($df.element().isNotNan()).alias("clean")
]).toDicts() as any[];
if (JSON.stringify(resNans[0].clean) !== JSON.stringify([1, 2, 3])) throw new Error("6. NaN filter failed for row 0");
if (JSON.stringify(resNans[1].clean) !== JSON.stringify([])) throw new Error("6. NaN filter failed for row 1");
if (JSON.stringify(resNans[2].clean) !== JSON.stringify([4, 5])) throw new Error("6. NaN filter failed for row 2");

// 7. Boolean elements in array (falsy preservation: false !== null)
const dfBools = $df.data({
    flags: [[true, false, true, false], [false, false], [null, true]]
});
const resBools = dfBools.select([
    $df.col("flags").arr.filter($df.element().eq(false)).alias("falses")
]).toDicts() as any[];
if (JSON.stringify(resBools[0].falses) !== JSON.stringify([false, false])) throw new Error("7. Falsy boolean filter failed row 0");
if (JSON.stringify(resBools[1].falses) !== JSON.stringify([false, false])) throw new Error("7. Falsy boolean filter failed row 1");
if (JSON.stringify(resBools[2].falses) !== JSON.stringify([])) throw new Error("7. Falsy boolean filter failed row 2");

// 8. Zero and signed zero preservation
const dfZeros = $df.data({
    nums: [[0, -0, 1, 2, 0], [-1, 0, 1]]
});
const resZeros = dfZeros.select([
    $df.col("nums").arr.filter($df.element().eq(0)).alias("zeros")
]).toDicts() as any[];
if (resZeros[0].zeros.length !== 3) throw new Error("8. Zero elements filter failed");
if (resZeros[1].zeros.length !== 1) throw new Error("8. Zero elements filter failed row 1");

// 9. TypedArray inside cells (Float64Array, Int32Array)
const dfTyped = $df.data({
    floats: [new Float64Array([10.5, 20.5, 30.5]), new Int32Array([1, 2, 3, 4])]
});
const resTyped = dfTyped.select([
    $df.col("floats").arr.filter($df.element().gt(15)).alias("gt15")
]).toDicts() as any[];
if (JSON.stringify(resTyped[0].gt15) !== JSON.stringify([20.5, 30.5])) throw new Error("9. Float64Array filter failed");
if (JSON.stringify(resTyped[1].gt15) !== JSON.stringify([])) throw new Error("9. Int32Array filter failed");

// 10. Chained array operations: .arr.filter(...).arr.len()
const dfChain = $df.data({
    items: [[1, 2, 3, 4, 5], [10, 20], [100]]
});
const resChain = dfChain.select([
    $df.col("items").arr.filter($df.element().gt(2)).arr.lengths().alias("cnt")
]).toDicts() as any[];
if (resChain[0].cnt !== 3 || resChain[1].cnt !== 2 || resChain[2].cnt !== 1) {
    throw new Error("10. Chained filter + len failed");
}

// 11. Array filter + explode
const dfExplode = $df.data({
    id: [1, 2],
    vals: [[10, 20, 30], [5, 15]]
});
const resExplode = dfExplode.withColumns(
    $df.col("vals").arr.filter($df.element().gt(12)).alias("gt12")
).explode("gt12").toDicts() as any[];
if (resExplode.length !== 3) throw new Error(`11. Filter + explode row count failed: expected 3, got ${resExplode.length}`);
if (resExplode[0].gt12 !== 20 || resExplode[1].gt12 !== 30 || resExplode[2].gt12 !== 15) {
    throw new Error("11. Filter + explode values failed");
}

// 12. Non-array row cell values (null, undefined, arrays)
const dfMixed = $df.data({
    v: [[1, 2, 3], null, undefined, [4, 5]]
});
const resMixed = dfMixed.select([
    $df.col("v").arr.filter($df.element().gt(1)).alias("f")
]).toDicts() as any[];
if (JSON.stringify(resMixed[0].f) !== JSON.stringify([2, 3])) throw new Error("12. Mixed row 0 failed");
if (resMixed[1].f !== null) throw new Error("12. Null row failed");
if (resMixed[2].f !== null) throw new Error("12. Undefined row failed");
if (JSON.stringify(resMixed[3].f) !== JSON.stringify([4, 5])) throw new Error("12. Mixed row 3 failed");

// 13. Logical AND condition on elements
const dfAnd = $df.data({
    v: [[1, 5, 10, 15, 20], [2, 4, 6, 8]]
});
const resAnd = dfAnd.select([
    $df.col("v").arr.filter($df.element().gt(4).and($df.element().lt(16))).alias("between")
]).toDicts() as any[];
if (JSON.stringify(resAnd[0].between) !== JSON.stringify([5, 10, 15])) throw new Error("13. AND filter row 0 failed");
if (JSON.stringify(resAnd[1].between) !== JSON.stringify([6, 8])) throw new Error("13. AND filter row 1 failed");

// 14. Logical OR condition on elements
const resOr = dfAnd.select([
    $df.col("v").arr.filter($df.element().lt(3).or($df.element().gt(18))).alias("ends")
]).toDicts() as any[];
if (JSON.stringify(resOr[0].ends) !== JSON.stringify([1, 20])) throw new Error("14. OR filter row 0 failed");
if (JSON.stringify(resOr[1].ends) !== JSON.stringify([2])) throw new Error("14. OR filter row 1 failed");

// 15. Element .isBetween() test
const resBetween = dfAnd.select([
    $df.col("v").arr.filter($df.element().between(5, 15)).alias("between")
]).toDicts() as any[];
if (JSON.stringify(resBetween[0].between) !== JSON.stringify([5, 10, 15])) throw new Error("15. Between filter failed");

// 16. Negative values filtering
const dfNeg = $df.data({
    v: [[-10, -5, 0, 5, 10], [-1, -2, -3]]
});
const resNeg = dfNeg.select([
    $df.col("v").arr.filter($df.element().lt(0)).alias("negs")
]).toDicts() as any[];
if (JSON.stringify(resNeg[0].negs) !== JSON.stringify([-10, -5])) throw new Error("16. Neg filter row 0 failed");
if (JSON.stringify(resNeg[1].negs) !== JSON.stringify([-1, -2, -3])) throw new Error("16. Neg filter row 1 failed");

// 17. Single element arrays
const dfSingle = $df.data({ v: [[1], [2], [3]] });
const resSingle = dfSingle.select([
    $df.col("v").arr.filter($df.element().eq(2)).alias("two")
]).toDicts() as any[];
if (JSON.stringify(resSingle[0].two) !== JSON.stringify([])) throw new Error("17. Single mismatch failed");
if (JSON.stringify(resSingle[1].two) !== JSON.stringify([2])) throw new Error("17. Single match failed");
if (JSON.stringify(resSingle[2].two) !== JSON.stringify([])) throw new Error("17. Single mismatch 2 failed");

// 18. Large array in cell (1000 items)
const largeArr = Array.from({ length: 1000 }, (_, i) => i);
const dfLarge = $df.data({ v: [largeArr] });
const resLarge = dfLarge.select([
    $df.col("v").arr.filter($df.element().ge(990)).alias("top10")
]).toDicts() as any[];
if (resLarge[0].top10.length !== 10 || resLarge[0].top10[0] !== 990 || resLarge[0].top10[9] !== 999) {
    throw new Error("18. Large array filtering failed");
}

// 19. Empty strings in string arrays
const dfEmptyStrs = $df.data({
    s: [["", "hello", "", "world"], ["", ""]]
});
const resEmptyStrs = dfEmptyStrs.select([
    $df.col("s").arr.filter($df.element().str.len().gt(0)).alias("non_empty")
]).toDicts() as any[];
if (JSON.stringify(resEmptyStrs[0].non_empty) !== JSON.stringify(["hello", "world"])) throw new Error("19. Empty string filter failed row 0");
if (JSON.stringify(resEmptyStrs[1].non_empty) !== JSON.stringify([])) throw new Error("19. Empty string filter failed row 1");

// 20. Immutability check: original data untouched
const originalArr = [1, 2, 3, 4];
const dfImmut = $df.data({ a: [originalArr] });
dfImmut.select([$df.col("a").arr.filter($df.element().gt(2)).alias("gt2")]);
if (originalArr.length !== 4 || originalArr[0] !== 1) {
    throw new Error("20. Immutability violation: source array was modified");
}

console.log("✓ ArrayExpr.filter tests passed!");
