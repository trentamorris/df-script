import type { DataFrame } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";
import { $df } from "df-script";

interface BaseRow {
    id: number;
    name: string;
}

declare const df: DataFrame<BaseRow>;

// 1. Default insertColumn without generic infers inserted key K with unknown value
const dfDefault = df.insertColumn(0, "score", $df.lit(10));
export type _Test1_InfersKeyK = Expect<Equal<typeof dfDefault, DataFrame<BaseRow & Record<"score", unknown>>>>;

// 2. Explicit generic U extends T with the inserted column type
const dfTyped = df.insertColumn<"score", { score: number }>(1, "score", $df.lit(100));
export type _Test2_ExplicitInserted = Expect<Equal<typeof dfTyped, DataFrame<BaseRow & { score: number }>>>;

// 3. .columns reflects original + inserted column keys
const colsTyped = dfTyped.columns;
export type _Test3_Columns = Expect<Equal<typeof colsTyped, Array<"id" | "name" | "score">>>;

// 4. Chaining insertColumn -> item() preserves exact scalar types
const scoreVal = dfTyped.item(0, "score");
const nameVal = dfTyped.item(0, "name");
export type _Test4_ChainedItemScore = Expect<Equal<typeof scoreVal, number>>;
export type _Test5_ChainedItemName = Expect<Equal<typeof nameVal, string>>;

// 5. Sequential insertColumn calls accumulate schema fields
const dfChained = df
    .insertColumn<"step1", { step1: boolean }>(0, "step1", $df.lit(true))
    .insertColumn<"step2", { step2: string }>(2, "step2", $df.lit("ok"));
export type _Test6_ChainedAccumulates = Expect<Equal<
    typeof dfChained,
    DataFrame<BaseRow & { step1: boolean } & { step2: string }>
>>;

// 6. Overwriting an existing column with a new type via insertColumn
const dfOverwrite = df.insertColumn<"id", { id: string }>(0, "id", $df.col("id").cast($df.Utf8));
type OverwrittenId = typeof dfOverwrite extends DataFrame<infer R> ? R["id"] : never;
export type _Test7_OverwriteId = Expect<Equal<OverwrittenId, number & string>>;

// 7. toDicts() on chained insertColumn reflects all accumulated fields
const rowsChained = dfChained.toDicts();
export type _Test8_ToDictsChained = Expect<Equal<
    typeof rowsChained,
    Array<BaseRow & { step1: boolean } & { step2: string }>
>>;

// 8. insertColumn on DataFrame<any> naturally propagates any
declare const dfAny: DataFrame<any>;
const dfAnyInserted = dfAny.insertColumn<"extra", { extra: number }>(0, "extra", $df.lit(1));
type AnyExtra = typeof dfAnyInserted extends DataFrame<infer R> ? R["extra"] : never;
export type _Test9_AnyPropagates = Expect<Equal<AnyExtra, any>>;

// 9. Negative type tests
// @ts-expect-error - index must be a number
df.insertColumn("0", "bad", $df.lit(1));
