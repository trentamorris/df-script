declare const process: any;
import { $df, element } from "../../src/index";

console.log("=========================================");
console.log("STARTING COLUMN EXPRESSION ARRAY.EVAL TESTS...");
console.log("=========================================");

const testData = [
    {
        id: 1,
        numbers: [1, 2, 3],
        tags: ["apple", "banana"],
        null_col: null
    },
    {
        id: 2,
        numbers: [10, 20],
        tags: ["cherry"],
        null_col: null
    }
];

try {
    const df = $df.data(testData);

    // 1. Basic element-wise arithmetic: element().mul(2)
    const dfArithmetic = df.select([
        $df.col("numbers").arr.eval(element().mul(2)).alias("arithmetic")
    ]);
    const resArithmetic = dfArithmetic.to_dicts();
    
    if (JSON.stringify(resArithmetic[0].arithmetic) !== JSON.stringify([2, 4, 6])) {
        throw new Error(`Expected [2, 4, 6], got ${JSON.stringify(resArithmetic[0].arithmetic)}`);
    }
    if (JSON.stringify(resArithmetic[1].arithmetic) !== JSON.stringify([20, 40])) {
        throw new Error(`Expected [20, 40], got ${JSON.stringify(resArithmetic[1].arithmetic)}`);
    }
    console.log("✓ Basic array.eval element arithmetic passed");

    // 2. Aggregation: element().sum()
    const dfSum = df.select([
        $df.col("numbers").arr.eval(element().sum()).alias("sum")
    ]);
    const resSum = dfSum.to_dicts();

    if (JSON.stringify(resSum[0].sum) !== JSON.stringify([6])) {
        throw new Error(`Expected [6], got ${JSON.stringify(resSum[0].sum)}`);
    }
    if (JSON.stringify(resSum[1].sum) !== JSON.stringify([30])) {
        throw new Error(`Expected [30], got ${JSON.stringify(resSum[1].sum)}`);
    }
    console.log("✓ array.eval element.sum() aggregation passed");

    // 3. Chained aggregation and post-ops: element().sum().mul(10).add(1)
    const dfChained = df.select([
        $df.col("numbers").arr.eval(element().sum().mul(10).add(1)).alias("chained")
    ]);
    const resChained = dfChained.to_dicts();

    if (JSON.stringify(resChained[0].chained) !== JSON.stringify([61])) {
        throw new Error(`Expected [61], got ${JSON.stringify(resChained[0].chained)}`);
    }
    if (JSON.stringify(resChained[1].chained) !== JSON.stringify([301])) {
        throw new Error(`Expected [301], got ${JSON.stringify(resChained[1].chained)}`);
    }
    console.log("✓ array.eval chained aggregation & post-ops passed");

    // 4. Element-wise string: element().str.to_uppercase()
    const dfString = df.select([
        $df.col("tags").arr.eval(element().str.to_uppercase()).alias("upper")
    ]);
    const resString = dfString.to_dicts();

    if (JSON.stringify(resString[0].upper) !== JSON.stringify(["APPLE", "BANANA"])) {
        throw new Error(`Expected ["APPLE", "BANANA"], got ${JSON.stringify(resString[0].upper)}`);
    }
    console.log("✓ array.eval element string operation passed");

    // 5. Null row handling robustness
    const dfNull = df.select([
        $df.col("null_col").arr.eval(element().add(1)).alias("null_eval")
    ]);
    const resNull = dfNull.to_dicts();

    if (resNull[0].null_eval !== null) {
        throw new Error(`Expected null, got ${JSON.stringify(resNull[0].null_eval)}`);
    }
    console.log("✓ array.eval null row robustness passed");

    // 6. Partitioning inside array.eval: element().sum().over(element())
    const dfOver = $df.data([
        { numbers: [1, 1, 2] }
    ]).select([
        $df.col("numbers").arr.eval(element().sum().over(element())).alias("over_eval")
    ]);
    const resOver = dfOver.to_dicts();
    if (JSON.stringify(resOver[0].over_eval) !== JSON.stringify([2, 2, 2])) {
        throw new Error(`Expected [2, 2, 2], got ${JSON.stringify(resOver[0].over_eval)}`);
    }
    console.log("✓ array.eval window partitioning .over() passed");

    // 7. Custom partition expressions: element().sum().over(element().mod(2))
    const dfCustomOver = $df.data([
        { numbers: [1, 2, 3, 4] }
    ]).select([
        $df.col("numbers").arr.eval(element().sum().over(element().mod(2))).alias("custom_over")
    ]);
    const resCustomOver = dfCustomOver.to_dicts();
    if (JSON.stringify(resCustomOver[0].custom_over) !== JSON.stringify([4, 6, 4, 6])) {
        throw new Error(`Expected [4, 6, 4, 6], got ${JSON.stringify(resCustomOver[0].custom_over)}`);
    }
    console.log("✓ array.eval custom partitioning expressions (odd/even) passed");

    console.log("\n🎉 ALL Expr.arr.eval COLUMN EXPRESSION TESTS PASSED SUCCESSFULLY!");
} catch (err) {
    console.error("\n❌ Expr.arr.eval COLUMN EXPRESSION TESTS FAILED:", err);
    process.exit(1);
}
