import { $df } from "df-script";
import type { ColumnExpr } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";

// 1. Single column name returns ColumnExpr<unknown>
const ex1 = $df.exclude("a");
export type _Test1_Single = Expect<Equal<typeof ex1, ColumnExpr<unknown>>>;

// 2. Array of column names returns ColumnExpr<unknown>
const ex2 = $df.exclude(["a", "b"]);
export type _Test2_Array = Expect<Equal<typeof ex2, ColumnExpr<unknown>>>;

// 3. Negative type tests
// @ts-expect-error - missing argument
$df.exclude();

// @ts-expect-error - invalid argument type
$df.exclude(123);

// @ts-expect-error - array with non-string
$df.exclude(["a", 123]);
