import { $df } from "df-script";
import type { ColumnExpr, DataFrame, RowRecord } from "df-script";
import type { Expect, Equal } from "../../../testTypeHelper";

const df = $df.dataFrame({ a: [1, 2], b: [true, false] });
const numCol = $df.col<number>("a");
const boolCol = $df.col<boolean>("b");

// 1. Returns ColumnExpr
const res = boolCol.isInfinite();
export type _Test1_Return = Expect<Equal<typeof res, ColumnExpr<any>>>;

// 2. Supports chaining with alias()
const aliased = boolCol.isInfinite().alias("out");
export type _Test2_Alias = Expect<Equal<typeof aliased, ColumnExpr<any>>>;

// 3. Works inside df.select()
const selected = df.select(boolCol.isInfinite().alias("out"));
export type _Test3_Select = Expect<Equal<typeof selected, DataFrame<RowRecord>>>;

// 4. Negative: unexpected string argument
// @ts-expect-error - isInfinite() takes 0 arguments
boolCol.isInfinite("invalid");

// 5. Negative: unexpected number argument
// @ts-expect-error - isInfinite() takes 0 arguments
boolCol.isInfinite(123);
