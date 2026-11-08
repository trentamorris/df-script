import assert from "assert";
import {
  splitByComma,
  formatSignature,
  parseJSDocComment,
  extractSignatureAndEnd,
  extractTypesFromContent,
  extractTypeProperties,
  resolveTypeAliasString,
  resolveTypeProperties,
  buildFunctionTypeTree,
  buildDetailedSignature,
  extractRawDocsFromContent,
  extractRawDocs
} from "../extract-docs.mjs";

console.log("Running scripts/_tests/extract-docs.test.mjs...");

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (err) {
    console.error(`❌ FAILED: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// ─── 1. splitByComma Extreme Edge Cases ───────────────────────────────────────

test("splitByComma: basic and empty inputs", () => {
  assert.deepStrictEqual(splitByComma(""), []);
  assert.deepStrictEqual(splitByComma("   "), []);
  assert.deepStrictEqual(splitByComma("a: number"), ["a: number"]);
  assert.deepStrictEqual(splitByComma("a: number, b: string"), ["a: number", "b: string"]);
});

test("splitByComma: commas inside single, double, and template strings with escapes", () => {
  assert.deepStrictEqual(
    splitByComma('separator: string = ", ", quote: string = \'\\\',\', tpl: string = `a, ${1, 2}, b`'),
    [
      'separator: string = ", "',
      "quote: string = '\\','",
      "tpl: string = `a, ${1, 2}, b`"
    ]
  );
  assert.deepStrictEqual(
    splitByComma('a: string = "\\\\", b: number = 1'),
    ['a: string = "\\\\"', "b: number = 1"]
  );
});

test("splitByComma: nested generics, arrow functions, tuples, and inline objects", () => {
  const input = [
    "fn: (a: Map<string, [number, string]>, b: { x: number, y: (k: T) => boolean }) => Record<string, any>",
    "options: { a?: [string, string], b?: Record<K, V> } = { a: [',', ';'] }",
    "...rest: (string | [number, number])[]"
  ].join(", ");

  assert.deepStrictEqual(splitByComma(input), [
    "fn: (a: Map<string, [number, string]>, b: { x: number, y: (k: T) => boolean }) => Record<string, any>",
    "options: { a?: [string, string], b?: Record<K, V> } = { a: [',', ';'] }",
    "...rest: (string | [number, number])[]"
  ]);
});

test("splitByComma: arrow '=>' inside generic parameter list does not underflow angleDepth", () => {
  const input = "a: Array<(x: number) => boolean>, b: Map<string, (y: any) => void>";
  assert.deepStrictEqual(splitByComma(input), [
    "a: Array<(x: number) => boolean>",
    "b: Map<string, (y: any) => void>"
  ]);
});

// ─── 2. formatSignature Extreme Edge Cases ────────────────────────────────────

test("formatSignature: 0 parameters stays on 1 line", () => {
  assert.strictEqual(formatSignature("sum(): ColumnExpr<number>"), "sum(): ColumnExpr<number>");
  assert.strictEqual(formatSignature("all(   )"), "all()");
});

test("formatSignature: 1 simple parameter stays on 1 line", () => {
  assert.strictEqual(formatSignature("add(val: NumericArg)"), "add(val: NumericArg)");
  assert.strictEqual(formatSignature("alias(name: string): this"), "alias(name: string): this");
  assert.strictEqual(
    formatSignature("head(n: number = 5): DataFrame<T>"),
    "head(n: number = 5): DataFrame<T>"
  );
  assert.strictEqual(
    formatSignature("entropy(options: EntropyOptions = { base: Math.E, normalize: true })"),
    "entropy(options: EntropyOptions = { base: Math.E, normalize: true })"
  );
});

test("formatSignature: 1 parameter with callback/arrow type stays on 1 line", () => {
  assert.strictEqual(
    formatSignature("map(fn: (row: T, idx: number) => U): DataFrame<U>"),
    "map(fn: (row: T, idx: number) => U): DataFrame<U>"
  );
});

test("formatSignature: 2+ parameters wrap onto multiple lines", () => {
  assert.strictEqual(
    formatSignature('join(separator: string = ", ", options: JoinArrayOptions = {})'),
    'join(\n  separator: string = ", ",\n  options: JoinArrayOptions = {}\n)'
  );
});

test("formatSignature: generics containing parentheses and arrows before parameter list", () => {
  const sig = "partitionBy<K extends (keyof T & string) | IExpr>(by: K | K[], options: PartitionByOptions = {}): DataFrame<T>[]";
  assert.strictEqual(
    formatSignature(sig),
    "partitionBy<K extends (keyof T & string) | IExpr>(\n  by: K | K[],\n  options: PartitionByOptions = {}\n): DataFrame<T>[]"
  );

  const singleParamGenericSig = "transform<F extends (x: T) => U>(fn: F): DataFrame<U>";
  assert.strictEqual(
    formatSignature(singleParamGenericSig),
    "transform<F extends (x: T) => U>(fn: F): DataFrame<U>"
  );
});

test("formatSignature: 1 destructured parameter expands across multiple lines and strips local variable aliases", () => {
  const sig = 'transpose({ includeHeader = false, headerName = "column", columnNames: colNamesOpt }: TransposeOptions = {}): DataFrame<any>';
  assert.strictEqual(
    formatSignature(sig),
    'transpose(\n  {\n    includeHeader = false,\n    headerName = "column",\n    columnNames\n  }: TransposeOptions = {}\n): DataFrame<any>'
  );
});

test("formatSignature: 1 destructured parameter with inline object type annotation", () => {
  const sig = "iterRows({ named = false }: { named?: boolean } = {}): Generator<any>";
  assert.strictEqual(
    formatSignature(sig),
    "iterRows(\n  {\n    named = false\n  }: { named?: boolean } = {}\n): Generator<any>"
  );
});

// ─── 3. parseJSDocComment Extreme Edge Cases ──────────────────────────────────

test("parseJSDocComment: multi-line @param descriptions and default values", () => {
  const comment = `
   * Joins two DataFrames on key columns.
   *
   * Supports multiple join strategies.
   * @param {DataFrame} other Right DataFrame to join with.
   * @param {JoinOptions} [options={}] Join configuration object.
   * @param {JoinType} [options.how="inner"] Join strategy:
   *   - "inner": matching keys
   *   - "left": all left rows
   * @param {[string, string]} [options.suffixes] Suffix tuple appended to
   *   overlapping non-key column names.
   * @note [Performance]: Hash join is used for equi-joins
   *   and runs in O(N + M) time.
   * @returns {DataFrame<R>} Joined DataFrame.
   * @example
   * >>> df1.join(df2, { on: "id" })
   `;

  const parsed = parseJSDocComment(comment);
  assert.strictEqual(
    parsed.desc,
    "Joins two DataFrames on key columns.\n\nSupports multiple join strategies."
  );
  assert.strictEqual(parsed.params.length, 4);
  assert.strictEqual(parsed.params[1].name, "[options]");
  assert.strictEqual(parsed.params[1].default, "{}");
  assert.strictEqual(parsed.params[2].name, "[options.how]");
  assert.strictEqual(parsed.params[2].default, '"inner"');
  assert.strictEqual(
    parsed.params[2].desc,
    'Join strategy: - "inner": matching keys - "left": all left rows'
  );
  assert.strictEqual(
    parsed.params[3].desc,
    "Suffix tuple appended to overlapping non-key column names."
  );
  assert.deepStrictEqual(parsed.notes, [
    "[Performance]: Hash join is used for equi-joins and runs in O(N + M) time."
  ]);
  assert.strictEqual(parsed.returns, "DataFrame<R>");
  assert.deepStrictEqual(parsed.examples, ['>>> df1.join(df2, { on: "id" })']);
});

// ─── 4. extractSignatureAndEnd & extractRawDocsFromContent Edge Cases ─────────

test("extractRawDocsFromContent: method named 'get' vs getter 'get width'", () => {
  const source = `
    /**
     * @namespace df
     * @category DataFrame
     * @syntax df.{symbol}(...)
     */
    export class Dummy {
      /**
       * Number of columns.
       * @returns {number}
       */
      get width(): number {
        return 2;
      }

      /**
       * Gets element at index.
       * @param index Target index.
       * @param nullOnOob Return null when out of bounds.
       * @returns ColumnExpression
       */
      get(index: number, nullOnOob: boolean = true) {
        return null;
      }
    }
  `;

  const docs = extractRawDocsFromContent(source, "dataframe/dataframe.ts", {});
  assert.ok(docs);
  assert.strictEqual(docs.Dummy, undefined);
  assert.strictEqual(docs.width.signature, "df.width: number");
  assert.strictEqual(docs.width.callExpression, ".width");
  assert.strictEqual(docs.width.propertyAccess, "width");
  assert.strictEqual(docs.width.filePath, "dataframe/dataframe.ts");
  assert.strictEqual(
    docs.get.signature,
    "df.get(\n  index: number,\n  nullOnOob: boolean = true\n)"
  );
  assert.strictEqual(docs.get.callExpression, ".get()");
  assert.strictEqual(docs.get.propertyAccess, "get");
});

test("extractRawDocsFromContent: file-level JSDoc followed by class JSDoc in Exception file", () => {
  const source = `
    /**
     * @namespace Exception
     * @category Exception
     * @syntax throw new {symbol}("message")
     */

    /**
     * Base exception class for all df-script errors.
     */
    export class DFScriptError extends Error {
      constructor(message: string) {
        super(message);
      }
    }

    /**
     * Column missing error.
     */
    export class ColumnNotFoundError extends DFScriptError {
      constructor(columnName: string, message?: string) {
        super(message || columnName);
      }
    }
  `;

  const docs = extractRawDocsFromContent(source, "exceptions/exceptions.ts", {});
  assert.ok(docs);
  assert.strictEqual(docs.DFScriptError.desc, "Base exception class for all df-script errors.");
  assert.strictEqual(docs.DFScriptError.callExpression, "DFScriptError");
  assert.strictEqual(docs.DFScriptError.propertyAccess, "DFScriptError");
  assert.strictEqual(docs.DFScriptError.signature, "new DFScriptError(message: string)");
  assert.strictEqual(docs.ColumnNotFoundError.callExpression, "ColumnNotFoundError");
  assert.strictEqual(docs.ColumnNotFoundError.propertyAccess, "ColumnNotFoundError");
  assert.strictEqual(
    docs.ColumnNotFoundError.signature,
    "new ColumnNotFoundError(\n  columnName: string,\n  message?: string\n)"
  );
});

test("extractSignatureAndEnd: handles braces inside strings and default parameters", () => {
  const code = `foo(a: string = "{ not body }", b: { x: number } = { x: 1 }): boolean { const s = "}"; return true; }`;
  const { signature, endIndex } = extractSignatureAndEnd(code, 3, "foo", false);
  assert.strictEqual(
    signature,
    'foo(a: string = "{ not body }", b: { x: number } = { x: 1 }): boolean'
  );
  assert.strictEqual(code[endIndex], "}");
  assert.strictEqual(endIndex, code.length - 1);
});

// ─── 5. Objective TypeScript Type Extraction ──────────────────────────────────

test("extractTypesFromContent: complex intersections, unions, and generic defaults", () => {
  const sampleCode = `
export type RegisteredDataType = string | number;

export interface CumulativeStepContext {
    /** Accumulated value */
    prev: any;
    index: number;
}

export type SeqRangeOptions = {
    n?: number;
    dtype?: RegisteredDataType;
} & (
    | { mode: "constant" }
    | {
        mode?: "cumulative";
        step?: number | ((context: CumulativeStepContext) => any);
    }
);

export type MappedOps<T extends Record<string, any> = any> = {
    [K in keyof T]: CumulativeStepContext;
};
`;

  const typesMap = extractTypesFromContent(sampleCode, "functions/seqRange.ts");

  assert.ok(typesMap.RegisteredDataType);
  assert.ok(typesMap.CumulativeStepContext);
  assert.ok(typesMap.SeqRangeOptions);
  assert.ok(typesMap.MappedOps);

  assert.strictEqual(typesMap.SeqRangeOptions.filePath, "functions/seqRange.ts");
  assert.strictEqual(typesMap.SeqRangeOptions.lineStart, 10);
  assert.strictEqual(typesMap.SeqRangeOptions.lineEnd, 19);
});

// ─── 6. Full Hierarchy & Flat Types Verification on extractRawDocs() ──────────

test("extractRawDocs: top-level domain keys, columnExpressions hierarchy, and flat types map", () => {
  const allDocs = extractRawDocs();

  assert.deepStrictEqual(Object.keys(allDocs), [
    "columnExpressions",
    "dataframe",
    "datatypes",
    "exceptions",
    "functions",
    "types"
  ]);

  assert.deepStrictEqual(
    Object.keys(allDocs.columnExpressions).sort(),
    ["arrayExpr", "standardExpr", "stringExpr", "structExpr", "temporalExpr"]
  );

  const seqRange = allDocs.functions.seqRange;
  assert.ok(seqRange, "Missing functions.seqRange");
  assert.strictEqual(seqRange.filePath, "functions/seqRange.ts");
  assert.strictEqual(
    seqRange.signature,
    "$df.seqRange(\n  value: any,\n  options: SeqRangeOptions = { strict: true }\n): ColumnExpr<any>"
  );

  const seqRangeOpts = allDocs.types.SeqRangeOptions;
  assert.ok(seqRangeOpts, "Missing types.SeqRangeOptions");
  assert.strictEqual(seqRangeOpts.filePath, "functions/types.ts");
  assert.ok(seqRangeOpts.signature.startsWith("export interface SeqRangeOptions {"));
});

test("Top-level functions (docs.functions): category, namespace, syntax, and signatures", () => {
  const allDocs = extractRawDocs();
  const expectedFunctions = {
    all: {
      filePath: "functions/all.ts",
      signature: "$df.all(): ColumnExpr<any>",
      returns: "ColumnExpr<any>"
    },
    coalesce: {
      filePath: "functions/coalesce.ts",
      signature: "$df.coalesce(...exprs: CoalesceArg[]): ColumnExpr<any>",
      returns: "ColumnExpr<any>"
    },
    col: {
      filePath: "functions/col.ts",
      signature: "$df.col<T = any>(name: ColumnSelector<T>): ColumnExpr<T>",
      returns: "ColumnExpr<T>"
    },
    concat: {
      filePath: "functions/concat.ts",
      signature: "$df.concat<U extends RowRecord = any>(\n  rawItems: ConcatItemsArg,\n  {\n    how = 'vertical',\n    horizontal\n  }: ConcatOptions = {}\n): DataFrame<U>",
      returns: "DataFrame"
    },
    data: {
      filePath: "functions/data.ts",
      signature: "$df.data<T extends RowRecord = any>(\n  data: DataFrameDataArg<T>,\n  schema?: DataFrameSchema\n): DataFrame<T>",
      returns: "DataFrame<T>"
    },
    duration: {
      filePath: "functions/duration.ts",
      signature: "$df.duration(options: DurationArg = {}): ColumnExpr<any>",
      returns: "ColumnExpr<any>"
    },
    element: {
      filePath: "functions/element.ts",
      signature: "$df.element<T = any>(): ColumnExpr<T>",
      returns: "ColumnExpr<T>"
    },
    exclude: {
      filePath: "functions/exclude.ts",
      signature: "$df.exclude(columns: ColumnKeyArg): ColumnExpr<any>",
      returns: "ColumnExpr<any>"
    },
    horizontal: {
      filePath: "functions/horizontal.ts",
      signature: "$df.horizontal(...exprs: IntoExprArg[]): HorizontalExpr",
      returns: "HorizontalExpr"
    },
    implode: {
      filePath: "functions/implode.ts",
      signature: "$df.implode(column: IntoExprArg): ColumnExpr<any>",
      returns: "ColumnExpr<any>"
    },
    lit: {
      filePath: "functions/lit.ts",
      signature: "$df.lit(\n  value: any,\n  options: LitOptions = {}\n): ColumnExpr<any>",
      returns: "ColumnExpr<any>"
    },
    readCsv: {
      filePath: "functions/readCsv.ts",
      signature: "$df.readCsv<T extends RowRecord = any>(\n  content: string,\n  options: ReadCSVOptions = {}\n): DataFrame<T>",
      returns: "DataFrame"
    },
    readJson: {
      filePath: "functions/readJson.ts",
      signature: '$df.readJson(\n  content: string,\n  {\n    format = "json",\n    trimBeforeParse = true,\n    schema,\n    ...parseOpts\n  }: ReadJSONOptions = {}\n): DataFrame<any>',
      returns: "A new DataFrame instance populated with the parsed records."
    },
    seqRange: {
      filePath: "functions/seqRange.ts",
      signature: "$df.seqRange(\n  value: any,\n  options: SeqRangeOptions = { strict: true }\n): ColumnExpr<any>",
      returns: "ColumnExpr<any>"
    },
    struct: {
      filePath: "functions/struct.ts",
      signature: "$df.struct(\n  fields: StructArg,\n  ...moreFields: IntoExpr[]\n): ColumnExpr<any>",
      returns: "ColumnExpr<any>"
    },
    when: {
      filePath: "functions/when.ts",
      signature: "$df.when(predicate: WhenArg): WhenThenChain",
      returns: "WhenThenChain"
    }
  };

  for (const [fnName, expected] of Object.entries(expectedFunctions)) {
    const fnDoc = allDocs.functions[fnName];
    assert.ok(fnDoc, `Missing function symbol '${fnName}' in docs.functions`);
    assert.strictEqual(fnDoc.filePath, expected.filePath, `Expected filePath '${expected.filePath}' for ${fnName}`);
    assert.strictEqual(fnDoc.category, "Function", `Expected category 'Function' for ${fnName}`);
    assert.strictEqual(fnDoc.namespace, "$df", `Expected namespace '$df' for ${fnName}`);
    assert.strictEqual(fnDoc.propertyAccess, fnName, `Unexpected propertyAccess for ${fnName}: ${fnDoc.propertyAccess}`);
    assert.strictEqual(fnDoc.callExpression, `${fnName}()`, `Unexpected callExpression for ${fnName}: ${fnDoc.callExpression}`);
    assert.strictEqual(fnDoc.signature, expected.signature, `Signature mismatch for ${fnName}`);
    assert.strictEqual(fnDoc.returns, expected.returns, `Returns mismatch for ${fnName}`);
    assert.ok(fnDoc.examples && fnDoc.examples.length > 0, `Missing examples for ${fnName}`);
  }
});

// ─── 7. Full Codebase Invariant Audit on extractRawDocs() ─────────────────────

test("Full codebase invariant check: all symbols and types have valid signatures", () => {
  const allDocs = extractRawDocs();
  const typeKeys = Object.keys(allDocs.types);
  assert.ok(typeKeys.length >= 150, `Expected at least 150 extracted types, got ${typeKeys.length}`);

  // 1. Validate all types
  for (const [typeName, typeObj] of Object.entries(allDocs.types)) {
    assert.ok(typeObj.filePath, `Missing filePath in types.${typeName}`);
    assert.ok(typeObj.lineStart >= 1, `Invalid lineStart in types.${typeName}`);
    assert.ok(typeObj.lineEnd >= typeObj.lineStart, `Invalid lineEnd in types.${typeName}`);
    assert.ok(typeObj.signature, `Missing signature in types.${typeName}`);
    assert.strictEqual(typeObj.subTypes, undefined, `Unexpected subTypes in types.${typeName}`);
  }

  // 2. Validate all operations across all categories
  const opGroups = [
    ...Object.entries(allDocs.columnExpressions).map(([k, v]) => [`columnExpressions.${k}`, v]),
    ["dataframe", allDocs.dataframe],
    ["datatypes", allDocs.datatypes],
    ["exceptions", allDocs.exceptions],
    ["functions", allDocs.functions]
  ];

  let totalOps = 0;
  for (const [groupName, symbols] of opGroups) {
    for (const [sym, data] of Object.entries(symbols)) {
      totalOps++;
      const ctx = `${groupName} -> ${sym}`;
      assert.ok(data.filePath, `Missing filePath in ${ctx}`);
      assert.ok(data.signature, `Missing signature in ${ctx}`);
      assert.ok(data.signatureDetailed, `Missing signatureDetailed in ${ctx}`);
      assert.ok(!data.signature.includes("get get("), `Duplicate 'get get(' in ${ctx}: ${data.signature}`);
      assert.ok(!data.signature.includes("Errorextends"), `Corrupted class signature in ${ctx}: ${data.signature}`);
      assert.ok(!data.signature.includes(".get "), `Invalid '.get ' getter syntax in ${ctx}: ${data.signature}`);
      assert.ok(!data.signature.includes('=\n  "'), `Broken string literal split in ${ctx}: ${data.signature}`);
      assert.strictEqual(data.subTypes, undefined, `Unexpected subTypes in ${ctx}`);
      if (data.desc) {
        assert.ok(!data.desc.includes("/**"), `Leaked JSDoc opener in desc of ${ctx}: ${data.desc}`);
        assert.ok(!data.desc.includes("*/"), `Leaked JSDoc closer in desc of ${ctx}: ${data.desc}`);
      }
      if (data.params) {
        for (const p of data.params) {
          assert.ok(!p.name.includes("="), `Unstripped default value in param name '${p.name}' of ${ctx}`);
        }
      }
    }
  }

  assert.ok(totalOps >= 340, `Expected at least 340 documented operations, got ${totalOps}`);
});

// ─── 8. propertyAccess, accessor & callExpression Invariants and Edge Cases ─

test("extractRawDocs: propertyAccess, accessor, and callExpression are populated accurately across all categories", () => {
  const allDocs = extractRawDocs();

  // 1. Column expressions with accessors (arr, str, struct, dt)
  const arrayAgg = allDocs.columnExpressions.arrayExpr?.agg;
  assert.ok(arrayAgg, "Expected arrayExpr.agg to exist");
  assert.strictEqual(arrayAgg.namespace, "$df.col");
  assert.strictEqual(arrayAgg.accessor, "arr");
  assert.strictEqual(arrayAgg.propertyAccess, "agg");
  assert.strictEqual(arrayAgg.callExpression, ".arr.agg()");

  const stringConcat = allDocs.columnExpressions.stringExpr?.concat;
  assert.ok(stringConcat, "Expected stringExpr.concat to exist");
  assert.strictEqual(stringConcat.namespace, "$df.col");
  assert.strictEqual(stringConcat.accessor, "str");
  assert.strictEqual(stringConcat.propertyAccess, "concat");
  assert.strictEqual(stringConcat.callExpression, ".str.concat()");

  const structField = allDocs.columnExpressions.structExpr?.field;
  assert.ok(structField, "Expected structExpr.field to exist");
  assert.strictEqual(structField.namespace, "$df.col");
  assert.strictEqual(structField.accessor, "struct");
  assert.strictEqual(structField.propertyAccess, "field");
  assert.strictEqual(structField.callExpression, ".struct.field()");

  const dtYear = allDocs.columnExpressions.temporalExpr?.year;
  assert.ok(dtYear, "Expected temporalExpr.year to exist");
  assert.strictEqual(dtYear.namespace, "$df.col");
  assert.strictEqual(dtYear.accessor, "dt");
  assert.strictEqual(dtYear.propertyAccess, "year");
  assert.strictEqual(dtYear.callExpression, ".dt.year()");

  // 2. Base / Standard column expressions ($df.col namespace, no accessor)
  const standardAbs = allDocs.columnExpressions.standardExpr?.abs;
  assert.ok(standardAbs, "Expected standardExpr.abs to exist");
  assert.strictEqual(standardAbs.namespace, "$df.col");
  assert.strictEqual(standardAbs.accessor, undefined);
  assert.strictEqual(standardAbs.propertyAccess, "abs");
  assert.strictEqual(standardAbs.callExpression, ".abs()");

  // 3. DataFrame operations
  const dfFilter = allDocs.dataframe?.filter;
  assert.ok(dfFilter, "Expected dataframe.filter to exist");
  assert.strictEqual(dfFilter.namespace, "df");
  assert.strictEqual(dfFilter.accessor, undefined);
  assert.strictEqual(dfFilter.propertyAccess, "filter");
  assert.strictEqual(dfFilter.callExpression, ".filter()");

  const dfShapeGetter = allDocs.dataframe?.shape;
  assert.ok(dfShapeGetter, "Expected dataframe.shape to exist");
  assert.strictEqual(dfShapeGetter.namespace, "df");
  assert.strictEqual(dfShapeGetter.accessor, undefined);
  assert.strictEqual(dfShapeGetter.propertyAccess, "shape");
  assert.strictEqual(dfShapeGetter.callExpression, ".shape");

  // 4. Standalone functions
  const fnCol = allDocs.functions?.col;
  assert.ok(fnCol, "Expected functions.col to exist");
  assert.strictEqual(fnCol.namespace, "$df");
  assert.strictEqual(fnCol.accessor, undefined);
  assert.strictEqual(fnCol.propertyAccess, "col");
  assert.strictEqual(fnCol.callExpression, "col()");

  // 5. Exceptions (classes)
  const errDf = allDocs.exceptions?.DataFrameError;
  assert.ok(errDf, "Expected exceptions.DataFrameError to exist");
  assert.strictEqual(errDf.namespace, "Exception");
  assert.strictEqual(errDf.accessor, undefined);
  assert.strictEqual(errDf.propertyAccess, "DataFrameError");
  assert.strictEqual(errDf.callExpression, "DataFrameError");

  // Invariant across all documented operations
  const allGroups = [
    ...Object.values(allDocs.columnExpressions),
    allDocs.dataframe,
    allDocs.datatypes,
    allDocs.exceptions,
    allDocs.functions
  ];

  for (const group of allGroups) {
    for (const [sym, item] of Object.entries(group)) {
      assert.strictEqual(item.propertyAccess, sym, `propertyAccess must match symbol key '${sym}'`);
      assert.ok(item.callExpression, `callExpression must be defined for '${sym}'`);
      assert.strictEqual(item.name, undefined, `name must be removed for '${sym}'`);
      assert.strictEqual(item.methodName, undefined, `methodName must be removed for '${sym}'`);
      assert.strictEqual(item.qualifiedName, undefined, `qualifiedName must be removed for '${sym}'`);
      if (item.category === "ColumnExpression") {
        assert.strictEqual(item.namespace, "$df.col");
        if (item.accessor) {
          assert.ok(
            item.callExpression.startsWith(`.${item.accessor}.`),
            `Expected callExpression for '${sym}' with accessor '${item.accessor}' to start with '.${item.accessor}.', got '${item.callExpression}'`
          );
        }
      }
    }
  }
});

// ─── 7. extractTypeProperties Comprehensive Edge Cases ───────────────────────

test("extractTypeProperties: basic properties, optional flags, JSDoc desc, and @default tags", () => {
  const sig = `export interface CastOptions {
    /**
     * Whether cast errors should throw or produce null values.
     * @default true
     */
    strict?: boolean;
    targetType: RegisteredDataType;
}`;

  const props = extractTypeProperties(sig);
  assert.ok(props);
  assert.deepStrictEqual(props.strict, {
    type: "boolean",
    optional: true,
    desc: "Whether cast errors should throw or produce null values.",
    default: "true"
  });
  assert.deepStrictEqual(props.targetType, {
    type: "RegisteredDataType",
    optional: false,
    desc: ""
  });
});

test("extractTypeProperties: nested object types with internal braces and string literals", () => {
  const sig = `export type ComplexOptions = {
    mode?: "both" | "start" | "end";
    /**
     * String options dictionary.
     */
    nestedConfig?: {
        literal?: boolean;
        caseInsensitive?: boolean;
    };
    "quoted-prop"?: string | number;
    'single-quoted': boolean;
    _internalFn?: (val: any) => void;
};`;

  const props = extractTypeProperties(sig);
  assert.ok(props);
  assert.strictEqual(props.mode.type, '"both" | "start" | "end"');
  assert.strictEqual(props.mode.optional, true);

  assert.strictEqual(
    props.nestedConfig.type,
    "{ literal?: boolean; caseInsensitive?: boolean; }"
  );
  assert.strictEqual(props.nestedConfig.desc, "String options dictionary.");
  assert.strictEqual(props.nestedConfig.optional, true);

  assert.strictEqual(props["quoted-prop"].type, "string | number");
  assert.strictEqual(props["quoted-prop"].optional, true);

  assert.strictEqual(props["single-quoted"].type, "boolean");
  assert.strictEqual(props["single-quoted"].optional, false);

  assert.strictEqual(props._internalFn.type, "(val: any) => void");
});

test("extractTypeProperties: interface with methods skips method declarations", () => {
  const sig = `export interface IExpr {
    _ops: OpFn[];
    _colName?: string;
    alias(name: string): this;
    cast(dataType: RegisteredDataType, options?: CastOptions): this;
    _resolve(val: any, columns: ColumnDict, height: number): ColumnData | any;
}`;

  const props = extractTypeProperties(sig);
  assert.ok(props);
  assert.strictEqual(Object.keys(props).length, 2);
  assert.strictEqual(props._ops.type, "OpFn[]");
  assert.strictEqual(props._ops.optional, false);
  assert.strictEqual(props._colName.type, "string");
  assert.strictEqual(props._colName.optional, true);
  assert.strictEqual(props.alias, undefined);
  assert.strictEqual(props.cast, undefined);
  assert.strictEqual(props._resolve, undefined);
});

test("extractTypeProperties: union or non-object signatures return undefined", () => {
  assert.strictEqual(extractTypeProperties("export type TimeUnit = 's' | 'ms' | 'us' | 'ns';"), undefined);
  assert.strictEqual(extractTypeProperties(""), undefined);
  assert.strictEqual(extractTypeProperties(null), undefined);
});

test("resolveTypeAliasString, resolveTypeProperties, and buildFunctionTypeTree: Omit, Pick, Partial, extends, unions, inline objects, and generic aliases", () => {
  const src = `
    /** Base A */
    export interface BaseA {
      /** Prop a */
      a?: number;
    }
    /** Base B */
    export interface BaseB {
      /** Prop b @default true */
      b?: boolean;
      /** Prop c */
      c?: string;
    }
    /** Child extending BaseA and BaseB */
    export interface ChildOpts extends BaseA, BaseB {
      /** Nested inline */
      nested?: {
        /** Inner flag @default false */
        flag?: boolean;
      };
      /** Sub options ref */
      sub?: SubOpts;
    }
    /** Sub options */
    export interface SubOpts {
      /** Strict mode @default true */
      strict?: boolean;
    }
    /** Omitted options */
    export type OmittedOpts = Omit<ChildOpts, "b" | "c">;
    /** Picked options */
    export type PickedOpts = Pick<ChildOpts, "a" | "b">;
    /** Partial options */
    export type PartialSub = Partial<SubOpts>;
    /** Generic key arg */
    export type KeyArg<K = string> = K | K[];
    /** Chained alias */
    export type ChainedKeyArg = KeyArg<number>;
    /** Union with options */
    export type UnionOptsArg = SubOpts | string;
  `;

  const typesMap = extractTypesFromContent(src, "test.ts");

  // 1. Generic & chained alias resolution
  assert.strictEqual(resolveTypeAliasString("KeyArg", typesMap), "string | string[]");
  assert.strictEqual(resolveTypeAliasString("KeyArg<boolean>", typesMap), "boolean | boolean[]");
  assert.strictEqual(resolveTypeAliasString("ChainedKeyArg", typesMap), "number | number[]");
  assert.strictEqual(resolveTypeAliasString("ChainedKeyArg[]", typesMap), "(number | number[])[]");

  // 2. Multi-interface extends + inline object + nested options resolution
  const childProps = resolveTypeProperties("ChildOpts", typesMap);
  assert.deepStrictEqual(Object.keys(childProps), ["a", "b", "c", "nested", "sub"]);
  assert.strictEqual(childProps.b.default, "true");
  assert.strictEqual(childProps.nested.type, "object");
  assert.strictEqual(childProps.nested.properties.flag.default, "false");
  assert.strictEqual(childProps.sub.properties.strict.default, "true");

  // 3. Omit & Pick resolution
  const omittedProps = resolveTypeProperties("OmittedOpts", typesMap);
  assert.deepStrictEqual(Object.keys(omittedProps), ["a", "nested", "sub"]);
  const pickedProps = resolveTypeProperties("PickedOpts", typesMap);
  assert.deepStrictEqual(Object.keys(pickedProps), ["a", "b"]);

  // 4. Union containing options interface (`SubOpts | string`)
  const unionProps = resolveTypeProperties("UnionOptsArg", typesMap);
  assert.deepStrictEqual(Object.keys(unionProps), ["strict"]);

  // 5. buildFunctionTypeTree with destructured, variadic, and optional params
  const fnTree = buildFunctionTypeTree(
    "myFn(items: ChainedKeyArg, { a, sub }: OmittedOpts = {}, ...rest: UnionOptsArg[]): void",
    [
      { name: "items", desc: "Input items." },
      { name: "[options]", desc: "Configuration options." },
      { name: "...rest", desc: "Variadic union args." }
    ],
    typesMap
  );
  assert.ok(fnTree);
  assert.strictEqual(fnTree.items.resolvedType, "number | number[]");
  assert.strictEqual(fnTree.items.optional, false);
  assert.strictEqual(fnTree.options.type, "OmittedOpts");
  assert.strictEqual(fnTree.options.optional, true);
  assert.strictEqual(fnTree.options.default, "{}");
  assert.deepStrictEqual(Object.keys(fnTree.options.properties), ["a", "nested", "sub"]);
  assert.strictEqual(fnTree.rest.variadic, true);
  assert.strictEqual(fnTree.rest.resolvedType, "(SubOpts | string)[]");
  assert.deepStrictEqual(Object.keys(fnTree.rest.properties), ["strict"]);
});

test("extractRawDocs: verifies real project typeTree for ewmVar, concat, readJson, and duration", () => {
  const allDocs = extractRawDocs();

  // ewmVar: EwmVarOptions = Omit<EwmOptions, 'bias' | 'fisher'>
  const ewmVarTree = allDocs.columnExpressions.standardExpr.ewmVar.typeTree;
  assert.ok(ewmVarTree && ewmVarTree.options && ewmVarTree.options.properties);
  assert.deepStrictEqual(Object.keys(ewmVarTree.options.properties), [
    "adjust",
    "alpha",
    "by",
    "com",
    "halfLife",
    "ignoreNulls",
    "minSamples",
    "span"
  ]);
  assert.strictEqual(ewmVarTree.options.properties.by.resolvedType, "string | IExpr");
  assert.strictEqual(ewmVarTree.options.properties.halfLife.resolvedType, "number | string");
  assert.strictEqual(ewmVarTree.options.properties.by.properties, undefined); // IExpr is opaque

  // concat: nested HorizontalConcatOptions inside ConcatOptions + 2-step alias ConcatItemsArg
  const concatTree = allDocs.dataframe.concat.typeTree;
  assert.strictEqual(concatTree.items.resolvedType, "ConcatItem | ConcatItem[]");
  assert.strictEqual(concatTree.options.properties.horizontal.properties.strict.default, "true");

  // duration: union DurationArg = DurationOptions | string has both resolvedType and properties
  const durationTree = allDocs.functions.duration.typeTree;
  assert.strictEqual(durationTree.options.resolvedType, "DurationOptions | string");
  assert.ok(durationTree.options.properties.days);
});

// ─── 9. Extreme Complex Type Edge Cases for typeTree & Type Resolution ───────

test("Extreme edge cases: nested utility types (Partial<Omit<...>>, Required<Pick<...>>, Readonly<...>) and empty Omit", () => {
  const src = `
    export interface CoreOpts {
      /** Alpha @default 1 */
      alpha?: number;
      /** Beta */
      beta: string;
      /** Gamma @default false */
      gamma?: boolean;
      /** Delta */
      delta: number[];
    }
    export type NestedPartialOmit = Partial<Omit<CoreOpts, "delta" | "gamma">>;
    export type NestedRequiredPick = Required<Pick<CoreOpts, "alpha" | "gamma">>;
    export type NestedReadonlyOmitPick = Readonly<Omit<Pick<CoreOpts, "alpha" | "beta" | "gamma">, "beta">>;
    export type EmptyOmit = Omit<Pick<CoreOpts, "alpha">, "alpha">;
  `;
  const typesMap = extractTypesFromContent(src, "nested.ts");

  const partialOmit = resolveTypeProperties("NestedPartialOmit", typesMap);
  assert.deepStrictEqual(Object.keys(partialOmit), ["alpha", "beta"]);
  assert.strictEqual(partialOmit.alpha.optional, true);
  assert.strictEqual(partialOmit.beta.optional, true);

  const reqPick = resolveTypeProperties("NestedRequiredPick", typesMap);
  assert.deepStrictEqual(Object.keys(reqPick), ["alpha", "gamma"]);
  assert.strictEqual(reqPick.alpha.optional, false);
  assert.strictEqual(reqPick.gamma.optional, false);

  const roOmitPick = resolveTypeProperties("NestedReadonlyOmitPick", typesMap);
  assert.deepStrictEqual(Object.keys(roOmitPick), ["alpha", "gamma"]);

  const emptyOmit = resolveTypeProperties("EmptyOmit", typesMap);
  assert.strictEqual(emptyOmit, undefined);
});

test("Extreme edge cases: intersections (&), multi-path discriminated unions (|), and inline object types", () => {
  const src = `
    export interface BaseConfig {
      /** Strict mode @default true */
      strict?: boolean;
    }
    export interface ExtraConfig {
      /** Limit count */
      limit?: number;
    }
    export type IntersectedOpts = BaseConfig & ExtraConfig & {
      /** Inline readonly mode @default "fast" */
      readonly mode?: "fast" | "accurate";
      /** Deep inline object */
      nested?: {
        /** Retries @default 3 */
        retries?: number;
      };
    };
    export type DiscriminatedWindowOpts =
      | {
          /** Window strategy */
          kind: "rolling";
          /** Window size */
          windowSize: number;
          /** Minimum samples @default 1 */
          minSamples?: number;
        }
      | {
          kind: "expanding";
          minSamples?: number;
          /** Center window @default false */
          center?: boolean;
        };
    export type CombinedIntersectionUnion = BaseConfig & DiscriminatedWindowOpts;
  `;
  const typesMap = extractTypesFromContent(src, "complex.ts");

  const interProps = resolveTypeProperties("IntersectedOpts", typesMap);
  assert.deepStrictEqual(Object.keys(interProps), ["limit", "mode", "nested", "strict"]);
  assert.strictEqual(interProps.mode.type, '"fast" | "accurate"');
  assert.strictEqual(interProps.mode.default, '"fast"');
  assert.strictEqual(interProps.nested.type, "object");
  assert.strictEqual(interProps.nested.properties.retries.default, "3");

  const unionProps = resolveTypeProperties("DiscriminatedWindowOpts", typesMap);
  assert.deepStrictEqual(Object.keys(unionProps), ["center", "kind", "minSamples", "windowSize"]);
  assert.strictEqual(unionProps.kind.type, '"rolling" | "expanding"');
  assert.strictEqual(unionProps.kind.optional, false);
  assert.strictEqual(unionProps.windowSize.optional, true);
  assert.strictEqual(unionProps.center.optional, true);
  assert.strictEqual(unionProps.minSamples.optional, true);
  assert.strictEqual(unionProps.minSamples.default, "1");

  const combinedProps = resolveTypeProperties("CombinedIntersectionUnion", typesMap);
  assert.deepStrictEqual(Object.keys(combinedProps), ["center", "kind", "minSamples", "strict", "windowSize"]);
});

test("Extreme edge cases: generic interfaces, generic extends, property-name collision with generic param T, and Array/ReadonlyArray aliases", () => {
  const src = `
    export interface MetaInfo {
      /** Source tag */
      source?: string;
    }
    export interface BaseBox<T = string> {
      /** Default item */
      defaultItem?: T;
    }
    export interface PagedBox<T = string, M = MetaInfo> extends BaseBox<T> {
      /** Items array */
      items: T[];
      /** Metadata */
      meta?: M;
      /** Property literally named T should not have its key replaced */
      T?: boolean;
    }
    export type KeyOrArr<K = string> = K | K[];
    export type NullableKeyOrArr<K = string> = KeyOrArr<K> | null | undefined;
  `;
  const typesMap = extractTypesFromContent(src, "generics.ts");

  const defaultBox = resolveTypeProperties("PagedBox", typesMap);
  assert.strictEqual(defaultBox.defaultItem.type, "string");
  assert.strictEqual(defaultBox.items.type, "string[]");
  assert.strictEqual(defaultBox.T.type, "boolean");
  assert.deepStrictEqual(Object.keys(defaultBox.meta.properties), ["source"]);

  const numBox = resolveTypeProperties("PagedBox<number, { customFlag?: boolean }>", typesMap);
  assert.strictEqual(numBox.defaultItem.type, "number");
  assert.strictEqual(numBox.items.type, "number[]");
  assert.strictEqual(numBox.T.type, "boolean");
  assert.strictEqual(numBox.meta.type, "object");
  assert.deepStrictEqual(Object.keys(numBox.meta.properties), ["customFlag"]);

  assert.strictEqual(
    resolveTypeAliasString("NullableKeyOrArr<number>", typesMap),
    "number | number[] | null | undefined"
  );
  assert.strictEqual(
    resolveTypeAliasString("Array<KeyOrArr<boolean>>", typesMap),
    "Array<boolean | boolean[]>"
  );
  assert.strictEqual(
    resolveTypeAliasString("ReadonlyArray<KeyOrArr<number>>", typesMap),
    "ReadonlyArray<number | number[]>"
  );
  assert.strictEqual(
    resolveTypeAliasString("((KeyOrArr<string>))[]", typesMap),
    "(string | string[])[]"
  );
});

test("Extreme edge cases: circular/self-referential types and declarative @internal / _ suppression", () => {
  const src = `
    export interface TreeNodeOpts {
      /** Node label */
      label: string;
      /** Child nodes */
      children?: TreeNodeOpts[];
    }
    export interface MutualA {
      /** Name A */
      nameA: string;
      /** Ref B */
      b?: MutualB;
    }
    export interface MutualB {
      /** Name B */
      nameB: string;
      /** Ref A */
      a?: MutualA;
    }
    export type RecursiveAlias = string | RecursiveAlias[];

    /**
     * Internal engine state type.
     * @internal
     */
    export interface MarkedInternalType {
      /** Secret field */
      secret: string;
    }

    export interface MixedVisibilityOpts {
      _privateState?: any;
      [key: string]: any;
      /**
       * Hidden internal prop.
       * @internal
       */
      hiddenProp?: number;
      /** Public visible prop @default "ok" */
      publicProp?: string;
    }
  `;
  const typesMap = extractTypesFromContent(src, "cycles.ts");

  const treeProps = resolveTypeProperties("TreeNodeOpts", typesMap);
  assert.deepStrictEqual(Object.keys(treeProps), ["children", "label"]);
  assert.strictEqual(treeProps.children.properties, undefined);

  const mutualAProps = resolveTypeProperties("MutualA", typesMap);
  assert.deepStrictEqual(Object.keys(mutualAProps), ["b", "nameA"]);
  assert.deepStrictEqual(Object.keys(mutualAProps.b.properties), ["a", "nameB"]);
  assert.strictEqual(mutualAProps.b.properties.a.properties, undefined);

  assert.ok(resolveTypeAliasString("RecursiveAlias", typesMap));
  assert.strictEqual(resolveTypeProperties("MarkedInternalType", typesMap), undefined);

  const mixedProps = resolveTypeProperties("MixedVisibilityOpts", typesMap);
  assert.deepStrictEqual(Object.keys(mixedProps), ["publicProp"]);

  const parsedJsdoc = parseJSDocComment(`
    * Runs action.
    * @param {MixedVisibilityOpts} [options={}] Main options.
    * @param {string} [options.publicProp="overridden"] Overridden public prop description.
    * @param {MixedVisibilityOpts} [suppressedOpts] @internal Do not expand this argument.
  `);

  const fnTree = buildFunctionTypeTree(
    "runAction(options: MixedVisibilityOpts = {}, suppressedOpts?: MixedVisibilityOpts): void",
    parsedJsdoc.params,
    typesMap
  );
  assert.strictEqual(fnTree.options.properties.publicProp.desc, "Overridden public prop description.");
  assert.strictEqual(fnTree.options.properties.publicProp.default, '"overridden"');
  assert.strictEqual(fnTree.suppressedOpts.properties, undefined);
  assert.strictEqual(fnTree.suppressedOpts.desc, "Do not expand this argument.");
});

test("Full codebase typeTree invariant audit: 0 missing descriptions, 0 leaked internal/_/index properties across all 210+ parameterized operations", () => {
  const allDocs = extractRawDocs();
  const opGroups = [
    ...Object.entries(allDocs.columnExpressions).map(([k, v]) => [`columnExpressions.${k}`, v]),
    ["dataframe", allDocs.dataframe],
    ["functions", allDocs.functions]
  ];

  let treeCount = 0;
  function assertValidProps(propsMap, ctx) {
    const keys = Object.keys(propsMap);
    assert.ok(keys.length > 0, `Empty properties map in ${ctx}`);
    assert.deepStrictEqual(keys, [...keys].sort((a, b) => a.localeCompare(b)), `Unsorted property keys in ${ctx}`);

    for (const [k, prop] of Object.entries(propsMap)) {
      assert.ok(!k.startsWith("_"), `Leaked internal '_' property '${k}' in ${ctx}`);
      assert.ok(!k.startsWith("["), `Leaked index/mapped property '${k}' in ${ctx}`);
      assert.strictEqual(prop.internal, undefined, `Leaked internal flag on '${k}' in ${ctx}`);
      assert.ok(typeof prop.type === "string" && prop.type.length > 0, `Missing type on '${k}' in ${ctx}`);
      assert.strictEqual(typeof prop.optional, "boolean", `Missing boolean optional on '${k}' in ${ctx}`);
      assert.ok(typeof prop.desc === "string" && prop.desc.trim().length > 0, `Empty desc on '${k}' in ${ctx}`);
      if (prop.properties) {
        assertValidProps(prop.properties, `${ctx}.${k}`);
      }
    }
  }

  for (const [groupName, symbols] of opGroups) {
    for (const [sym, data] of Object.entries(symbols)) {
      if (!data.typeTree) continue;
      treeCount++;
      for (const [paramKey, node] of Object.entries(data.typeTree)) {
        const ctx = `${groupName}.${sym}(${paramKey})`;
        assert.ok(typeof node.type === "string" && node.type.length > 0, `Missing type in ${ctx}`);
        assert.strictEqual(typeof node.optional, "boolean", `Missing boolean optional in ${ctx}`);
        assert.ok(typeof node.desc === "string" && node.desc.trim().length > 0, `Empty param desc in ${ctx}`);
        if (node.properties) {
          assertValidProps(node.properties, ctx);
        }
      }
    }
  }

  assert.ok(treeCount >= 210, `Expected at least 210 operations with typeTree, got ${treeCount}`);
});

// ─── 10. buildDetailedSignature & signatureDetailed Edge Cases ────────────────

test("buildDetailedSignature: 0-param, getters, and simple 1-param methods stay on 1 line", () => {
  assert.strictEqual(
    buildDetailedSignature("df.width: number", undefined),
    "df.width: number"
  );
  assert.strictEqual(
    buildDetailedSignature("$df.col(<column_name>).sum()", undefined),
    "$df.col(<column_name>).sum()"
  );
  assert.strictEqual(
    buildDetailedSignature("df.head(n: number = 5): DataFrame<T>", {
      n: {
        type: "number",
        optional: true,
        default: "5",
        desc: "Number of rows."
      }
    }),
    "df.head(n: number = 5): DataFrame<T>"
  );
  // Single optional param without default keeps `?`
  assert.strictEqual(
    buildDetailedSignature("df.limit(n?: number): DataFrame<T>", {
      n: {
        type: "number",
        optional: true,
        desc: "Row limit."
      }
    }),
    "df.limit(n?: number): DataFrame<T>"
  );
  // Single variadic param with resolvedType
  assert.strictEqual(
    buildDetailedSignature("$df.coalesce(...exprs: CoalesceArg[]): ColumnExpr<any>", {
      exprs: {
        type: "CoalesceArg[]",
        optional: false,
        variadic: true,
        resolvedType: "(IntoExprArg | ValidScalarTypes)[]",
        desc: "Expressions."
      }
    }),
    "$df.coalesce(...exprs: (IntoExprArg | ValidScalarTypes)[]): ColumnExpr<any>"
  );
});

test("buildDetailedSignature: expands 1-level and multi-level nested option properties with defaults and resolved types", () => {
  const allDocs = extractRawDocs();

  // 1. arrayExpr.join (separator + JoinArrayOptions)
  const arrJoin = allDocs.columnExpressions.arrayExpr.join;
  assert.strictEqual(
    arrJoin.signature,
    '$df.col(<column_name>).arr.join(\n  separator: string = ",",\n  options: JoinArrayOptions = {}\n)'
  );
  assert.strictEqual(
    arrJoin.signatureDetailed,
    [
      "$df.col(<column_name>).arr.join(",
      '  separator: string = ",",',
      "  options: {",
      "    ignoreNulls?: boolean = false,",
      "    limit?: number,",
      '    nullValue?: string = "",',
      '    prefix?: string = "",',
      '    suffix?: string = "",',
      '    truncationMarker?: string = "...",',
      "    valueFormatter?: (val: any, index: number) => string",
      "  } = {}",
      ")"
    ].join("\n")
  );

  // 2. standardExpr.ewmKurt (single options param without default `= {}` expands across multiple lines)
  const ewmKurt = allDocs.columnExpressions.standardExpr.ewmKurt;
  assert.strictEqual(
    ewmKurt.signature,
    "$df.col(<column_name>).ewmKurt(options: EwmKurtOptions)"
  );
  assert.strictEqual(
    ewmKurt.signatureDetailed,
    [
      "$df.col(<column_name>).ewmKurt(",
      "  options: {",
      "    adjust?: boolean = true,",
      "    alpha?: number,",
      "    bias?: boolean = false,",
      "    by?: string | IExpr,",
      "    com?: number,",
      "    fisher?: boolean = true,",
      "    halfLife?: number | string,",
      "    ignoreNulls?: boolean = false,",
      "    minSamples?: number = 1,",
      "    span?: number",
      "  }",
      ")"
    ].join("\n")
  );

  // 3. dataframe.concat (destructured options in raw TS normalized to `options: { ... } = {}` with 2-level nested `horizontal`)
  const dfConcat = allDocs.dataframe.concat;
  assert.strictEqual(
    dfConcat.signatureDetailed,
    [
      "df.concat<U extends RowRecord = any>(",
      "  items: ConcatItem | ConcatItem[],",
      "  options: {",
      "    horizontal?: {",
      "      strict?: boolean = true",
      "    },",
      '    how?: "vertical" | "horizontal" | "diagonal" = "vertical"',
      "  } = {}",
      "): DataFrame<U>"
    ].join("\n")
  );

  // 4. functions.concat (preserves generics `<U extends RowRecord = any>` and return type `: DataFrame<U>`)
  const fnConcat = allDocs.functions.concat;
  assert.strictEqual(
    fnConcat.signatureDetailed,
    [
      "$df.concat<U extends RowRecord = any>(",
      "  rawItems: ConcatItem | ConcatItem[],",
      "  options: {",
      "    horizontal?: {",
      "      strict?: boolean = true",
      "    },",
      '    how?: "vertical" | "horizontal" | "diagonal" = "vertical"',
      "  } = {}",
      "): DataFrame<U>"
    ].join("\n")
  );
});

test("buildDetailedSignature: synthetic 3-level deep nesting, callbacks with '=>' in generics, and internal suppression", () => {
  const src = `
    export type ValueOrList<T = string> = T | T[];
    export interface Level3Opts {
      /** Deep flag @default true */
      deepFlag?: boolean;
      /** Transform callback */
      transform?: (x: number) => ValueOrList<string>;
    }
    export interface Level2Opts {
      /** Level 3 config */
      level3?: Level3Opts;
      /** Retries @default 3 */
      retries?: number;
    }
    export interface Level1Opts {
      /** Level 2 config */
      level2?: Level2Opts;
      /** Mode @default "auto" */
      mode?: ValueOrList<"auto" | "manual">;
      /** @internal */
      hiddenSecret?: string;
    }
  `;
  const typesMap = extractTypesFromContent(src, "deep.ts");
  for (const [k, v] of Object.entries(typesMap)) {
    const props = resolveTypeProperties(k, typesMap);
    if (props) v.properties = props;
  }

  const rawSig = "execute<T extends (a: number) => boolean>(target: ValueOrList<number>, { mode = \"auto\" }: Level1Opts = {}, ...tags: string[]): Promise<boolean>";
  const formattedSig = formatSignature(rawSig);
  const tree = buildFunctionTypeTree(
    rawSig,
    [
      { name: "target", desc: "Target input." },
      { name: "[options]", desc: "Execution options." },
      { name: "...tags", desc: "Extra tags." }
    ],
    typesMap
  );

  const detailed = buildDetailedSignature(formattedSig, tree);
  assert.strictEqual(
    detailed,
    [
      "execute<T extends (a: number) => boolean>(",
      "  target: number | number[],",
      "  options: {",
      "    level2?: {",
      "      level3?: {",
      "        deepFlag?: boolean = true,",
      "        transform?: (x: number) => ValueOrList<string>",
      "      },",
      "      retries?: number = 3",
      "    },",
      '    mode?: "auto" | "manual" | ("auto" | "manual")[] = "auto"',
      "  } = {},",
      "  ...tags: string[]",
      "): Promise<boolean>"
    ].join("\n")
  );
});

test("Full codebase signatureDetailed invariant audit: balanced delimiters and no leaked internal properties", () => {
  const allDocs = extractRawDocs();
  const opGroups = [
    ...Object.entries(allDocs.columnExpressions).map(([k, v]) => [`columnExpressions.${k}`, v]),
    ["dataframe", allDocs.dataframe],
    ["datatypes", allDocs.datatypes],
    ["exceptions", allDocs.exceptions],
    ["functions", allDocs.functions]
  ];

  for (const [groupName, symbols] of opGroups) {
    for (const [sym, data] of Object.entries(symbols)) {
      const ctx = `${groupName}.${sym}`;
      const sig = data.signatureDetailed;
      assert.ok(typeof sig === "string" && sig.length > 0, `Empty signatureDetailed in ${ctx}`);

      if (!data.typeTree) {
        assert.strictEqual(sig, data.signature, `Expected signatureDetailed === signature when no typeTree in ${ctx}`);
      } else {
        // Ensure top-level parentheses are balanced
        const openIdx = sig.indexOf("(");
        assert.ok(openIdx !== -1, `Missing '(' in signatureDetailed of ${ctx}`);
        assert.ok(!sig.includes(": undefined ="), `Unexpected ': undefined =' in signatureDetailed of ${ctx}: ${sig}`);
        assert.ok(!sig.includes("= undefined"), `Unexpected '= undefined' in signatureDetailed of ${ctx}: ${sig}`);
        assert.ok(!sig.includes("?: ") || !sig.match(/\?:\s*[^,\n]+=\s*[^,\n]+\s*\?/), `Malformed optional default in ${ctx}`);
      }
    }
  }
});

console.log(`✅ All ${passed} test suites in scripts/_tests/extract-docs.test.mjs passed!`);
