import assert from "assert";
import {
  splitByComma,
  formatSignature,
  parseJSDocComment,
  extractSignatureAndEnd,
  extractTypesFromContent,
  extractSubTypes,
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

// ─── 5. Objective TypeScript Type & SubType Extraction ────────────────────────

test("extractTypesFromContent & extractSubTypes: complex intersections, unions, and generic defaults", () => {
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
  for (const [k, v] of Object.entries(typesMap)) {
    v.subTypes = extractSubTypes(v.signature, typesMap, k);
  }

  assert.ok(typesMap.RegisteredDataType);
  assert.ok(typesMap.CumulativeStepContext);
  assert.ok(typesMap.SeqRangeOptions);
  assert.ok(typesMap.MappedOps);

  assert.deepStrictEqual(typesMap.SeqRangeOptions.subTypes, [
    "RegisteredDataType",
    "CumulativeStepContext"
  ]);
  assert.deepStrictEqual(typesMap.MappedOps.subTypes, ["CumulativeStepContext"]);
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
    ["arrayExpr", "exprBase", "standardExpr", "stringExpr", "structExpr", "temporalExpr"]
  );

  // VerifySeqRange & its subTypes chain
  const seqRange = allDocs.functions.seqRange;
  assert.ok(seqRange, "Missing functions.seqRange");
  assert.strictEqual(seqRange.filePath, "functions/seqRange.ts");
  assert.strictEqual(
    seqRange.signature,
    "$df.seqRange(\n  value: any,\n  options: SeqRangeOptions = { strict: true }\n): ColumnExpr<any>"
  );
  assert.deepStrictEqual(seqRange.subTypes, ["SeqRangeOptions", "ColumnExpr"]);

  const seqRangeOpts = allDocs.types.SeqRangeOptions;
  assert.ok(seqRangeOpts, "Missing types.SeqRangeOptions");
  assert.strictEqual(seqRangeOpts.filePath, "functions/seqRange.ts");
  assert.deepStrictEqual(seqRangeOpts.subTypes, [
    "RegisteredDataType",
    "CumulativeStepContext",
    "IndependentStepContext"
  ]);
  assert.ok(seqRangeOpts.signature.startsWith("export type SeqRangeOptions = {"));

  for (const subKey of seqRangeOpts.subTypes) {
    assert.ok(allDocs.types[subKey], `Missing subType '${subKey}' in docs.types`);
  }
});

test("Top-level functions (docs.functions): category, namespace, syntax, and signatures", () => {
  const allDocs = extractRawDocs();
  const expectedFunctions = {
    all: {
      filePath: "functions/all.ts",
      signature: "$df.all(): ColumnExpr<any>",
      returns: "ColumnExpr<any>",
      subTypes: ["ColumnExpr"]
    },
    coalesce: {
      filePath: "functions/coalesce.ts",
      signature: "$df.coalesce(...exprs: (IExpr | ValidScalarTypes | (IExpr | ValidScalarTypes)[])[]): ColumnExpr<any>",
      returns: "ColumnExpr<any>",
      subTypes: ["IExpr", "ValidScalarTypes", "ColumnExpr"]
    },
    col: {
      filePath: "functions/col.ts",
      signature: "$df.col<T = any>(name: ColumnSelector<T>): ColumnExpr<T>",
      returns: "ColumnExpr<T>",
      subTypes: ["ColumnSelector", "ColumnExpr"]
    },
    concat: {
      filePath: "functions/concat.ts",
      signature: "$df.concat<U extends RowRecord = any>(\n  rawItems: ConcatItem | ConcatItem[],\n  {\n    how = 'vertical',\n    horizontal\n  }: ConcatOptions = {}\n): DataFrame<U>",
      returns: "DataFrame",
      subTypes: ["RowRecord", "ConcatItem", "ConcatOptions"]
    },
    data: {
      filePath: "functions/data.ts",
      signature: "$df.data<T extends RowRecord = any>(\n  data: T[] | ColumnDict,\n  schema?: DataFrameSchema\n): DataFrame<T>",
      returns: "DataFrame<T>",
      subTypes: ["RowRecord", "ColumnDict", "DataFrameSchema"]
    },
    duration: {
      filePath: "functions/duration.ts",
      signature: "$df.duration(options: DurationOptions | string = {}): ColumnExpr<any>",
      returns: "ColumnExpr<any>",
      subTypes: ["DurationOptions", "ColumnExpr"]
    },
    element: {
      filePath: "functions/element.ts",
      signature: "$df.element<T = any>(): ColumnExpr<T>",
      returns: "ColumnExpr<T>",
      subTypes: ["ColumnExpr"]
    },
    exclude: {
      filePath: "functions/exclude.ts",
      signature: "$df.exclude(columns: string | string[]): ColumnExpr<any>",
      returns: "ColumnExpr<any>",
      subTypes: ["ColumnExpr"]
    },
    horizontal: {
      filePath: "functions/horizontal.ts",
      signature: "$df.horizontal(...exprs: (IntoExpr | IntoExpr[])[]): HorizontalExpr",
      returns: "HorizontalExpr",
      subTypes: ["IntoExpr", "HorizontalExpr"]
    },
    implode: {
      filePath: "functions/implode.ts",
      signature: "$df.implode(column: IntoExpr | IntoExpr[]): ColumnExpr<any>",
      returns: "ColumnExpr<any>",
      subTypes: ["IntoExpr", "ColumnExpr"]
    },
    lit: {
      filePath: "functions/lit.ts",
      signature: "$df.lit(\n  value: any,\n  options: LitOptions = {}\n): ColumnExpr<any>",
      returns: "ColumnExpr<any>",
      subTypes: ["LitOptions", "ColumnExpr"]
    },
    readCsv: {
      filePath: "functions/readCsv.ts",
      signature: "$df.readCsv<T extends RowRecord = any>(\n  content: string,\n  options: ReadCSVOptions = {}\n): DataFrame<T>",
      returns: "DataFrame",
      subTypes: ["RowRecord", "ReadCSVOptions"]
    },
    readJson: {
      filePath: "functions/readJson.ts",
      signature: '$df.readJson(\n  content: string,\n  {\n    format = "json",\n    trimBeforeParse = true,\n    schema,\n    ...parseOpts\n  }: ReadJSONOptions = {}\n): DataFrame<any>',
      returns: "A new DataFrame instance populated with the parsed records.",
      subTypes: ["ReadJSONOptions"]
    },
    seqRange: {
      filePath: "functions/seqRange.ts",
      signature: "$df.seqRange(\n  value: any,\n  options: SeqRangeOptions = { strict: true }\n): ColumnExpr<any>",
      returns: "ColumnExpr<any>",
      subTypes: ["SeqRangeOptions", "ColumnExpr"]
    },
    struct: {
      filePath: "functions/struct.ts",
      signature: "$df.struct(\n  fields: IntoExpr[] | Record<string, IntoExpr> | IntoExpr,\n  ...moreFields: IntoExpr[]\n): ColumnExpr<any>",
      returns: "ColumnExpr<any>",
      subTypes: ["IntoExpr", "ColumnExpr"]
    },
    when: {
      filePath: "functions/when.ts",
      signature: "$df.when(predicate: WhenArg): WhenThenChain",
      returns: "WhenThenChain",
      subTypes: ["WhenArg"]
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
    assert.deepStrictEqual(fnDoc.subTypes, expected.subTypes, `subTypes mismatch for ${fnName}`);
    assert.ok(fnDoc.examples && fnDoc.examples.length > 0, `Missing examples for ${fnName}`);
  }
});

// ─── 7. Full Codebase Invariant Audit on extractRawDocs() ─────────────────────

test("Full codebase invariant check: all symbols and types have valid signatures and subTypes", () => {
  const allDocs = extractRawDocs();
  const typeKeys = Object.keys(allDocs.types);
  assert.ok(typeKeys.length >= 150, `Expected at least 150 extracted types, got ${typeKeys.length}`);

  // 1. Validate all types
  for (const [typeName, typeObj] of Object.entries(allDocs.types)) {
    assert.ok(typeObj.filePath, `Missing filePath in types.${typeName}`);
    assert.ok(typeObj.lineStart >= 1, `Invalid lineStart in types.${typeName}`);
    assert.ok(typeObj.lineEnd >= typeObj.lineStart, `Invalid lineEnd in types.${typeName}`);
    assert.ok(typeObj.signature, `Missing signature in types.${typeName}`);
    assert.ok(Array.isArray(typeObj.subTypes), `Missing subTypes array in types.${typeName}`);
    for (const st of typeObj.subTypes) {
      assert.ok(allDocs.types[st], `Dangling subType '${st}' referenced by types.${typeName}`);
    }
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
      assert.ok(!data.signature.includes("get get("), `Duplicate 'get get(' in ${ctx}: ${data.signature}`);
      assert.ok(!data.signature.includes("Errorextends"), `Corrupted class signature in ${ctx}: ${data.signature}`);
      assert.ok(!data.signature.includes(".get "), `Invalid '.get ' getter syntax in ${ctx}: ${data.signature}`);
      assert.ok(!data.signature.includes('=\n  "'), `Broken string literal split in ${ctx}: ${data.signature}`);
      assert.ok(Array.isArray(data.subTypes), `Missing subTypes array in ${ctx}`);
      for (const st of data.subTypes) {
        assert.ok(allDocs.types[st], `Dangling subType '${st}' referenced by ${ctx}`);
      }
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

console.log(`✅ All ${passed} test suites in scripts/_tests/extract-docs.test.mjs passed!`);
