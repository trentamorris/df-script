import type { ColumnExpr } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";
import { $df } from "df-script";

// 1. $df.col("a") infers ColumnExpr<{ a: any }>
const colA = $df.col("a");
export type _Test1_SingleCol = Expect<Equal<typeof colA, ColumnExpr<{ a: any }>>>;

// 2. $df.col(["a", "b"]) infers ColumnExpr<{ a: any; b: any }>
const colMulti = $df.col(["a", "b"]);
export type _Test2_MultiCol = Expect<Equal<typeof colMulti, ColumnExpr<{ a: any; b: any }>>>;

// 3. Explicit generic $df.col<{ id: number }>("id")
const colTyped = $df.col<{ id: number }>("id");
export type _Test3_ExplicitSchema = Expect<Equal<typeof colTyped, ColumnExpr<{ id: number }>>>;

// 4. Negative type tests
// @ts-expect-error - col() requires an argument
$df.col();
