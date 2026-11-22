import type { DataFrame, RowRecord } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";

interface UserA {
    id: number;
    name: string;
}

interface UserB {
    id: number;
    score: number;
}

declare const dfA: DataFrame<UserA>;
declare const dfB: DataFrame<UserB>;
declare const dfGeneric: DataFrame<RowRecord>;

// 1. Comparing two typed DataFrames returns boolean
const eq1 = dfA.equals(dfA);
export type _Test1_SameSchema = Expect<Equal<typeof eq1, boolean>>;

// 2. Comparing DataFrames with different schemas returns boolean
const eq2 = dfA.equals(dfB, { nullsEqual: false });
export type _Test2_DiffSchema = Expect<Equal<typeof eq2, boolean>>;

// 3. Comparing against DataFrame<RowRecord> returns boolean
const eq3 = dfA.equals(dfGeneric);
export type _Test3_RowRecord = Expect<Equal<typeof eq3, boolean>>;

// 4. Comparing against Pick<UserA, "id"> and DataFrame<any> returns boolean
declare const dfAny: DataFrame<any>;
const eq4 = dfA.equals(dfA.select<Pick<UserA, "id">>("id"));
const eq5 = dfA.equals(dfAny);
export type _Test4_PickAndAny = Expect<Equal<typeof eq4, boolean>>;
export type _Test5_Any = Expect<Equal<typeof eq5, boolean>>;

// 5. Negative type tests
// @ts-expect-error - equals requires a DataFrame
dfA.equals({ id: 1 });
