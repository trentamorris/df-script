import type { DataFrame, RowRecord } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";
import { $df } from "df-script";

interface UserRow {
    id: number;
    name: string;
    active: boolean;
    score: number | null;
}

declare const df: DataFrame<UserRow>;
declare const dfGeneric: DataFrame<RowRecord>;

// 1. Filtering with a ColumnExpression preserves exact schema T
const filteredExpr = df.filter($df.col("id").gt(10));
export type _Test1_ExprPreservesT = Expect<Equal<typeof filteredExpr, DataFrame<UserRow>>>;

// 2. Filtering with a row predicate function preserves T and types row argument as UserRow
const filteredFn = df.filter(row => row.active && row.id > 0);
export type _Test2_FnPreservesT = Expect<Equal<typeof filteredFn, DataFrame<UserRow>>>;

// 3. Filtering with multiple predicates (ANDed) preserves T
const filteredMulti = df.filter($df.col("active").eq(true), $df.col("score").isNotNull());
export type _Test3_MultiPreservesT = Expect<Equal<typeof filteredMulti, DataFrame<UserRow>>>;

// 4. Chaining filter -> select -> item preserves exact scalar types
const itemAfterFilter = df
    .filter($df.col("id").eq(1))
    .select<{ name: string; score: number | null }>("name", "score")
    .item(0, "score");
export type _Test4_ChainedItem = Expect<Equal<typeof itemAfterFilter, number | null>>;

// 5. DataFrame<RowRecord> filter preserves RowRecord
const genericFiltered = dfGeneric.filter($df.col("a").eq(1));
export type _Test5_RowRecord = Expect<Equal<typeof genericFiltered, DataFrame<RowRecord>>>;

// 6. Negative type tests: invalid row property in predicate must fail to compile
// @ts-expect-error - "missingProp" does not exist on UserRow
df.filter(row => row.missingProp === 1);
