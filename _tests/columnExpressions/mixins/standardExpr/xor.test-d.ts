import { $df } from "df-script";
import type { ColumnExpr, DataFrame, RowRecord } from "df-script";
import type { Expect, Equal } from "../../../testTypeHelper";

const df = $df.dataFrame({ a: [1, 2], b: [true, false] });
const numCol = $df.col<number>("a");
const boolCol = $df.col<boolean>("b");

// 1. Accepts boolean literal
const res1 = boolCol.xor(true);
export type _Test1_Bool = Expect<Equal<typeof res1, ColumnExpr<any>>>;

// 2. Accepts ColumnExpr
const res2 = boolCol.xor($df.col<boolean>("c"));
export type _Test2_Expr = Expect<Equal<typeof res1, typeof res2>>;

// 3. Supports chaining with alias()
const aliased = boolCol.xor(true).alias("out");
export type _Test3_Alias = Expect<Equal<typeof aliased, ColumnExpr<any>>>;

// 4. Negative: missing required argument
// @ts-expect-error - xor() requires an argument
boolCol.xor();
