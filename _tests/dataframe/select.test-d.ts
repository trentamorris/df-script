import type { DataFrame } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";
import { $df } from "df-script";

interface TestUser {
    id: number;
    username: string;
    isActive: boolean;
}

declare const df: DataFrame<TestUser>;

// 1. Explicit generic parameter defines projected single-column DataFrame schema
const dfSingle = df.select<{ id: number }>("id");
export type _Test1_SingleCol = Expect<Equal<typeof dfSingle, DataFrame<{ id: number }>>>;

// 2. Explicit multi-column generic parameter defines projected multi-column schema
const dfMulti = df.select<{ id: number; username: string }>("id", "username");
export type _Test2_MultiCol = Expect<Equal<typeof dfMulti, DataFrame<{ id: number; username: string }>>>;

// 3. Selection with column expression aliases preserving custom output types
const dfAliased = df.select<{ user_id: number; status: string }>(
    $df.col("id").alias("user_id"),
    $df.col("isActive").cast($df.Utf8).alias("status")
);
export type _Test3_Aliased = Expect<Equal<typeof dfAliased, DataFrame<{ user_id: number; status: string }>>>;

// 4. Default / untyped select falls back to DataFrame<any>
const dfDefault = df.select("id", "username");
export type _Test4_DefaultAny = Expect<Equal<typeof dfDefault, DataFrame<any>>>;

// 5. Zero-argument select() falls back to DataFrame<any>
const dfEmpty = df.select();
export type _Test5_EmptySelect = Expect<Equal<typeof dfEmpty, DataFrame<any>>>;

// 6. Array argument form select(["id", "username"]) defaults to DataFrame<any>
const dfArrayArg = df.select(["id", "username"]);
export type _Test6_ArrayArg = Expect<Equal<typeof dfArrayArg, DataFrame<any>>>;

// 7. Extracting rows via toDicts() on a typed select preserves projected record types
const rows = df.select<{ id: number }>("id").toDicts();
export type _Test7_ToDicts = Expect<Equal<typeof rows, Array<{ id: number }>>>;

// 8. Columns getter on typed select reflects projected keys union
const cols = df.select<{ id: number; username: string }>("id", "username").columns;
export type _Test8_Columns = Expect<Equal<typeof cols, Array<"id" | "username">>>;

// 9. Select on an untyped DataFrame<any> allows projecting into a strictly typed schema
declare const dfAny: DataFrame<any>;
const dfProjected = dfAny.select<{ count: number }>("count");
export type _Test9_ProjectAny = Expect<Equal<typeof dfProjected, DataFrame<{ count: number }>>>;

// 10. Chaining select after withColumns cleanly transitions schema
const dfChained = df
    .withColumns<{ score: number }>($df.lit(100).alias("score"))
    .select<{ username: string; score: number }>("username", "score");
export type _Test10_ChainedSelect = Expect<Equal<typeof dfChained, DataFrame<{ username: string; score: number }>>>;
