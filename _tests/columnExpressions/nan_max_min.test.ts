import { $df } from "../../src";

console.log("=========================================");
console.log("STARTING NAN_MAX & NAN_MIN TESTS...");
console.log("=========================================");

try {
    // 1. Array with NaN values
    const df1 = $df.data({
        group: ["A", "A", "A"],
        val: [10, NaN, 50]
    });
    const res1 = df1.select([
        $df.col("val").max().alias("max_val"),
        $df.col("val").min().alias("min_val"),
        $df.col("val").nan_max().alias("nan_max_val"),
        $df.col("val").nan_min().alias("nan_min_val")
    ]).to_dicts();

    if (res1[0].max_val !== 50 || res1[0].min_val !== 10) {
        throw new Error(`Failed standard max/min test with NaN: ${JSON.stringify(res1)}`);
    }
    if (!Number.isNaN(res1[0].nan_max_val) || !Number.isNaN(res1[0].nan_min_val)) {
        throw new Error(`Failed nan_max/nan_min propagation test: ${JSON.stringify(res1)}`);
    }

    // 2. Array without NaN values
    const df2 = $df.data({
        val: [10, 20, 50, 5]
    });
    const res2 = df2.select([
        $df.col("val").nan_max().alias("nan_max_val"),
        $df.col("val").nan_min().alias("nan_min_val")
    ]).to_dicts();

    if (res2[0].nan_max_val !== 50 || res2[0].nan_min_val !== 5) {
        throw new Error(`Failed nan_max/nan_min normal values test: ${JSON.stringify(res2)}`);
    }

    // 3. Array with nulls but no NaN
    const df3 = $df.data({
        val: [null, 15, null, 42]
    });
    const res3 = df3.select([
        $df.col("val").nan_max().alias("nan_max_val"),
        $df.col("val").nan_min().alias("nan_min_val")
    ]).to_dicts();

    if (res3[0].nan_max_val !== 42 || res3[0].nan_min_val !== 15) {
        throw new Error(`Failed nan_max/nan_min with nulls test: ${JSON.stringify(res3)}`);
    }

    // 4. GroupBy aggregations
    const df4 = $df.data({
        group: ["A", "A", "B", "B"],
        val: [10, NaN, 20, 30]
    });
    const res4 = df4.groupby("group").agg([
        $df.col("val").nan_max().alias("nan_max_val"),
        $df.col("val").nan_min().alias("nan_min_val")
    ]).to_dicts();

    if (!Number.isNaN(res4[0].nan_max_val) || !Number.isNaN(res4[0].nan_min_val)) {
        throw new Error(`Failed groupby NaN propagation test: ${JSON.stringify(res4)}`);
    }
    if (res4[1].nan_max_val !== 30 || res4[1].nan_min_val !== 20) {
        throw new Error(`Failed groupby normal values test: ${JSON.stringify(res4)}`);
    }

    console.log("SUCCESS: ALL NAN_MAX & NAN_MIN TESTS PASSED!");
} catch (err: any) {
    console.error("FAILURE:", err?.message || err);
    throw err;
}

