import type { DataFrame, RowRecord } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";
import { $df } from "df-script";

interface RichRow {
    id: number;
    name: string;
    active: boolean;
    score: number | null;
    createdAt: Date;
    bigId: bigint;
    tags: string[];
}

declare const df: DataFrame<RichRow>;
declare const dfGeneric: DataFrame<RowRecord>;

// 1. Primitive column names infer exact array types
const ids = df.toArray("id");
const names = df.toArray("name");
const actives = df.toArray("active");
export type _Test1_NumberArr = Expect<Equal<typeof ids, number[]>>;
export type _Test2_StringArr = Expect<Equal<typeof names, string[]>>;
export type _Test3_BooleanArr = Expect<Equal<typeof actives, boolean[]>>;

// 2. Nullable, Date, BigInt, and nested array columns infer exact types
const scores = df.toArray("score");
const dates = df.toArray("createdAt");
const bigIds = df.toArray("bigId");
const tags = df.toArray("tags");
export type _Test4_NullableArr = Expect<Equal<typeof scores, Array<number | null>>>;
export type _Test5_DateArr = Expect<Equal<typeof dates, Date[]>>;
export type _Test6_BigIntArr = Expect<Equal<typeof bigIds, bigint[]>>;
export type _Test7_NestedArr = Expect<Equal<typeof tags, string[][]>>;

// 3. Expression argument with explicit R override
const doubled = df.toArray<keyof RichRow, number>($df.col("id").mul(2));
export type _Test8_ExprOverride = Expect<Equal<typeof doubled, number[]>>;

// 4. DataFrame<RowRecord> falls back to any[]
const genericArr = dfGeneric.toArray("anything");
export type _Test9_RowRecordFallback = Expect<Equal<typeof genericArr, any[]>>;

// 5. Negative type tests: invalid column name must fail to compile
// @ts-expect-error - "missing" is not a key of RichRow
df.toArray("missing");

// @ts-expect-error - return type of "id" is number[], not string[]
const wrongArrType: string[] = df.toArray<"id">("id");
