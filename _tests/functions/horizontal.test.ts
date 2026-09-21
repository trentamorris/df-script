declare const process: any;
import { $df } from "../../src/index";

console.log("=========================================");
console.log("STARTING COLUMN EXPRESSION $df.horizontal() TESTS...");
console.log("=========================================");

try {
    const df = $df.data({
        a: [1, 10, 100],
        b: [2, 20, 200],
        c: [3, 30, 300]
    });

    // 1. Horizontal evaluation with sum aggregator
    const resSum = df.select([
        $df.horizontal("a", "b", "c").eval($df.element().sum()).alias("sum")
    ]).toDicts();

    if (resSum[0].sum !== 6) throw new Error("Row 0 sum failed: " + resSum[0].sum);
    if (resSum[1].sum !== 60) throw new Error("Row 1 sum failed: " + resSum[1].sum);
    if (resSum[2].sum !== 600) throw new Error("Row 2 sum failed: " + resSum[2].sum);

    // 2. Horizontal evaluation with mean aggregator
    const resMean = df.select([
        $df.horizontal("a", "b", "c").eval($df.element().mean()).alias("mean")
    ]).toDicts();

    if (resMean[0].mean !== 2) throw new Error("Row 0 mean failed: " + resMean[0].mean);
    if (resMean[1].mean !== 20) throw new Error("Row 1 mean failed: " + resMean[1].mean);
    if (resMean[2].mean !== 200) throw new Error("Row 2 mean failed: " + resMean[2].mean);

    // 3. Horizontal evaluation with boolean checks (gt and all / any)
    const boolDf = $df.data({
        x: [5, -2, 10],
        y: [8, -3, -1],
        z: [1, -5, 4]
    });

    const resBool = boolDf.select([
        $df.horizontal("x", "y", "z").eval($df.element().gt(0).all()).alias("all_pos"),
        $df.horizontal("x", "y", "z").eval($df.element().gt(0).any()).alias("any_pos")
    ]).toDicts();

    if (resBool[0].all_pos !== true || resBool[0].any_pos !== true) throw new Error("Row 0 bool failed");
    if (resBool[1].all_pos !== false || resBool[1].any_pos !== false) throw new Error("Row 1 bool failed");
    if (resBool[2].all_pos !== false || resBool[2].any_pos !== true) throw new Error("Row 2 bool failed");

    // 4. Raw array chaining via .arr
    const resArr = df.select([
        $df.horizontal("a", "b", "c").arr.min().alias("min_val"),
        $df.horizontal("a", "b", "c").arr.max().alias("max_val")
    ]).toDicts();

    if (resArr[0].min_val !== 1 || resArr[0].max_val !== 3) throw new Error("Row 0 min/max failed");
    if (resArr[1].min_val !== 10 || resArr[1].max_val !== 30) throw new Error("Row 1 min/max failed");
    if (resArr[2].min_val !== 100 || resArr[2].max_val !== 300) throw new Error("Row 2 min/max failed");

    // 4b. Direct methods forwarded automatically via Proxy without typing .arr!
    const resDirect = df.select([
        $df.horizontal("a", "b", "c").min().alias("min_val"),
        $df.horizontal("a", "b", "c").max().alias("max_val"),
        $df.horizontal("a", "b", "c").sum().alias("sum_val"),
        $df.horizontal("a", "b", "c").mean().alias("mean_val")
    ]).toDicts();

    if (resDirect[0].min_val !== 1 || resDirect[0].max_val !== 3 || resDirect[0].sum_val !== 6 || resDirect[0].mean_val !== 2) {
        throw new Error("Direct horizontal forwarded methods failed on row 0");
    }

    // 5. Array arguments and selectors ($df.all())
    const resAll = df.select([
        $df.horizontal($df.all()).eval($df.element().sum()).alias("all_sum")
    ]).toDicts();

    if (resAll[0].all_sum !== 6 || resAll[1].all_sum !== 60 || resAll[2].all_sum !== 600) {
        throw new Error("Horizontal with $df.all() failed");
    }

    // 6. Regex column selection
    const resRegex = df.select([
        $df.horizontal([/^[ab]$/]).eval($df.element().sum()).alias("ab_sum")
    ]).toDicts();

    if (resRegex[0].ab_sum !== 3 || resRegex[1].ab_sum !== 30 || resRegex[2].ab_sum !== 300) {
        throw new Error("Horizontal with regex failed");
    }

    // 7. Single column input (should wrap each row in 1-element array)
    const resSingle = df.select([
        $df.horizontal("a").alias("single_arr")
    ]).toDicts();
    if (!Array.isArray(resSingle[0].single_arr) || resSingle[0].single_arr.length !== 1 || resSingle[0].single_arr[0] !== 1) {
        throw new Error("Single column horizontal failed");
    }

    // 8. Empty dataframe / 0 rows
    const emptyDf = $df.data({
        a: [] as number[],
        b: [] as number[]
    });
    const resEmpty = emptyDf.select([
        $df.horizontal("a", "b").eval($df.element().sum()).alias("sum")
    ]).toDicts();
    if (resEmpty.length !== 0) {
        throw new Error("Empty dataframe horizontal failed");
    }

    // 9. Null and undefined handling
    const nullDf = $df.data({
        a: [1, null, undefined, 4],
        b: [null, 2, undefined, 5]
    });
    const resNull = nullDf.select([
        $df.horizontal("a", "b").alias("raw"),
        $df.horizontal("a", "b").arr.sum().alias("sum")
    ]).toDicts();

    if (resNull[0].raw[0] !== 1 || resNull[0].raw[1] !== null) throw new Error("Null raw row 0 failed");
    if (resNull[1].raw[0] !== null || resNull[1].raw[1] !== 2) throw new Error("Null raw row 1 failed");
    if (resNull[3].sum !== 9) throw new Error("Null sum row 3 failed");

    // 10. Mixed literals and column expressions
    const resLit = df.select([
        $df.horizontal("a", $df.lit(100), "b").eval($df.element().sum()).alias("mixed_sum")
    ]).toDicts();
    // row 0: 1 + 100 + 2 = 103
    if (resLit[0].mixed_sum !== 103) throw new Error("Mixed literal horizontal row 0 failed: " + resLit[0].mixed_sum);
    // row 1: 10 + 100 + 20 = 130
    if (resLit[1].mixed_sum !== 130) throw new Error("Mixed literal horizontal row 1 failed: " + resLit[1].mixed_sum);

    // 11. Excluding columns with $df.exclude()
    const resExclude = df.select([
        $df.horizontal($df.exclude("c")).eval($df.element().sum()).alias("no_c_sum")
    ]).toDicts();
    // row 0: a(1) + b(2) = 3
    if (resExclude[0].no_c_sum !== 3) throw new Error("Exclude horizontal row 0 failed");

    // 12. Non-aggregating element-wise transformation returning arrays
    const resTransform = df.select([
        $df.horizontal("a", "b").eval($df.element().mul(2)).alias("doubled")
    ]).toDicts();
    // row 0: [1*2, 2*2] = [2, 4]
    if (resTransform[0].doubled[0] !== 2 || resTransform[0].doubled[1] !== 4) {
        throw new Error("Element-wise transform failed");
    }

    // 13. Mixed string/numeric data (array coerces to common Utf8 array type)
    const mixedTypeDf = $df.data({
        name: ["Alice", "Bob"],
        code: ["A1", "B2"],
        city: ["NYC", "LA"]
    });
    const resMixed = mixedTypeDf.select([
        $df.horizontal("name", "code", "city").alias("str_arr")
    ]).toDicts();
    if (resMixed[0].str_arr[0] !== "Alice" || resMixed[0].str_arr[1] !== "A1" || resMixed[0].str_arr[2] !== "NYC") {
        throw new Error("Mixed string array failed");
    }

    console.log("✓ $df.horizontal() tests passed successfully!");
} catch (err) {
    console.error("❌ $df.horizontal() tests failed:", err);
    process.exit(1);
}
