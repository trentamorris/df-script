import type { DataFrame, GroupedData, RowRecord } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";
import { $df } from "df-script";

interface TimeRow {
    ts: Date;
    group: string;
    val: number;
}

declare const df: DataFrame<TimeRow>;

// 1. groupByDynamic returns GroupedData<TimeRow, "ts">
const grouped = df.groupByDynamic("ts", { every: "1d" });
export type _Test1_GroupedType = Expect<Equal<typeof grouped, GroupedData<TimeRow, "ts">>>;

// 2. groupByDynamic with groupBy option preserves T and K
const groupedBy = df.groupByDynamic("ts", { every: "1h", groupBy: "group" });
export type _Test2_GroupedWithGroupBy = Expect<Equal<typeof groupedBy, GroupedData<TimeRow, "ts">>>;

// 3. Chaining groupByDynamic -> agg returns DataFrame<RowRecord> by default
const agged = grouped.agg($df.col("val").sum().alias("total"));
export type _Test3_AggResult = Expect<Equal<typeof agged, DataFrame<RowRecord>>>;

// 4. Explicit generic U on agg preserves full output schema
const aggedTyped = grouped.agg<{ ts: Date; total: number }>($df.col("val").sum().alias("total"));
export type _Test4_AggTyped = Expect<Equal<typeof aggedTyped, DataFrame<{ ts: Date; total: number }>>>;

// 5. Delegated aggregation methods (sum, count, mean) return DataFrame
const summed = grouped.sum();
const counted = grouped.count();
export type _Test5_DelegatedSum = Expect<Equal<typeof summed, DataFrame<TimeRow>>>;
export type _Test6_DelegatedCount = Expect<Equal<typeof counted, DataFrame<TimeRow>>>;

// 4. Negative type tests
// @ts-expect-error - options with "every" is required
df.groupByDynamic("ts");
