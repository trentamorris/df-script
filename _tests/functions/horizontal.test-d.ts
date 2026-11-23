import { $df } from "df-script";
import type { HorizontalExpr } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";

// 1. Variadic column names return HorizontalExpr
const h1 = $df.horizontal("a", "b");
export type _Test1_Variadic = Expect<Equal<typeof h1, HorizontalExpr>>;

// 2. Array of column names returns HorizontalExpr
const h2 = $df.horizontal(["a", "b"]);
export type _Test2_Array = Expect<Equal<typeof h2, HorizontalExpr>>;

// 3. Selector ($df.all()) returns HorizontalExpr
const h3 = $df.horizontal($df.all());
export type _Test3_Selector = Expect<Equal<typeof h3, HorizontalExpr>>;

// 4. Negative type tests
// @ts-expect-error - boolean is not valid IntoExprArg
$df.horizontal(true);

// @ts-expect-error - number is not valid IntoExprArg
$df.horizontal(123);
