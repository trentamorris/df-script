import { $df } from "df-script";
import type { ColumnExpr } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";

// 1. Default generic returns ColumnExpr<unknown[]>
const i1 = $df.implode("val");
export type _Test1_Default = Expect<Equal<typeof i1, ColumnExpr<unknown[]>>>;

// 2. Explicit generic T = number returns ColumnExpr<number[]>
const i2 = $df.implode<number>("val");
export type _Test2_Number = Expect<Equal<typeof i2, ColumnExpr<number[]>>>;

// 3. Expression argument returns ColumnExpr<string[]>
const i3 = $df.implode<string>($df.col("name"));
export type _Test3_Expr = Expect<Equal<typeof i3, ColumnExpr<string[]>>>;

// 4. Negative type tests
// @ts-expect-error - missing argument
$df.implode();

// @ts-expect-error - invalid argument type
$df.implode(123);
