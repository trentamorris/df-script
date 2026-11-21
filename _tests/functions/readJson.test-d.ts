import type { DataFrame } from "df-script";
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

// 2. Default readJson falls back to DataFrame<any>
const defaultDf = $df.readJson(jsonStr);
export type _TestReadJsonDefault = Expect<Equal<typeof defaultDf, DataFrame<any>>>;
