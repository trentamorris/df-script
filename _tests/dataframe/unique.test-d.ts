import type { DataFrame, RowRecord } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";

interface UserRow {
    id: number;
    name: string;
    role: string;
}

declare const df: DataFrame<UserRow>;
declare const dfGeneric: DataFrame<RowRecord>;

// 1. unique() without arguments preserves exact schema T
const uniqAll = df.unique();
export type _Test1_NoArgsPreservesT = Expect<Equal<typeof uniqAll, DataFrame<UserRow>>>;

// 2. unique("role") with single column key preserves T
const uniqOne = df.unique("role");
export type _Test2_SingleKeyPreservesT = Expect<Equal<typeof uniqOne, DataFrame<UserRow>>>;

// 3. unique(["id", "role"]) with array of keys preserves T
const uniqMulti = df.unique(["id", "role"]);
export type _Test3_MultiKeyPreservesT = Expect<Equal<typeof uniqMulti, DataFrame<UserRow>>>;

// 4. DataFrame<RowRecord> preserves RowRecord
const uniqGeneric = dfGeneric.unique("a");
export type _Test4_RowRecord = Expect<Equal<typeof uniqGeneric, DataFrame<RowRecord>>>;

// 5. Negative type tests
// @ts-expect-error - "missing" is not a key of UserRow
df.unique("missing");

// @ts-expect-error - numeric index is not a valid column key
df.unique(0);
