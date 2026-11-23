import { $df } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";

// 1. Function exists on $df
const fn = ($df as Record<string, unknown>)["data"];
export type _Test1_Exists = Expect<Equal<typeof fn, unknown>>;

// 2. Negative: $df.dataFrame rejects invalid input
// @ts-expect-error - invalid DataFrameDataArg
$df.dataFrame(123);
