declare const process: any;
import { DataFrame } from "../../src/dataframe";
import { $df } from "../../src/api";

console.log("=========================================");
console.log("STARTING HARDENED DATAFRAME GROUPBYDYNAMIC TESTS...");
console.log("=========================================");

try {
    // 1. Basic dynamic grouping on integer timestamps
    const df1 = new DataFrame([
        { time: 10, val: 100 },
        { time: 15, val: 150 },
        { time: 20, val: 200 },
        { time: 25, val: 250 },
        { time: 30, val: 300 }
    ]);

    const res1 = df1.groupByDynamic("time", { every: 10, period: 10 }).agg(
        $df.col("val").sum().alias("val_sum"),
        $df.col("val").count().alias("count")
    );

    if (res1.height !== 3) {
        throw new Error(`Expected height 3, got ${res1.height}`);
    }

    const dicts1 = res1.toDicts() as any[];
    if (dicts1[0].time !== 10 || dicts1[0].val_sum !== 250 || dicts1[0].count !== 2) {
        throw new Error(`Row 0 mismatch: ${JSON.stringify(dicts1[0])}`);
    }
    if (dicts1[1].time !== 20 || dicts1[1].val_sum !== 450 || dicts1[1].count !== 2) {
        throw new Error(`Row 1 mismatch: ${JSON.stringify(dicts1[1])}`);
    }
    if (dicts1[2].time !== 30 || dicts1[2].val_sum !== 300 || dicts1[2].count !== 1) {
        throw new Error(`Row 2 mismatch: ${JSON.stringify(dicts1[2])}`);
    }

    // 2. Overlapping windows (period > every)
    const resOverlapping = df1.groupByDynamic("time", { every: 10, period: 20 }).agg(
        $df.col("val").sum().alias("sum")
    );
    const dictsOverlapping = resOverlapping.toDicts() as any[];
    if (dictsOverlapping[0].sum !== 700 || dictsOverlapping[1].sum !== 750 || dictsOverlapping[2].sum !== 300) {
        throw new Error(`Overlapping window failed: ${JSON.stringify(dictsOverlapping)}`);
    }

    // 3. Date / Datetime grouping with string durations ("1d", "2d")
    const dfDates = new DataFrame([
        { date: new Date("2023-01-01T00:00:00Z"), val: 10 },
        { date: new Date("2023-01-01T12:00:00Z"), val: 20 },
        { date: new Date("2023-01-02T00:00:00Z"), val: 30 },
        { date: new Date("2023-01-03T00:00:00Z"), val: 40 },
    ]);

    const resDates = dfDates.groupByDynamic("date", { every: "1d", period: "1d" }).agg(
        $df.col("val").sum().alias("total")
    );

    if (resDates.height !== 3) {
        throw new Error(`Expected date height 3, got ${resDates.height}`);
    }
    const dictsDates = resDates.toDicts() as any[];
    if (dictsDates[0].total !== 30 || dictsDates[1].total !== 30 || dictsDates[2].total !== 40) {
        throw new Error(`Date aggregation total mismatch: ${JSON.stringify(dictsDates)}`);
    }

    // 4. includeBoundaries: true
    const resBoundaries = df1.groupByDynamic("time", { every: 10, includeBoundaries: true }).agg(
        $df.col("val").mean().alias("mean")
    );
    const dictsBoundaries = resBoundaries.toDicts() as any[];
    if (dictsBoundaries[0]._lower_boundary !== 10 || dictsBoundaries[0]._upper_boundary !== 20) {
        throw new Error(`Boundaries mismatch: ${JSON.stringify(dictsBoundaries[0])}`);
    }

    // 5. Partitioned dynamic grouping (`by` / `groupBy`)
    const dfPartitioned = new DataFrame([
        { symbol: "AAPL", time: 10, price: 100 },
        { symbol: "AAPL", time: 15, price: 105 },
        { symbol: "MSFT", time: 10, price: 200 },
        { symbol: "MSFT", time: 25, price: 210 },
    ]);

    const resPart = dfPartitioned.groupByDynamic("time", { every: 10, period: 10, by: "symbol" }).agg(
        $df.col("price").mean().alias("avg_price")
    );
    if (resPart.height !== 3) {
        throw new Error(`Expected partitioned height 3, got ${resPart.height}`);
    }
    const dictsPart = resPart.toDicts() as any[];
    const aaplRow = dictsPart.find(r => r.symbol === "AAPL" && r.time === 10);
    const msftRow1 = dictsPart.find(r => r.symbol === "MSFT" && r.time === 10);
    const msftRow2 = dictsPart.find(r => r.symbol === "MSFT" && r.time === 20);

    if (!aaplRow || aaplRow.avg_price !== 102.5) throw new Error("AAPL avg price wrong");
    if (!msftRow1 || msftRow1.avg_price !== 200) throw new Error("MSFT row 1 wrong");
    if (!msftRow2 || msftRow2.avg_price !== 210) throw new Error("MSFT row 2 wrong");

    // 6. closed interval variations ('right', 'both', 'none')
    const dfIntervals = new DataFrame([
        { time: 10, val: 1 },
        { time: 20, val: 2 },
    ]);
    const resRight = dfIntervals.groupByDynamic("time", { every: 10, closed: "right" }).agg(
        $df.col("val").sum().alias("sum")
    );
    const dictsRight = resRight.toDicts() as any[];
    if (dictsRight[0].sum !== 1 || dictsRight[1].sum !== 2) {
        throw new Error(`closed="right" failed: ${JSON.stringify(dictsRight)}`);
    }

    // 7. label variations ('right', 'datapoint')
    const resLabelRight = df1.groupByDynamic("time", { every: 10, label: "right" }).agg(
        $df.col("val").first().alias("first_val")
    );
    const dictsLabelRight = resLabelRight.toDicts() as any[];
    if (dictsLabelRight[0].time !== 20) {
        throw new Error(`Expected label 'right' time 20, got ${dictsLabelRight[0].time}`);
    }

    const resLabelDatapoint = df1.groupByDynamic("time", { every: 10, label: "datapoint" }).agg(
        $df.col("val").first().alias("first_val")
    );
    if ((resLabelDatapoint.toDicts() as any[])[0].time !== 10) {
        throw new Error("Expected label 'datapoint' time 10");
    }

    // 8. startBy: 'datapoint'
    const dfStartPoint = new DataFrame([
        { time: 13, val: 10 },
        { time: 22, val: 20 },
    ]);
    const resStartPoint = dfStartPoint.groupByDynamic("time", { every: 10, startBy: "datapoint" }).agg(
        $df.col("val").sum().alias("sum")
    );
    const dictsStartPoint = resStartPoint.toDicts() as any[];
    if (dictsStartPoint[0].time !== 13) {
        throw new Error(`Expected startBy 'datapoint' time 13, got ${dictsStartPoint[0].time}`);
    }

    // 9. Unsorted validation (checkSorted: true throws DataFrameError)
    const dfUnsorted = new DataFrame([
        { time: 20, val: 1 },
        { time: 10, val: 2 }
    ]);
    let caughtSorted = false;
    try {
        dfUnsorted.groupByDynamic("time", { every: 10, checkSorted: true }).agg($df.col("val").sum());
    } catch {
        caughtSorted = true;
    }
    if (!caughtSorted) {
        throw new Error("Expected checkSorted to throw error on unsorted input");
    }

    // 10. toDataframe() from groupByDynamic
    const dynDf = df1.groupByDynamic("time", { every: 10 }).toDataframe();
    if (dynDf.height !== 3) {
        throw new Error(`toDataframe on groupByDynamic failed: height ${dynDf.height}`);
    }

    // =========================================================================
    // 10/10 EXHAUSTIVE COMPLEX EDGE CASE TESTING
    // =========================================================================

    // 11. Empty DataFrame dynamic grouping
    const emptyDf = new DataFrame({ time: [], val: [] });
    const emptyGrouped = emptyDf.groupByDynamic("time", { every: 10 }).agg($df.col("val").sum());
    if (emptyGrouped.height !== 0) {
        throw new Error(`Expected 0 rows for empty df, got ${emptyGrouped.height}`);
    }

    // 12. Single-row DataFrame
    const singleDf = new DataFrame([{ time: 42, val: 99 }]);
    const singleGrouped = singleDf.groupByDynamic("time", { every: 10 }).agg($df.col("val").sum().alias("val_sum"));
    if (singleGrouped.height !== 1 || (singleGrouped.toDicts() as any[])[0].val_sum !== 99) {
        throw new Error("Single row dynamic grouping failed");
    }

    // 13. Index column with null, undefined, NaN values (auto-ignored without throwing)
    const nullishDf = new DataFrame([
        { time: null, val: 10 },
        { time: 10, val: 20 },
        { time: NaN, val: 30 },
        { time: 15, val: 40 },
        { time: undefined, val: 50 },
    ]);
    const nullishGrouped = nullishDf.groupByDynamic("time", { every: 10, checkSorted: false }).agg($df.col("val").sum().alias("sum"));
    if (nullishGrouped.height !== 1 || (nullishGrouped.toDicts() as any[])[0].sum !== 60) {
        throw new Error(`Nullish index filtering failed: got ${JSON.stringify(nullishGrouped.toDicts())}`);
    }

    // 14. ISO date strings seamlessly coerced and formatted
    const isoDf = new DataFrame([
        { dt: "2024-06-01T10:00:00Z", v: 100 },
        { dt: "2024-06-01T15:30:00Z", v: 200 },
        { dt: "2024-06-02T01:00:00Z", v: 300 }
    ]);
    const isoGrouped = isoDf.groupByDynamic("dt", { every: "1d", period: "1d", includeBoundaries: true }).agg(
        $df.col("v").sum().alias("day_sum")
    );
    if (isoGrouped.height !== 2) {
        throw new Error(`ISO string dynamic grouping height mismatch: expected 2, got ${isoGrouped.height}`);
    }
    const isoRows = isoGrouped.toDicts() as any[];
    if (isoRows[0].day_sum !== 300 || isoRows[1].day_sum !== 300) {
        throw new Error(`ISO string dynamic grouping sum mismatch: ${JSON.stringify(isoRows)}`);
    }
    if (!(isoRows[0]._lower_boundary instanceof Date)) {
        throw new Error("_lower_boundary for ISO date should be Date instance");
    }

    // 15. Gaps / Spanned intervals with no data in between
    const gapDf = new DataFrame([
        { time: 0, val: 1 },
        { time: 1000, val: 2 }
    ]);
    const gapGrouped = gapDf.groupByDynamic("time", { every: 100, period: 100 }).agg($df.col("val").sum().alias("sum"));
    if (gapGrouped.height !== 2) {
        throw new Error(`Gap dataframe should only produce 2 non-empty buckets, got ${gapGrouped.height}`);
    }

    // 16. Multi-column secondary grouping keys
    const multiByDf = new DataFrame([
        { region: "US", dept: "ENG", time: 10, score: 90 },
        { region: "US", dept: "ENG", time: 12, score: 95 },
        { region: "US", dept: "HR", time: 10, score: 80 },
        { region: "EU", dept: "ENG", time: 10, score: 85 },
    ]);
    const multiByGrouped = multiByDf.groupByDynamic("time", {
        every: 10,
        by: ["region", "dept"]
    }).agg($df.col("score").mean().alias("avg_score"));

    if (multiByGrouped.height !== 3) {
        throw new Error(`Multi-key secondary group height mismatch: expected 3, got ${multiByGrouped.height}`);
    }
    const multiRows = multiByGrouped.toDicts() as any[];
    const usEng = multiRows.find(r => r.region === "US" && r.dept === "ENG");
    if (!usEng || usEng.avg_score !== 92.5) {
        throw new Error(`Multi-key aggregation mismatch: got ${JSON.stringify(usEng)}`);
    }

    // 17. truncate: false retains exact datapoint timestamps
    const nonTruncDf = new DataFrame([
        { time: 14, val: 10 },
        { time: 18, val: 20 }
    ]);
    const nonTruncGrouped = nonTruncDf.groupByDynamic("time", { every: 10, truncate: false }).agg($df.col("val").sum().alias("sum"));
    if ((nonTruncGrouped.toDicts() as any[])[0].time !== 14) {
        throw new Error(`truncate: false should retain first data point timestamp 14`);
    }

    // 18. closed: 'none' (strictly open intervals (start, end))
    const closedNoneDf = new DataFrame([
        { time: 10, val: 1 },
        { time: 15, val: 2 },
        { time: 20, val: 3 },
    ]);
    const closedNoneGrouped = closedNoneDf.groupByDynamic("time", { every: 10, period: 10, closed: "none" }).agg(
        $df.col("val").sum().alias("sum")
    );
    const closedNoneRows = closedNoneGrouped.toDicts() as any[];
    if (closedNoneGrouped.height !== 1 || closedNoneRows[0].sum !== 2) {
        throw new Error(`closed="none" failed: got ${JSON.stringify(closedNoneRows)}`);
    }

    // 19. closed: 'both' (inclusive of both boundaries [start, end])
    const closedBothDf = new DataFrame([
        { time: 10, val: 1 },
        { time: 20, val: 2 },
    ]);
    const closedBothGrouped = closedBothDf.groupByDynamic("time", { every: 10, period: 10, closed: "both" }).agg(
        $df.col("val").sum().alias("sum")
    );
    if (closedBothGrouped.height !== 2 || (closedBothGrouped.toDicts() as any[])[0].sum !== 3) {
        throw new Error(`closed="both" failed: got ${JSON.stringify(closedBothGrouped.toDicts())}`);
    }

    // 20. Offset duration strings (e.g. offset: "2h")
    const offsetDf = new DataFrame([
        { ts: new Date("2024-01-01T02:00:00Z"), val: 100 },
        { ts: new Date("2024-01-01T04:00:00Z"), val: 200 },
    ]);
    const offsetGrouped = offsetDf.groupByDynamic("ts", { every: "1d", offset: "2h", includeBoundaries: true }).agg(
        $df.col("val").sum().alias("total")
    );
    const offsetRows = offsetGrouped.toDicts() as any[];
    if (offsetRows[0]._lower_boundary.toISOString() !== "2024-01-01T02:00:00.000Z") {
        throw new Error(`Offset lower boundary mismatch: got ${offsetRows[0]._lower_boundary.toISOString()}`);
    }

    // 21. Multiple simultaneous aggregations on grouped dynamic data
    const multiAggGrouped = df1.groupByDynamic("time", { every: 10 }).agg(
        $df.col("val").min().alias("min_val"),
        $df.col("val").max().alias("max_val"),
        $df.col("val").mean().alias("mean_val"),
        $df.col("val").sum().alias("sum_val")
    );
    const multiAggRows = multiAggGrouped.toDicts() as any[];
    if (multiAggRows[0].min_val !== 100 || multiAggRows[0].max_val !== 150 || multiAggRows[0].mean_val !== 125 || multiAggRows[0].sum_val !== 250) {
        throw new Error(`Multi aggregation values mismatch: ${JSON.stringify(multiAggRows[0])}`);
    }

    // 22. Multiple rows with identical timestamps in the same window
    const dupTimeDf = new DataFrame([
        { time: 10, v: 10 },
        { time: 10, v: 20 },
        { time: 10, v: 30 },
        { time: 20, v: 40 },
    ]);
    const dupRes = dupTimeDf.groupByDynamic("time", { every: 10 }).agg(
        $df.col("v").sum().alias("v_sum"),
        $df.col("v").count().alias("v_cnt")
    );
    const dupRows = dupRes.toDicts() as any[];
    if (dupRows[0].v_sum !== 60 || dupRows[0].v_cnt !== 3 || dupRows[1].v_sum !== 40 || dupRows[1].v_cnt !== 1) {
        throw new Error(`Duplicate timestamps grouping failed: ${JSON.stringify(dupRows)}`);
    }

    // 23. Sub-second millisecond duration windows ("500ms", "250ms")
    const subSecDf = new DataFrame([
        { ts: new Date("2024-01-01T00:00:00.100Z"), val: 1 },
        { ts: new Date("2024-01-01T00:00:00.300Z"), val: 2 },
        { ts: new Date("2024-01-01T00:00:00.600Z"), val: 3 },
    ]);
    const subSecRes = subSecDf.groupByDynamic("ts", { every: "500ms" }).agg($df.col("val").sum().alias("sum"));
    if (subSecRes.height !== 2 || (subSecRes.toDicts() as any[])[0].sum !== 3 || (subSecRes.toDicts() as any[])[1].sum !== 3) {
        throw new Error(`Sub-second duration windows failed: got ${JSON.stringify(subSecRes.toDicts())}`);
    }

    // 24. Negative integer timestamps (e.g. historical coordinates / relative time)
    const negTimeDf = new DataFrame([
        { time: -30, val: 5 },
        { time: -25, val: 10 },
        { time: -10, val: 15 },
        { time: 0, val: 20 },
    ]);
    const negRes = negTimeDf.groupByDynamic("time", { every: 10 }).agg($df.col("val").sum().alias("sum"));
    if (negRes.height !== 3) {
        throw new Error(`Negative timestamps failed: expected 3 windows, got ${negRes.height}`);
    }

    // 25. Large period spanning all data in a single giant window
    const giantWindowRes = df1.groupByDynamic("time", { every: 100, period: 100 }).agg($df.col("val").sum().alias("total"));
    if (giantWindowRes.height !== 1 || (giantWindowRes.toDicts() as any[])[0].total !== 1000) {
        throw new Error(`Giant window failed: expected 1 row with sum 1000, got ${JSON.stringify(giantWindowRes.toDicts())}`);
    }

    // 26. Dynamic grouping on ColumnExpression selector as index ($df.col("time"))
    const colExprRes = df1.groupByDynamic($df.col("time"), { every: 10 }).agg($df.col("val").sum().alias("sum"));
    if (colExprRes.height !== 3 || (colExprRes.toDicts() as any[])[0].sum !== 250) {
        throw new Error("ColumnExpression index selector failed");
    }

    // 27. Negative offset shift (offset: "-1d" / -10)
    const negOffsetDf = new DataFrame([
        { time: 10, val: 100 },
        { time: 20, val: 200 }
    ]);
    const negOffsetRes = negOffsetDf.groupByDynamic("time", { every: 10, offset: -5, includeBoundaries: true }).agg($df.col("val").sum().alias("sum"));
    const negOffsetRows = negOffsetRes.toDicts() as any[];
    if (negOffsetRows[0]._lower_boundary !== 5 || negOffsetRows[0]._upper_boundary !== 15) {
        throw new Error(`Negative offset boundaries mismatch: ${JSON.stringify(negOffsetRows[0])}`);
    }

    // 29. startBy Day-of-Week (e.g. "monday", "sunday")
    // Jan 1 2024 is a Monday, Jan 3 2024 is Wednesday, Jan 7 is Sunday
    const weekDf = new DataFrame([
        { dt: new Date("2024-01-03T10:00:00Z"), val: 100 },
        { dt: new Date("2024-01-05T10:00:00Z"), val: 200 },
        { dt: new Date("2024-01-10T10:00:00Z"), val: 300 }
    ]);
    const mondayGrouped = weekDf.groupByDynamic("dt", { every: "1w", startBy: "monday", includeBoundaries: true }).agg(
        $df.col("val").sum().alias("sum")
    );
    const mondayRows = mondayGrouped.toDicts() as any[];
    if (mondayRows[0]._lower_boundary.toISOString() !== "2024-01-01T00:00:00.000Z") {
        throw new Error(`startBy: monday failed: expected 2024-01-01, got ${mondayRows[0]._lower_boundary.toISOString()}`);
    }

    // 30. Pre-1970 negative dates (dates prior to Unix epoch)
    const pre1970Df = new DataFrame([
        { dt: new Date("1960-01-15T00:00:00Z"), val: 10 },
        { dt: new Date("1960-01-16T00:00:00Z"), val: 20 },
    ]);
    const pre1970Grouped = pre1970Df.groupByDynamic("dt", { every: "1d", includeBoundaries: true }).agg($df.col("val").sum().alias("sum"));
    if (pre1970Grouped.height !== 2 || (pre1970Grouped.toDicts() as any[])[0].sum !== 10) {
        throw new Error("Pre-1970 negative epoch dates dynamic grouping failed");
    }

    // 31. Date sniffing when row 0 is null/undefined
    const nullFirstDateDf = new DataFrame([
        { dt: null, val: 5 },
        { dt: new Date("2024-05-01T00:00:00Z"), val: 10 },
        { dt: new Date("2024-05-02T00:00:00Z"), val: 20 }
    ]);
    const nullFirstGrouped = nullFirstDateDf.groupByDynamic("dt", { every: "1d", includeBoundaries: true }).agg($df.col("val").sum().alias("sum"));
    const nullFirstRows = nullFirstGrouped.toDicts() as any[];
    if (!(nullFirstRows[0]._lower_boundary instanceof Date)) {
        throw new Error("Date sniffing when row 0 is null failed");
    }

    // 32. Floating-point step precision (no drift across 100+ steps)
    const floatDf = new DataFrame(
        Array.from({ length: 50 }, (_, i) => ({ time: i * 0.1, val: i }))
    );
    const floatGrouped = floatDf.groupByDynamic("time", { every: 0.1, period: 0.1 }).agg($df.col("val").sum().alias("sum"));
    if (floatGrouped.height !== 50) {
        throw new Error(`Float step precision drift failed: expected 50 windows, got ${floatGrouped.height}`);
    }

    // 33. Underlapping / skipping windows (period < every)
    const underlapDf = new DataFrame([
        { time: 0, val: 1 },
        { time: 5, val: 2 }, // falls between window [0, 2) and [10, 12)
        { time: 10, val: 3 },
    ]);
    const underlapGrouped = underlapDf.groupByDynamic("time", { every: 10, period: 2 }).agg($df.col("val").sum().alias("sum"));
    const underlapRows = underlapGrouped.toDicts() as any[];
    if (underlapGrouped.height !== 2 || underlapRows[0].sum !== 1 || underlapRows[1].sum !== 3) {
        throw new Error(`Underlapping window (period < every) failed: got ${JSON.stringify(underlapRows)}`);
    }

    // 34. Non-positive every / period validation
    let threwEvery = false;
    try {
        underlapDf.groupByDynamic("time", { every: 0 });
    } catch {
        threwEvery = true;
    }
    if (!threwEvery) throw new Error("every <= 0 must throw InvalidArgumentError");

    let threwPeriod = false;
    try {
        underlapDf.groupByDynamic("time", { every: 10, period: -5 });
    } catch {
        threwPeriod = true;
    }
    // 36. Sparse dataset with huge gap (fast-forwards without loop freeze)
    const sparseDf = new DataFrame([
        { time: 0, val: 1 },
        { time: 1_000_000_000, val: 2 }
    ]);
    const startT = Date.now();
    const sparseGrouped = sparseDf.groupByDynamic("time", { every: 10 }).agg($df.col("val").sum().alias("sum"));
    const elapsed = Date.now() - startT;
    // 37. Sparse gap fast-forward when closed: "right" and next point lands exactly on boundary
    const sparseRightDf = new DataFrame([
        { time: 10, val: 1 },
        { time: 1_000_000_000, val: 2 } // lands exactly on multiple of 10
    ]);
    const sparseRightRes = sparseRightDf.groupByDynamic("time", { every: 10, closed: "right", includeBoundaries: true }).agg($df.col("val").sum().alias("sum"));
    const sparseRightRows = sparseRightRes.toDicts() as any[];
    if (sparseRightRes.height !== 2 || sparseRightRows[1]._lower_boundary !== 999_999_990 || sparseRightRows[1]._upper_boundary !== 1_000_000_000) {
        throw new Error(`Sparse right-closed boundary jump failed: ${JSON.stringify(sparseRightRows)}`);
    }

    // 38. Overlapping windows with multi-row capturing (period > every)
    const overlapMultiDf = new DataFrame([
        { time: 10, val: 10 },
        { time: 25, val: 20 }
    ]);
    const overlapMultiRes = overlapMultiDf.groupByDynamic("time", { every: 10, period: 30, closed: "left" }).agg($df.col("val").sum().alias("sum"));
    const overlapMultiRows = overlapMultiRes.toDicts() as any[];
    // Windows: [10, 40) captures {10, 25} -> 30, [20, 50) captures {25} -> 20
    if (overlapMultiRes.height !== 2 || overlapMultiRows[0].sum !== 30 || overlapMultiRows[1].sum !== 20) {
        throw new Error(`Overlapping multi-row capturing failed: ${JSON.stringify(overlapMultiRows)}`);
    }

    // 39. Overlapping windows across a sparse gap (period > every)
    const overlapSparseDf = new DataFrame([
        { time: 0, val: 1 },
        { time: 1000, val: 2 }
    ]);
    const resOverlapSparse = overlapSparseDf.groupByDynamic("time", {
        every: 10,
        period: 30, // period > every across sparse gap
        includeBoundaries: true
    }).agg($df.col("val").sum().alias("sum"));

    // Point 1000 must be captured in 3 separate overlapping windows: [980, 1010), [990, 1020), [1000, 1030)
    const overlapSparseRows = resOverlapSparse.toDicts() as any[];
    const point1000Windows = overlapSparseRows.filter(r => r._lower_boundary >= 980);

    if (point1000Windows.length !== 3) {
        throw new Error(`Expected 3 overlapping windows for sparse point, got ${point1000Windows.length}: ${JSON.stringify(overlapSparseRows)}`);
    }

    // 40. `groupBy` alias key (vs `by`) — both should behave identically
    const groupByAliasDf = new DataFrame([
        { cat: "A", time: 10, v: 1 },
        { cat: "A", time: 20, v: 2 },
        { cat: "B", time: 10, v: 3 },
    ]);
    const groupByAliasRes = groupByAliasDf.groupByDynamic("time", { every: 10, groupBy: "cat" }).agg(
        $df.col("v").sum().alias("sum")
    );
    if (groupByAliasRes.height !== 3) {
        throw new Error(`groupBy alias: expected 3 rows, got ${groupByAliasRes.height}`);
    }
    const groupByAliasRows = groupByAliasRes.toDicts() as any[];
    const groupByA = groupByAliasRows.find(r => r.cat === "A" && r.time === 10);
    if (!groupByA || groupByA.sum !== 1) throw new Error(`groupBy alias row A mismatch: ${JSON.stringify(groupByA)}`);
    const groupByB = groupByAliasRows.find(r => r.cat === "B" && r.time === 10);
    if (!groupByB || groupByB.sum !== 3) throw new Error(`groupBy alias row B mismatch: ${JSON.stringify(groupByB)}`);

    // 41. offset + startBy: "datapoint" — offset should shift the datapoint anchor
    const offsetDatapointDf = new DataFrame([
        { time: 13, val: 10 },
        { time: 25, val: 20 },
    ]);
    const offsetDatapointRes = offsetDatapointDf.groupByDynamic("time", {
        every: 10,
        offset: 3,
        startBy: "datapoint",
        includeBoundaries: true
    }).agg($df.col("val").sum().alias("sum"));
    const offsetDpRows = offsetDatapointRes.toDicts() as any[];
    // firstWindowStart = minVal + offset = 13 + 3 = 16; window [16, 26) captures {25}
    if (offsetDatapointRes.height !== 1 || offsetDpRows[0]._lower_boundary !== 16) {
        throw new Error(`offset + startBy:datapoint failed: got ${JSON.stringify(offsetDpRows)}`);
    }

    // 42. closed: "none" + startBy: "datapoint" — both interact; fast-forward guard skipped
    const closedNoneDpDf = new DataFrame([
        { time: 5, val: 1 },
        { time: 15, val: 2 },
        { time: 25, val: 3 },
    ]);
    const closedNoneDpRes = closedNoneDpDf.groupByDynamic("time", {
        every: 10,
        period: 10,
        closed: "none",
        startBy: "datapoint"
    }).agg($df.col("val").sum().alias("sum"));
    // Window (5, 15) strictly open: excludes 5 and 15, captures nothing for first window
    // Window (15, 25) strictly open: captures nothing (15 and 25 excluded)
    if (closedNoneDpRes.height !== 0) {
        throw new Error(`closed:none + startBy:datapoint failed: expected 0 rows, got ${closedNoneDpRes.height}: ${JSON.stringify(closedNoneDpRes.toDicts())}`);
    }

    // 43. Partition where ALL rows have null/NaN timestamps → 0 groups, no throw
    const allNullPartDf = new DataFrame([
        { sym: "X", time: null, val: 1 },
        { sym: "X", time: null, val: 2 },
        { sym: "Y", time: 10, val: 3 },
    ]);
    const allNullPartRes = allNullPartDf.groupByDynamic("time", {
        every: 10,
        by: "sym",
        checkSorted: false
    }).agg($df.col("val").sum().alias("sum"));
    // Partition X has all nulls → 0 groups; partition Y has one row → 1 group
    if (allNullPartRes.height !== 1) {
        throw new Error(`All-null partition: expected 1 row (from Y), got ${allNullPartRes.height}: ${JSON.stringify(allNullPartRes.toDicts())}`);
    }
    const allNullRows = allNullPartRes.toDicts() as any[];
    if (allNullRows[0].sym !== "Y" || allNullRows[0].sum !== 3) {
        throw new Error(`All-null partition: Y partition wrong: ${JSON.stringify(allNullRows[0])}`);
    }

    // 44. truncate: false + label: "right" — truncate:false wins (uses first datapoint, not window end)
    const truncRightDf = new DataFrame([
        { time: 14, val: 10 },
        { time: 18, val: 20 },
    ]);
    const truncRightRes = truncRightDf.groupByDynamic("time", {
        every: 10,
        truncate: false,
        label: "right"
    }).agg($df.col("val").sum().alias("sum"));
    // With truncate:false, useDatapoint = true regardless of label, so label should be the first datapoint (14)
    const truncRightRows = truncRightRes.toDicts() as any[];
    if (truncRightRows[0].time !== 14) {
        throw new Error(`truncate:false + label:right — expected datapoint label 14, got ${truncRightRows[0].time}`);
    }

    // 45. startBy: day-of-week on a non-date integer column — should fall through to "window" startBy silently
    const intColDf = new DataFrame([
        { time: 100, val: 1 },
        { time: 200, val: 2 },
    ]);
    const intDayOfWeekRes = intColDf.groupByDynamic("time", { every: 100, startBy: "monday" }).agg(
        $df.col("val").sum().alias("sum")
    );
    // isDateType is false → "monday" branch skipped → falls through to window startBy
    if (intDayOfWeekRes.height !== 2) {
        throw new Error(`startBy:monday on int col should produce 2 windows, got ${intDayOfWeekRes.height}`);
    }

    // 46. startBy: day-of-week with closed: "right" where first date lands exactly on Monday midnight (dayStart)
    // Jan 1 2024 is Monday 00:00:00Z. With closed="right", (dayStart - 1w, dayStart] captures Jan 1, and (dayStart, dayStart + 1w] captures Jan 2.
    const mondayRightDf = new DataFrame([
        { dt: new Date("2024-01-01T00:00:00Z"), val: 50 },
        { dt: new Date("2024-01-02T00:00:00Z"), val: 50 }
    ]);
    const mondayRightRes = mondayRightDf.groupByDynamic("dt", {
        every: "1w",
        startBy: "monday",
        closed: "right",
        includeBoundaries: true
    }).agg($df.col("val").sum().alias("sum"));
    if (mondayRightRes.height !== 2) {
        throw new Error(`startBy: monday with closed: "right" expected 2 windows, got ${mondayRightRes.height}: ${JSON.stringify(mondayRightRes.toDicts())}`);
    }
    const mondayRightRows = mondayRightRes.toDicts() as any[];
    if (mondayRightRows[0].sum !== 50 || mondayRightRows[1].sum !== 50) {
        throw new Error(`startBy: monday with closed: "right" sums mismatch: ${JSON.stringify(mondayRightRows)}`);
    }

    // 47. startBy: day-of-week with custom offset
    const mondayOffsetDf = new DataFrame([
        { dt: new Date("2024-01-01T02:00:00Z"), val: 10 },
        { dt: new Date("2024-01-01T05:00:00Z"), val: 20 }
    ]);
    const mondayOffsetRes = mondayOffsetDf.groupByDynamic("dt", {
        every: "1w",
        startBy: "monday",
        offset: "2h",
        includeBoundaries: true
    }).agg($df.col("val").sum().alias("sum"));
    const mondayOffsetRows = mondayOffsetRes.toDicts() as any[];
    if (mondayOffsetRows[0]._lower_boundary.toISOString() !== "2024-01-01T02:00:00.000Z" || mondayOffsetRows[0].sum !== 30) {
        throw new Error(`startBy: monday with offset failed: ${JSON.stringify(mondayOffsetRows)}`);
    }

    // =========================================================================
    // 10/10 BRUTAL EXTREME EDGE CASES
    // =========================================================================

    // 48. Sub-millisecond / Microsecond Precision Windowing (float milliseconds: 0.25ms = 250us)
    const microDf = new DataFrame([
        { time: 100.0, val: 1 },
        { time: 100.1, val: 2 }, // [100.00, 100.25) -> {1, 2} sum: 3
        { time: 100.3, val: 4 }, // [100.25, 100.50) -> {4}    sum: 4
        { time: 100.7, val: 8 }, // [100.50, 100.75) -> {8}    sum: 8
    ]);
    const microRes = microDf.groupByDynamic("time", {
        every: 0.25,
        period: 0.25,
        includeBoundaries: true
    }).agg($df.col("val").sum().alias("sum"));
    if (microRes.height !== 3) {
        throw new Error(`Sub-millisecond windowing height mismatch: expected 3, got ${microRes.height}: ${JSON.stringify(microRes.toDicts())}`);
    }
    const microRows = microRes.toDicts() as any[];
    if (microRows[0].sum !== 3 || microRows[1].sum !== 4 || microRows[2].sum !== 8) {
        throw new Error(`Sub-millisecond windowing sums mismatch: ${JSON.stringify(microRows)}`);
    }

    // 49. Extreme Leap Year Boundary (Feb 28 to Feb 29 to Mar 1 across 2024 leap year)
    const leapDf = new DataFrame([
        { dt: new Date("2024-02-28T12:00:00Z"), v: 10 },
        { dt: new Date("2024-02-29T12:00:00Z"), v: 20 },
        { dt: new Date("2024-03-01T12:00:00Z"), v: 30 }
    ]);
    const leapRes = leapDf.groupByDynamic("dt", { every: "1d", includeBoundaries: true }).agg(
        $df.col("v").sum().alias("sum")
    );
    if (leapRes.height !== 3) {
        throw new Error(`Leap year grouping height mismatch: expected 3, got ${leapRes.height}`);
    }
    const leapRows = leapRes.toDicts() as any[];
    if (leapRows[1]._lower_boundary.toISOString() !== "2024-02-29T00:00:00.000Z") {
        throw new Error(`Leap day Feb 29 boundary mismatch: got ${leapRows[1]._lower_boundary.toISOString()}`);
    }

    // 50. Negative Epoch Timestamps with startBy: "datapoint" and non-zero offset
    // Testing negative time coordinates (-1050ms, -500ms)
    const negDpDf = new DataFrame([
        { time: -1050, val: 5 },
        { time: -980, val: 10 },
        { time: -500, val: 15 }
    ]);
    const negDpRes = negDpDf.groupByDynamic("time", {
        every: 100,
        period: 100,
        startBy: "datapoint",
        offset: -20, // firstWindowStart = -1050 - 20 = -1070
        includeBoundaries: true
    }).agg($df.col("val").sum().alias("sum"));
    const negDpRows = negDpRes.toDicts() as any[];
    // Window [-1070, -970) captures -1050 and -980 -> sum: 15
    if (negDpRows[0]._lower_boundary !== -1070 || negDpRows[0].sum !== 15) {
        throw new Error(`Negative timestamp + datapoint + negative offset mismatch: ${JSON.stringify(negDpRows[0])}`);
    }

    // 51. Massive Number of Repeated Identical Timestamps with Out-of-Order Secondary Keys
    // Stress test binary search boundary stability and secondary key collation
    const stressRows = [];
    for (let i = 0; i < 200; i++) {
        stressRows.push({
            grp: i % 2 === 0 ? "EVEN" : "ODD",
            time: 1000, // all identical timestamps
            val: 1
        });
    }
    const stressDf = new DataFrame(stressRows);
    const stressRes = stressDf.groupByDynamic("time", {
        every: 100,
        by: "grp"
    }).agg($df.col("val").sum().alias("count"));
    if (stressRes.height !== 2) {
        throw new Error(`Stress duplicate identical timestamps expected 2 groups, got ${stressRes.height}`);
    }
    const stressResultRows = stressRes.toDicts() as any[];
    const evenPart = stressResultRows.find(r => r.grp === "EVEN");
    const oddPart = stressResultRows.find(r => r.grp === "ODD");
    if (!evenPart || evenPart.count !== 100 || !oddPart || oddPart.count !== 100) {
        throw new Error(`Stress duplicate test counts failed: ${JSON.stringify(stressResultRows)}`);
    }

    // 52. Ultra-Sparse Multi-Partition with Mixed Infinite / Finite Windows
    // One partition has points at 0 and 100_000_000, another has points at 50 and 60
    const mixedSparseDf = new DataFrame([
        { cat: "SPARSE", t: 0, v: 1 },
        { cat: "SPARSE", t: 100_000_000, v: 2 },
        { cat: "DENSE", t: 50, v: 10 },
        { cat: "DENSE", t: 60, v: 20 },
    ]);
    const mixedSparseRes = mixedSparseDf.groupByDynamic("t", {
        every: 10,
        period: 20, // overlapping windows across sparse gap
        by: "cat"
    }).agg($df.col("v").sum().alias("sum"));
    // SPARSE: t=0 -> 2 windows ([0,20), [10,30) with only [0,20) non-empty? wait: [0,20) captures 0)
    // t=100_000_000 -> 2 overlapping windows [99_999_990, 100_000_010) and [100_000_000, 100_000_020)
    // DENSE: t=50, t=60 captured across dense windows
    if (mixedSparseRes.height < 4) {
        throw new Error(`Mixed sparse/dense multi-partition failed: height ${mixedSparseRes.height}`);
    }

    // 53. Schema Stability Check with includeBoundaries and toDataframe()
    const schemaCheckDf = new DataFrame([
        { date: new Date("2025-01-01T00:00:00Z"), score: 100 },
        { date: new Date("2025-01-02T00:00:00Z"), score: 200 }
    ]);
    const schemaDirect = schemaCheckDf.groupByDynamic("date", { every: "1d", includeBoundaries: true }).toDataframe();
    if (schemaDirect.height !== 2) {
        throw new Error(`toDataframe on includeBoundaries failed: height ${schemaDirect.height}`);
    }
    const schemaDicts = schemaDirect.toDicts() as any[];
    if (!(schemaDicts[0]._lower_boundary instanceof Date) || !(schemaDicts[0]._upper_boundary instanceof Date)) {
        throw new Error(`Boundary columns should materialize as Date instances in toDataframe()`);
    }

    // 54. Invalid duration string (non-numeric / unparseable) throwing InvalidArgumentError
    let caughtInvalidEvery = false;
    try {
        df1.groupByDynamic("time", { every: "invalid_duration" });
    } catch {
        caughtInvalidEvery = true;
    }
    if (!caughtInvalidEvery) {
        throw new Error("Unparseable duration string for 'every' must throw InvalidArgumentError");
    }

    let caughtInvalidPeriod = false;
    try {
        df1.groupByDynamic("time", { every: 10, period: "not_a_duration" });
    } catch {
        caughtInvalidPeriod = true;
    }
    if (!caughtInvalidPeriod) {
        throw new Error("Unparseable duration string for 'period' must throw InvalidArgumentError");
    }

    // 55. Duplicate secondary keys in `by` options (deduplication)
    const dupByDf = new DataFrame([
        { symbol: "AAPL", time: 10, price: 100 },
        { symbol: "AAPL", time: 15, price: 105 }
    ]);
    const dupByRes = dupByDf.groupByDynamic("time", { every: 10, by: ["symbol", "symbol"] }).agg(
        $df.col("price").mean().alias("avg_price")
    );
    if (dupByRes.columns.filter(c => c === "symbol").length !== 1) {
        throw new Error("Duplicate secondary grouping keys should be deduplicated");
    }

    // 56. Closed right sparse gap with O(1) jump fast-forward
    const sparseRightJumpDf = new DataFrame([
        { time: 0, val: 1 },
        { time: 50_000_000, val: 2 }
    ]);
    const sparseRightJumpRes = sparseRightJumpDf.groupByDynamic("time", { every: 10, period: 10, closed: "right" }).agg(
        $df.col("val").sum().alias("sum")
    );
    if (sparseRightJumpRes.height !== 2) {
        throw new Error(`Sparse right jump failed: expected height 2, got ${sparseRightJumpRes.height}`);
    }

    // 57. Case-insensitive startBy day of week (e.g. "Monday", "SUNDAY")
    const caseStartDf = new DataFrame([
        { dt: new Date("2024-01-03T10:00:00Z"), val: 100 },
        { dt: new Date("2024-01-05T10:00:00Z"), val: 200 }
    ]);
    const caseStartRes = caseStartDf.groupByDynamic("dt", { every: "1w", startBy: "Monday" as any, includeBoundaries: true }).agg(
        $df.col("val").sum().alias("sum")
    );
    const caseStartRows = caseStartRes.toDicts() as any[];
    if (caseStartRows[0]._lower_boundary.toISOString() !== "2024-01-01T00:00:00.000Z") {
        throw new Error(`Case-insensitive startBy failed: ${JSON.stringify(caseStartRows[0])}`);
    }

    // 58. Secondary key deduplication with 3+ repeated keys
    const multiDupByDf = new DataFrame([
        { symbol: "AAPL", time: 10, price: 100 },
        { symbol: "AAPL", time: 15, price: 105 }
    ]);
    const multiDupByRes = multiDupByDf.groupByDynamic("time", { every: 10, by: ["symbol", "symbol", "symbol"] }).agg(
        $df.col("price").mean().alias("avg_price")
    );
    if (multiDupByRes.columns.filter(c => c === "symbol").length !== 1) {
        throw new Error("Multi duplicate secondary grouping keys deduplication failed");
    }

    // =========================================================================
    // 10/10 COMPLEX HARDENED EDGE CASES
    // =========================================================================

    // 59. DST Transition across 1-hour clocks shift (fall back / spring forward)
    // Testing UTC timeline across US Daylight Savings transition (Nov 3 2024: 01:00 UTC-4 -> 01:00 UTC-5)
    const dstDf = new DataFrame([
        { dt: new Date("2024-11-03T05:00:00Z"), val: 10 }, // 01:00 EDT
        { dt: new Date("2024-11-03T06:00:00Z"), val: 20 }, // 01:00 EST (second 1am)
        { dt: new Date("2024-11-03T07:00:00Z"), val: 30 }  // 02:00 EST
    ]);
    const dstRes = dstDf.groupByDynamic("dt", { every: "1h", period: "2h", includeBoundaries: true }).agg(
        $df.col("val").sum().alias("sum")
    );
    // Overlapping 2h windows: [05:00, 07:00) -> 10+20=30; [06:00, 08:00) -> 20+30=50; [07:00, 09:00) -> 30
    if (dstRes.height !== 3) {
        throw new Error(`DST transition windowing height mismatch: expected 3, got ${dstRes.height}`);
    }
    const dstRows = dstRes.toDicts() as any[];
    if (dstRows[0].sum !== 30 || dstRows[1].sum !== 50 || dstRows[2].sum !== 30) {
        throw new Error(`DST transition aggregation mismatch: ${JSON.stringify(dstRows)}`);
    }

    // 60. Dense non-uniform sparse clusters with period >> every (sliding window across dense cluster then vast emptiness)
    // Cluster 1: at t=0..5 (6 points), Gap of 5,000,000, Cluster 2: at t=5,000,000..5,000,005 (6 points)
    const clusterRows: { t: number; v: number }[] = [];
    for (let i = 0; i <= 5; i++) clusterRows.push({ t: i, v: 1 });
    for (let i = 0; i <= 5; i++) clusterRows.push({ t: 5_000_000 + i, v: 2 });
    const clusterDf = new DataFrame(clusterRows);
    const clusterRes = clusterDf.groupByDynamic("t", {
        every: 10,
        period: 50,
        closed: "both",
        includeBoundaries: true
    }).agg($df.col("v").sum().alias("sum"));
    // Cluster 1 at 0..5 captured in window [0, 50]
    // Then gap fast-forwards directly to window [4_999_960, 5_000_010], [4_999_970, 5_000_020] ...
    const clusterOut = clusterRes.toDicts() as any[];
    if (clusterOut[0].sum !== 6) {
        throw new Error(`Dense cluster window 0 failed: ${clusterOut[0].sum}`);
    }
    const lastClusterWindow = clusterOut[clusterOut.length - 1];
    if (lastClusterWindow.sum !== 12) {
        throw new Error(`Dense cluster last window expected 12, got: ${lastClusterWindow.sum}`);
    }

    // 61. Multi-partition interleaved with null timestamps and disparate time ranges
    // Partition A: [100, 200], Partition B: [10, 20], Partition C: all nulls
    const interDf = new DataFrame([
        { grp: "A", t: 100, val: 1 },
        { grp: "B", t: 10, val: 2 },
        { grp: "C", t: null, val: 3 },
        { grp: "A", t: 200, val: 4 },
        { grp: "B", t: 20, val: 5 },
        { grp: "C", t: NaN, val: 6 },
    ]);
    const interRes = interDf.groupByDynamic("t", {
        every: 50,
        period: 50,
        by: "grp",
        checkSorted: false,
        includeBoundaries: true
    }).agg($df.col("val").sum().alias("sum"));
    const interRows = interRes.toDicts() as any[];
    // Partition C has 0 rows; A has windows [100,150) -> 1, [200,250) -> 4; B has [0,50) -> 7
    if (interRes.height !== 3) {
        throw new Error(`Interleaved disparate partitions: expected 3 rows, got ${interRes.height}: ${JSON.stringify(interRows)}`);
    }
    const bRow = interRows.find(r => r.grp === "B");
    if (!bRow || bRow.sum !== 7) {
        throw new Error(`Interleaved partition B aggregation mismatch: ${JSON.stringify(bRow)}`);
    }

    // 62. Negative modulo day-of-week boundary with pre-epoch negative timestamps
    // Jan 1 1970 was a Thursday (day 4). Dec 31 1969 was Wednesday (day 3).
    // Testing startBy: "monday" for a timestamp in 1969.
    const preEpochMondayDf = new DataFrame([
        { dt: new Date("1969-12-29T12:00:00Z"), val: 10 }, // Monday Dec 29 1969
        { dt: new Date("1969-12-31T12:00:00Z"), val: 20 }, // Wednesday Dec 31 1969
    ]);
    const preEpochMondayRes = preEpochMondayDf.groupByDynamic("dt", {
        every: "1w",
        startBy: "monday",
        includeBoundaries: true
    }).agg($df.col("val").sum().alias("sum"));
    const preEpochMondayRows = preEpochMondayRes.toDicts() as any[];
    if (preEpochMondayRows.length !== 1 || preEpochMondayRows[0].sum !== 30) {
        throw new Error(`Pre-epoch startBy monday failed: ${JSON.stringify(preEpochMondayRows)}`);
    }
    if (preEpochMondayRows[0]._lower_boundary.toISOString() !== "1969-12-29T00:00:00.000Z") {
        throw new Error(`Pre-epoch lower boundary mismatch: got ${preEpochMondayRows[0]._lower_boundary.toISOString()}`);
    }

    // 63. Sub-microsecond (nanosecond scale) float step intervals
    // Window width: 0.0001 (100ns). Points at 0.00005, 0.00015, 0.00025
    const nanoDf = new DataFrame([
        { time: 0.00005, v: 1 },
        { time: 0.00015, v: 2 },
        { time: 0.00025, v: 3 },
    ]);
    const nanoRes = nanoDf.groupByDynamic("time", {
        every: 0.0001,
        period: 0.0001,
        includeBoundaries: true
    }).agg($df.col("v").sum().alias("sum"));
    if (nanoRes.height !== 3) {
        throw new Error(`Sub-microsecond nanosecond scale failed: expected 3 rows, got ${nanoRes.height}`);
    }
    const nanoRows = nanoRes.toDicts() as any[];
    if (nanoRows[0].sum !== 1 || nanoRows[1].sum !== 2 || nanoRows[2].sum !== 3) {
        throw new Error(`Sub-microsecond aggregation sums mismatch: ${JSON.stringify(nanoRows)}`);
    }

    // 64. Massive duplicate clusters where 1000 identical timestamps straddle the boundary of closed: "both"
    const boundaryDupes: { t: number; v: number }[] = [];
    for (let i = 0; i < 500; i++) boundaryDupes.push({ t: 10, v: 1 });
    for (let i = 0; i < 500; i++) boundaryDupes.push({ t: 20, v: 2 });
    const boundaryDupeDf = new DataFrame(boundaryDupes);
    // Closed="both": [10, 20] captures both t=10 and t=20; [20, 30] captures t=20
    const boundaryDupeRes = boundaryDupeDf.groupByDynamic("t", {
        every: 10,
        period: 10,
        closed: "both"
    }).agg($df.col("v").sum().alias("sum"));
    const boundaryDupeRows = boundaryDupeRes.toDicts() as any[];
    if (boundaryDupeRows[0].sum !== 1500) { // 500*1 + 500*2 = 1500
        throw new Error(`Boundary duplicates window 0 sum expected 1500, got ${boundaryDupeRows[0].sum}`);
    }
    if (boundaryDupeRows[1].sum !== 1000) { // 500*2 = 1000
        throw new Error(`Boundary duplicates window 1 sum expected 1000, got ${boundaryDupeRows[1].sum}`);
    }

    // 65. Underlapping jumping windows across huge empty gap with startBy: "datapoint"
    // Period < every (e.g. sample 5 units every 100 units across gap of 1,000,000)
    const underlapGapDf = new DataFrame([
        { t: 10, val: 1 },
        { t: 12, val: 2 },
        { t: 1_000_010, val: 3 },
        { t: 1_000_014, val: 4 }
    ]);
    const underlapGapRes = underlapGapDf.groupByDynamic("t", {
        every: 100,
        period: 10,
        startBy: "datapoint",
        includeBoundaries: true
    }).agg($df.col("val").sum().alias("sum"));
    // Underlapping windows anchored to first datapoint (10):
    // Window [10, 20) captures 10 and 12 -> 3
    // Then steps of 100 until 1_000_010 (which is 10 + 10,000 * 100) -> captures 1_000_010 and 1_000_014 -> 7
    if (underlapGapRes.height !== 2) {
        throw new Error(`Underlapping window with startBy datapoint across gap: expected 2 rows, got ${underlapGapRes.height}`);
    }
    const underlapGapRows = underlapGapRes.toDicts() as any[];
    if (underlapGapRows[0].sum !== 3 || underlapGapRows[1].sum !== 7) {
        throw new Error(`Underlapping gap aggregation sums mismatch: ${JSON.stringify(underlapGapRows)}`);
    }

    // 66. Complex secondary grouping where secondary columns contain nulls, symbols, and booleans
    const complexByDf = new DataFrame([
        { flag: true, sym: null, time: 10, val: 1 },
        { flag: true, sym: null, time: 15, val: 2 },
        { flag: false, sym: "USD", time: 10, val: 3 },
        { flag: null, sym: "EUR", time: 20, val: 4 },
    ]);
    const complexByRes = complexByDf.groupByDynamic("time", {
        every: 10,
        by: ["flag", "sym"],
        checkSorted: false
    }).agg($df.col("val").sum().alias("sum"));
    if (complexByRes.height !== 3) {
        throw new Error(`Complex secondary grouping with nulls/booleans expected 3 rows, got ${complexByRes.height}`);
    }
    const complexByRows = complexByRes.toDicts() as any[];
    const nullSymRow = complexByRows.find(r => r.flag === true && r.sym === null);
    if (!nullSymRow || nullSymRow.sum !== 3) {
        throw new Error(`Complex secondary group with null sym failed: ${JSON.stringify(nullSymRow)}`);
    }

    // 67. Floating-point non-integer offsets combined with label: "right" and closed: "none"
    const floatOffsetDf = new DataFrame([
        { t: 1.25, v: 10 },
        { t: 2.75, v: 20 },
        { t: 3.50, v: 30 },
    ]);
    const floatOffsetRes = floatOffsetDf.groupByDynamic("t", {
        every: 1.5,
        period: 1.5,
        offset: 0.25,
        closed: "none",
        label: "right",
        includeBoundaries: true
    }).agg($df.col("v").sum().alias("sum"));
    // Aligns to (val - 0.25) / 1.5. FirstWindow: (1.25 - 0.25)/1.5 = 1/1.5 -> floor is 0 -> start = 0.25, end = 1.75
    // Interval (0.25, 1.75) strictly open captures t=1.25 (v=10). Label "right" is end (1.75).
    const floatOffsetRows = floatOffsetRes.toDicts() as any[];
    if (floatOffsetRows.length === 0 || Math.abs(floatOffsetRows[0].t - 1.75) > 1e-9 || floatOffsetRows[0].sum !== 10) {
        throw new Error(`Float offset with label right failed: ${JSON.stringify(floatOffsetRows)}`);
    }

    // 68. Unsorted validation on non-contiguous partition blocks (checkSorted: true throws on unsorted within partition)
    const partUnsortedDf = new DataFrame([
        { cat: "A", t: 10, v: 1 },
        { cat: "B", t: 50, v: 2 },
        { cat: "A", t: 5, v: 3 }, // Out of order inside partition "A"!
        { cat: "B", t: 60, v: 4 }
    ]);
    let caughtPartUnsorted = false;
    try {
        partUnsortedDf.groupByDynamic("t", { every: 10, by: "cat", checkSorted: true }).agg($df.col("v").sum());
    } catch {
        caughtPartUnsorted = true;
    }
    if (!caughtPartUnsorted) {
        throw new Error("Partition-level unsorted index column must throw DataFrameError");
    }

    // 69. Edge case: byKeys containing indexColName throws InvalidArgumentError
    const overlapByDf = new DataFrame([
        { t: 10, v: 100 },
        { t: 20, v: 200 }
    ]);
    let caughtOverlap = false;
    try {
        overlapByDf.groupByDynamic("t", { every: 10, by: ["t"] }).agg($df.col("v").sum());
    } catch {
        caughtOverlap = true;
    }
    if (!caughtOverlap) {
        throw new Error("Expected groupByDynamic to throw when index column is included in byKeys");
    }

    // 70. Empty DataFrame (height 0)
    const zeroRowDf = new DataFrame({ t: [], v: [] });
    const zeroRowRes = zeroRowDf.groupByDynamic("t", { every: 10 }).agg($df.col("v").sum());
    if (zeroRowRes.height !== 0) {
        throw new Error(`Expected empty result on height 0 DataFrame, got height ${zeroRowRes.height}`);
    }

    // 71. Sparse jump on large negative epoch timestamps (fast forward across negative gap)
    const negSparseDf = new DataFrame([
        { time: -1_000_000_000, val: 1 },
        { time: -100, val: 2 }
    ]);
    const negStart = Date.now();
    const negSparseRes = negSparseDf.groupByDynamic("time", { every: 10, period: 10 }).agg(
        $df.col("val").sum().alias("sum")
    );
    if (Date.now() - negStart > 500) {
        throw new Error("Negative timestamp sparse gap failed to fast-forward (infinite or slow loop)!");
    }
    if (negSparseRes.height !== 2) {
        throw new Error(`Expected height 2, got ${negSparseRes.height}`);
    }

    // 72. Large negative offset (|offset| > every)
    const largeNegOffsetDf = new DataFrame([
        { time: 100, val: 1 },
        { time: 105, val: 2 },
    ]);
    const largeNegRes = largeNegOffsetDf.groupByDynamic("time", {
        every: 10,
        period: 10,
        offset: -25, // offset is -2.5 * every
        includeBoundaries: true
    }).agg($df.col("val").sum().alias("sum"));
    const largeNegRows = largeNegRes.toDicts() as any[];
    if (largeNegRes.height !== 2 || largeNegRows[0]._lower_boundary !== 95) {
        throw new Error(`Large negative offset failed: ${JSON.stringify(largeNegRows)}`);
    }

    // 73. IEEE 754 precision boundary on closed="right"
    const floatBoundDf = new DataFrame([
        { time: 0.30000000000000004, val: 42 }, // common float imprecision of 0.1 * 3
        { time: 0.4, val: 84 }
    ]);
    const floatBoundRes = floatBoundDf.groupByDynamic("time", {
        every: 0.1,
        period: 0.1,
        closed: "right"
    }).agg($df.col("val").sum().alias("sum"));
    const floatBoundRows = floatBoundRes.toDicts() as any[];
    const totalPoints = floatBoundRows.reduce((acc, r) => acc + (r.sum > 0 ? 1 : 0), 0);
    if (totalPoints !== 2) {
        throw new Error(`Float precision boundary omitted point in closed="right": ${JSON.stringify(floatBoundRows)}`);
    }

    // 74. Invalid enum option values must throw InvalidArgumentError
    const invalidOptions = [
        { closed: "center" },
        { label: "middle" },
        { startBy: "random_choice" }
    ];
    for (const opt of invalidOptions) {
        let threw = false;
        try {
            df1.groupByDynamic("time", { every: 10, ...(opt as any) });
        } catch {
            threw = true;
        }
        if (!threw) {
            throw new Error(`Expected error for invalid option: ${JSON.stringify(opt)}`);
        }
    }

    // 75. Composite partition keys collision resistance (prevent delimiter collision e.g. "a_b" vs "a" + "b")
    const collisionDf = new DataFrame([
        { a: "1", b: "2", time: 10, val: 10 },
        { a: "1_2", b: "", time: 10, val: 20 },
        { a: "x_y", b: "z", time: 10, val: 30 },
        { a: "x", b: "y_z", time: 10, val: 40 },
    ]);
    const colRes = collisionDf.groupByDynamic("time", { every: 10, by: ["a", "b"] }).agg(
        $df.col("val").sum().alias("sum")
    );
    if (colRes.height !== 4) {
        throw new Error(`Composite keys collided in partition map! Expected 4 distinct groups, got ${colRes.height}`);
    }

    // 76. Calendar duration units handling
    const calDf = new DataFrame([
        { dt: new Date("2024-01-15T00:00:00Z"), val: 1 },
        { dt: new Date("2024-02-15T00:00:00Z"), val: 2 },
        { dt: new Date("2024-03-15T00:00:00Z"), val: 3 },
    ]);
    const calRes = calDf.groupByDynamic("dt", { every: "1mo" }).agg($df.col("val").sum());
    if (calRes.height < 1) {
        throw new Error(`Month interval grouping produced empty output: ${calRes.height}`);
    }

    // 77. Entire index column is null / NaN
    const allNullDf = new DataFrame([
        { time: null, val: 1 },
        { time: NaN, val: 2 },
        { time: undefined, val: 3 }
    ]);
    const allNullRes = allNullDf.groupByDynamic("time", { every: 10, checkSorted: false }).agg(
        $df.col("val").sum().alias("sum")
    );
    if (allNullRes.height !== 0) {
        throw new Error(`Expected height 0 when entire index is null/NaN, got ${allNullRes.height}`);
    }

    // 78. Negative string offset support (e.g. offset: "-2h")
    const negStrOffsetDf = new DataFrame([
        { dt: new Date("2024-01-01T00:00:00Z"), val: 10 },
        { dt: new Date("2024-01-01T22:00:00Z"), val: 20 },
    ]);
    const negStrOffsetRes = negStrOffsetDf.groupByDynamic("dt", { every: "1d", offset: "-2h", includeBoundaries: true }).agg(
        $df.col("val").sum().alias("sum")
    );
    const negRows = negStrOffsetRes.toDicts() as any[];
    if (negRows[0]._lower_boundary.toISOString() !== "2023-12-31T22:00:00.000Z") {
        throw new Error(`Negative offset failed: got lower boundary ${negRows[0]._lower_boundary.toISOString()}`);
    }

    // 79. Day of week startBy alignment test
    const dowDf = new DataFrame([
        { dt: new Date("2024-01-03T12:00:00Z"), val: 10 }, // Wednesday
        { dt: new Date("2024-01-08T12:00:00Z"), val: 20 }, // Monday next week
    ]);
    const dowRes = dowDf.groupByDynamic("dt", { every: "1w", startBy: "monday", includeBoundaries: true }).agg(
        $df.col("val").sum().alias("sum")
    );
    const dowRows = dowRes.toDicts() as any[];
    if (dowRows[0]._lower_boundary.toISOString() !== "2024-01-01T00:00:00.000Z") {
        throw new Error(`startBy monday alignment failed: got ${dowRows[0]._lower_boundary.toISOString()}`);
    }

    // 80. Unsorted data when checkSorted: false automatically sorts partition indices correctly
    const unsortedDf = new DataFrame([
        { time: 30, val: 3 },
        { time: 10, val: 1 },
        { time: 20, val: 2 },
    ]);
    const unsortedRes = unsortedDf.groupByDynamic("time", { every: 10, checkSorted: false }).agg(
        $df.col("val").sum().alias("sum")
    );
    const unsortedRows = unsortedRes.toDicts() as any[];
    if (unsortedRes.height !== 3 || unsortedRows[0].time !== 10 || unsortedRows[0].sum !== 1 || unsortedRows[2].time !== 30 || unsortedRows[2].sum !== 3) {
        throw new Error(`Unsorted data with checkSorted:false failed: ${JSON.stringify(unsortedRows)}`);
    }

    // 81. Index column containing Infinity and -Infinity
    const infDf = new DataFrame([
        { time: -Infinity, val: 1 },
        { time: 10, val: 2 },
        { time: Infinity, val: 3 }
    ]);
    const infRes = infDf.groupByDynamic("time", { every: 10, checkSorted: false }).agg(
        $df.col("val").sum().alias("sum")
    );
    const infRows = infRes.toDicts() as any[];
    if (infRes.height !== 1 || infRows[0].sum !== 2 || infRows[0].time !== 10) {
        throw new Error(`Infinity in index column failed: ${JSON.stringify(infRows)}`);
    }

    // 82. Sparse window jump with startBy: "datapoint"
    const sparseDatapointDf = new DataFrame([
        { time: 5, val: 10 },
        { time: 1005, val: 20 }
    ]);
    const sparseRes = sparseDatapointDf.groupByDynamic("time", { every: 10, startBy: "datapoint" }).agg(
        $df.col("val").sum().alias("sum")
    );
    const sparseRows = sparseRes.toDicts() as any[];
    if (sparseRes.height !== 2 || sparseRows[0].time !== 5 || sparseRows[1].time !== 1005) {
        throw new Error(`Sparse startBy: "datapoint" jump failed: ${JSON.stringify(sparseRows)}`);
    }

    // =========================================================================
    // Category 1: Mathematical & Loop Pathology Edge Cases
    // =========================================================================

    // 83. Negative Sparse Gap Loop Freeze: fast forward jump across huge negative ranges
    const negSparseFreezeDf = new DataFrame([
        { time: -1_000_000_000, val: 1 },
        { time: -50, val: 2 }
    ]);
    const negSparseFreezeRes = negSparseFreezeDf.groupByDynamic("time", { every: 10, period: 10 }).agg(
        $df.col("val").sum().alias("sum")
    );
    const negSparseFreezeRows = negSparseFreezeRes.toDicts() as any[];
    if (negSparseFreezeRes.height !== 2 || negSparseFreezeRows[0].sum !== 1 || negSparseFreezeRows[1].sum !== 2) {
        throw new Error(`Negative sparse gap loop failed: ${JSON.stringify(negSparseFreezeRows)}`);
    }

    // 84. Period Larger Than Gap in Sparse Data (overlapping trailing windows across sparse gap)
    const largePeriodDf = new DataFrame([
        { time: 10, val: 100 },
        { time: 1000, val: 200 }
    ]);
    const largePeriodRes = largePeriodDf.groupByDynamic("time", { every: 10, period: 30 }).agg(
        $df.col("val").sum().alias("sum")
    );
    if (largePeriodRes.height < 4) {
        throw new Error(`Period larger than gap failed to synthesize overlapping windows: ${largePeriodRes.height}`);
    }

    // 85. Underlapping Skipping Windows Across Sparse Gaps (period < every)
    const underlapSkipDf = new DataFrame([
        { time: 0, val: 1 },
        { time: 5000, val: 2 }
    ]);
    const underlapSkipRes = underlapSkipDf.groupByDynamic("time", { every: 1000, period: 10 }).agg(
        $df.col("val").sum().alias("sum")
    );
    const underlapSkipRows = underlapSkipRes.toDicts() as any[];
    if (underlapSkipRes.height !== 2 || underlapSkipRows[0].sum !== 1 || underlapSkipRows[1].sum !== 2) {
        throw new Error(`Underlapping skipping windows failed: ${JSON.stringify(underlapSkipRows)}`);
    }

    // 86. Zero-Width / Sub-Epsilon Step Degeneracy Guard
    let threwZeroWidth = false;
    try {
        negSparseFreezeDf.groupByDynamic("time", { every: 1e-16 });
    } catch {
        threwZeroWidth = true;
    }
    if (!threwZeroWidth) throw new Error("Failed to guard zero-width / sub-epsilon step degeneracy");

    // =========================================================================
    // Category 2: Boundary Precision & IEEE-754 Tolerance
    // =========================================================================

    // 87. Epsilon Boundary Inclusion on closed: "right" (e.g. 0.30000000000000004 with every: 0.1)
    const floatBoundPrecDf = new DataFrame([
        { time: 0.1, val: 1 },
        { time: 0.2, val: 2 },
        { time: 0.30000000000000004, val: 3 }
    ]);
    const floatBoundPrecRes = floatBoundPrecDf.groupByDynamic("time", { every: 0.1, closed: "right" }).agg(
        $df.col("val").sum().alias("sum")
    );
    if (floatBoundPrecRes.height < 3) {
        throw new Error(`Float boundary closed: right failed: height=${floatBoundPrecRes.height}`);
    }

    // 88. Epsilon Boundary Inclusion on closed: "left" (timestamp on windowEnd - 1e-15)
    const epsLeftDf = new DataFrame([
        { time: 10 - 1e-15, val: 5 }
    ]);
    const epsLeftRes = epsLeftDf.groupByDynamic("time", { every: 10, closed: "left" }).agg(
        $df.col("val").sum().alias("sum")
    );
    if (epsLeftRes.height !== 1) {
        throw new Error(`Epsilon boundary closed: left failed: height=${epsLeftRes.height}`);
    }

    // 89. Large Negative Offsets Exceeding Interval (|offset| > every, e.g. offset: -35, every: 10)
    const largeNegStepOffsetDf = new DataFrame([
        { time: 0, val: 10 },
        { time: 10, val: 20 }
    ]);
    const largeNegStepOffsetRes = largeNegStepOffsetDf.groupByDynamic("time", { every: 10, offset: -35 }).agg(
        $df.col("val").sum().alias("sum")
    );
    if (largeNegStepOffsetRes.height !== 2) {
        throw new Error(`Large negative offset failed: height=${largeNegStepOffsetRes.height}`);
    }

    // 90. Exact Multiples on Pre-Epoch Timestamps (-100 with every: 10 under closed: "right" vs "left")
    const preEpochDf = new DataFrame([
        { time: -100, val: 42 }
    ]);
    const preEpochRight = preEpochDf.groupByDynamic("time", { every: 10, closed: "right" }).agg(
        $df.col("val").sum().alias("sum")
    );
    const preEpochLeft = preEpochDf.groupByDynamic("time", { every: 10, closed: "left" }).agg(
        $df.col("val").sum().alias("sum")
    );
    if (preEpochRight.height !== 1 || preEpochLeft.height !== 1) {
        throw new Error("Pre-epoch exact multiple boundary test failed");
    }

    // =========================================================================
    // Category 4: Partition Key & Collation Edge Cases
    // =========================================================================

    // 91. Partition Map Key Collision (type-safe composite key hashing in buildGroupMap)
    const partCollDf = new DataFrame([
        { a: "1", b: 2, time: 10, val: 1 },
        { a: 1, b: "2", time: 10, val: 2 }
    ], {
        a: $df.Object,
        b: $df.Object,
        time: $df.Int32,
        val: $df.Int32
    });
    const partCollRes = partCollDf.groupByDynamic("time", { every: 10, by: ["a", "b"] }).agg(
        $df.col("val").sum().alias("sum")
    );
    if (partCollRes.height !== 2) {
        throw new Error(`Partition key collision test failed: expected 2 groups, got ${partCollRes.height}`);
    }

    // 92. Null / Boolean / String Mix in Secondary Keys
    const mixSecDf = new DataFrame([
        { cat: null, time: 10, val: 1 },
        { cat: false, time: 10, val: 2 },
        { cat: "", time: 10, val: 3 }
    ], {
        cat: $df.Object,
        time: $df.Int32,
        val: $df.Int32
    });
    const mixSecRes = mixSecDf.groupByDynamic("time", { every: 10, by: "cat" }).agg(
        $df.col("val").sum().alias("sum")
    );
    if (mixSecRes.height !== 3) {
        throw new Error(`Secondary key null/boolean/empty isolation failed: expected 3, got ${mixSecRes.height}`);
    }

    // 93. All-Null Partition Alongside Valid Partitions
    const halfNullDf = new DataFrame([
        { group: "A", time: null, val: 1 },
        { group: "A", time: NaN, val: 2 },
        { group: "B", time: 10, val: 3 },
        { group: "B", time: 20, val: 4 }
    ]);
    const halfNullRes = halfNullDf.groupByDynamic("time", { every: 10, by: "group", checkSorted: false }).agg(
        $df.col("val").sum().alias("sum")
    );
    if (halfNullRes.height !== 2) {
        throw new Error(`All-null partition alongside valid partition failed: expected 2, got ${halfNullRes.height}`);
    }

    // 94. Secondary Key Sharing Name with Index Column throws InvalidArgumentError
    let threwSecondaryKeySharing = false;
    try {
        preEpochDf.groupByDynamic("time", { every: 10, by: "time" as any });
    } catch {
        threwSecondaryKeySharing = true;
    }
    if (!threwSecondaryKeySharing) throw new Error("Failed to throw when secondary key shares name with index column");

    // =========================================================================
    // Category 5: Schema & Metadata Integrity
    // =========================================================================

    // 95. 100% Missing Index Column returns 0 height with schema preserved
    const missingIndexDf = new DataFrame([
        { time: null, val: 1 },
        { time: NaN, val: 2 }
    ]);
    const missingIndexRes = missingIndexDf.groupByDynamic("time", { every: 10, checkSorted: false }).agg(
        $df.col("val").sum().alias("sum")
    );
    if (missingIndexRes.height !== 0) {
        throw new Error(`100% missing index must produce 0 height, got ${missingIndexRes.height}`);
    }

    // 96. Datetime Sniffing with Leading Nulls
    const leadingNullDateDf = new DataFrame([
        { dt: null, val: 1 },
        { dt: undefined, val: 2 },
        { dt: new Date("2024-01-01T00:00:00Z"), val: 3 },
        { dt: new Date("2024-01-02T00:00:00Z"), val: 4 }
    ]);
    const leadingNullDateRes = leadingNullDateDf.groupByDynamic("dt", { every: "1d", includeBoundaries: true }).agg(
        $df.col("val").sum().alias("sum")
    );
    const leadingNullRows = leadingNullDateRes.toDicts() as any[];
    if (leadingNullDateRes.height !== 2 || !(leadingNullRows[0]._lower_boundary instanceof Date)) {
        throw new Error(`Datetime sniffing with leading nulls failed: ${JSON.stringify(leadingNullRows)}`);
    }

    // 97. Option Enum Strict Validation (closed, label, startBy)
    let threwInvalidClosed = false;
    try {
        missingIndexDf.groupByDynamic("time", { every: 10, closed: "center" as any });
    } catch {
        threwInvalidClosed = true;
    }
    if (!threwInvalidClosed) throw new Error("Failed to reject invalid closed enum 'center'");

    let threwInvalidLabel = false;
    try {
        missingIndexDf.groupByDynamic("time", { every: 10, label: "middle" as any });
    } catch {
        threwInvalidLabel = true;
    }
    if (!threwInvalidLabel) throw new Error("Failed to reject invalid label enum 'middle'");

    let threwInvalidStartBy = false;
    try {
        missingIndexDf.groupByDynamic("time", { every: 10, startBy: "epoch" as any });
    } catch {
        threwInvalidStartBy = true;
    }
    if (!threwInvalidStartBy) throw new Error("Failed to reject invalid startBy enum 'epoch'");

    // 98. Index Unit 'i' in Integer Axis Windowing
    const dfIndexSteps = new DataFrame([
        { idx: 0, val: 10 },
        { idx: 5, val: 20 },
        { idx: 10, val: 30 },
        { idx: 15, val: 40 },
        { idx: 20, val: 50 },
    ]);
    const resIndexSteps = dfIndexSteps.groupByDynamic("idx", { every: "10i", period: "10i" }).agg(
        $df.col("val").sum().alias("sum")
    );
    const indexRows = resIndexSteps.toDicts() as any[];
    if (resIndexSteps.height !== 3 || indexRows[0].sum !== 30 || indexRows[1].sum !== 70 || indexRows[2].sum !== 50) {
        throw new Error(`Index unit 'i' windowing failed: ${JSON.stringify(indexRows)}`);
    }

    // 99. Calendar Month String Grouping
    const dfMonthly = new DataFrame([
        { dt: new Date("2023-01-15T00:00:00Z"), val: 100 },
        { dt: new Date("2023-01-20T00:00:00Z"), val: 200 },
        { dt: new Date("2023-02-15T00:00:00Z"), val: 300 },
    ]);
    const resMonthly = dfMonthly.groupByDynamic("dt", { every: "1mo", period: "1mo", startBy: "datapoint" }).agg(
        $df.col("val").sum().alias("sum")
    );
    if (resMonthly.height !== 2) {
        throw new Error(`Monthly dynamic grouping failed: expected 2, got ${resMonthly.height}`);
    }

    // 100. Calendar Month Stepping Across Leap Year February (startBy: 'window')
    const dfLeap = new DataFrame([
        { dt: new Date("2024-01-10T00:00:00Z"), val: 1 },
        { dt: new Date("2024-02-10T00:00:00Z"), val: 2 },
        { dt: new Date("2024-03-10T00:00:00Z"), val: 3 },
    ]);
    const resLeap = dfLeap.groupByDynamic("dt", { every: "1mo", period: "1mo", includeBoundaries: true }).agg(
        $df.col("val").sum().alias("sum")
    );
    const calLeapRows = resLeap.toDicts() as any[];
    if (resLeap.height !== 3) {
        throw new Error(`Leap year monthly dynamic grouping failed: expected 3, got ${resLeap.height}`);
    }
    // Window boundaries: 2024-01-01 to 2024-02-01, 2024-02-01 to 2024-03-01, 2024-03-01 to 2024-04-01
    const febStart = new Date(calLeapRows[1]._lower_boundary).toISOString();
    const febEnd = new Date(calLeapRows[1]._upper_boundary).toISOString();
    if (febStart !== "2024-02-01T00:00:00.000Z" || febEnd !== "2024-03-01T00:00:00.000Z") {
        throw new Error(`Calendar boundary mismatch for leap Feb: [${febStart}, ${febEnd}]`);
    }

    // 101. Multi-month Calendar Grouping ("1q" = 3mo, "1y" = 12mo)
    const dfQuarterly = new DataFrame([
        { dt: new Date("2023-01-15T00:00:00Z"), val: 10 },
        { dt: new Date("2023-02-15T00:00:00Z"), val: 20 },
        { dt: new Date("2023-03-15T00:00:00Z"), val: 30 },
        { dt: new Date("2023-04-15T00:00:00Z"), val: 40 },
        { dt: new Date("2023-05-15T00:00:00Z"), val: 50 },
    ]);
    const resQuarterly = dfQuarterly.groupByDynamic("dt", { every: "1q", period: "1q", includeBoundaries: true }).agg(
        $df.col("val").sum().alias("sum")
    );
    if (resQuarterly.height !== 2) {
        throw new Error(`Quarterly dynamic grouping failed: expected 2, got ${resQuarterly.height}`);
    }
    const qRows = resQuarterly.toDicts() as any[];
    if (qRows[0].sum !== 60 || qRows[1].sum !== 90) {
        throw new Error(`Quarterly aggregation sums mismatch: ${JSON.stringify(qRows)}`);
    }

    // 102. Overlapping Calendar Windows (period > every, e.g. every: "1mo", period: "2mo")
    const resOverlappingCal = dfQuarterly.groupByDynamic("dt", { every: "1mo", period: "2mo" }).agg(
        $df.col("val").sum().alias("sum")
    );
    const overlapCalRows = resOverlappingCal.toDicts() as any[];
    // Jan+Feb=30, Feb+Mar=50, Mar+Apr=70, Apr+May=90, May=50
    if (overlapCalRows.length !== 5 || overlapCalRows[0].sum !== 30 || overlapCalRows[1].sum !== 50 || overlapCalRows[2].sum !== 70) {
        throw new Error(`Overlapping calendar grouping failed: ${JSON.stringify(overlapCalRows)}`);
    }

    // 103. Calendar Dynamic with Secondary Partition Grouping (by / groupBy)
    const dfPartitionedCal = new DataFrame([
        { dt: new Date("2023-01-10T00:00:00Z"), dept: "sales", val: 100 },
        { dt: new Date("2023-01-20T00:00:00Z"), dept: "eng", val: 200 },
        { dt: new Date("2023-02-10T00:00:00Z"), dept: "sales", val: 300 },
        { dt: new Date("2023-02-20T00:00:00Z"), dept: "eng", val: 400 },
    ]);
    const resPartCal = dfPartitionedCal.groupByDynamic("dt", { every: "1mo", period: "1mo", by: "dept" }).agg(
        $df.col("val").sum().alias("dept_sum")
    );
    if (resPartCal.height !== 4) {
        throw new Error(`Partitioned calendar grouping failed: expected 4, got ${resPartCal.height}`);
    }

    // 104. Calendar Dynamic with label: "right" and label: "datapoint"
    const resCalLabelRight = dfQuarterly.groupByDynamic("dt", { every: "1mo", period: "1mo", label: "right" }).agg(
        $df.col("val").count().alias("cnt")
    );
    const rightRows = resCalLabelRight.toDicts() as any[];
    if (new Date(rightRows[0].dt).toISOString() !== "2023-02-01T00:00:00.000Z") {
        throw new Error(`Calendar label: 'right' failed: expected 2023-02-01, got ${new Date(rightRows[0].dt).toISOString()}`);
    }

    // 105. Calendar Dynamic with closed: "right"
    const dfClosedRight = new DataFrame([
        { dt: new Date("2023-01-01T00:00:00Z"), val: 1 },
        { dt: new Date("2023-01-31T23:59:59.999Z"), val: 2 },
        { dt: new Date("2023-02-01T00:00:00.000Z"), val: 3 }
    ]);
    const resClosedRight = dfClosedRight.groupByDynamic("dt", { every: "1mo", period: "1mo", closed: "right" }).agg(
        $df.col("val").sum().alias("sum")
    );
    const closedRows = resClosedRight.toDicts() as any[];
    // Window (2023-01-01, 2023-02-01] includes val 2 and 3
    if (closedRows.length < 1 || closedRows[0].sum !== 5) {
        throw new Error(`Calendar closed: 'right' failed: ${JSON.stringify(closedRows)}`);
    }

    // 106. Calendar Dynamic Multi-year Grouping ("2y" = 24mo)
    const dfMultiYear = new DataFrame([
        { dt: new Date("2020-05-15T00:00:00Z"), val: 10 },
        { dt: new Date("2021-06-15T00:00:00Z"), val: 20 },
        { dt: new Date("2022-07-15T00:00:00Z"), val: 30 },
        { dt: new Date("2023-08-15T00:00:00Z"), val: 40 }
    ]);
    const resMultiYear = dfMultiYear.groupByDynamic("dt", { every: "2y", period: "2y", includeBoundaries: true }).agg(
        $df.col("val").sum().alias("sum")
    );
    const myRows = resMultiYear.toDicts() as any[];
    if (resMultiYear.height !== 2 || myRows[0].sum !== 30 || myRows[1].sum !== 70) {
        throw new Error(`Multi-year dynamic grouping failed: ${JSON.stringify(myRows)}`);
    }

    // 107. Fractional Unit Duration Strings ("1.5s", "0.5m", "2.5h")
    const dfFractional = new DataFrame([
        { dt: new Date("2024-01-01T00:00:00.000Z"), val: 1 },
        { dt: new Date("2024-01-01T00:00:01.200Z"), val: 2 },
        { dt: new Date("2024-01-01T00:00:01.800Z"), val: 3 },
        { dt: new Date("2024-01-01T00:00:03.100Z"), val: 4 }
    ]);
    const resFractional = dfFractional.groupByDynamic("dt", { every: "1.5s", period: "1.5s", includeBoundaries: true }).agg(
        $df.col("val").sum().alias("sum")
    );
    const fracRows = resFractional.toDicts() as any[];
    // [0, 1500ms): 1 + 2 = 3; [1500ms, 3000ms): 3; [3000ms, 4500ms): 4
    if (resFractional.height !== 3 || fracRows[0].sum !== 3 || fracRows[1].sum !== 3 || fracRows[2].sum !== 4) {
        throw new Error(`Fractional unit duration grouping failed: ${JSON.stringify(fracRows)}`);
    }

    // 108. Microsecond / Micro Sign ("µs", "μs") Duration Support
    const dfMicro = new DataFrame([
        { dt: new Date("2024-01-01T00:00:00.000Z"), val: 10 },
        { dt: new Date("2024-01-01T00:00:00.010Z"), val: 20 },
        { dt: new Date("2024-01-01T00:00:00.025Z"), val: 30 }
    ]);
    // 10000us = 10ms
    const resMicro = dfMicro.groupByDynamic("dt", { every: "10000us", period: "10000us" }).agg(
        $df.col("val").sum().alias("sum")
    );
    const microSecRows = resMicro.toDicts() as any[];
    if (resMicro.height !== 3 || microSecRows[0].sum !== 10 || microSecRows[1].sum !== 20 || microSecRows[2].sum !== 30) {
        throw new Error(`Microsecond duration grouping failed: ${JSON.stringify(microSecRows)}`);
    }

    // 109. ColumnExpr as indexColumn selector ($df.col("dt"))
    const resExprIndex = dfMultiYear.groupByDynamic($df.col("dt"), { every: "2y" }).agg(
        $df.col("val").sum().alias("sum")
    );
    if (resExprIndex.height !== 2) {
        throw new Error(`ColumnExpr as indexColumn failed: height ${resExprIndex.height}`);
    }

    // 110. Array of Secondary Keys with Duplicates (deduplication check)
    const dfDupKeys = new DataFrame([
        { region: "US", time: 10, val: 1 },
        { region: "US", time: 15, val: 2 },
        { region: "EU", time: 10, val: 3 }
    ]);
    const resDupKeys = dfDupKeys.groupByDynamic("time", { every: 10, by: ["region", "region"] as any }).agg(
        $df.col("val").sum().alias("sum")
    );
    if (resDupKeys.height !== 2 || resDupKeys.columns.filter(c => c === "region").length !== 1) {
        throw new Error(`Duplicate secondary keys handling failed: ${JSON.stringify(resDupKeys.toDicts())}`);
    }

    // 111. All Points Excluded with closed: "none" when every datapoint lands exactly on boundaries
    const dfExactBounds = new DataFrame([
        { time: 10, val: 1 },
        { time: 20, val: 2 },
        { time: 30, val: 3 }
    ]);
    const resExactBounds = dfExactBounds.groupByDynamic("time", { every: 10, period: 10, closed: "none" }).agg(
        $df.col("val").sum().alias("sum")
    );
    // (10, 20), (20, 30): both strictly open, empty interior!
    if (resExactBounds.height !== 0) {
        throw new Error(`closed: "none" exact bounds failed: expected 0 rows, got ${resExactBounds.height}`);
    }

    // 112. Negative and Pre-1970 UTC Dates with Calendar Month Grouping
    const dfPre1970 = new DataFrame([
        { dt: new Date("1960-01-15T00:00:00Z"), val: 100 },
        { dt: new Date("1960-01-25T00:00:00Z"), val: 200 },
        { dt: new Date("1960-02-10T00:00:00Z"), val: 300 }
    ]);
    const resPre1970 = dfPre1970.groupByDynamic("dt", { every: "1mo", period: "1mo", includeBoundaries: true }).agg(
        $df.col("val").sum().alias("sum")
    );
    const preRows = resPre1970.toDicts() as any[];
    if (resPre1970.height !== 2 || preRows[0].sum !== 300 || preRows[1].sum !== 300) {
        throw new Error(`Pre-1970 calendar dynamic grouping failed: ${JSON.stringify(preRows)}`);
    }

    // 113. Calendar Sparse Multi-decade Gap Correctness
    const dfCalGap = new DataFrame([
        { dt: new Date("1980-01-15T00:00:00Z"), val: 10 },
        { dt: new Date("2024-01-15T00:00:00Z"), val: 20 }
    ]);
    const resCalGap = dfCalGap.groupByDynamic("dt", { every: "1mo", period: "1mo" }).agg(
        $df.col("val").sum().alias("sum")
    );
    if (resCalGap.height !== 2) {
        throw new Error(`Calendar sparse gap height mismatch: expected 2, got ${resCalGap.height}`);
    }
    const calGapRows = resCalGap.toDicts() as any[];
    if (calGapRows[0].sum !== 10 || calGapRows[1].sum !== 20) {
        throw new Error(`Calendar sparse gap sums mismatch: ${JSON.stringify(calGapRows)}`);
    }

    // 114. Empty DataFrame with includeBoundaries and secondary by keys
    const dfEmpty = new DataFrame<{ grp: string; time: number; val: number }>({
        grp: [],
        time: [],
        val: []
    });
    const resEmpty = dfEmpty.groupByDynamic("time", { every: 10, by: ["grp"], includeBoundaries: true }).agg(
        $df.col("val").sum().alias("sum")
    );
    if (resEmpty.height !== 0) {
        throw new Error(`Empty DataFrame groupByDynamic failed: expected height 0, got ${resEmpty.height}`);
    }
    const emptyCols = resEmpty.columns;
    if (!emptyCols.includes("grp") || !emptyCols.includes("time") || !emptyCols.includes("_lower_boundary") || !emptyCols.includes("_upper_boundary")) {
        throw new Error(`Empty DataFrame missing expected boundary or grouping columns: ${emptyCols.join(", ")}`);
    }

    // 115. All NaN / null in index column
    const dfAllNaN = new DataFrame([
        { time: null as any, val: 1 },
        { time: undefined as any, val: 2 },
        { time: "not_a_date" as any, val: 3 }
    ]);
    const resAllNaN = dfAllNaN.groupByDynamic("time", { every: 10 }).agg(
        $df.col("val").sum().alias("sum")
    );
    if (resAllNaN.height !== 0) {
        throw new Error(`All-null/NaN index column should yield 0 groups, got ${resAllNaN.height}`);
    }

    // 116. Single-row DataFrame with window skipping logic
    const dfSingle = new DataFrame([
        { time: 50, val: 999 }
    ]);
    const resSingle = dfSingle.groupByDynamic("time", { every: 10, period: 10, includeBoundaries: true }).agg(
        $df.col("val").sum().alias("sum")
    );
    if (resSingle.height !== 1) {
        throw new Error(`Single row DataFrame groupByDynamic expected height 1, got ${resSingle.height}`);
    }
    const singleRow = resSingle.toDicts()[0] as any;
    if (singleRow.sum !== 999 || singleRow._lower_boundary !== 50 || singleRow._upper_boundary !== 60) {
        throw new Error(`Single row row values mismatch: ${JSON.stringify(singleRow)}`);
    }

    // 117. Case-insensitive startBy Day of Week
    const dfDays = new DataFrame([
        { date: new Date("2024-01-01T12:00:00Z"), val: 10 }, // Monday
        { date: new Date("2024-01-02T12:00:00Z"), val: 20 }, // Tuesday
        { date: new Date("2024-01-08T12:00:00Z"), val: 30 }  // Next Monday
    ]);
    const resMixedCase = dfDays.groupByDynamic("date", { every: "1w", period: "1w", startBy: "MonDay" as any }).agg(
        $df.col("val").sum().alias("sum")
    );
    if (resMixedCase.height !== 2) {
        throw new Error(`Mixed-case startBy day of week expected height 2, got ${resMixedCase.height}`);
    }

    // 118. Fractional floating point steps with offset
    const dfFloat = new DataFrame([
        { x: 0.25, val: 1 },
        { x: 0.75, val: 2 },
        { x: 1.25, val: 3 }
    ]);
    const resFloat = dfFloat.groupByDynamic("x", { every: 0.5, period: 0.5, offset: 0.25 }).agg(
        $df.col("val").sum().alias("sum")
    );
    if (resFloat.height !== 3) {
        throw new Error(`Fractional floating point step groupByDynamic failed: expected height 3, got ${resFloat.height}`);
    }

    console.log("✓ All 118 hardened DataFrame groupByDynamic edge cases passed successfully!");
} catch (e: any) {
    console.error(`❌ DataFrame groupByDynamic test failed: ${e.message}`);
    process.exit(1);
}