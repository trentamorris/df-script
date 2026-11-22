import type { DataFrame, RowRecord } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";

interface BaseRow {
    a: number;
}

declare const df: DataFrame<BaseRow>;

// 1. Default unstack without generic falls back to DataFrame<RowRecord> (no any leak)
const unstackedDefault = df.unstack("a", { step: 2 });
export type _Test1_DefaultRowRecord = Expect<Equal<typeof unstackedDefault, DataFrame<RowRecord>>>;

// 2. Default unstack .columns is string[]
const colsDefault = unstackedDefault.columns;
export type _Test2_DefaultColumns = Expect<Equal<typeof colsDefault, string[]>>;

// 3. Explicit generic U preserves unstacked schema
const unstackedTyped = df.unstack<{ a_0: number; a_1: number | null }>("a", {
    step: 2,
    how: "vertical",
    fillValues: null
});
export type _Test3_ExplicitSchema = Expect<Equal<
    typeof unstackedTyped,
    DataFrame<{ a_0: number; a_1: number | null }>
>>;

// 4. Negative type tests
// @ts-expect-error - options with step is required
df.unstack("a");

// @ts-expect-error - invalid "how" option
df.unstack("a", { step: 2, how: "diagonal" });
