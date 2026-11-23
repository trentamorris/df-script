import type { ColumnExpr, RowRecord } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";
import { $df } from "df-script";

// 1. $df.coalesce() returns ColumnExpr<RowRecord> by default
const coalDefault = $df.coalesce($df.col("a"), $df.col("b"), $df.lit(0));
export type _Test1_DefaultRowRecord = Expect<Equal<typeof coalDefault, ColumnExpr<RowRecord>>>;

// 2. $df.coalesce<T>() preserves explicit schema T
interface UserRow {
    a: number | null;
    b: number | null;
}
const coalTyped = $df.coalesce<UserRow>($df.col("a"), $df.col("b"));
export type _Test2_ExplicitSchema = Expect<Equal<typeof coalTyped, ColumnExpr<UserRow>>>;

// 3. Negative type tests
// @ts-expect-error - invalid argument type to coalesce
$df.coalesce({});
