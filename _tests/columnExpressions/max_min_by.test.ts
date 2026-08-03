import { $df } from "../../src";

console.log("=========================================");
console.log("STARTING MAX_BY & MIN_BY TESTS...");
console.log("=========================================");

try {
    // 1. Simple select max_by and min_by
    const df1 = $df.data({
        name: ["alice", "bob", "charlie"],
        score: [10, 50, 20]
    });
    const res1 = df1.select([
        $df.col("name").max_by($df.col("score")).alias("max_name"),
        $df.col("name").min_by($df.col("score")).alias("min_name")
    ]).to_dicts();
    if (res1[0].max_name !== "bob" || res1[0].min_name !== "alice") {
        throw new Error(`Failed simple select test: ${JSON.stringify(res1)}`);
    }

    // 2. Group by aggregations
    const df2 = $df.data({
        group: ["A", "A", "B", "B"],
        val: ["foo", "bar", "baz", "qux"],
        weight: [10, 20, 100, 50]
    });
    const res2 = df2.groupby("group").agg([
        $df.col("val").max_by($df.col("weight")).alias("heaviest"),
        $df.col("val").min_by($df.col("weight")).alias("lightest")
    ]).to_dicts();
    if (res2[0].heaviest !== "bar" || res2[0].lightest !== "foo" ||
        res2[1].heaviest !== "baz" || res2[1].lightest !== "qux") {
        throw new Error(`Failed groupby test: ${JSON.stringify(res2)}`);
    }

    // 3. Nulls and NaNs in by column
    const df3 = $df.data({
        val: ["a", "b", "c", "d"],
        byVal: [null, NaN, 30, 10]
    });
    const res3 = df3.select([
        $df.col("val").max_by($df.col("byVal")).alias("max"),
        $df.col("val").min_by($df.col("byVal")).alias("min")
    ]).to_dicts();
    if (res3[0].max !== "c" || res3[0].min !== "d") {
        throw new Error(`Failed nulls/NaNs test: ${JSON.stringify(res3)}`);
    }

    // 4. Tie breaking
    const df4 = $df.data({
        val: ["first", "second", "third"],
        score: [100, 100, 50]
    });
    const res4 = df4.select([
        $df.col("val").max_by($df.col("score")).alias("top")
    ]).to_dicts();
    if (res4[0].top !== "first") {
        throw new Error(`Failed tie-breaking test: ${JSON.stringify(res4)}`);
    }

    // 5. Empty dataframe
    const emptyDf = $df.data({ val: [], score: [] });
    const emptyRes = emptyDf.select($df.col("val").max_by($df.col("score")).alias("res")).to_dicts();
    if (emptyRes[0].res !== null) {
        throw new Error(`Failed empty DF test: ${JSON.stringify(emptyRes)}`);
    }

    // 6. All nulls / NaNs
    const nullsDf = $df.data({ val: ["a", "b", "c"], score: [null, NaN, null] });
    const nullsRes = nullsDf.select([
        $df.col("val").max_by($df.col("score")).alias("max"),
        $df.col("val").min_by($df.col("score")).alias("min")
    ]).to_dicts();
    if (nullsRes[0].max !== null || nullsRes[0].min !== null) {
        throw new Error(`Failed all nulls test: ${JSON.stringify(nullsRes)}`);
    }

    // 7. Single element
    const singleDf = $df.data({ val: ["solo"], score: [42] });
    const singleRes = singleDf.select([
        $df.col("val").max_by($df.col("score")).alias("max"),
        $df.col("val").min_by($df.col("score")).alias("min")
    ]).to_dicts();
    if (singleRes[0].max !== "solo" || singleRes[0].min !== "solo") {
        throw new Error(`Failed single element test: ${JSON.stringify(singleRes)}`);
    }

    // 8. Date comparisons
    const dateDf = $df.data({
        event: ["event1", "event2", "event3"],
        date: [new Date("2026-01-01"), new Date("2026-12-31"), new Date("2026-06-15")]
    });
    const dateRes = dateDf.select([
        $df.col("event").max_by($df.col("date")).alias("latest"),
        $df.col("event").min_by($df.col("date")).alias("earliest")
    ]).to_dicts();
    if (dateRes[0].latest !== "event2" || dateRes[0].earliest !== "event1") {
        throw new Error(`Failed date comparison test: ${JSON.stringify(dateRes)}`);
    }

    console.log("✓ ALL MAX_BY & MIN_BY TESTS PASSED!");
} catch (err: any) {
    console.error("❌ Test failed:", err?.message || err);
    throw err;
}
