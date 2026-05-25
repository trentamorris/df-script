import { $tbl } from "../index";

const data = [
    { name: "Alice", dept: "HR", salary: 1000 },
    { name: "Bob", dept: "HR", salary: 2000 },
    { name: "Charlie", dept: "IT", salary: 3000 },
    { name: "David", dept: "IT", salary: 4000 },
    { name: "Eve", dept: "IT", salary: 5000 },
];

console.log("Input data:");
console.table(data);

try {
    const df = $tbl.data(data);

    // 1. Test single partition column window function
    const dfWithWindow = df.select(
        "name",
        "dept",
        "salary",
        $tbl.col("salary").mean().over("dept").alias("avg_salary_by_dept")
    );

    const result = dfWithWindow.collect();
    console.log("\nResult of mean().over('dept'):");
    console.table(result);

    // Assertions
    const expected = [1500, 1500, 4000, 4000, 4000];
    let passed = true;
    for (let i = 0; i < result.length; i++) {
        if (result[i].avg_salary_by_dept !== expected[i]) {
            console.error(`Assertion failed at index ${i}: expected ${expected[i]}, got ${result[i].avg_salary_by_dept}`);
            passed = false;
        }
    }

    // 2. Test multi-column partition window function
    const dataMulti = [
        { name: "Alice", dept: "HR", role: "Manager", salary: 1000 },
        { name: "Bob", dept: "HR", role: "Developer", salary: 2000 },
        { name: "Charlie", dept: "HR", role: "Developer", salary: 3000 },
    ];
    const dfMulti = $tbl.data(dataMulti);
    const resMulti = dfMulti.select(
        "name",
        $tbl.col("salary").sum().over(["dept", "role"]).alias("sum_salary_by_dept_role")
    ).collect();

    console.log("\nResult of sum().over(['dept', 'role']):");
    console.table(resMulti);

    const expectedMulti = [1000, 5000, 5000];
    for (let i = 0; i < resMulti.length; i++) {
        if (resMulti[i].sum_salary_by_dept_role !== expectedMulti[i]) {
            console.error(`Assertion failed at index ${i} for multi-column: expected ${expectedMulti[i]}, got ${resMulti[i].sum_salary_by_dept_role}`);
            passed = false;
        }
    }

    // 3. Test post-aggregation operations on window function (e.g. .mean().over(...).add(100) or .gt(2000))
    const dfPostAgg = df.select(
        "name",
        $tbl.col("salary").mean().over("dept").add(100).alias("avg_salary_plus_100"),
        $tbl.col("salary").mean().over("dept").gt(2000).alias("avg_salary_gt_2000")
    ).collect();

    console.log("\nResult of mean().over('dept') with post-aggregations (.add(100), .gt(2000)):");
    console.table(dfPostAgg);

    const expectedPlus100 = [1600, 1600, 4100, 4100, 4100];
    const expectedGt2000 = [false, false, true, true, true];

    for (let i = 0; i < dfPostAgg.length; i++) {
        if (dfPostAgg[i].avg_salary_plus_100 !== expectedPlus100[i]) {
            console.error(`Assertion failed at index ${i} for add(100): expected ${expectedPlus100[i]}, got ${dfPostAgg[i].avg_salary_plus_100}`);
            passed = false;
        }
        if (dfPostAgg[i].avg_salary_gt_2000 !== expectedGt2000[i]) {
            console.error(`Assertion failed at index ${i} for gt(2000): expected ${expectedGt2000[i]}, got ${dfPostAgg[i].avg_salary_gt_2000}`);
            passed = false;
        }
    }

    // 4. Test positional window functions (lead, lag, row_number)
    const dfPositional = df.select(
        "name",
        "dept",
        $tbl.col("salary").lag(1).over("dept").alias("salary_lag_1"),
        $tbl.col("salary").lead(1).over("dept").alias("salary_lead_1"),
        $tbl.col("salary").row_number().over("dept").alias("row_num")
    ).collect();

    console.log("\nResult of positional window functions (lag(1), lead(1), row_number()):");
    console.table(dfPositional);

    // HR group: Alice (1000), Bob (2000)
    // IT group: Charlie (3000), David (4000), Eve (5000)
    const expectedLag = [null, 1000, null, 3000, 4000];
    const expectedLead = [2000, null, 4000, 5000, null];
    const expectedRowNumber = [1, 2, 1, 2, 3];

    for (let i = 0; i < dfPositional.length; i++) {
        if (dfPositional[i].salary_lag_1 !== expectedLag[i]) {
            console.error(`Assertion failed at index ${i} for lag(1): expected ${expectedLag[i]}, got ${dfPositional[i].salary_lag_1}`);
            passed = false;
        }
        if (dfPositional[i].salary_lead_1 !== expectedLead[i]) {
            console.error(`Assertion failed at index ${i} for lead(1): expected ${expectedLead[i]}, got ${dfPositional[i].salary_lead_1}`);
            passed = false;
        }
        if (dfPositional[i].row_num !== expectedRowNumber[i]) {
            console.error(`Assertion failed at index ${i} for row_number(): expected ${expectedRowNumber[i]}, got ${dfPositional[i].row_num}`);
            passed = false;
        }
    }

    // 5. Test new ranking, cumulative, and rolling window functions
    const dfExtended = df.select(
        "name",
        "dept",
        $tbl.col("salary").dense_rank().over("dept").alias("dense_rank"),
        $tbl.col("salary").cum_sum().over("dept").alias("cum_sum"),
        $tbl.col("salary").cum_sum(true).over("dept").alias("cum_sum_reverse"),
        $tbl.col("salary").cum_count().over("dept").alias("cum_count"),
        $tbl.col("salary").cum_count(true).over("dept").alias("cum_count_reverse"),
        $tbl.col("salary").rolling_mean(2).over("dept").alias("rolling_mean_2"),
        $tbl.col("salary").rolling_quantile(0.5, 2).over("dept").alias("rolling_median_2"),
        $tbl.col("salary").rolling_rank(2).over("dept").alias("rolling_rank_2")
    ).collect();

    console.log("\nResult of extended window functions (dense_rank(), cum_sum(), cum_sum_reverse, cum_count(), cum_count_reverse, rolling_mean(2), rolling_quantile(0.5, 2), rolling_rank(2)):");
    console.table(dfExtended);

    // HR group: Alice (1000), Bob (2000)
    // IT group: Charlie (3000), David (4000), Eve (5000)
    const expectedDenseRank = [1, 2, 1, 2, 3];
    const expectedCumSum = [1000, 3000, 3000, 7000, 12000];
    const expectedCumSumReverse = [3000, 2000, 12000, 9000, 5000];
    const expectedCumCount = [1, 2, 1, 2, 3];
    const expectedCumCountReverse = [2, 1, 3, 2, 1];
    const expectedRollingMean = [1000, 1500, 3000, 3500, 4500];
    const expectedRollingMedian = [1000, 1500, 3000, 3500, 4500];
    const expectedRollingRank = [1, 2, 1, 2, 2];

    for (let i = 0; i < dfExtended.length; i++) {
        if (dfExtended[i].dense_rank !== expectedDenseRank[i]) {
            console.error(`Assertion failed at index ${i} for dense_rank(): expected ${expectedDenseRank[i]}, got ${dfExtended[i].dense_rank}`);
            passed = false;
        }
        if (dfExtended[i].cum_sum !== expectedCumSum[i]) {
            console.error(`Assertion failed at index ${i} for cum_sum(): expected ${expectedCumSum[i]}, got ${dfExtended[i].cum_sum}`);
            passed = false;
        }
        if (dfExtended[i].cum_sum_reverse !== expectedCumSumReverse[i]) {
            console.error(`Assertion failed at index ${i} for cum_sum_reverse: expected ${expectedCumSumReverse[i]}, got ${dfExtended[i].cum_sum_reverse}`);
            passed = false;
        }
        if (dfExtended[i].cum_count !== expectedCumCount[i]) {
            console.error(`Assertion failed at index ${i} for cum_count: expected ${expectedCumCount[i]}, got ${dfExtended[i].cum_count}`);
            passed = false;
        }
        if (dfExtended[i].cum_count_reverse !== expectedCumCountReverse[i]) {
            console.error(`Assertion failed at index ${i} for cum_count_reverse: expected ${expectedCumCountReverse[i]}, got ${dfExtended[i].cum_count_reverse}`);
            passed = false;
        }
        if (dfExtended[i].rolling_mean_2 !== expectedRollingMean[i]) {
            console.error(`Assertion failed at index ${i} for rolling_mean_2: expected ${expectedRollingMean[i]}, got ${dfExtended[i].rolling_mean_2}`);
            passed = false;
        }
        if (dfExtended[i].rolling_median_2 !== expectedRollingMedian[i]) {
            console.error(`Assertion failed at index ${i} for rolling_median_2: expected ${expectedRollingMedian[i]}, got ${dfExtended[i].rolling_median_2}`);
            passed = false;
        }
        if (dfExtended[i].rolling_rank_2 !== expectedRollingRank[i]) {
            console.error(`Assertion failed at index ${i} for rolling_rank_2: expected ${expectedRollingRank[i]}, got ${dfExtended[i].rolling_rank_2}`);
            passed = false;
        }
    }

    // 5.5. Test first() and last() window functions
    const dfFirstLast = df.select(
        "name",
        $tbl.col("salary").first().over("dept").alias("first_salary"),
        $tbl.col("salary").last().over("dept").alias("last_salary")
    ).collect();

    console.log("\nResult of first().over('dept') and last().over('dept'):");
    console.table(dfFirstLast);

    const expectedFirst = [1000, 1000, 3000, 3000, 3000];
    const expectedLast = [2000, 2000, 5000, 5000, 5000];
    for (let i = 0; i < dfFirstLast.length; i++) {
        if (dfFirstLast[i].first_salary !== expectedFirst[i]) {
            console.error(`Assertion failed at index ${i} for first_salary: expected ${expectedFirst[i]}, got ${dfFirstLast[i].first_salary}`);
            passed = false;
        }
        if (dfFirstLast[i].last_salary !== expectedLast[i]) {
            console.error(`Assertion failed at index ${i} for last_salary: expected ${expectedLast[i]}, got ${dfFirstLast[i].last_salary}`);
            passed = false;
        }
    }

    // 6. Test post-operations on rolling functions (e.g. rolling_mean(2).gt(3500))
    const dfRollingPost = df.select(
        "name",
        $tbl.col("salary").rolling_mean(2).over("dept").gt(3500).alias("rolling_mean_gt_3500")
    ).collect();

    console.log("\nResult of rolling_mean(2).over('dept').gt(3500):");
    console.table(dfRollingPost);

    const expectedRollingPost = [false, false, false, false, true];
    for (let i = 0; i < dfRollingPost.length; i++) {
        if (dfRollingPost[i].rolling_mean_gt_3500 !== expectedRollingPost[i]) {
            console.error(`Assertion failed at index ${i} for rolling_mean_gt_3500: expected ${expectedRollingPost[i]}, got ${dfRollingPost[i].rolling_mean_gt_3500}`);
            passed = false;
        }
    }

    // 7. Test GroupBy aggregation using pre/post grouping operations
    const dfGrouped = df.groupby(["dept"]).agg(
        $tbl.col("salary").mean().alias("avg_salary"),
        $tbl.col("salary").mean().gt(2000).alias("avg_salary_gt_2000")
    ).collect();

    console.log("\nResult of GroupBy aggregation:");
    console.table(dfGrouped);

    // HR group (mean = 1500) and IT group (mean = 4000)
    for (const row of dfGrouped) {
        if (row.dept === "HR") {
            if (row.avg_salary !== 1500) {
                console.error(`Groupby HR average salary mismatch: expected 1500, got ${row.avg_salary}`);
                passed = false;
            }
            if (row.avg_salary_gt_2000 !== false) {
                console.error(`Groupby HR average salary comparison mismatch: expected false, got ${row.avg_salary_gt_2000}`);
                passed = false;
            }
        } else if (row.dept === "IT") {
            if (row.avg_salary !== 4000) {
                console.error(`Groupby IT average salary mismatch: expected 4000, got ${row.avg_salary}`);
                passed = false;
            }
            if (row.avg_salary_gt_2000 !== true) {
                console.error(`Groupby IT average salary comparison mismatch: expected true, got ${row.avg_salary_gt_2000}`);
                passed = false;
            }
        }
    }

    // 8. Test AllColumnsExpr wildcard select and exclude
    console.log("\nTesting AllColumnsExpr select and exclude:");
    const dfAllExclude = df.select($tbl.all().exclude("salary").lower()).collect();
    console.table(dfAllExclude);

    if (dfAllExclude.length !== 5 || dfAllExclude[0].salary !== undefined || dfAllExclude[0].name !== "alice" || dfAllExclude[0].dept !== "hr") {
        console.error("AllColumnsExpr exclude lower failed!");
        passed = false;
    }

    // 9. Test with_columns wildcard select and exclude
    console.log("\nTesting with_columns wildcard select and exclude:");
    const dfWithCols = df.with_columns(
        $tbl.all().exclude("salary").upper()
    ).collect();
    console.table(dfWithCols);

    if (dfWithCols.length !== 5 || dfWithCols[0].salary !== 1000 || dfWithCols[0].name !== "ALICE" || dfWithCols[0].dept !== "HR") {
        console.error("with_columns wildcard exclude failed!");
        passed = false;
    }

    // 9.5 Test with_columns old record signature
    console.log("\nTesting with_columns old record signature:");
    const dfWithColsRecord = df.with_columns({
        "salary_plus_500": $tbl.col("salary").add(500)
    }).collect();
    console.table(dfWithColsRecord);

    if (dfWithColsRecord.length !== 5 || dfWithColsRecord[0].salary_plus_500 !== 1500) {
        console.error("with_columns old record signature failed!");
        passed = false;
    }

    // 10. Test expression robustness and Kleene logic
    console.log("\nTesting expression robustness and Kleene logic:");

    // We need data with nulls to test Kleene logic
    const dataNulls = [
        { val_num: 10, val_bool: true },
        { val_num: null, val_bool: false },
        { val_num: 20, val_bool: null },
    ];
    const dfNulls = $tbl.data(dataNulls);

    const dfNullsRes = dfNulls.select(
        // 10.1 RHS null arithmetic
        $tbl.col("val_num").add(null).alias("add_null"),
        // 10.2 RHS null comparison
        $tbl.col("val_num").gt(null).alias("gt_null"),
        // 10.3 3-valued Kleene AND logic
        $tbl.col("val_bool").and($tbl.col("val_bool").is_null()).alias("kleene_and"),
        // 10.4 replace_all string replacement
        $tbl.col("val_num").replace(new Map([[10, "HR"], [null, "IT"], [20, "HR"]])).replace_all("R", "S").alias("replaced_dept")
    ).collect();

    console.table(dfNullsRes);

    // Assertions
    // add_null should be all null
    if (dfNullsRes[0].add_null !== null || dfNullsRes[1].add_null !== null || dfNullsRes[2].add_null !== null) {
        console.error("RHS null arithmetic failed!");
        passed = false;
    }
    // gt_null should be all null
    if (dfNullsRes[0].gt_null !== null || dfNullsRes[1].gt_null !== null || dfNullsRes[2].gt_null !== null) {
        console.error("RHS null comparison failed!");
        passed = false;
    }
    // kleene_and should evaluate:
    // row 0: true AND false -> false
    // row 1: false AND false -> false
    // row 2: null AND true -> null
    if (dfNullsRes[0].kleene_and !== false || dfNullsRes[1].kleene_and !== false || dfNullsRes[2].kleene_and !== null) {
        console.error("Kleene logical AND failed!");
        passed = false;
    }
    // replaced_dept should replace "HR" to "HS" and "IT" to "IT"
    if (dfNullsRes[0].replaced_dept !== "HS" || dfNullsRes[1].replaced_dept !== "IT" || dfNullsRes[2].replaced_dept !== "HS") {
        console.error("replace_all string replacement failed!");
        passed = false;
    }

    // 11. Test join null-key matching prevention
    console.log("\nTesting join null-key matching prevention:");
    const joinLeftData = [
        { id: 1, val: "L1" },
        { id: null, val: "L2" },
        { id: 2, val: "L3" },
    ];
    const joinRightData = [
        { id: 1, rval: "R1" },
        { id: null, rval: "R2" },
        { id: 3, rval: "R3" },
    ];
    const dfJoinLeft = $tbl.data(joinLeftData);
    const dfJoinRight = $tbl.data(joinRightData);

    // Inner Join: null ids should NOT match, only id: 1 should match
    const dfInnerJoined = dfJoinLeft.join(dfJoinRight, "id", "inner").collect();
    console.log("Inner Join Result:");
    console.table(dfInnerJoined);
    if (dfInnerJoined.length !== 1 || dfInnerJoined[0].id !== 1 || dfInnerJoined[0].val !== "L1" || dfInnerJoined[0].rval !== "R1") {
        console.error("Inner Join null-key matching prevention failed!");
        passed = false;
    }

    // Left Join: null ids should NOT match, and left null id should be kept with right columns null
    const dfLeftJoined = dfJoinLeft.join(dfJoinRight, "id", "left").collect();
    console.log("Left Join Result:");
    console.table(dfLeftJoined);
    if (dfLeftJoined.length !== 3) {
        console.error(`Left Join row count incorrect! Expected 3, got ${dfLeftJoined.length}`);
        passed = false;
    }
    const leftRowNull = dfLeftJoined.find((r: any) => r.id === null);
    if (!leftRowNull || leftRowNull.val !== "L2" || leftRowNull.rval !== null) {
        console.error("Left Join null-key matching prevention failed to preserve left null key!");
        passed = false;
    }

    // Outer Join: null ids should NOT match, both null key rows kept
    const dfOuterJoined = dfJoinLeft.join(dfJoinRight, "id", "outer").collect();
    console.log("Outer Join Result:");
    console.table(dfOuterJoined);
    if (dfOuterJoined.length !== 5) {
        console.error(`Outer Join row count incorrect! Expected 5, got ${dfOuterJoined.length}`);
        passed = false;
    }

    // 12. Test single string parameters for groupby, unique, unpivot
    console.log("\nTesting single string parameters for groupby, unique, unpivot:");
    const testUsabilityData = [
        { category: "A", val: 10 },
        { category: "A", val: 10 },
        { category: "B", val: 20 },
    ];
    const dfUsability = $tbl.data(testUsabilityData);

    // groupby with single string:
    const dfGroupedUsability = dfUsability.groupby("category").agg($tbl.col("val").sum().alias("sum_val")).collect();
    console.log("Groupby Usability Result:");
    console.table(dfGroupedUsability);
    if (dfGroupedUsability.length !== 2) {
        console.error("groupby with single string key failed!");
        passed = false;
    }

    // unique with single string:
    const dfUniqueUsability = dfUsability.unique("category").collect();
    console.log("Unique Usability Result:");
    console.table(dfUniqueUsability);
    if (dfUniqueUsability.length !== 2) {
        console.error("unique with single string key failed!");
        passed = false;
    }

    // unpivot with single string:
    const dfUnpivotUsability = dfUsability.unpivot("category", "val").collect();
    console.log("Unpivot Usability Result:");
    console.table(dfUnpivotUsability);
    if (dfUnpivotUsability.length !== 3) {
        console.error("unpivot with single string keys failed!");
        passed = false;
    }

    // pivot with single string:
    const dfPivotUsability = dfUsability.pivot("category", "category", "val").collect();
    console.log("Pivot Usability Result:");
    console.table(dfPivotUsability);
    if (dfPivotUsability.length !== 2) {
        console.error("pivot with single string key failed!");
        passed = false;
    }

    // 13. Test constructor array enforcement
    console.log("\nTesting constructor array enforcement:");
    try {
        const dfInvalid = $tbl.data(null as any);
        const collectedInvalid = dfInvalid.collect();
        if (!Array.isArray(collectedInvalid) || collectedInvalid.length !== 0) {
            console.error("Constructor array enforcement failed: collected is not empty array.");
            passed = false;
        }
    } catch (e) {
        console.error("Constructor array enforcement threw an error:", e);
        passed = false;
    }

    // 14. Test defensive null/undefined guards
    console.log("\nTesting defensive null/undefined guards:");
    try {
        // 14.1 Rename with undefined mapping
        const dfRenameGuard = dfUsability.rename(undefined).collect();
        if (dfRenameGuard.length !== 3) {
            console.error("Rename guard failed!");
            passed = false;
        }

        // 14.2 Sort with undefined config or missing config.by
        const dfSortGuard1 = dfUsability.sort(undefined).collect();
        const dfSortGuard2 = dfUsability.sort({} as any).collect();
        if (dfSortGuard1.length !== 3 || dfSortGuard2.length !== 3) {
            console.error("Sort guard failed!");
            passed = false;
        }

        // 14.3 to_list with null nameOrExpr
        try {
            dfUsability.to_list(null as any);
        } catch (e) {
            console.error("to_list guard failed to prevent crash:", e);
            passed = false;
        }
    } catch (e) {
        console.error("One of the guards failed with error:", e);
        passed = false;
    }

    if (passed) {
        console.log("\n🎉 ALL WINDOW FUNCTION TESTS PASSED!");
    } else {
        console.error("\n❌ SOME TESTS FAILED!");
        process.exit(1);
    }
} catch (error) {
    console.error("Error executing tests:", error);
    process.exit(1);
}
