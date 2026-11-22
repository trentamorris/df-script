import type { DataFrame } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";

interface UserRow {
    id: number;
    name: string;
}

declare const df: DataFrame<UserRow>;

// 1. writeCsv() with no arguments returns string
const csvStr = df.writeCsv();
export type _Test1_ReturnsString = Expect<Equal<typeof csvStr, string>>;

// 2. writeCsv(file, options) with file path and options returns string
const csvFile = df.writeCsv("out.csv", { separator: ";", includeHeader: true });
export type _Test2_WithFileAndOptions = Expect<Equal<typeof csvFile, string>>;

// 3. writeCsv(writable) with writable buffer object returns string
const csvStream = df.writeCsv({ write: (_chunk: string) => { } });
export type _Test3_WithWritable = Expect<Equal<typeof csvStream, string>>;

// 4. Negative type tests
// @ts-expect-error - file target cannot be a number
df.writeCsv(123);