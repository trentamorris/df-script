import type { DataFrame, RowRecord } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";

interface UserRow {
    id: number;
    name: string;
}

declare const df: DataFrame<UserRow>;
declare const dfGeneric: DataFrame<RowRecord>;

// 1. limit(n) preserves exact schema T
const limited = df.limit(5);
export type _Test1_PreservesT = Expect<Equal<typeof limited, DataFrame<UserRow>>>;

// 2. limit(n, options) with offset and from: "end" preserves T
const limitedOpts = df.limit(3, { offset: 1, from: "end" });
export type _Test2_WithOptions = Expect<Equal<typeof limitedOpts, DataFrame<UserRow>>>;

// 3. Chaining limit -> item preserves exact scalar type
const firstId = df.limit(1).item(0, "id");
export type _Test3_ChainedItem = Expect<Equal<typeof firstId, number>>;

// 4. DataFrame<RowRecord> preserves RowRecord
const genericLimited = dfGeneric.limit(2);
export type _Test4_RowRecord = Expect<Equal<typeof genericLimited, DataFrame<RowRecord>>>;

// 5. Negative type tests
// @ts-expect-error - n must be a number
df.limit("5");

// @ts-expect-error - invalid "from" option
df.limit(5, { from: "middle" });
