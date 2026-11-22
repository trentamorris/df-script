import type { DataFrame } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";

interface UserRow {
    id: number;
    name: string;
}

declare const df: DataFrame<UserRow>;

// 1. writeJson() with no arguments returns string
const jsonStr = df.writeJson();
export type _Test1_ReturnsString = Expect<Equal<typeof jsonStr, string>>;

// 2. writeJson(file, options) with file path and options returns string
const jsonFile = df.writeJson("out.json", {});
export type _Test2_WithFileAndOptions = Expect<Equal<typeof jsonFile, string>>;

// 3. writeJson(writable) with writable buffer object returns string
const jsonStream = df.writeJson({ write: (_chunk: string) => {} });
export type _Test3_WithWritable = Expect<Equal<typeof jsonStream, string>>;

// 4. Negative type tests
// @ts-expect-error - file target cannot be a number
df.writeJson(123);

// @ts-expect-error - unknown option is rejected
df.writeJson(undefined, { unknownOpt: true });
