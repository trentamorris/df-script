import type { DataFrame, RowRecord } from "df-script";
import type { Expect, Equal } from "../../testTypeHelper";
import { $df } from "df-script";

interface SalesRow {
    region: string;
    product: string;
    amount: number;
}

declare const df: DataFrame<SalesRow>;

// 1. Default groupBy().agg() without generic falls back to DataFrame<RowRecord>
const aggDefault = df.groupBy("region").agg($df.col("amount").sum().alias("total"));
export type _Test1_DefaultRowRecord = Expect<Equal<typeof aggDefault, DataFrame<RowRecord>>>;

// 2. Explicit generic U on agg() preserves full aggregated schema
const aggTyped = df.groupBy("region").agg<{ region: string; total: number }>(
    $df.col("amount").sum().alias("total")
);
export type _Test2_ExplicitSchema = Expect<Equal<typeof aggTyped, DataFrame<{ region: string; total: number }>>>;

// 3. Chaining agg() -> item() preserves exact scalar type
const totalVal = aggTyped.item(0, "total");
export type _Test3_ChainedItem = Expect<Equal<typeof totalVal, number>>;

// 4. Negative type tests
// @ts-expect-error - invalid grouping key
df.groupBy("missing");

// @ts-expect-error - invalid argument to agg()
df.groupBy("region").agg(123);
