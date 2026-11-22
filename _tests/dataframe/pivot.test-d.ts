import type { DataFrame, RowRecord } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";

interface SalesRow {
    year: number;
    region: string;
    revenue: number;
}

declare const df: DataFrame<SalesRow>;

// 1. Default pivot without generic falls back to DataFrame<RowRecord> (no any leak)
const pivotedDefault = df.pivot({ index: "year", columns: "region", values: "revenue" });
export type _Test1_DefaultRowRecord = Expect<Equal<typeof pivotedDefault, DataFrame<RowRecord>>>;

// 2. Default pivot .columns is string[]
const colsDefault = pivotedDefault.columns;
export type _Test2_DefaultColumns = Expect<Equal<typeof colsDefault, string[]>>;

// 3. Explicit generic U preserves pivoted schema
const pivotedTyped = df.pivot<{ year: number; North: number | null; South: number | null }>({
    index: "year",
    columns: "region",
    values: "revenue"
});
export type _Test3_ExplicitSchema = Expect<Equal<
    typeof pivotedTyped,
    DataFrame<{ year: number; North: number | null; South: number | null }>
>>;

// 4. Negative type tests
// @ts-expect-error - invalid index column
df.pivot({ index: "missing", columns: "region", values: "revenue" });

// @ts-expect-error - invalid columns key
df.pivot({ index: "year", columns: "missing", values: "revenue" });
