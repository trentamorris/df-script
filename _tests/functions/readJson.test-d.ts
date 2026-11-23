import type { DataFrame } from "df-script";
import type { RowRecord } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";
import { $df } from "df-script";

interface UserRecord {
    id: number;
    name: string;
}

declare const jsonStr: string;

// 1. readJson preserves explicit generic record type
const typedDf = $df.readJson<UserRecord>(jsonStr);
export type _TestReadJsonTyped = Expect<Equal<typeof typedDf, DataFrame<UserRecord>>>;

// 2. Default readJson falls back to DataFrame<RowRecord>
const defaultDf = $df.readJson(jsonStr);
export type _TestReadJsonDefault = Expect<Equal<typeof defaultDf, DataFrame<RowRecord>>>;

// 3. NDJSON options
const ndjsonDf = $df.readJson<UserRecord>(jsonStr, {
    format: "ndjson",
    trimBeforeParse: false,
    ndjson: { skipInvalidLines: true }
});
export type _TestReadJsonNdjson = Expect<Equal<typeof ndjsonDf, DataFrame<UserRecord>>>;

// 4. Negative type tests
// @ts-expect-error - content must be string
$df.readJson(123);

// @ts-expect-error - invalid format option
$df.readJson(jsonStr, { format: "yaml" });

// @ts-expect-error - invalid trimBeforeParse type
$df.readJson(jsonStr, { trimBeforeParse: "yes" });
