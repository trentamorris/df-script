import { $df } from "df-script";
import type { Expect, Equal } from "../../../testTypeHelper";

const numCol = $df.col<number>("a");

// 1. Accepts number or ColumnExpr
const res1 = numCol.spearmanCorr(2);
const res2 = numCol.spearmanCorr($df.col<number>("b"));
export type _Test1_SameReturn = Expect<Equal<typeof res1, typeof res2>>;

// 2. Supports chaining with alias()
const aliased = numCol.spearmanCorr(2).alias("out");
export type _Test2_Alias = Expect<Equal<typeof aliased, typeof res1>>;

// 3. Negative: missing required argument
// @ts-expect-error - spearmanCorr() requires an argument
numCol.spearmanCorr();
