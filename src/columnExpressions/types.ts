import type { IExpr } from "../types";

export type ExprConstructor = new (...args: any[]) => IExpr;
