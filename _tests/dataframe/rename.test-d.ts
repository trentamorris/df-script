import type { DataFrame } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";

interface UserRow {
    id: number;
    name: string;
    active: boolean;
}

declare const df: DataFrame<UserRow>;

// 1. Renaming a single column updates key name and preserves value type
const renamedOne = df.rename({ name: "username" } as const);
const idAfterRename = renamedOne.item(0, "id");
export type _Test1_IdPreserved = Expect<Equal<typeof idAfterRename, number>>;

// 2. Renaming multiple columns updates all renamed keys
const renamedMulti = df.rename({ id: "user_id", active: "is_active" } as const);
const multiCols = renamedMulti.columns;
export type _Test2_MultiColumns = Expect<Equal<typeof multiCols, Array<"name" | "user_id" | "is_active">>>;

// 3. .columns reflects renamed key union
const cols = renamedOne.columns;
export type _Test3_Columns = Expect<Equal<typeof cols, Array<"id" | "active" | "username">>>;

// 4. Chaining rename -> item() infers exact scalar type under new column name
const usernameVal = renamedOne.item(0, "username");
export type _Test4_ChainedItem = Expect<Equal<typeof usernameVal, string>>;

// 5. Negative type tests
// @ts-expect-error - "missing" is not a key of UserRow
df.rename({ missing: "new_name" });

// @ts-expect-error - old key "name" no longer exists after rename
renamedOne.item(0, "name");
