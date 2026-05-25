import type { IExpr } from "../types"

export type JoinType = "inner" | "left" | "outer" | "right";
export type LimitPosition = "start" | "end";
export type ConcatHow = "vertical" | "horizontal" | "diagonal";
export interface ConcatOptions {
    how?: ConcatHow;
}
export type GroupMap = Map<string, number[]>;
