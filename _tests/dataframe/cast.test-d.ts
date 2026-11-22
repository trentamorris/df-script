import type { DataFrame, RowRecord } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";
import { $df } from "df-script";

interface RawUser {
    id: string;
    age: string;
    active: number;
}

declare const df: DataFrame<RawUser>;

// 1. Default cast without generic falls back to DataFrame<RowRecord> (no any leak)
const castDefault = df.cast({ id: $df.Int64 });
export type _Test1_DefaultRowRecord = Expect<Equal<typeof castDefault, DataFrame<RowRecord>>>;

// 2. Default cast .columns is string[]
const colsDefault = castDefault.columns;
export type _Test2_DefaultColumns = Expect<Equal<typeof colsDefault, string[]>>;

// 3. Explicit generic U preserves full cast schema
const castTyped = df.cast<{ id: number; age: number; active: boolean }>({
    id: $df.Int64,
    age: $df.Int32,
    active: $df.Boolean
});
export type _Test3_ExplicitSchema = Expect<Equal<typeof castTyped, DataFrame<{ id: number; age: number; active: boolean }>>>;

// 4. Global DataType cast with explicit generic
const castAllStrings = df.cast<{ id: string; age: string; active: string }>($df.Utf8);
export type _Test4_GlobalDataType = Expect<Equal<typeof castAllStrings, DataFrame<{ id: string; age: string; active: string }>>>;

// 5. toDicts() on explicitly typed cast reflects new column types
const rowsTyped = castTyped.toDicts();
export type _Test5_ToDicts = Expect<Equal<typeof rowsTyped, Array<{ id: number; age: number; active: boolean }>>>;

// 6. Negative type tests
// @ts-expect-error - invalid cast target
df.cast("not_a_dtype");
