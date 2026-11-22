import type { DataFrame, RowRecord } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";

interface UserRow {
    id: number;
    name: string;
    score: number;
}

declare const df: DataFrame<UserRow>;
declare const dfGeneric: DataFrame<RowRecord>;

// 1. sort({ by: "id" }) preserves exact schema T
const sortedOne = df.sort({ by: "id" });
export type _Test1_SortOne = Expect<Equal<typeof sortedOne, DataFrame<UserRow>>>;

// 2. sort({ by: ["id", "score"], descending: [false, true] }) preserves T
const sortedMulti = df.sort({ by: ["id", "score"], descending: [false, true] });
export type _Test2_SortMulti = Expect<Equal<typeof sortedMulti, DataFrame<UserRow>>>;

// 3. Chaining sort -> item preserves exact scalar type
const topName = df.sort({ by: "score", descending: true }).item(0, "name");
export type _Test3_ChainedItem = Expect<Equal<typeof topName, string>>;

// 4. DataFrame<RowRecord> preserves RowRecord
const genericSorted = dfGeneric.sort({ by: "a" });
export type _Test4_RowRecord = Expect<Equal<typeof genericSorted, DataFrame<RowRecord>>>;

// 5. Negative type tests
// @ts-expect-error - invalid descending type
df.sort({ by: "id", descending: "yes" });

// @ts-expect-error - "missing" is not a key of UserRow
df.sort({ by: "missing" });
