import type { DataFrame, RowRecord } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";

interface UserRow {
    id: number;
    name: string;
}

interface ExtraCols {
    score: number;
}

declare const df1: DataFrame<UserRow>;
declare const df2: DataFrame<UserRow>;
declare const dfExtra: DataFrame<ExtraCols>;
declare const dfGeneric: DataFrame<RowRecord>;

// 1. Default vertical concat preserves T (UserRow)
const vertical = df1.concat(df2);
export type _Test1_VerticalPreservesT = Expect<Equal<typeof vertical, DataFrame<UserRow>>>;

// 2. Default vertical concat with array of DataFrames preserves T
const verticalArr = df1.concat([df2]);
export type _Test2_VerticalArrayPreservesT = Expect<Equal<typeof verticalArr, DataFrame<UserRow>>>;

// 3. Columns getter on default concat reflects keyof T
const cols = vertical.columns;
export type _Test3_Columns = Expect<Equal<typeof cols, Array<"id" | "name">>>;

// 4. Explicit generic U overrides schema for horizontal / diagonal concat
const horizontal = df1.concat<UserRow & ExtraCols>(dfExtra, { how: "horizontal" });
export type _Test4_HorizontalExplicit = Expect<Equal<typeof horizontal, DataFrame<UserRow & ExtraCols>>>;

// 5. toDicts() on horizontal concat reflects merged schema
const rowsHoriz = horizontal.toDicts();
export type _Test5_ToDicts = Expect<Equal<typeof rowsHoriz, Array<UserRow & ExtraCols>>>;

// 6. DataFrame<RowRecord> concat preserves RowRecord
const genericConcat = dfGeneric.concat(df1);
export type _Test6_RowRecordPreserved = Expect<Equal<typeof genericConcat, DataFrame<RowRecord>>>;

// 7. Negative type tests
// @ts-expect-error - invalid concat item
df1.concat("not_a_dataframe");
