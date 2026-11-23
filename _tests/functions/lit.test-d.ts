import { $df } from "df-script";
import type { ColumnExpr } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";

// 1. Literal number infers ColumnExpr<number>
const l1 = $df.lit(42);
export type _Test1_Number = Expect<Equal<typeof l1, ColumnExpr<number>>>;

// 2. Literal string infers ColumnExpr<string>
const l2 = $df.lit("hello");
export type _Test2_String = Expect<Equal<typeof l2, ColumnExpr<string>>>;

// 3. Literal boolean infers ColumnExpr<boolean>
const l3 = $df.lit(true);
export type _Test3_Boolean = Expect<Equal<typeof l3, ColumnExpr<boolean>>>;

// 4. Literal null infers ColumnExpr<null>
const l4 = $df.lit(null);
export type _Test4_Null = Expect<Equal<typeof l4, ColumnExpr<null>>>;

// 5. Explicit generic overrides inferred type
const l5 = $df.lit<number | null>(null);
export type _Test5_Explicit = Expect<Equal<typeof l5, ColumnExpr<number | null>>>;

// 6. Negative type tests
// @ts-expect-error - missing value argument
$df.lit();

// @ts-expect-error - invalid options object
$df.lit(1, { strict: "yes" });
