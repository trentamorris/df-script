import { $df } from "df-script";
import type { ColumnExpr } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";

// 1. Numeric value infers ColumnExpr<number>
const s1 = $df.seqRange(1, { step: 2 });
export type _Test1_Number = Expect<Equal<typeof s1, ColumnExpr<number>>>;

// 2. String value in constant mode infers ColumnExpr<string>
const s2 = $df.seqRange("x", { mode: "constant" });
export type _Test2_String = Expect<Equal<typeof s2, ColumnExpr<string>>>;

// 3. Explicit generic overrides inferred type
const s3 = $df.seqRange<number | null>(null, { mode: "constant" });
export type _Test3_Explicit = Expect<Equal<typeof s3, ColumnExpr<number | null>>>;

// 4. Negative type tests
// @ts-expect-error - missing value argument
$df.seqRange();

// @ts-expect-error - invalid mode
$df.seqRange(1, { mode: "invalid" });
