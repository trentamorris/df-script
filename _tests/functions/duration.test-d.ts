import { $df } from "df-script";
import type { ColumnExpr } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";

// 1. String shorthand returns ColumnExpr<number>
const d1 = $df.duration("1d 12h");
export type _Test1_String = Expect<Equal<typeof d1, ColumnExpr<number>>>;

// 2. Options object returns ColumnExpr<number>
const d2 = $df.duration({ days: 1, hours: 2 });
export type _Test2_Options = Expect<Equal<typeof d2, ColumnExpr<number>>>;

// 3. Dynamic expression component returns ColumnExpr<number>
const d3 = $df.duration({ seconds: $df.col("n") });
export type _Test3_DynamicExpr = Expect<Equal<typeof d3, ColumnExpr<number>>>;

// 4. Default call returns ColumnExpr<number>
const d4 = $df.duration();
export type _Test4_Default = Expect<Equal<typeof d4, ColumnExpr<number>>>;

// 5. Negative type tests
// @ts-expect-error - number is not valid DurationArg
$df.duration(123);

// @ts-expect-error - boolean is not valid DurationArg
$df.duration(true);

// @ts-expect-error - invalid component value
$df.duration({ days: true });
