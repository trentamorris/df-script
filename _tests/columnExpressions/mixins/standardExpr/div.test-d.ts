import { $df } from "df-script";
import type { ColumnExpr, DataFrame, RowRecord } from "df-script";
import type { Expect, Equal } from "../../../testTypeHelper";

const df = $df.dataFrame({ a: [1, 2], b: [true, false] });
const numCol = $df.col<number>("a");
const boolCol = $df.col<boolean>("b");

// 1. Accepts number literal
const res1 = numCol.div(2);
export type _Test1_Number = Expect<Equal<typeof res1, ColumnExpr<any>>>;

// 2. Accepts ColumnExpr
const res2 = numCol.div($df.col<number>("b"));
export type _Test2_Expr = Expect<Equal<typeof res1, typeof res2>>;

// 3. Supports chaining with alias()
const aliased = numCol.div(2).alias("out");
export type _Test3_Alias = Expect<Equal<typeof aliased, ColumnExpr<any>>>;

// 4. Negative: missing required argument
// @ts-expect-error - div() requires an argument
numCol.div();

// 5. Negative: invalid boolean argument
// @ts-expect-error - div() does not accept boolean
numCol.div(true);
