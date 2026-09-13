import { ExprBase } from "../ExprBase";
import type { IntoExpr } from "../../types";
import { InvalidArgumentError } from "../../exceptions";
import { LITERAL_MARKER } from "../constants";
import { createDelegatingProxy } from "../utils";

/**
 * @namespace $df.col.struct
 * @category ColumnExpression
 * @syntax $df.col(<column_name>).struct.{symbol}(...)
 */

export class StructExprNamespace {
    constructor(public _expr: any) {
        return createDelegatingProxy(this, (prop, target) => prop in target ? undefined : target.field(prop));
    }

    /**
     * Extracts a sub-field property value from nested objects/struct columns.
     * @param name Name of the field key to extract.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_struct_single -->
     * >>> df.withColumns($df.col("user").struct.field("name").alias("user_name"))
     * shape: (1, 2)
     * ┌───────────────────────────┬───────────┐
     * │ user                      │ user_name │
     * ├───────────────────────────┼───────────┤
     * │ { name: "Alice", id: 1 }  │ Alice     │
     * └───────────────────────────┴───────────┘
     */
    field(name: string) {
        const derived = this._expr._deriveUnary((v: any) => (v != null && typeof v === "object" ? v[name] : null));
        derived._baseExpr = this._expr;
        derived._fieldName = name;
        return derived.alias(name);
    }

    /**
     * Renames existing field keys inside structured object columns.
     * @param mapping Key-value map of current field names to new field names.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_struct_single -->
     * >>> df.withColumns($df.col("user").struct.renameFields({ name: "first_name" }).alias("user_renamed"))
     * shape: (1, 2)
     * ┌───────────────────────────┬────────────────────────────────┐
     * │ user                      │ user_renamed                   │
     * ├───────────────────────────┼────────────────────────────────┤
     * │ { name: "Alice", id: 1 }  │ { id: 1, first_name: "Alice" } │
     * └───────────────────────────┴────────────────────────────────┘
     */
    renameFields(mapping: Record<string, string>) {
        return this._expr._deriveUnary((v: any) => {
            if (v == null || typeof v !== "object") return null;
            const newObj: any = {};
            const origKeys = Object.keys(v);
            const origLen = origKeys.length;
            for (let k = 0; k < origLen; k++) {
                const key = origKeys[k];
                const newKey = mapping[key] !== undefined ? mapping[key] : key;
                newObj[newKey] = (v as any)[key];
            }
            return newObj;
        });
    }

    /**
     * Inserts or updates fields inside structured object columns.
     * @param fields Expressions or field map defining new or updated fields.
     * @returns ColumnExpression
     * @throws {Error} If expressions passed without an alias or name.
     * @example
     * <!-- doc:base_struct_single -->
     * >>> df.withColumns($df.col("user").struct.withFields({ is_active: $df.lit(true) }).alias("updated_user"))
     * shape: (1, 2)
     * ┌──────────────────────────────┬───────────────────────────────────────────┐
     * │ user                         │ updated_user                              │
     * ├──────────────────────────────┼───────────────────────────────────────────┤
     * │ { name: "Alice", age: 30 }   │ { name: "Alice", age: 30, is_active: true }│
     * └──────────────────────────────┴───────────────────────────────────────────┘
     */
    withFields(fields: IntoExpr[] | Record<string, IntoExpr>) {
        return this._expr._derive((vArray: any[], columns: any) => {
            const height = vArray.length;
            const result = new Array(height);
            const resolved: { name: string; expr: any }[] = [];

            if (Array.isArray(fields)) {
                for (let j = 0; j < fields.length; j++) {
                    const expr = this._expr._toColExpr(fields[j]);
                    const name = (expr._outputName && expr._outputName !== LITERAL_MARKER)
                        ? expr._outputName
                        : (expr._colName !== LITERAL_MARKER ? expr._colName : "");
                    if (!name) {
                        throw new InvalidArgumentError("Expressions passed to struct.withFields must have a name/alias.");
                    }
                    resolved.push({ name, expr });
                }
            } else {
                const keys = Object.keys(fields);
                for (let j = 0; j < keys.length; j++) {
                    resolved.push({ name: keys[j], expr: this._expr._toColExpr(fields[keys[j]]) });
                }
            }

            const len = resolved.length;
            const fieldValues = new Array(len);
            for (let j = 0; j < len; j++) {
                fieldValues[j] = resolved[j].expr.evaluate(columns, height);
            }

            for (let i = 0; i < height; i++) {
                const v = vArray[i];
                if (v == null || typeof v !== "object") {
                    result[i] = null;
                    continue;
                }

                const newObj: any = { ...v };
                for (let j = 0; j < len; j++) {
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
     * <!-- doc:base_struct_single -->
     * >>> df.select($df.col("user").struct.unnest())
     * shape: (1, 2)
     * ┌───────┬─────┐
     * │ name  │ age │
     * ├───────┼─────┤
     * │ Alice │ 30  │
     * └───────┴─────┘
     */
    unnest() {
        const newInst = this._expr._derive();
        newInst._isUnnest = true;
        newInst._baseExpr = this._expr;
        return newInst;
    }
}

export interface StructExprNamespace {
    [key: string]: any;
}

export class StructExpr extends ExprBase {
    /**
     * Struct namespace accessor for operating on nested object/struct columns.
     * @namespace $df.col
     * @category ColumnExpression
     * @syntax $df.col(<column_name>).struct
     * @returns StructExprNamespace
     * @example
     * <!-- doc:base_struct_single -->
     * >>> df.select($df.col("user").struct.field("name"))
     * shape: (1, 1)
     * ┌─────────┐
     * │ name    │
     * ├─────────┤
     * │ "Alice" │
     * └─────────┘
     */
    get struct() {
        return new StructExprNamespace(this);
    }
}
