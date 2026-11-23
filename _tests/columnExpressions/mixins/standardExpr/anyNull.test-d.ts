import { $df } from "df-script";
import type { ColumnExpr, DataFrame, RowRecord } from "df-script";
import type { Expect, Equal } from "../../../testTypeHelper";

const df = $df.dataFrame({ a: [1, 2], b: [true, false] });
const numCol = $df.col<number>("a");
const boolCol = $df.col<boolean>("b");

// 1. Returns ColumnExpr
const res = boolCol.anyNull();
export type _Test1_Return = Expect<Equal<typeof res, ColumnExpr<any>>>;

// 2. Supports chaining with alias()
const aliased = boolCol.anyNull().alias("out");
export type _Test2_Alias = Expect<Equal<typeof aliased, ColumnExpr<any>>>;

// 3. Works inside df.select()
const selected = df.select(boolCol.anyNull().alias("out"));
export type _Test3_Select = Expect<Equal<typeof selected, DataFrame<RowRecord>>>;

// 4. Negative: unexpected string argument
// @ts-expect-error - anyNull() takes 0 arguments
boolCol.anyNull("invalid");

// 5. Negative: unexpected number argument
// @ts-expect-error - anyNull() takes 0 arguments
boolCol.anyNull(123);
