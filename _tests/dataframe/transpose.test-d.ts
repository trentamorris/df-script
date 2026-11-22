import type { DataFrame, RowRecord } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";

interface MatrixRow {
    a: number;
    b: number;
}

declare const df: DataFrame<MatrixRow>;

// 1. Default transpose without generic falls back to DataFrame<RowRecord> (no any leak)
const transposedDefault = df.transpose();
export type _Test1_DefaultRowRecord = Expect<Equal<typeof transposedDefault, DataFrame<RowRecord>>>;

// 2. Default transpose .columns is string[]
const colsDefault = transposedDefault.columns;
export type _Test2_DefaultColumns = Expect<Equal<typeof colsDefault, string[]>>;

// 3. Explicit generic U preserves transposed schema
const transposedTyped = df.transpose<{ column: string; row_0: number; row_1: number }>({
    includeHeader: true,
    headerName: "column",
    columnNames: ["row_0", "row_1"]
});
export type _Test3_ExplicitSchema = Expect<Equal<
    typeof transposedTyped,
    DataFrame<{ column: string; row_0: number; row_1: number }>
>>;

// 4. Negative type tests
// @ts-expect-error - includeHeader must be a boolean
df.transpose({ includeHeader: "yes" });
