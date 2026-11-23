import { $df } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";

// 1. when().then() returns WhenThen (extending ColumnExpr<unknown>)
const w1 = $df.when($df.col("a").gt(0)).then("pos");
const w2 = w1.otherwise("non-pos");
const w3 = w1.when($df.col("a").lt(0)).then("neg").otherwise("zero");

export type _Test1_SameType = Expect<Equal<typeof w1, typeof w2>>;
export type _Test2_ChainedType = Expect<Equal<typeof w1, typeof w3>>;

// 2. Negative type tests
// @ts-expect-error - missing predicate
$df.when();

// @ts-expect-error - cannot call otherwise before then
$df.when($df.col("a").gt(0)).otherwise("x");
