import type { DataFrame } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";

interface BaseRow {
    name: string;
    score: number;
}

declare const df: DataFrame<BaseRow>;

// 1. Default withRowIndex() adds "index": number
const dfDefault = df.withRowIndex();
export type _Test1_DefaultIndex = Expect<Equal<typeof dfDefault, DataFrame<BaseRow & Record<"index", number>>>>;

// 2. Custom name infers exact key K with number type
const dfCustom = df.withRowIndex("row_id", 10);
export type _Test2_CustomName = Expect<Equal<typeof dfCustom, DataFrame<BaseRow & Record<"row_id", number>>>>;

// 3. .columns reflects original + index key
const cols = dfCustom.columns;
export type _Test3_Columns = Expect<Equal<typeof cols, Array<"name" | "score" | "row_id">>>;

// 4. item() and toArray() infer number for the row index column
const idxVal = dfCustom.item(0, "row_id");
const idxArr = dfCustom.toArray("row_id");
export type _Test4_ItemType = Expect<Equal<typeof idxVal, number>>;
export type _Test5_ToArrayType = Expect<Equal<typeof idxArr, number[]>>;

// 5. toDicts() reflects original + row index fields
const rows = dfCustom.toDicts();
export type _Test6_ToDicts = Expect<Equal<typeof rows, Array<BaseRow & Record<"row_id", number>>>>;

// 6. Chaining withRowIndex -> select -> item preserves number type
const selectedIdx = df.withRowIndex("seq", 1).select<{ seq: number; name: string }>("seq", "name").item(0, "seq");
export type _Test7_ChainedSelectItem = Expect<Equal<typeof selectedIdx, number>>;

// 7. DataFrame<RowRecord> withRowIndex preserves RowRecord & Record<K, number>
declare const dfGeneric: DataFrame<import("df-script").RowRecord>;
const genericWithIdx = dfGeneric.withRowIndex("idx");
const genericIdxVal = genericWithIdx.item(0, "idx");
export type _Test8_RowRecordIdx = Expect<Equal<typeof genericIdxVal, number>>;

// 8. Negative type tests
// @ts-expect-error - offset must be a number
df.withRowIndex("idx", "0");
