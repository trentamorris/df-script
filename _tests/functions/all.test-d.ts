import type { ColumnExpr, RowRecord } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";
import { $df } from "df-script";

// 1. $df.all() returns ColumnExpr<RowRecord> by default
const allDefault = $df.all();
export type _Test1_DefaultRowRecord = Expect<Equal<typeof allDefault, ColumnExpr<RowRecord>>>;

// 2. $df.all<T>() preserves explicit schema T
interface UserRow {
    id: number;
    name: string;
}
const allTyped = $df.all<UserRow>();
export type _Test2_ExplicitSchema = Expect<Equal<typeof allTyped, ColumnExpr<UserRow>>>;

// 3. Negative type tests
// @ts-expect-error - all() takes no arguments
$df.all("id");
