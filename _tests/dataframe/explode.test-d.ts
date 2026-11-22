import type { DataFrame, RowRecord } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";

interface NestedRow {
    id: number;
    tags: string[];
}

declare const df: DataFrame<NestedRow>;

// 1. Default explode without generic falls back to DataFrame<RowRecord>
const explodedDefault = df.explode("tags");
export type _Test1_DefaultRowRecord = Expect<Equal<typeof explodedDefault, DataFrame<RowRecord>>>;

// 2. Default explode .columns is string[]
const colsDefault = explodedDefault.columns;
export type _Test2_DefaultColumns = Expect<Equal<typeof colsDefault, string[]>>;

// 3. Explicit generic U preserves exploded element type
const explodedTyped = df.explode<{ id: number; tags: string }>("tags");
export type _Test3_ExplicitSchema = Expect<Equal<typeof explodedTyped, DataFrame<{ id: number; tags: string }>>>;

// 4. toDicts() on explicitly typed explode reflects scalar element type
const rowsTyped = explodedTyped.toDicts();
export type _Test4_ToDicts = Expect<Equal<typeof rowsTyped, Array<{ id: number; tags: string }>>>;

// 5. Exploding nullable array column into nullable scalar + chaining select -> item
interface NullableNested {
    id: number;
    scores: number[] | null;
}
declare const dfNullable: DataFrame<NullableNested>;
const chainedItem = dfNullable
    .explode<{ id: number; scores: number | null }>("scores", { emptyAsNull: true })
    .select<{ scores: number | null }>("scores")
    .item(0, "scores");
export type _Test5_NullableExplodeChain = Expect<Equal<typeof chainedItem, number | null>>;

// 6. Negative type tests
// @ts-expect-error - explode requires at least 1 argument
df.explode();
