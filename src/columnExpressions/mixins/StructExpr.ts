import { ExprBase, derive } from "../ExprBase";
import type { IntoExpr, IExpr } from "../../types";

let ColumnExprClass: any = null;
function toColExpr(col: any): any {
    if (col == null) {
        throw new Error("Column reference cannot be null or undefined.");
    }
    if (!ColumnExprClass) {
        ColumnExprClass = require("../ColumnExpr").ColumnExpr;
    }
    return ColumnExprClass.isColExpr(col) ? col : new ColumnExprClass(col);
}

export class StructExprNamespace {
    constructor(public expr: IExpr) {
        return new Proxy(this, {
            get(target, prop, receiver) {
                if (prop in target) {
                    return Reflect.get(target, prop, receiver);
                }
                if (typeof prop === "string") {
                    return target.field(prop);
                }
                return Reflect.get(target, prop, receiver);
            }
        });
    }

    /**
     * Extracts a sub-field property value from nested objects/struct columns.
     * @param name Name of the field key to extract.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ user: [{ name: "Alice", id: 1 }] })
     * >>> df.with_columns($df.col("user").struct.field("name").alias("user_name"))
     * shape: (1, 2)
     * ┌─────────────────────────┬───────────┐
     * │ user                    │ user_name │
     * ├─────────────────────────┼───────────┤
     * │ { name: "Alice", id: 1 }│ Alice     │
     * └─────────────────────────┴───────────┘
     */
    field(name: string) {
        return derive(this.expr, (vArray) => {
            const height = vArray.length;
            const result = new Array(height);
            for (let i = 0; i < height; i++) {
                const v = vArray[i];
                result[i] = (v != null && typeof v === "object") ? (v as any)[name] : null;
            }
            return result;
        }).alias(name);
    }

    /**
     * Renames existing field keys inside structured object columns.
     * @param mapping Key-value map of current field names to new field names.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ user: [{ first: "Alice" }] })
     * >>> df.with_columns($df.col("user").struct.rename_fields({ first: "first_name" }).alias("user_renamed"))
     * shape: (1, 2)
     * ┌───────────────────┬─────────────────────────┐
     * │ user              │ user_renamed            │
     * ├───────────────────┼─────────────────────────┤
     * │ { first: "Alice" }│ { first_name: "Alice" } │
     * └───────────────────┴─────────────────────────┘
     */
    rename_fields(mapping: Record<string, string>) {
        return derive(this.expr, (vArray) => {
            const height = vArray.length;
            const result = new Array(height);
            const keys = Object.keys(mapping);
            const keysLen = keys.length;
            
            for (let i = 0; i < height; i++) {
                const v = vArray[i];
                if (v == null || typeof v !== "object") {
                    result[i] = null;
                    continue;
                }
                
                const newObj: any = {};
                const origKeys = Object.keys(v);
                const origLen = origKeys.length;
                for (let k = 0; k < origLen; k++) {
                    const key = origKeys[k];
                    newObj[key] = (v as any)[key];
                }
                
                for (let j = 0; j < keysLen; j++) {
                    const oldKey = keys[j];
                    if (oldKey in newObj) {
                        const newKey = mapping[oldKey];
                        newObj[newKey] = newObj[oldKey];
                        delete newObj[oldKey];
                    }
                }
                result[i] = newObj;
            }
            return result;
        });
    }

    /**
     * Inserts or updates fields inside structured object columns.
     * @param fields Expressions or field map defining new or updated fields.
     * @returns ColumnExpression
     * @throws {Error} If expressions passed without an alias or name.
     * @example
     * >>> const df = $df.data({ user: [{ name: "Alice" }], age: [30] })
     * >>> df.with_columns($df.col("user").struct.with_fields({ user_age: $df.col("age") }).alias("updated_user"))
     * shape: (1, 3)
     * ┌─────────────────┬─────┬───────────────────────────────┐
     * │ user            │ age │ updated_user                  │
     * ├─────────────────┼─────┼───────────────────────────────┤
     * │ { name: "Alice"}│ 30  │ { name: "Alice", user_age: 30}│
     * └─────────────────┴─────┴───────────────────────────────┘
     */
    with_fields(fields: IntoExpr[] | Record<string, IntoExpr>) {
        return derive(this.expr, (vArray, columns) => {
            const height = vArray.length;
            const result = new Array(height);
            
            const resolved: { name: string, expr: any }[] = [];
            if (Array.isArray(fields)) {
                const fieldsLen = fields.length;
                for (let j = 0; j < fieldsLen; j++) {
                    const f = fields[j];
                    const expr = toColExpr(f);
                    const name = expr._outputName || expr._colName;
                    if (!name) {
                        throw new Error("Expressions passed to struct.with_fields must have a name/alias.");
                    }
                    resolved.push({ name, expr });
                }
            } else if (fields && typeof fields === "object") {
                const keys = Object.keys(fields);
                const keysLen = keys.length;
                for (let j = 0; j < keysLen; j++) {
                    const name = keys[j];
                    const expr = toColExpr(fields[name]);
                    resolved.push({ name, expr });
                }
            }

            const resolvedLen = resolved.length;
            const fieldValues = new Array(resolvedLen);
            for (let j = 0; j < resolvedLen; j++) {
                fieldValues[j] = resolved[j].expr.evaluate(columns, height);
            }

            for (let i = 0; i < height; i++) {
                const v = vArray[i];
                if (v == null || typeof v !== "object") {
                    result[i] = null;
                    continue;
                }
                
                const newObj: any = {};
                const origKeys = Object.keys(v);
                const origLen = origKeys.length;
                for (let k = 0; k < origLen; k++) {
                    const key = origKeys[k];
                    newObj[key] = (v as any)[key];
                }
                
                for (let j = 0; j < resolvedLen; j++) {
                    newObj[resolved[j].name] = fieldValues[j][i];
                }
                result[i] = newObj;
            }
            return result;
        });
    }

    /**
     * Expands nested struct attributes into distinct columns in the DataFrame schema.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ user: [{ name: "Alice", age: 30 }] })
     * >>> df.select($df.col("user").struct.unnest())
     * shape: (1, 2)
     * ┌───────┬─────┐
     * │ name  │ age │
     * ├───────┼─────┤
     * │ Alice │ 30  │
     * └───────┴─────┘
     */
    unnest() {
        const newInst = derive(this.expr);
        (newInst as any).isUnnest = true;
        (newInst as any).baseExpr = this.expr;
        return newInst;
    }
}

export interface StructExprNamespace {
    [key: string]: any;
}

export class StructExpr extends ExprBase {
    /**
     * Struct namespace accessor for operating on nested object/struct columns.
     * @returns StructExprNamespace
     * @example
     * >>> df.select($df.col("user").struct.field("name"))
     */
    get struct() {
        return new StructExprNamespace(this);
    }
}
