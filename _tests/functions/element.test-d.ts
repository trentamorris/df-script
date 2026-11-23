import { $df } from "df-script";
import type { ColumnExpr } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";

// 1. Default generic is ColumnExpr<unknown> (no any)
const e1 = $df.element();
export type _Test1_Default = Expect<Equal<typeof e1, ColumnExpr<unknown>>>;

// 2. Explicit generic T = number
const e2 = $df.element<number>();
export type _Test2_Number = Expect<Equal<typeof e2, ColumnExpr<number>>>;

// 3. Explicit generic T = string
const e3 = $df.element<string>();
export type _Test3_String = Expect<Equal<typeof e3, ColumnExpr<string>>>;

// 4. Negative type tests
// @ts-expect-error - element() takes no arguments
$df.element("a");
