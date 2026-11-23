import { $df } from "df-script";
import type { ColumnExpr, DataFrame, RowRecord } from "df-script";
import type { Expect, Equal } from "../../../testTypeHelper";

const df = $df.dataFrame({ a: [1, 2], b: [true, false] });
const numCol = $df.col<number>("a");
const boolCol = $df.col<boolean>("b");

// 1. Returns ColumnExpr
const res = numCol.variance();
export type _Test1_Return = Expect<Equal<typeof res, ColumnExpr<any>>>;

// 2. Supports chaining with alias()
const aliased = numCol.variance().alias("out");
export type _Test2_Alias = Expect<Equal<typeof aliased, ColumnExpr<any>>>;

// 3. Works inside df.select()
const selected = df.select(numCol.variance().alias("out"));
export type _Test3_Select = Expect<Equal<typeof selected, DataFrame<RowRecord>>>;

// 4. Negative: unexpected string argument
// @ts-expect-error - variance() takes 0 arguments
numCol.variance("invalid");

// 5. Negative: unexpected number argument
// @ts-expect-error - variance() takes 0 arguments
numCol.variance(123);
