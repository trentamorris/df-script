import type { DataFrame, RowRecord } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";

interface SampleRow {
    id: number;
    name: string;
    active: boolean;
}

declare const df: DataFrame<SampleRow>;
declare const dfSingle: DataFrame<{ total: number }>;
declare const dfGeneric: DataFrame<RowRecord>;

// 1. String column name infers exact column value type
const idVal = df.item(0, "id");
export type _Test1_ByNameNumber = Expect<Equal<typeof idVal, number>>;

const nameVal = df.item(0, "name");
export type _Test2_ByNameString = Expect<Equal<typeof nameVal, string>>;

const activeVal = df.item(0, "active");
export type _Test3_ByNameBoolean = Expect<Equal<typeof activeVal, boolean>>;

// 2. Numeric column index returns union of row value types T[keyof T]
const byIndex = df.item(0, 0);
export type _Test4_ByIndex = Expect<Equal<typeof byIndex, number | string | boolean>>;

// 3. Zero-argument item() on (1, 1) DataFrame<{ total: number }> returns number
const singleVal = dfSingle.item();
export type _Test5_SingleCell = Expect<Equal<typeof singleVal, number>>;

// 4. Zero-argument item() on multi-column DataFrame returns T[keyof T]
const multiZeroArg = df.item();
export type _Test6_MultiZeroArg = Expect<Equal<typeof multiZeroArg, number | string | boolean>>;

// 5. DataFrame<RowRecord> falls back to any
const genericVal = dfGeneric.item(0, "anything");
export type _Test7_RowRecordFallback = Expect<Equal<typeof genericVal, any>>;

// 6. Negative type tests: invalid column name must fail to compile
// @ts-expect-error - "nonexistent" is not a key of SampleRow
df.item(0, "nonexistent");

// @ts-expect-error - row index must be a number
df.item("0", "id");

// @ts-expect-error - return type of "id" is number, not string
const wrongItemType: string = df.item(0, "id");
