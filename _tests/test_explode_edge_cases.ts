declare const process: any;
import { $df } from "../src/index";
import { DataFrameError, ShapeError } from "../src/exceptions";

console.log("=========================================");
console.log("STARTING EXPLODE EDGE CASES TESTS...");
console.log("=========================================");

try {
    // 1. DataFrame.explode with Array of ColumnExprs
    const df1 = $df.data({
        id: [1, 2],
        list1: [[10, 20], [30]],
        list2: [["a", "b"], ["c"]]
    });

    const res1 = df1.explode([$df.col("list1"), $df.col("list2")]).to_dicts();
    if (res1.length !== 3) throw new Error(`Expected length 3, got ${res1.length}`);
    if (res1[0].list1 !== 10 || res1[0].list2 !== "a") throw new Error("df.explode([$df.col]) row 0 failed");
    if (res1[1].list1 !== 20 || res1[1].list2 !== "b") throw new Error("df.explode([$df.col]) row 1 failed");
    if (res1[2].list1 !== 30 || res1[2].list2 !== "c") throw new Error("df.explode([$df.col]) row 2 failed");
    console.log("✓ Pass: 1. DataFrame.explode with Array of ColumnExprs");

    // 2. DataFrame.explode with Selectors ($df.exclude("id"))
    const resSelectors = df1.explode($df.exclude("id")).to_dicts();
    if (resSelectors.length !== 3) throw new Error(`Expected length 3 for selectors, got ${resSelectors.length}`);
    console.log("✓ Pass: 2. DataFrame.explode with Selectors");

    // 3. Explode empty DataFrame (0 rows)
    const emptyDf = $df.data({ id: [] as number[], list: [] as number[][] });
    const explodedEmpty = emptyDf.explode("list").to_dicts();
    if (explodedEmpty.length !== 0) throw new Error(`Expected empty exploded length 0, got ${explodedEmpty.length}`);
    console.log("✓ Pass: 3. Explode on 0-row DataFrame");

    // 4. Explode TypedArrays
    const typedDf = $df.data({
        category: ["A", "B"],
        values: [new Int32Array([100, 200]), new Int32Array([300])]
    });
    const explodedTyped = typedDf.explode("values").to_dicts();
    if (explodedTyped.length !== 3) throw new Error(`Expected typed array exploded length 3, got ${explodedTyped.length}`);
    if (explodedTyped[0].values !== 100 || explodedTyped[2].values !== 300) throw new Error("TypedArray explode values incorrect");
    console.log("✓ Pass: 4. Explode TypedArray columns");

    // 5. Options combinations: empty_as_null & keep_nulls
    const mixedDf = $df.data({
        id: [1, 2, 3, 4],
        arr: [[1, 2], [], null, [3]]
    });

    const defaultExplode = mixedDf.explode("arr").to_dicts();
    if (defaultExplode.length !== 5) throw new Error(`Default options expected 5 rows, got ${defaultExplode.length}`);
    if (defaultExplode[2].arr !== null || defaultExplode[3].arr !== null) throw new Error("Default options null mapping failed");

    const noEmpty = mixedDf.explode("arr", { empty_as_null: false }).to_dicts();
    if (noEmpty.length !== 4) throw new Error(`empty_as_null=false expected 4 rows, got ${noEmpty.length}`);

    const noNulls = mixedDf.explode("arr", { keep_nulls: false }).to_dicts();
    if (noNulls.length !== 4) throw new Error(`keep_nulls=false expected 4 rows, got ${noNulls.length}`);

    const strictExplode = mixedDf.explode("arr", { empty_as_null: false, keep_nulls: false }).to_dicts();
    if (strictExplode.length !== 3) throw new Error(`strict expected 3 rows, got ${strictExplode.length}`);
    if (strictExplode[2].id !== 4 || strictExplode[2].arr !== 3) throw new Error("strict options result failed");
    console.log("✓ Pass: 5. Explode options (empty_as_null & keep_nulls)");

    // 6. Exploding mixed array sizes and nulls
    const mixedListsDf = $df.data({
        id: [1, 2, 3],
        val: [[10, 20], [99], null]
    });
    const explodedMix = mixedListsDf.explode("val").to_dicts();
    if (explodedMix.length !== 4) throw new Error(`Expected mixed list length 4, got ${explodedMix.length}`);
    if (explodedMix[2].id !== 2 || explodedMix[2].val !== 99) throw new Error("Mixed list row explosion failed");
    console.log("✓ Pass: 6. Exploding mixed array sizes and nulls");

    // 7. Parallel explode mismatch assertion
    const mismatchDf = $df.data({
        a: [[1, 2], [3]],
        b: [[10], [20, 30]]
    });
    let shapeErrorThrown = false;
    try {
        mismatchDf.explode(["a", "b"]);
    } catch (e: any) {
        if (e instanceof ShapeError) {
            shapeErrorThrown = true;
        }
    }
    if (!shapeErrorThrown) throw new Error("Expected ShapeError on mismatched parallel explode heights");
    console.log("✓ Pass: 7. Parallel explode mismatch throws ShapeError");

    // 8. Non-existent column assertion
    let dfErrorThrown = false;
    try {
        df1.explode("non_existent");
    } catch (e: any) {
        if (e instanceof DataFrameError) {
            dfErrorThrown = true;
        }
    }
    if (!dfErrorThrown) throw new Error("Expected DataFrameError on non-existent column explode");
    console.log("✓ Pass: 8. Non-existent column explode throws DataFrameError");

    // 9. col().arr.explode() with .alias() in select()
    const selectAlias = df1.select([
        $df.col("id"),
        $df.col("list1").arr.explode().alias("exploded_1")
    ]).to_dicts();
    if (selectAlias.length !== 3) throw new Error(`Select alias expected 3 rows, got ${selectAlias.length}`);
    if (selectAlias[0].exploded_1 !== 10 || selectAlias[1].exploded_1 !== 20) throw new Error("Select alias values incorrect");
    console.log("✓ Pass: 9. ColumnExpression.arr.explode() with alias");

    // 10. Single-row DataFrame explosion
    const singleRowDf = $df.data({ id: [1], items: [[10, 20, 30, 40]] });
    const singleExploded = singleRowDf.explode("items").to_dicts();
    if (singleExploded.length !== 4) throw new Error(`Single row expected 4 rows, got ${singleExploded.length}`);
    if (singleExploded[3].items !== 40) throw new Error("Single row explode last element failed");
    console.log("✓ Pass: 10. Single-row DataFrame explosion");

    // 11. Arrays with internal nulls/undefined values
    const internalNullsDf = $df.data({ id: [1, 2], val: [[10, null, 30], [null, 40]] });
    const explodedInternalNulls = internalNullsDf.explode("val").to_dicts();
    if (explodedInternalNulls.length !== 5) throw new Error(`Internal nulls expected 5 rows, got ${explodedInternalNulls.length}`);
    if (explodedInternalNulls[1].val !== null || explodedInternalNulls[3].val !== null) throw new Error("Internal null elements failed");
    console.log("✓ Pass: 11. Arrays with internal null elements");

    // 12. Arrays of objects / structs
    const structArrayDf = $df.data({
        id: [1, 2],
        items: [[{ x: 10, y: "a" }, { x: 20, y: "b" }], [{ x: 30, y: "c" }]]
    });
    const explodedStructs = structArrayDf.explode("items").to_dicts();
    if (explodedStructs.length !== 3) throw new Error(`Struct array expected 3 rows, got ${explodedStructs.length}`);
    if (explodedStructs[0].items.x !== 10 || explodedStructs[2].items.y !== "c") throw new Error("Struct array explode values failed");
    console.log("✓ Pass: 12. Arrays of objects / structs");

    // 13. Arrays of Date objects & booleans
    const d1 = new Date("2026-01-01");
    const d2 = new Date("2026-02-02");
    const datesBoolsDf = $df.data({
        id: [1, 2],
        dates: [[d1, d2], [d1]],
        bools: [[true, false], [true]]
    });
    const explodedDatesBools = datesBoolsDf.explode(["dates", "bools"]).to_dicts();
    if (explodedDatesBools.length !== 3) throw new Error(`Dates/Bools expected 3 rows, got ${explodedDatesBools.length}`);
    if (explodedDatesBools[0].bools !== true || explodedDatesBools[1].bools !== false) throw new Error("Bools explode values failed");
    console.log("✓ Pass: 13. Arrays of Date objects and booleans");

    // 14. Nested multi-dimensional arrays
    const nestedArrayDf = $df.data({
        id: [1, 2],
        matrix: [[[1, 2], [3]], [[4, 5]]]
    });
    const explodedMatrix = nestedArrayDf.explode("matrix").to_dicts();
    if (explodedMatrix.length !== 3) throw new Error(`Nested array expected 3 rows, got ${explodedMatrix.length}`);
    if (JSON.stringify(explodedMatrix[0].matrix) !== JSON.stringify([1, 2])) throw new Error("Nested array row 0 failed");
    console.log("✓ Pass: 14. Nested multi-dimensional arrays");

    // 15. Exploding unnamed literal expression error assertion
    let litErrorThrown = false;
    try {
        singleRowDf.explode($df.lit(100) as any);
    } catch (e: any) {
        if (e instanceof DataFrameError) {
            litErrorThrown = true;
        }
    }
    if (!litErrorThrown) throw new Error("Expected DataFrameError when exploding unnamed literal expression");
    console.log("✓ Pass: 15. Exploding unnamed literal expression throws DataFrameError");

    // 16. Chaining expressions on exploded DataFrame
    const chainedDf = df1.explode("list1").with_columns($df.col("list1").add(100).alias("list1_plus_100")).to_dicts();
    if (chainedDf.length !== 3) throw new Error(`Chained explode expected 3 rows, got ${chainedDf.length}`);
    if (chainedDf[0].list1_plus_100 !== 110 || chainedDf[2].list1_plus_100 !== 130) throw new Error("Chained explode math failed");
    console.log("✓ Pass: 16. Chaining arithmetic on exploded DataFrame");

    // 17. Exploding in with_columns()
    const withColsDf = df1.with_columns($df.col("list1").arr.explode().alias("exploded_val")).to_dicts();
    if (withColsDf.length !== 3) throw new Error(`with_columns explode expected 3 rows, got ${withColsDf.length}`);
    if (withColsDf[0].exploded_val !== 10 || withColsDf[2].exploded_val !== 30) throw new Error("with_columns explode failed");
    console.log("✓ Pass: 17. Exploding in with_columns()");

    // 18. String column str.explode()
    const strDf = $df.data({ word: ["cat", "dog"] });
    const explodedStr = strDf.with_columns($df.col("word").str.explode().alias("chars")).to_dicts();
    if (explodedStr.length !== 2) throw new Error(`str.explode expected 2 rows, got ${explodedStr.length}`);
    if (JSON.stringify(explodedStr[0].chars) !== JSON.stringify(["c", "a", "t"])) throw new Error("str.explode chars failed");
    console.log("✓ Pass: 18. String column str.explode()");

    // 19. All empty arrays [ [], [], [] ] with options
    const allEmptyDf = $df.data({ id: [1, 2, 3], list: [[], [], []] });
    const allEmptyDefault = allEmptyDf.explode("list").to_dicts();
    if (allEmptyDefault.length !== 3) throw new Error(`All empty default expected 3 rows of null, got ${allEmptyDefault.length}`);
    if (allEmptyDefault[0].list !== null) throw new Error("All empty default row 0 failed");

    const allEmptyDrop = allEmptyDf.explode("list", { empty_as_null: false }).to_dicts();
    if (allEmptyDrop.length !== 0) throw new Error(`All empty drop expected 0 rows, got ${allEmptyDrop.length}`);
    console.log("✓ Pass: 19. All empty arrays [ [], [], [] ] with options");

    // 20. All null rows [ null, null, null ] with options
    const allNullDf = $df.data({ id: [1, 2, 3], list: [null, null, null] });
    const allNullDefault = allNullDf.explode("list").to_dicts();
    if (allNullDefault.length !== 3) throw new Error(`All null default expected 3 rows of null, got ${allNullDefault.length}`);

    const allNullDrop = allNullDf.explode("list", { keep_nulls: false }).to_dicts();
    if (allNullDrop.length !== 0) throw new Error(`All null drop expected 0 rows, got ${allNullDrop.length}`);
    console.log("✓ Pass: 20. All null rows [ null, null, null ] with options");

    // 21. Single multi-column expression $df.col(["list1", "list2"])
    const multiColExprDf = df1.explode($df.col(["list1", "list2"])).to_dicts();
    if (multiColExprDf.length !== 3) throw new Error(`Multi-column expression expected 3 rows, got ${multiColExprDf.length}`);
    if (multiColExprDf[0].list1 !== 10 || multiColExprDf[0].list2 !== "a") throw new Error("Multi-column expression failed");
    console.log("✓ Pass: 21. Single multi-column expression $df.col(['list1', 'list2'])");

    // 22. Large array explosion (10,000 elements)
    const largeArr = Array.from({ length: 10000 }, (_, i) => i);
    const largeDf = $df.data({ id: [1], items: [largeArr] });
    const explodedLarge = largeDf.explode("items").to_dicts();
    if (explodedLarge.length !== 10000) throw new Error(`Large array expected 10,000 rows, got ${explodedLarge.length}`);
    if (explodedLarge[9999].items !== 9999) throw new Error("Large array last item failed");
    console.log("✓ Pass: 22. Large array explosion (10,000 elements)");

    console.log("\n=========================================");
    console.log("🎉 ALL 22 EXPLODE EDGE CASE TESTS PASSED SUCCESSFULLY!");
    console.log("=========================================");
} catch (err) {
    console.error("❌ Explode test failed:", err);
    process.exit(1);
}
