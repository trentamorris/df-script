import { $df } from "df-script";
import type { ColumnExpr } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";

// 1. Object mapping returns ColumnExpr<Record<string, unknown>>
const st1 = $df.struct({ x: "a", y: "b" });
export type _Test1_Object = Expect<Equal<typeof st1, ColumnExpr<Record<string, unknown>>>>;

// 2. Positional expressions return ColumnExpr<Record<string, unknown>>
const st2 = $df.struct($df.col("a"), $df.col("b"));
export type _Test2_Positional = Expect<Equal<typeof st2, ColumnExpr<Record<string, unknown>>>>;

// 3. Array of expressions returns ColumnExpr<Record<string, unknown>>
const st3 = $df.struct(["a", "b"]);
export type _Test3_Array = Expect<Equal<typeof st3, ColumnExpr<Record<string, unknown>>>>;

// 4. Negative type tests
// @ts-expect-error - missing fields argument
$df.struct();

// @ts-expect-error - number is not valid StructArg
$df.struct(123);
