import type { DataFrame } from "df-script";
import type { Expect, Equal } from "../testTypeHelper";

interface User {
    id: number;
    name: string;
}

interface Order {
    id: number;
    amount: number;
}

declare const users: DataFrame<User>;
declare const orders: DataFrame<Order>;

// 1. Default join infers merged schema DataFrame<User & Order>
const joinedDefault = users.join(orders, { on: "id" });
export type _Test1_DefaultMerged = Expect<Equal<typeof joinedDefault, DataFrame<User & Order>>>;

// 2. Default join .columns reflects merged key union
const colsDefault = joinedDefault.columns;
export type _Test2_DefaultColumns = Expect<Equal<typeof colsDefault, Array<"id" | "name" | "amount">>>;

// 3. Explicit result type R preserves full joined schema
const joinedTyped = users.join<Order, User & { amount: number }>(orders, { on: "id", how: "left" });
export type _Test3_ExplicitResult = Expect<Equal<typeof joinedTyped, DataFrame<User & { amount: number }>>>;

// 4. toDicts() on explicitly typed join reflects merged record type
const rowsTyped = joinedTyped.toDicts();
export type _Test4_ToDictsTyped = Expect<Equal<typeof rowsTyped, Array<User & { amount: number }>>>;

// 5. Chaining join -> select transitions schema cleanly
const chained = users
    .join<Order, User & { amount: number }>(orders, { on: "id" })
    .select<{ name: string; amount: number }>("name", "amount");
export type _Test5_ChainedSelect = Expect<Equal<typeof chained, DataFrame<{ name: string; amount: number }>>>;

// 6. Negative type tests
// @ts-expect-error - join requires a DataFrame
users.join({ id: 1 }, { on: "id" });

// @ts-expect-error - invalid "how" join strategy
users.join(orders, { on: "id", how: "invalid_how" });

// @ts-expect-error - "nonexistent" is not a key of User
users.join(orders, { leftOn: "nonexistent", rightOn: "id" });
