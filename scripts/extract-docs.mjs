/**
 * extract-docs.mjs
 *
 * Reads JSDoc comments and TypeScript type definitions from the df-script library
 * source files recursively and outputs a static, structured docs.json file.
 *
 * Usage:
 *   node scripts/extract-docs.mjs
 *   node scripts/extract-docs.mjs --out ./docs.json
 */

import ts from "typescript";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, "../src");
const docExamplesPath = path.resolve(__dirname, "../doc-examples.ts");

let docExamples = {};
try {
  const content = fs.readFileSync(docExamplesPath, "utf-8");
  const match = content.match(/export const DOC_EXAMPLES:\s*Record<string,\s*string>\s*=\s*(\{[\s\S]*?\n\};)/);
  if (match) {
    docExamples = new Function("return " + match[1])();
  }
} catch (e) { }

/**
 * Strips embedded example tables from source files, keeping only clean <!-- doc:KEY --> tags.
 */
export function syncJSDocsInFiles(sourceFiles) {
  let updatedCount = 0;
  const tagRegex = /\/\*[\s\S]*?\*\//g;

  for (const filePath of sourceFiles) {
    let content = fs.readFileSync(filePath, "utf-8");
    let changed = false;

    content = content.replace(tagRegex, jsdoc => {
      return jsdoc.replace(
        /<!-- @?doc:([a-zA-Z0-9_]+) -->([\s\S]*?)(?=(\n\s*\* (?:df\.|\$df\.|const |let |var |[a-zA-Z0-9_$]+ =|[a-zA-Z0-9_$]+\.)|\n\s*\* @|\*\/))/g,
        (match, key, tableContent) => {
          if (tableContent && tableContent.trim()) {
            changed = true;
            return `<!-- doc:${key} -->`;
          }
          return match;
        }
      );
    });

    if (changed) {
      fs.writeFileSync(filePath, content, "utf-8");
      updatedCount++;
      console.log(`  Stripped embedded JSDoc tables in: ${path.relative(srcDir, filePath)}`);
    }
  }
  if (updatedCount > 0) {
    console.log(`✓ Cleaned embedded tables in ${updatedCount} source files.`);
  }
}

// ─── JSDoc Tag Constants ──────────────────────────────────────────────────────
const TAG_PREFIX = "@";
const TAG_EXAMPLE = "@example";
const TAG_PARAM = "@param";
const TAG_RETURNS = "@returns";
const TAG_NAMESPACE = "@namespace";
const TAG_CATEGORY = "@category";
const TAG_SYNTAX = "@syntax";
const TAG_INTERNAL = "@internal";
const TAG_IGNORE = "@ignore";
const TAG_TYPEFILE = "@typefile";
const TAG_INTERNALFILE = "@internalfile";
const TAG_NOTE = "@note";

// ─── Regexes to capture JSDoc tags ────────────────────────────────────────────

// Regexes for specific tags
const PARAM_REGEX = new RegExp(
  `${TAG_PARAM}\\s+(?:\\{([^{}]*(?:\\{[^{}]*\\}[^{}]*)*)\\}\\s+)?(\\[[^\\]]+\\]|[a-zA-Z0-9_$.?]+)(?:\\s+(.*))?`
);
const RETURNS_REGEX = new RegExp(
  `${TAG_RETURNS}\\s+(?:\\{([^{}]*(?:\\{[^{}]*\\}[^{}]*)*)\\}\\s*)?(.*)`
);
const NAMESPACE_REGEX = new RegExp(`${TAG_NAMESPACE}\\s+([a-zA-Z0-9_$..]+)`);
const CATEGORY_REGEX = new RegExp(`${TAG_CATEGORY}\\s+([a-zA-Z0-9_$..]+)`);
const SYNTAX_REGEX = new RegExp(`${TAG_SYNTAX}\\s+(.+)`);

// ─── JSDoc Parser ────────────────────────────────────────────────────────────

export function parseJSDocComment(comment) {
  comment = comment.replace(/\r\n/g, "\n");
  let desc = "";
  let returns;
  const examplesList = [];
  const paramsList = [];
  const notesList = [];

  const descLines = [];
  let currentExampleLines = [];
  let inExample = false;
  let inNote = false;
  let inParam = false;

  for (const rawLine of comment.split("\n")) {
    const line = rawLine.replace(/^\s*\*?\s?/, "");
    const trimmed = line.trim();

    if (trimmed.startsWith(TAG_PREFIX)) {
      if (inExample) {
        examplesList.push(currentExampleLines.join("\n").trimEnd());
        currentExampleLines = [];
        inExample = false;
      }
      inNote = false;
      inParam = false;

      if (trimmed.startsWith(TAG_EXAMPLE)) {
        inExample = true;
      } else if (trimmed.startsWith(TAG_NOTE)) {
        inNote = true;
        const noteContent = trimmed.substring(TAG_NOTE.length).trim();
        if (noteContent) notesList.push(noteContent);
      } else if (trimmed.startsWith(TAG_PARAM)) {
        const m = trimmed.match(PARAM_REGEX);
        if (m) {
          const type = m[1] ? m[1].trim() : undefined;
          let rawName = m[2].trim();
          let defaultVal = undefined;
          if (rawName.startsWith("[") && rawName.endsWith("]")) {
            const inner = rawName.slice(1, -1);
            const eqIdx = inner.indexOf("=");
            if (eqIdx !== -1) {
              rawName = `[${inner.slice(0, eqIdx).trim()}]`;
              defaultVal = inner.slice(eqIdx + 1).trim();
            }
          }
          const pDesc = (m[3] || "").trim();
          const hasInternalTag =
            pDesc.includes(TAG_INTERNAL) || pDesc.includes(TAG_IGNORE);
          const cleanDesc = pDesc
            .replace(new RegExp(`(?:${TAG_INTERNAL}|${TAG_IGNORE})\\b`, "g"), "")
            .replace(/\s+/g, " ")
            .trim();
          const paramObj = { name: rawName };
          if (type) paramObj.type = type;
          if (defaultVal) paramObj.default = defaultVal;
          if (hasInternalTag) paramObj.internal = true;
          paramObj.desc = cleanDesc;
          paramsList.push(paramObj);
          inParam = true;
        }
      } else if (trimmed.startsWith(TAG_RETURNS)) {
        const m = trimmed.match(RETURNS_REGEX);
        if (m) {
          const rType = m[1] ? m[1].trim() : "";
          const rDesc = m[2] ? m[2].trim() : "";
          returns = rType || rDesc;
        }
      }
    } else {
      if (inExample) {
        currentExampleLines.push(line);
      } else if (inNote && notesList.length > 0 && trimmed.length > 0) {
        notesList[notesList.length - 1] += " " + trimmed;
      } else if (inParam && paramsList.length > 0) {
        if (trimmed.length > 0) {
          const lastParam = paramsList[paramsList.length - 1];
          lastParam.desc = lastParam.desc ? `${lastParam.desc} ${trimmed}` : trimmed;
        }
      } else {
        inNote = false;
        descLines.push(trimmed);
      }
    }
  }

  if (inExample && currentExampleLines.length > 0) {
    examplesList.push(currentExampleLines.join("\n").trimEnd());
  }

  desc = descLines
    .reduce((acc, line) => {
      if (line === "") return acc + "\n\n";
      return acc ? (acc.endsWith("\n\n") ? acc + line : acc + " " + line) : line;
    }, "")
    .trim();

  return {
    desc,
    examples:
      examplesList.length > 0
        ? examplesList.map(ex => {
          return ex
            .replace(
              /<!-- @?doc:([a-zA-Z0-9_]+) -->([\s\S]*?)(?=(\n\s*(?:df\.|df1\.|df2\.|trades\.|quotes\.|east\.|west\.|\$df\.|\$col|const |let |var |\/\/)|$))/g,
              (_, key) => {
                return docExamples[key] ? docExamples[key].replace(/^ {5}\* /gm, "") : "";
              }
            )
            .trim();
        })
        : undefined,
    params: paramsList.length > 0 ? paramsList : undefined,
    notes: notesList.length > 0 ? notesList : undefined,
    returns
  };
}

// ─── Shared Balanced Token & AST Scanners ────────────────────────────────────

/**
 * Replaces comments and string literals with spaces while preserving exact character offsets and newlines.
 */
function _maskCommentsAndStrings(str) {
  let out = "";
  let i = 0;
  const len = str.length;

  while (i < len) {
    const ch = str[i];
    const next = i + 1 < len ? str[i + 1] : "";

    if (ch === "/" && next === "/") {
      out += "  ";
      i += 2;
      while (i < len && str[i] !== "\n") {
        out += " ";
        i++;
      }
      continue;
    }

    if (ch === "/" && next === "*") {
      out += "  ";
      i += 2;
      while (i < len && !(str[i] === "*" && str[i + 1] === "/")) {
        out += str[i] === "\n" ? "\n" : " ";
        i++;
      }
      if (i < len) {
        out += "  ";
        i += 2;
      }
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      out += " ";
      i++;
      while (i < len) {
        if (str[i] === "\\") {
          out += "  ";
          i += 2;
          continue;
        }
        if (str[i] === quote) {
          out += " ";
          i++;
          break;
        }
        out += str[i] === "\n" ? "\n" : " ";
        i++;
      }
      continue;
    }

    out += ch;
    i++;
  }

  return out;
}

/**
 * Scans `str` from `startIndex` while tracking string quotes, escapes, and nested `()`, `{}`, `[]`, `<>` depths.
 * Calls `onChar(ch, index, isTop, state, prev, next)` for every non-string character (`isTop` is true before `ch` mutates depth).
 * Stops and returns `index` when `onChar` returns `true`, or `-1` if the end of string is reached.
 */
function _scanBalanced(str, onChar, startIndex = 0) {
  const state = { paren: 0, brace: 0, bracket: 0, angle: 0 };
  let inString = null;
  let isEscaped = false;
  const len = str.length;

  for (let i = startIndex; i < len; i++) {
    const ch = str[i];
    const prev = i > startIndex ? str[i - 1] : "";
    const next = i + 1 < len ? str[i + 1] : "";

    if (inString) {
      if (ch === inString && !isEscaped) inString = null;
      isEscaped = ch === "\\" && !isEscaped;
      continue;
    }

    if (ch === "/" && next === "/") {
      i += 2;
      while (i < len && str[i] !== "\n") i++;
      continue;
    }

    if (ch === "/" && next === "*") {
      const endComment = str.indexOf("*/", i + 2);
      if (endComment === -1) break;
      i = endComment + 1;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }

    const isTop =
      state.paren === 0 &&
      state.brace === 0 &&
      state.bracket === 0 &&
      state.angle === 0;

    if (onChar(ch, i, isTop, state, prev, next)) {
      return i;
    }

    if (ch === "(") state.paren++;
    else if (ch === ")" && state.paren > 0) state.paren--;
    else if (ch === "{") state.brace++;
    else if (ch === "}" && state.brace > 0) state.brace--;
    else if (ch === "[") state.bracket++;
    else if (ch === "]" && state.bracket > 0) state.bracket--;
    else if (ch === "<") state.angle++;
    else if (ch === ">" && prev !== "=" && state.angle > 0) state.angle--;
  }

  return -1;
}

function _findTopLevelChar(str, targetChar, startIndex = 0) {
  return _scanBalanced(
    str,
    (ch, _i, isTop, _s, prev, next) =>
      isTop &&
      ch === targetChar &&
      (targetChar !== "=" || (next !== ">" && prev !== "=" && prev !== "!")),
    startIndex
  );
}

function _findMatchingClose(str, openIdx, openCh = "(", closeCh = ")") {
  if (openIdx === -1 || openIdx >= str.length) return -1;
  let depth = 0;
  return _scanBalanced(
    str,
    (ch, _i, _isTop, _s, prev) => {
      if (ch === openCh) depth++;
      else if (ch === closeCh && (closeCh !== ">" || prev !== "=") && --depth === 0) {
        return true;
      }
      return false;
    },
    openIdx
  );
}

function _splitTopLevel(str, delimiter = ",") {
  if (!str) return [];
  const parts = [];
  let lastIdx = 0;
  _scanBalanced(str, (ch, i, isTop, _s, prev, next) => {
    if (
      isTop &&
      ch === delimiter &&
      (delimiter !== "|" || (next !== "|" && prev !== "|")) &&
      (delimiter !== "&" || (next !== "&" && prev !== "&"))
    ) {
      const part = str.slice(lastIdx, i).trim();
      if (part) parts.push(part);
      lastIdx = i + 1;
    }
    return false;
  });
  const tail = str.slice(lastIdx).trim();
  if (tail) parts.push(tail);
  return parts;
}

function _splitParamNameAndType(paramStr) {
  const idx = _findTopLevelChar(paramStr, ":");
  return idx === -1
    ? { namePart: paramStr.trim(), typeAndDefault: "" }
    : {
      namePart: paramStr.slice(0, idx).trim(),
      typeAndDefault: paramStr.slice(idx + 1).trim()
    };
}

function _splitTypeAndDefault(typeAndDefault) {
  const idx = _findTopLevelChar(typeAndDefault, "=");
  return idx === -1
    ? { typeStr: typeAndDefault.trim(), defaultStr: undefined }
    : {
      typeStr: typeAndDefault.slice(0, idx).trim(),
      defaultStr: typeAndDefault.slice(idx + 1).trim()
    };
}

function _extractSignatureParams(signatureStr) {
  const openParen = _findTopLevelChar(signatureStr, "(");
  if (openParen === -1) return null;
  const closeParen = _findMatchingClose(signatureStr, openParen, "(", ")");
  if (closeParen === -1) return null;
  const paramsStr = signatureStr.slice(openParen + 1, closeParen);
  return {
    openParen,
    closeParen,
    rawParams: _splitTopLevel(paramsStr, ",")
  };
}



// splitByComma: Splits a string on commas at the top-level (respecting strings, nested parentheses, curly braces, brackets, and generics).
export function splitByComma(str) {
  return _splitTopLevel(str, ",");
}

// formatSignature: splits params onto individual lines when there are 2+ params or a destructured parameter,
// and keeps 0 or 1 simple parameter on a single line.
export function formatSignature(signatureStr) {
  const parsed = _extractSignatureParams(signatureStr);
  if (!parsed) return signatureStr;

  const { openParen, closeParen, rawParams } = parsed;
  const prefix = signatureStr.slice(0, openParen);
  const suffix = signatureStr.slice(closeParen + 1);

  if (rawParams.length === 0) {
    return `${prefix}()${suffix}`;
  }

  const formattedParams = rawParams.map(p => {
    const { namePart, typeAndDefault } = _splitParamNameAndType(p);

    // Check if the parameter is destructured (e.g. "{ a, b }: Type = {}")
    if (namePart.startsWith("{") && namePart.endsWith("}") && typeAndDefault) {
      const fieldsStr = namePart.slice(1, -1).trim();
      const fields = splitByComma(fieldsStr).map(f => {
        const colonIdx = _findTopLevelChar(f, ":");
        if (colonIdx !== -1 && _findTopLevelChar(f, "=") === -1) {
          return f.slice(0, colonIdx).trim();
        }
        return f;
      });

      const lines = fields.map(f => `    ${f}`);
      return `  {\n${lines.join(",\n")}\n  }: ${typeAndDefault}`;
    }

    return "  " + p;
  });

  if (formattedParams.length === 1 && !formattedParams[0].includes("\n")) {
    return `${prefix}(${formattedParams[0].trim()})${suffix}`;
  }

  return `${prefix}(\n${formattedParams.join(",\n")}\n)${suffix}`;
}

// ─── Objective TypeScript Type & SubType Extractor ───────────────────────────

/**
 * Extracts generic parameter metadata (`[{ name, defaultType }]`) from a declaration header string.
 */
function _parseGenericParams(headerStr) {
  const openAngle = _findTopLevelChar(headerStr, "<");
  if (openAngle === -1) return [];
  const closeAngle = _findMatchingClose(headerStr, openAngle, "<", ">");
  if (closeAngle === -1 || closeAngle <= openAngle) return [];

  return splitByComma(headerStr.slice(openAngle + 1, closeAngle)).map(p => {
    const eqPos = _findTopLevelChar(p, "=");
    const defaultType = eqPos !== -1 ? p.slice(eqPos + 1).trim() : undefined;
    const beforeEq = eqPos !== -1 ? p.slice(0, eqPos).trim() : p.trim();
    const extMatch = beforeEq.match(/^([A-Za-z_$][A-Za-z0-9_$]*)\s+extends\b/);
    const paramName = extMatch ? extMatch[1] : beforeEq;
    return { name: paramName, defaultType };
  });
}

function _substituteGenerics(str, genericParams, rawArgs = []) {
  if (!str || !genericParams || genericParams.length === 0) return str;
  let result = str;
  for (let i = 0; i < genericParams.length; i++) {
    const gp = genericParams[i];
    const replacement = rawArgs[i] !== undefined ? rawArgs[i].trim() : gp.defaultType;
    if (replacement) {
      const needsParensInArray =
        _splitTopLevel(replacement, "|").length > 1 ||
        _splitTopLevel(replacement, "&").length > 1;
      const paramRegex = new RegExp(`\\b${gp.name}\\b(?!\\s*\\??:)`, "g");
      result = result.replace(paramRegex, (_match, offset, fullStr) => {
        const after = fullStr.slice(offset + gp.name.length);
        if (needsParensInArray && after.startsWith("[")) {
          return `(${replacement})`;
        }
        return replacement;
      });
    }
  }
  return result;
}

/**
 * Extracts all top-level TypeScript `interface` and `type` declarations from a file's raw content.
 */
export function extractTypesFromContent(rawContent, filePath = "", typesMap = {}) {
  const normalized = rawContent.replace(/\r\n/g, "\n");
  const masked = _maskCommentsAndStrings(normalized);
  const declRegex = /^[ \t]*(?:export\s+)?(interface|type)\s+([A-Za-z_$][A-Za-z0-9_$]*)\b/gm;

  let match;
  while ((match = declRegex.exec(masked)) !== null) {
    const kind = match[1];
    const typeName = match[2];
    const firstNonSpaceOffset = match[0].search(/\S/);
    const declStart = match.index + (firstNonSpaceOffset !== -1 ? firstNonSpaceOffset : 0);
    const cursor = match.index + match[0].length;
    let declEnd = -1;

    if (kind === "interface") {
      const openBraceIdx = _findTopLevelChar(masked, "{", cursor);
      if (openBraceIdx === -1) continue;
      declEnd = _findMatchingClose(masked, openBraceIdx, "{", "}");
    } else if (kind === "type") {
      const eqIdx = _scanBalanced(
        masked,
        (ch, _i, isTop, _s, prev, next) =>
          isTop && ((ch === "=" && next !== ">" && prev !== "=" && prev !== "!") || ch === ";"),
        cursor
      );
      if (eqIdx === -1 || masked[eqIdx] === ";") continue;

      const rhsEnd = _scanBalanced(
        masked,
        (ch, i, isTop) => {
          if (!isTop) return false;
          if (ch === ";") return true;
          if (ch === "\n") {
            const rest = masked.slice(i + 1).trimStart();
            if (/^(?:export|interface|type|function|const|let|var|class|abstract)\b/.test(rest)) {
              return true;
            }
          }
          return false;
        },
        eqIdx + 1
      );

      declEnd =
        rhsEnd === -1
          ? masked.length - 1
          : masked[rhsEnd] === "\n"
            ? rhsEnd - 1
            : rhsEnd;
    }

    if (declEnd === -1) continue;

    const signature = normalized.slice(declStart, declEnd + 1).trim();
    const lineStart = normalized.slice(0, declStart).split("\n").length;
    const lineEnd = normalized.slice(0, declEnd + 1).split("\n").length;
    const properties = extractTypeProperties(signature);

    const beforeDecl = normalized.slice(0, declStart).trimEnd();
    let desc = "";
    let isInternal = false;
    if (beforeDecl.endsWith("*/")) {
      const commentStart = beforeDecl.lastIndexOf("/**");
      if (commentStart !== -1) {
        const commentContent = beforeDecl.slice(commentStart + 3, beforeDecl.length - 2);
        isInternal =
          commentContent.includes(TAG_INTERNAL) || commentContent.includes(TAG_IGNORE);
        const parsed = parseJSDocComment(commentContent);
        desc = parsed.desc || "";
      }
    }

    typesMap[typeName] = {
      filePath,
      lineStart,
      lineEnd,
      ...(desc ? { desc } : {}),
      ...(isInternal ? { internal: true } : {}),
      signature,
      ...(properties ? { properties } : {})
    };

    declRegex.lastIndex = declEnd + 1;
  }

  return typesMap;
}

/**
 * Extracts structured properties from an interface or object type signature string.
 * @param {string} signature - The TypeScript type/interface declaration string.
 * @returns {Record<string, { type: string, optional: boolean, desc: string, default?: string }> | undefined}
 */
export function extractTypeProperties(signature) {
  if (!signature) return undefined;

  const headerEnd =
    signature.startsWith("export type") || signature.startsWith("type ")
      ? _findTopLevelChar(signature, "=")
      : 0;
  const openBrace = _findTopLevelChar(signature, "{", headerEnd !== -1 ? headerEnd : 0);
  if (openBrace === -1) return undefined;
  const closeBrace = _findMatchingClose(signature, openBrace, "{", "}");
  if (closeBrace === -1 || closeBrace <= openBrace) return undefined;

  // For type aliases with top-level intersections or unions of `{ ... }` (e.g. `{ a: number } & { b: string }`),
  // avoid treating the first `{` to last `}` as a single object literal if top-level `&` or `|` exists after `closeBrace`.
  const afterClose = signature.slice(closeBrace + 1).replace(/;$/, "").trim();
  if (afterClose.length > 0) return undefined;

  const body = signature.slice(openBrace + 1, closeBrace);
  const properties = {};

  let i = 0;
  const len = body.length;

  while (i < len) {
    while (i < len && /\s/.test(body[i])) i++;
    if (i >= len) break;

    let rawJsDoc = null;
    if (body[i] === "/" && body[i + 1] === "*") {
      const endComment = body.indexOf("*/", i + 2);
      if (endComment !== -1) {
        rawJsDoc = body.slice(i + 2, endComment);
        i = endComment + 2;
        while (i < len && /\s/.test(body[i])) i++;
      }
    }
    if (i >= len) break;

    // Skip `readonly` modifier before property name
    if (/^readonly\s+/.test(body.slice(i))) {
      i += body.slice(i).match(/^readonly\s+/)[0].length;
    }

    let propName = "";
    if (body[i] === '"' || body[i] === "'") {
      const quote = body[i++];
      const startQuote = i;
      while (i < len && body[i] !== quote) {
        if (body[i] === "\\") i++;
        i++;
      }
      propName = body.slice(startQuote, i);
      if (i < len) i++;
    } else if (body[i] === "[") {
      const closeBracket = _findMatchingClose(body, i, "[", "]");
      if (closeBracket === -1) break;
      propName = body.slice(i, closeBracket + 1).trim();
      i = closeBracket + 1;
    } else {
      const startId = i;
      while (i < len && /[a-zA-Z0-9_$]/.test(body[i])) i++;
      propName = body.slice(startId, i).trim();
    }

    if (!propName) {
      i++;
      continue;
    }

    while (i < len && /\s/.test(body[i])) i++;

    let isOptional = false;
    if (body[i] === "?") {
      isOptional = true;
      i++;
      while (i < len && /\s/.test(body[i])) i++;
    }

    // Skip method declarations `methodName(...): ReturnType` or `methodName<T>(...): ReturnType`
    if (body[i] === "(" || body[i] === "<") {
      if (body[i] === "<") {
        const closeAngle = _findMatchingClose(body, i, "<", ">");
        if (closeAngle !== -1) i = closeAngle + 1;
        while (i < len && /\s/.test(body[i])) i++;
      }
      if (body[i] === "(") {
        const closeParen = _findMatchingClose(body, i, "(", ")");
        if (closeParen !== -1) i = closeParen + 1;
        while (i < len && body[i] !== ";" && body[i] !== "\n") i++;
        if (body[i] === ";") i++;
        continue;
      }
    }

    if (body[i] !== ":") {
      i++;
      continue;
    }
    i++;
    while (i < len && /\s/.test(body[i])) i++;

    const typeStart = i;
    const typeEnd = _scanBalanced(
      body,
      (ch, idx, isTop) => {
        if (!isTop) return false;
        if (ch === ";" || ch === "," || ch === "}") return true;
        if (ch === "\n") {
          const rest = body.slice(idx + 1).trimStart();
          if (
            rest.startsWith("/**") ||
            rest.startsWith("}") ||
            /^(?:readonly\s+)?[a-zA-Z0-9_$'"[]+(\?)?:/.test(rest)
          ) {
            return true;
          }
        }
        return false;
      },
      typeStart
    );

    const endPos = typeEnd !== -1 ? typeEnd : len;
    const rawType = body
      .slice(typeStart, endPos)
      .replace(/\s+/g, " ")
      .trim();
    i = endPos;
    if (body[i] === ";" || body[i] === ",") i++;

    let desc = "";
    let defaultValue = undefined;
    let isInternal = false;

    if (rawJsDoc) {
      isInternal = rawJsDoc.includes(TAG_INTERNAL) || rawJsDoc.includes(TAG_IGNORE);
      const parsedComment = parseJSDocComment(rawJsDoc);
      desc = parsedComment.desc || "";

      const defaultTagMatch = rawJsDoc.match(/@default\s+([^\r\n*]+)/);
      if (defaultTagMatch) {
        defaultValue = defaultTagMatch[1].trim();
      } else {
        const inlineDefaultMatch = desc.match(/\(default:\s*([^)]+)\)|[Dd]efaults?\s+to\s+([^.]+)/);
        if (inlineDefaultMatch) {
          defaultValue = (inlineDefaultMatch[1] || inlineDefaultMatch[2]).trim();
        }
      }
    }

    properties[propName] = {
      type: rawType,
      optional: isOptional,
      desc,
      ...(defaultValue !== undefined ? { default: defaultValue } : {}),
      ...(isInternal ? { internal: true } : {})
    };
  }

  return Object.keys(properties).length > 0 ? properties : undefined;
}

/**
 * Unwraps outer balanced parentheses and leading `readonly` modifiers from a type expression.
 */
function _unwrapTypeExpr(typeExpr) {
  if (!typeExpr) return "";
  let s = typeExpr.trim().replace(/^readonly\s+/, "").trim();
  while (s.startsWith("(") && _findMatchingClose(s, 0, "(", ")") === s.length - 1) {
    s = s.slice(1, -1).trim().replace(/^readonly\s+/, "").trim();
  }
  return s;
}

/**
 * Extracts `{ rhs, genericParams }` from a `type Name<...> = RHS;` declaration.
 */
function _parseTypeAliasDeclaration(signature) {
  if (!signature || !/^(?:export\s+)?type\s+/.test(signature)) return null;
  const eqIdx = _findTopLevelChar(signature, "=");
  if (eqIdx === -1) return null;

  const header = signature.slice(0, eqIdx).trim();
  let rhs = signature.slice(eqIdx + 1).trim();
  if (rhs.endsWith(";")) rhs = rhs.slice(0, -1).trim();
  rhs = rhs.replace(/^(?:\/\*\*[\s\S]*?\*\/\s*)+/, "").replace(/^[|&]\s*/, "").trim();

  return {
    rhs,
    genericParams: _parseGenericParams(header)
  };
}

/**
 * Parses a named or generic type reference `BaseName<Arg1, Arg2>` into `{ baseName, typeArgs }`.
 */
function _parseTypeReference(typeExpr) {
  const s = _unwrapTypeExpr(typeExpr);
  const openAngle = _findTopLevelChar(s, "<");
  if (openAngle === -1) {
    return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(s) ? { baseName: s, typeArgs: [] } : null;
  }
  const closeAngle = _findMatchingClose(s, openAngle, "<", ">");
  if (closeAngle !== s.length - 1) return null;
  const baseName = s.slice(0, openAngle).trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(baseName)) return null;
  return {
    baseName,
    typeArgs: splitByComma(s.slice(openAngle + 1, closeAngle))
  };
}

/**
 * Resolves a type expression string (such as `CastTargetArg`, `ColumnKeyArg<boolean>`, or `KeyArg[]`) to its underlying type alias RHS.
 */
export function resolveTypeAliasString(typeExpr, typesMap, visited = new Set()) {
  if (!typeExpr || !typesMap) return undefined;
  const trimmed = _unwrapTypeExpr(typeExpr);
  if (!trimmed) return undefined;

  // 1. Handle `T[]` array suffix (when not a top-level union/intersection)
  if (
    trimmed.endsWith("[]") &&
    _splitTopLevel(trimmed, "|").length === 1 &&
    _splitTopLevel(trimmed, "&").length === 1
  ) {
    const inner = _unwrapTypeExpr(trimmed.slice(0, -2));
    const resolvedInner = resolveTypeAliasString(inner, typesMap, visited);
    if (resolvedInner) {
      const needsParens =
        _splitTopLevel(resolvedInner, "|").length > 1 ||
        _splitTopLevel(resolvedInner, "&").length > 1;
      return `${needsParens ? `(${resolvedInner})` : resolvedInner}[]`;
    }
    return undefined;
  }

  // 2. Handle `Array<T>` and `ReadonlyArray<T>`
  const parsedRef = _parseTypeReference(trimmed);
  if (
    parsedRef &&
    (parsedRef.baseName === "Array" || parsedRef.baseName === "ReadonlyArray") &&
    parsedRef.typeArgs.length === 1
  ) {
    const resolvedInner = resolveTypeAliasString(parsedRef.typeArgs[0], typesMap, visited);
    return resolvedInner ? `${parsedRef.baseName}<${resolvedInner}>` : undefined;
  }

  // 3. Handle top-level union where branches include parameterized generic aliases (e.g. `ColumnKeyArg<boolean> | null`)
  const unionBranches = _splitTopLevel(trimmed, "|");
  if (unionBranches.length > 1) {
    let changed = false;
    const expandedBranches = unionBranches.map(branch => {
      const ref = _parseTypeReference(branch);
      if (ref && ref.typeArgs.length > 0) {
        const resolvedBranch = resolveTypeAliasString(branch, typesMap, visited);
        if (resolvedBranch) {
          changed = true;
          return resolvedBranch;
        }
      }
      return branch;
    });
    return changed ? expandedBranches.join(" | ") : undefined;
  }

  if (!parsedRef) return undefined;
  const { baseName, typeArgs } = parsedRef;

  if (visited.has(baseName)) return undefined;
  const typeEntry = typesMap[baseName];
  if (!typeEntry || typeEntry.internal) return undefined;

  const parsedAlias = _parseTypeAliasDeclaration(typeEntry.signature);
  if (!parsedAlias) return undefined;

  if (/^(?:Omit|Pick|Partial|Required|Readonly)\s*</.test(parsedAlias.rhs)) {
    return undefined;
  }
  if (
    parsedAlias.rhs.startsWith("{") ||
    (typesMap[parsedAlias.rhs] && resolveTypeProperties(parsedAlias.rhs, typesMap))
  ) {
    return undefined;
  }

  let resolved = _substituteGenerics(parsedAlias.rhs, parsedAlias.genericParams, typeArgs)
    .replace(/\/\*\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[|&]\s*/, "");

  const nextVisited = new Set(visited);
  nextVisited.add(baseName);
  const furtherResolved = resolveTypeAliasString(resolved, typesMap, nextVisited);
  if (furtherResolved) {
    resolved = furtherResolved;
  }

  return resolved !== trimmed ? resolved : undefined;
}

/**
 * Recursively resolves the effective public properties of ANY type expression (`typeExpr`) against `typesMap`, accounting for:
 * - `interface X<T> extends Base1<T>, Base2`
 * - `type X = Omit<Inner, Keys>` / `Pick<Inner, Keys>` / `Partial<Inner>` / `Required<Inner>` / `Readonly<Inner>` (including nested utility types)
 * - Intersection types (`A & B & { inlineProp?: number }`)
 * - Union types (`DurationOptions | string`, or multi-path discriminated unions `{ mode: "a", x: number } | { mode: "b", y: string }`)
 * - Inline object literals (`{ a?: number; nested?: { flag?: boolean } }`)
 * - Array wrappers (`SubOpts[]`, `Array<SubOpts>`, `(SubOpts | string)[]`)
 * - Skips internal properties (`_` prefix or `@internal` / `@ignore` tag), index/mapped signatures (`[` prefix), and `@internal` types.
 */
export function resolveTypeProperties(typeExpr, typesMap, visited = new Set()) {
  if (!typeExpr || !typesMap) return undefined;
  let expr = _unwrapTypeExpr(typeExpr);
  if (!expr) return undefined;

  // Unwrap array suffixes `T[]` (when not a top-level union/intersection)
  while (
    expr.endsWith("[]") &&
    _splitTopLevel(expr, "|").length === 1 &&
    _splitTopLevel(expr, "&").length === 1
  ) {
    expr = _unwrapTypeExpr(expr.slice(0, -2));
  }

  // 1. Inline object literal `{ ... }`
  if (expr.startsWith("{") && _findMatchingClose(expr, 0, "{", "}") === expr.length - 1) {
    const rawInline = extractTypeProperties(expr);
    return _finalizeResolvedProperties(rawInline, typesMap, visited);
  }

  // 2. Top-level Intersection `A & B & ...`
  const intersectionParts = _splitTopLevel(expr, "&");
  if (intersectionParts.length > 1) {
    const merged = {};
    for (const part of intersectionParts) {
      const partProps = resolveTypeProperties(part, typesMap, visited);
      if (partProps) {
        Object.assign(merged, structuredClone(partProps));
      }
    }
    return _finalizeResolvedProperties(merged, typesMap, visited);
  }

  // 3. Top-level Union `A | B | ...`
  const unionParts = _splitTopLevel(expr, "|");
  if (unionParts.length > 1) {
    const branchPropMaps = [];
    for (const part of unionParts) {
      const branchProps = resolveTypeProperties(part, typesMap, visited);
      if (branchProps) branchPropMaps.push(branchProps);
    }
    if (branchPropMaps.length === 0) return undefined;
    if (branchPropMaps.length === 1) return branchPropMaps[0];

    // Multi-path object union: merge properties across branches, unioning distinct types and marking branch-specific keys optional
    const merged = {};
    const allKeys = new Set(branchPropMaps.flatMap(m => Object.keys(m)));
    for (const key of allKeys) {
      const presentIn = branchPropMaps.filter(m => Object.prototype.hasOwnProperty.call(m, key));
      const first = structuredClone(presentIn[0][key]);
      const distinctTypes = [];
      for (const m of presentIn) {
        for (const t of _splitTopLevel(m[key].type, "|")) {
          if (!distinctTypes.includes(t)) distinctTypes.push(t);
        }
        if (!first.desc && m[key].desc) first.desc = m[key].desc;
        if (first.default === undefined && m[key].default !== undefined) {
          first.default = m[key].default;
        }
        if (m[key].properties) {
          first.properties = Object.assign(first.properties || {}, structuredClone(m[key].properties));
        }
      }
      first.type = distinctTypes.join(" | ");
      first.optional =
        presentIn.length < branchPropMaps.length || presentIn.some(m => m[key].optional);
      merged[key] = first;
    }
    return _finalizeResolvedProperties(merged, typesMap, visited);
  }

  // 4. Built-in TypeScript utility wrappers (`Omit`, `Pick`, `Partial`, `Required`, `Readonly`, `Array`, `ReadonlyArray`)
  const parsedRef = _parseTypeReference(expr);
  if (!parsedRef) return undefined;
  const { baseName, typeArgs } = parsedRef;

  if (
    (baseName === "Array" || baseName === "ReadonlyArray" || baseName === "Readonly") &&
    typeArgs.length === 1
  ) {
    return resolveTypeProperties(typeArgs[0], typesMap, visited);
  }

  if (baseName === "Omit" && typeArgs.length >= 2) {
    const baseProps = resolveTypeProperties(typeArgs[0], typesMap, visited);
    if (!baseProps) return undefined;
    const copy = structuredClone(baseProps);
    const keys = [...typeArgs[1].matchAll(/["']([^"']+)["']/g)].map(m => m[1]);
    for (const k of keys) delete copy[k];
    return Object.keys(copy).length > 0 ? copy : undefined;
  }

  if (baseName === "Pick" && typeArgs.length >= 2) {
    const baseProps = resolveTypeProperties(typeArgs[0], typesMap, visited);
    if (!baseProps) return undefined;
    const picked = {};
    const keys = [...typeArgs[1].matchAll(/["']([^"']+)["']/g)].map(m => m[1]);
    for (const k of keys) {
      if (baseProps[k]) picked[k] = structuredClone(baseProps[k]);
    }
    return Object.keys(picked).length > 0 ? picked : undefined;
  }

  if ((baseName === "Partial" || baseName === "Required") && typeArgs.length === 1) {
    const baseProps = resolveTypeProperties(typeArgs[0], typesMap, visited);
    if (!baseProps) return undefined;
    const copy = structuredClone(baseProps);
    const isOpt = baseName === "Partial";
    for (const k of Object.keys(copy)) copy[k].optional = isOpt;
    return copy;
  }

  // 5. Named type or interface in `typesMap`
  if (visited.has(baseName)) return undefined;
  const entry = typesMap[baseName];
  if (!entry || entry.internal) return undefined;

  const nextVisited = new Set(visited);
  nextVisited.add(baseName);

  const sig = entry.signature;
  let mergedProps = {};

  // Check `interface X<T> extends Base1<T>, Base2 { ... }`
  const openBraceIdx = _findTopLevelChar(sig, "{");
  const headerStr = openBraceIdx !== -1 ? sig.slice(0, openBraceIdx) : sig;
  const ifaceGenericParams = /^(?:export\s+)?interface\s+/.test(sig)
    ? _parseGenericParams(headerStr)
    : [];

  const extMatch = headerStr.match(/\bextends\s+([\s\S]+)$/);
  if (extMatch && /^(?:export\s+)?interface\s+/.test(sig)) {
    const bases = splitByComma(extMatch[1]);
    for (const rawBase of bases) {
      const substitutedBase = _substituteGenerics(rawBase.trim(), ifaceGenericParams, typeArgs);
      const baseProps = resolveTypeProperties(substitutedBase, typesMap, nextVisited);
      if (baseProps) {
        Object.assign(mergedProps, structuredClone(baseProps));
      }
    }
  }

  if (entry.properties) {
    const ownCopy = structuredClone(entry.properties);
    if (ifaceGenericParams.length > 0) {
      for (const prop of Object.values(ownCopy)) {
        prop.type = _substituteGenerics(prop.type, ifaceGenericParams, typeArgs);
      }
    }
    Object.assign(mergedProps, ownCopy);
  }

  const parsedAlias = _parseTypeAliasDeclaration(sig);
  if (parsedAlias) {
    const substitutedRhs = _substituteGenerics(parsedAlias.rhs, parsedAlias.genericParams, typeArgs);
    const rhsProps = resolveTypeProperties(substitutedRhs, typesMap, nextVisited);
    if (rhsProps) {
      Object.assign(mergedProps, structuredClone(rhsProps));
    }
  }

  return _finalizeResolvedProperties(mergedProps, typesMap, nextVisited);
}

/**
 * Filters out internal (`_`-prefixed or `@internal`) and index/mapped (`[`-prefixed) properties,
 * sorts keys alphabetically, and resolves nested `properties` and `resolvedType` for each property.
 */
function _finalizeResolvedProperties(rawProps, typesMap, visited) {
  if (!rawProps) return undefined;

  const validKeys = Object.keys(rawProps).filter(k => {
    if (k.startsWith("_") || k.startsWith("[")) return false;
    const p = rawProps[k];
    return !p.internal;
  });

  if (validKeys.length === 0) return undefined;
  validKeys.sort((a, b) => a.localeCompare(b));

  const finalProps = {};
  for (const k of validKeys) {
    const propCopy = structuredClone(rawProps[k]);
    delete propCopy.internal;

    const unwrappedPropType = _unwrapTypeExpr(propCopy.type);
    if (
      unwrappedPropType.startsWith("{") &&
      _findMatchingClose(unwrappedPropType, 0, "{", "}") === unwrappedPropType.length - 1
    ) {
      const inlineProps = resolveTypeProperties(unwrappedPropType, typesMap, visited);
      if (inlineProps) {
        propCopy.type = "object";
        propCopy.properties = inlineProps;
      }
    } else {
      const resolvedAlias = resolveTypeAliasString(propCopy.type, typesMap, visited);
      if (resolvedAlias) {
        propCopy.resolvedType = resolvedAlias;
      }
      const nestedProps = resolveTypeProperties(propCopy.type, typesMap, visited);
      if (nestedProps) {
        propCopy.properties = nestedProps;
      }
    }

    finalProps[k] = propCopy;
  }

  return finalProps;
}

function _cleanParamName(name) {
  return name ? name.replace(/^\[|\]$/g, "").replace(/^\.\.\./, "").trim() : "";
}

/**
 * Builds the parameter-keyed `typeTree` for a function/method from its raw TS signature and JSDoc params.
 */
export function buildFunctionTypeTree(rawSignature, jsdocParams = [], typesMap = {}) {
  const parsed = _extractSignatureParams(rawSignature);
  if (!parsed || parsed.rawParams.length === 0) return undefined;

  const { rawParams: rawTsParams } = parsed;
  const topLevelJsdocParams = jsdocParams.filter(p => !_cleanParamName(p.name).includes("."));
  const dottedJsdocParams = jsdocParams.filter(p => _cleanParamName(p.name).includes("."));
  const typeTree = {};

  for (let idx = 0; idx < rawTsParams.length; idx++) {
    const rawParam = rawTsParams[idx];
    const { namePart, typeAndDefault } = _splitParamNameAndType(rawParam);
    const { typeStr, defaultStr } = _splitTypeAndDefault(typeAndDefault);

    const jsdocAtIdx = topLevelJsdocParams[idx];
    const cleanJsdocIdxName = jsdocAtIdx ? _cleanParamName(jsdocAtIdx.name) : undefined;

    let isVariadic = false;
    let isOptional = defaultStr !== undefined;
    let paramKey = namePart.trim();

    if (paramKey.startsWith("...")) {
      isVariadic = true;
      paramKey = paramKey.slice(3).trim();
    }
    if (paramKey.endsWith("?")) {
      isOptional = true;
      paramKey = paramKey.slice(0, -1).trim();
    }

    if (paramKey.startsWith("{") && paramKey.endsWith("}")) {
      paramKey = cleanJsdocIdxName || "options";
    }

    const matchedJsdoc =
      topLevelJsdocParams.find(p => _cleanParamName(p.name) === paramKey) || jsdocAtIdx;

    if (matchedJsdoc && matchedJsdoc.name.startsWith("[") && matchedJsdoc.name.endsWith("]")) {
      isOptional = true;
    }

    const effectiveType = typeStr || (matchedJsdoc && matchedJsdoc.type) || "any";
    const effectiveDefault = defaultStr !== undefined ? defaultStr : matchedJsdoc?.default;
    const parsedRef = _parseTypeReference(effectiveType.replace(/\[\]$/, ""));
    const baseTypeName = parsedRef ? parsedRef.baseName : effectiveType.trim();
    const isInlineObjectParam =
      effectiveType.startsWith("{") &&
      _findMatchingClose(effectiveType, 0, "{", "}") === effectiveType.length - 1;

    const desc =
      (matchedJsdoc && matchedJsdoc.desc) ||
      (typesMap[baseTypeName] && typesMap[baseTypeName].desc) ||
      "";

    const node = {
      type: isInlineObjectParam ? "object" : effectiveType,
      optional: isOptional,
      ...(isVariadic ? { variadic: true } : {}),
      ...(effectiveDefault !== undefined ? { default: effectiveDefault } : {}),
      desc
    };

    if (!matchedJsdoc?.internal) {
      const resolvedAlias = resolveTypeAliasString(effectiveType, typesMap);
      if (resolvedAlias) {
        node.resolvedType = resolvedAlias;
      }

      const resolvedProps = resolveTypeProperties(effectiveType, typesMap);
      if (resolvedProps) {
        node.properties = resolvedProps;
      }
    }

    // Apply any dotted JSDoc @param overrides (e.g. `@param [options.how="inner"] Custom desc` or `@param options.secret @internal`)
    if (node.properties && dottedJsdocParams.length > 0) {
      for (const dp of dottedJsdocParams) {
        const parts = _cleanParamName(dp.name).split(".");
        if (parts[0] !== paramKey || parts.length < 2) continue;

        let currProps = node.properties;
        for (let pIdx = 1; pIdx < parts.length - 1; pIdx++) {
          currProps = currProps?.[parts[pIdx]]?.properties;
        }
        const leafKey = parts[parts.length - 1];
        if (!currProps || !currProps[leafKey]) continue;

        if (dp.internal) {
          delete currProps[leafKey];
        } else {
          if (dp.desc) currProps[leafKey].desc = dp.desc;
          if (dp.default !== undefined) currProps[leafKey].default = dp.default;
        }
      }
    }

    typeTree[paramKey] = node;
  }

  return Object.keys(typeTree).length > 0 ? typeTree : undefined;
}

/**
 * Formats a nested properties map into an indented `{ ... }` object block for `signatureDetailed`.
 */
function _formatPropertiesBlock(properties, indent = "  ") {
  const entries = Object.entries(properties);
  if (entries.length === 0) return "{}";

  const propIndent = indent + "  ";
  const lines = entries.map(([propKey, propNode]) => {
    const optMark = propNode.optional ? "?" : "";
    let typePart;
    if (propNode.properties && Object.keys(propNode.properties).length > 0) {
      typePart = _formatPropertiesBlock(propNode.properties, propIndent);
    } else {
      typePart = propNode.resolvedType || propNode.type || "any";
    }
    const defaultPart = propNode.default !== undefined ? ` = ${propNode.default}` : "";
    return `${propIndent}${propKey}${optMark}: ${typePart}${defaultPart}`;
  });

  return `{\n${lines.join(",\n")}\n${indent}}`;
}

/**
 * Builds a detailed, expanded signature string from a formatted signature and its `typeTree`.
 * Expands nested option properties and resolved type aliases inline into a single contiguous code statement.
 */
export function buildDetailedSignature(formattedSignature, typeTree) {
  if (!formattedSignature) return formattedSignature;
  if (!typeTree || Object.keys(typeTree).length === 0) return formattedSignature;

  // Skip any caller prefix like `$df.col(<column_name>).` before locating the operation's `(`
  const callerPrefixEnd = formattedSignature.indexOf("<column_name>)");
  const searchStart = callerPrefixEnd !== -1 ? callerPrefixEnd + "<column_name>)".length : 0;

  const openParen = _findTopLevelChar(formattedSignature, "(", searchStart);
  if (openParen === -1) return formattedSignature;
  const closeParen = _findMatchingClose(formattedSignature, openParen, "(", ")");
  if (closeParen === -1) return formattedSignature;

  const prefix = formattedSignature.slice(0, openParen);
  const suffix = formattedSignature.slice(closeParen + 1);
  const entries = Object.entries(typeTree);

  if (entries.length === 0) {
    return `${prefix}()${suffix}`;
  }

  const formattedParams = entries.map(([paramKey, node]) => {
    const varPrefix = node.variadic ? "..." : "";
    const hasDefault = node.default !== undefined;
    const optMark = node.optional && !hasDefault ? "?" : "";
    let typePart;
    if (node.properties && Object.keys(node.properties).length > 0) {
      typePart = _formatPropertiesBlock(node.properties, "  ");
    } else {
      typePart = node.resolvedType || node.type || "any";
    }
    const defaultPart = hasDefault ? ` = ${node.default}` : "";
    return `  ${varPrefix}${paramKey}${optMark}: ${typePart}${defaultPart}`;
  });

  if (formattedParams.length === 1 && !formattedParams[0].includes("\n")) {
    return `${prefix}(${formattedParams[0].trim()})${suffix}`;
  }

  return `${prefix}(\n${formattedParams.join(",\n")}\n)${suffix}`;
}

export function extractAllProjectTypes() {
  const typesMap = {};
  const sourceFiles = getSourceFiles(srcDir);

  for (const filePath of sourceFiles) {
    const rawContent = fs.readFileSync(filePath, "utf-8");
    const relativePath = path.relative(srcDir, filePath).replace(/\\/g, "/");
    extractTypesFromContent(rawContent, relativePath, typesMap);
  }

  for (const [typeName, typeEntry] of Object.entries(typesMap)) {
    const resolvedProps = resolveTypeProperties(typeName, typesMap);
    if (resolvedProps) {
      typeEntry.properties = resolvedProps;
    }
  }

  return typesMap;
}

// ─── Recursive Directory Walker ──────────────────────────────────────────────

function _walkFiles(dir, predicate) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      results = results.concat(_walkFiles(fullPath, predicate));
    } else if (predicate(file)) {
      results.push(fullPath);
    }
  }
  return results;
}

export function getSourceFiles(dir) {
  return _walkFiles(dir, file => file.endsWith(".ts") && !file.endsWith(".d.ts"));
}

// ─── Pure Raw Extraction ─────────────────────────────────────────────────────

export function extractRawDocsFromContent(rawContent, relativePath = "", typesMap = null) {
  let fileDocs = null;

  // Scan the raw file content for an `@namespace <value>` tag in any JSDoc block
  const namespaceMatch = rawContent.match(NAMESPACE_REGEX);
  const fileNamespace = namespaceMatch ? namespaceMatch[1].trim() : null;

  // Scan for `@category <value>`
  const categoryMatch = rawContent.match(CATEGORY_REGEX);
  const inferCategory = (relPath) => {
    if (relPath.startsWith("functions/")) return "Function";
    if (relPath.startsWith("dataframe/")) return "DataFrame";
    if (relPath.startsWith("datatypes/")) return "DataType";
    if (relPath.startsWith("exceptions/")) return "Exception";
    return "ColumnExpression";
  };
  const fileCategory = categoryMatch ? categoryMatch[1].trim() : inferCategory(relativePath);

  // Scan for `@syntax <template>`
  const syntaxMatch = rawContent.match(SYNTAX_REGEX);
  const fileSyntaxTemplate = syntaxMatch ? syntaxMatch[1].trim() : null;

  const sf = ts.createSourceFile(relativePath || "file.ts", rawContent, ts.ScriptTarget.Latest, true);

  const getLeadingJSDoc = (node) => {
    const ranges = ts.getLeadingCommentRanges(rawContent, node.getFullStart()) || [];
    for (let i = ranges.length - 1; i >= 0; i--) {
      const text = rawContent.slice(ranges[i].pos, ranges[i].end);
      if (text.startsWith("/**")) return text.slice(3, -2);
    }
    return null;
  };

  const candidates = [];
  for (const stmt of sf.statements) {
    if (ts.isFunctionDeclaration(stmt) && stmt.name) {
      candidates.push({ node: stmt, symbolName: stmt.name.text, isClass: false, isGetter: false });
    } else if (ts.isClassDeclaration(stmt) && stmt.name) {
      candidates.push({ node: stmt, symbolName: stmt.name.text, isClass: true, isGetter: false });
      for (const member of stmt.members) {
        if ((ts.isMethodDeclaration(member) || ts.isGetAccessorDeclaration(member)) && member.name && ts.isIdentifier(member.name)) {
          candidates.push({
            node: member,
            symbolName: member.name.text,
            isClass: false,
            isGetter: ts.isGetAccessorDeclaration(member)
          });
        }
      }
    }
  }

  for (const { node, symbolName, isClass, isGetter } of candidates) {
    const comment = getLeadingJSDoc(node);
    if (!comment) continue;

    // Skip internal functions marked with @internal or @ignore, or leading underscore
    if (
      comment.includes(TAG_INTERNAL) ||
      comment.includes(TAG_IGNORE) ||
      symbolName.startsWith("_")
    ) {
      continue;
    }

    let symbolCategory = fileCategory;
    const localCategoryMatch = comment.match(CATEGORY_REGEX);
    if (localCategoryMatch) {
      symbolCategory = localCategoryMatch[1].trim();
    }
    if (isClass && symbolCategory !== "Exception" && symbolCategory !== "DataType") {
      continue;
    }

    const parsed = parseJSDocComment(comment);

    let symbolNamespace = fileNamespace;
    const localNamespaceMatch = comment.match(NAMESPACE_REGEX);
    if (localNamespaceMatch) {
      symbolNamespace = localNamespaceMatch[1].trim();
    }

    let accessor = undefined;
    if (symbolCategory === "ColumnExpression") {
      if (symbolNamespace && symbolNamespace.startsWith("$df.col.")) {
        accessor = symbolNamespace.slice("$df.col.".length);
      }
      symbolNamespace = "$df.col";
    }

    if (symbolNamespace) {
      parsed.namespace = symbolNamespace;
    }
    if (accessor) {
      parsed.accessor = accessor;
    }

    parsed.category = symbolCategory;
    parsed.propertyAccess = symbolName;

    let symbolSyntax = null;
    const localSyntaxMatch = comment.match(SYNTAX_REGEX);
    if (localSyntaxMatch) {
      symbolSyntax = localSyntaxMatch[1].trim().replace("{symbol}", symbolName);
    } else if (fileSyntaxTemplate) {
      symbolSyntax = fileSyntaxTemplate.replace("{symbol}", symbolName);
    } else {
      symbolSyntax = `$df.col(<column_name>).${symbolName}(...)`;
    }
    if (isGetter) {
      symbolSyntax = symbolSyntax.replace(/\(\.\.\.\)$/, "");
    }

    if (isClass) {
      parsed.callExpression = symbolName;
    } else if (isGetter) {
      parsed.callExpression = `.${symbolName}`;
    } else if (symbolCategory === "Function") {
      parsed.callExpression = `${symbolName}()`;
    } else {
      if (accessor) {
        parsed.callExpression = `.${accessor}.${symbolName}()`;
      } else {
        parsed.callExpression = `.${symbolName}()`;
      }
    }

    const nodeStart = node.getStart(sf);
    const nodeEnd = node.getEnd();
    if (parsed.params && Array.isArray(node.parameters)) {
      const astParamTypes = new Map();
      for (const p of node.parameters) {
        if (ts.isIdentifier(p.name) && p.type) {
          astParamTypes.set(p.name.text, p.type.getText(sf).replace(/\s+/g, " ").trim());
        }
      }
      for (const p of parsed.params) {
        if (!p.type || p.type === "any") {
          const cleanName = p.name.replace(/^\[|\]$/g, "").replace(/^\.\.\./, "").split("=")[0].trim();
          const astType = astParamTypes.get(cleanName);
          if (astType) p.type = astType;
        }
      }
    }
    let rawSignature = node.body
      ? rawContent.slice(nodeStart, node.body.getStart(sf)).replace(/\s+/g, " ").trim()
      : rawContent.slice(nodeStart, nodeEnd).replace(/\s+/g, " ").trim();
    rawSignature = rawSignature.replace(/^(?:export\s+)?(?:async\s+)?function\s+/, "");
    if (isGetter) {
      rawSignature = rawSignature.replace(/^get\s+/, "").replace(/\(\s*\)\s*:/, ":");
    }

    if (isClass && symbolCategory === "Exception") {
      const ctor = node.members.find(m => ts.isConstructorDeclaration(m));
      const ctorParams = ctor ? ctor.parameters.map(p => p.getText(sf).replace(/\s+/g, " ").trim()).join(", ") : "message: string";
      parsed.signature = formatSignature(`new ${symbolName}(${ctorParams})`);
    } else {
      const formattedSignature = formatSignature(rawSignature);
      const symbolIndex = symbolSyntax.indexOf(symbolName);
      const callerPrefix = symbolIndex !== -1 ? symbolSyntax.substring(0, symbolIndex) : "";
      parsed.signature = callerPrefix + formattedSignature;
    }

    if (relativePath) {
      parsed.filePath = relativePath;
    }
    parsed.lineStart = sf.getLineAndCharacterOfPosition(nodeStart).line + 1;
    parsed.lineEnd = sf.getLineAndCharacterOfPosition(nodeEnd).line + 1;
    const typeTree = typesMap ? buildFunctionTypeTree(rawSignature, parsed.params || [], typesMap) : undefined;
    const signatureDetailed = buildDetailedSignature(parsed.signature, typeTree);

    const orderedParsed = {
      ...(parsed.desc ? { desc: parsed.desc } : {}),
      ...(parsed.examples ? { examples: parsed.examples } : {}),
      ...(parsed.params ? { params: parsed.params } : {}),
      ...(parsed.returns ? { returns: parsed.returns } : {}),
      ...(parsed.notes ? { notes: parsed.notes } : {}),
      ...(parsed.namespace ? { namespace: parsed.namespace } : {}),
      ...(parsed.accessor ? { accessor: parsed.accessor } : {}),
      category: parsed.category,
      propertyAccess: parsed.propertyAccess,
      callExpression: parsed.callExpression,
      signature: parsed.signature,
      signatureDetailed,
      ...(parsed.filePath ? { filePath: parsed.filePath } : {}),
      lineStart: parsed.lineStart,
      lineEnd: parsed.lineEnd,
      ...(typeTree ? { typeTree } : {})
    };

    if (parsed.desc || parsed.params || parsed.returns || parsed.examples || parsed.notes) {
      if (!fileDocs) {
        fileDocs = {};
      }
      fileDocs[symbolName] = orderedParsed;
    }
  }

  return fileDocs;
}

function extractAllProjectUtils(sourceFiles, typesMap) {
  const utilsMap = {};
  const rawBodies = {};
  const allTypeNames = Object.keys(typesMap || {});

  for (const filePath of sourceFiles) {
    const relativePath = path.relative(srcDir, filePath).replace(/\\/g, "/");
    if (relativePath.endsWith("types.ts") || relativePath.endsWith("index.ts")) {
      continue;
    }
    const isUtilFile = relativePath.startsWith("utils/") || relativePath.endsWith("/utils.ts");
    const rawContent = fs.readFileSync(filePath, "utf-8");
    const sf = ts.createSourceFile(filePath, rawContent, ts.ScriptTarget.Latest, true);

    for (const stmt of sf.statements) {
      if (!ts.isFunctionDeclaration(stmt) || !stmt.name) continue;
      const name = stmt.name.text;
      const exported = Boolean(stmt.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword));
      const params = stmt.parameters.map(p => p.getText(sf)).join(", ");
      const ret = stmt.type ? stmt.type.getText(sf) : "unknown";
      const signature = `${name}(${params}): ${ret}`;
      const lineStart = sf.getLineAndCharacterOfPosition(stmt.getStart(sf)).line + 1;
      const lineEnd = sf.getLineAndCharacterOfPosition(stmt.getEnd()).line + 1;
      const referencedTypes = allTypeNames.filter(t => new RegExp(`\\b${t}\\b`).test(signature)).sort();
      const entry = {
        code: stmt.getText(sf),
        exported,
        filePath: relativePath,
        lineEnd,
        lineStart,
        returns: ret,
        signature
      };
      if (referencedTypes.length > 0) {
        entry.types = referencedTypes;
      }
      utilsMap[name] = entry;
      rawBodies[name] = stmt.body ? stmt.body.getText(sf) : "";
    }
  }

  const allUtilNames = Object.keys(utilsMap).sort();
  const sortedUtilsMap = {};
  for (const name of allUtilNames) {
    const body = rawBodies[name];
    if (body) {
      const called = allUtilNames.filter(u => u !== name && new RegExp(`\\b${u}\\s*\\(`).test(body));
      if (called.length > 0) {
        utilsMap[name].utils = called;
      }
    }
    sortedUtilsMap[name] = utilsMap[name];
  }

  return sortedUtilsMap;
}

function extractAllProjectConstantsAndClasses(sourceFiles) {
  const constants = {};
  const classes = {};

  const getLeadingDoc = (node, sf, raw) => {
    const ranges = ts.getLeadingCommentRanges(raw, node.getFullStart()) || [];
    for (let i = ranges.length - 1; i >= 0; i--) {
      const text = raw.slice(ranges[i].pos, ranges[i].end);
      if (text.startsWith("/**")) {
        return parseJSDocComment(text.slice(3, -2)).description || "";
      }
    }
    return "";
  };

  for (const filePath of sourceFiles) {
    const raw = fs.readFileSync(filePath, "utf-8");
    const rel = path.relative(srcDir, filePath).replace(/\\/g, "/");
    const sf = ts.createSourceFile(filePath, raw, ts.ScriptTarget.Latest, true);

    for (const stmt of sf.statements) {
      if (ts.isVariableStatement(stmt)) {
        const isExported = !!stmt.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
        const desc = getLeadingDoc(stmt, sf, raw);
        const start = sf.getLineAndCharacterOfPosition(stmt.getStart(sf)).line + 1;
        const end = sf.getLineAndCharacterOfPosition(stmt.getEnd()).line + 1;
        for (const decl of stmt.declarationList.declarations) {
          if (!ts.isIdentifier(decl.name)) continue;
          const name = decl.name.text;
          const key = isExported ? name : `${rel}:${name}`;
          constants[key] = {
            name,
            exported: isExported,
            visibility: isExported && !name.startsWith("_") ? "public" : "internal",
            type: decl.type ? decl.type.getText(sf) : undefined,
            value: decl.initializer ? decl.initializer.getText(sf) : undefined,
            filePath: rel,
            lineStart: start,
            lineEnd: end,
            ...(desc ? { description: desc } : {})
          };
        }
      } else if (ts.isClassDeclaration(stmt) && stmt.name) {
        const name = stmt.name.text;
        const isExported = !!stmt.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
        const desc = getLeadingDoc(stmt, sf, raw);
        const start = sf.getLineAndCharacterOfPosition(stmt.getStart(sf)).line + 1;
        const end = sf.getLineAndCharacterOfPosition(stmt.getEnd()).line + 1;

        let ext;
        let impls;
        if (stmt.heritageClauses) {
          for (const hc of stmt.heritageClauses) {
            const names = hc.types.map(t => t.getText(sf));
            if (hc.token === ts.SyntaxKind.ExtendsKeyword) ext = names[0];
            else if (hc.token === ts.SyntaxKind.ImplementsKeyword) impls = names;
          }
        }

        let ctor;
        const properties = [];
        const methods = [];
        const getters = [];
        const setters = [];

        for (const member of stmt.members) {
          if (ts.isConstructorDeclaration(member)) {
            const params = member.parameters.map(p => p.getText(sf)).join(", ");
            const cDesc = getLeadingDoc(member, sf, raw);
            ctor = {
              signature: `constructor(${params})`,
              ...(cDesc ? { description: cDesc } : {})
            };
          } else if (ts.isPropertyDeclaration(member) && member.name) {
            const pName = member.name.getText(sf);
            properties.push({
              name: pName,
              type: member.type ? member.type.getText(sf) : undefined,
              visibility: pName.startsWith("_") ? "internal" : "public"
            });
          } else if (ts.isMethodDeclaration(member) && member.name) {
            methods.push(member.name.getText(sf));
          } else if (ts.isGetAccessorDeclaration(member) && member.name) {
            getters.push(member.name.getText(sf));
          } else if (ts.isSetAccessorDeclaration(member) && member.name) {
            setters.push(member.name.getText(sf));
          }
        }

        classes[name] = {
          name,
          exported: isExported,
          visibility: isExported && !name.startsWith("_") ? "public" : "internal",
          ...(ext ? { extends: ext } : {}),
          ...(impls?.length ? { implements: impls } : {}),
          filePath: rel,
          lineStart: start,
          lineEnd: end,
          ...(ctor ? { constructor: ctor } : {}),
          ...(properties.length ? { properties } : {}),
          ...(methods.length ? { methods } : {}),
          ...(getters.length ? { getters } : {}),
          ...(setters.length ? { setters } : {}),
          ...(desc ? { description: desc } : {})
        };
      }
    }
  }

  return { constants, classes };
}

export function extractRawDocs() {
  const typesMap = extractAllProjectTypes();
  const sourceFiles = getSourceFiles(srcDir);
  const utilsMap = extractAllProjectUtils(sourceFiles, typesMap);
  const { constants, classes } = extractAllProjectConstantsAndClasses(sourceFiles);
  const docs = {
    classes,
    columnExpressions: {},
    constants,
    dataframe: {},
    datatypes: {},
    exceptions: {},
    functions: {},
    types: typesMap,
    utils: utilsMap
  };

  for (const filePath of sourceFiles) {
    const rawContent = fs.readFileSync(filePath, "utf-8");

    if (rawContent.includes(TAG_TYPEFILE) || rawContent.includes(TAG_INTERNALFILE)) {
      continue;
    }

    const relativePath = path.relative(srcDir, filePath).replace(/\\/g, "/");
    const fileDocs = extractRawDocsFromContent(rawContent, relativePath, typesMap);

    if (!fileDocs) continue;

    if (relativePath.startsWith("columnExpressions/")) {
      const subKey = path.basename(relativePath, ".ts");
      docs.columnExpressions[subKey] = Object.assign(docs.columnExpressions[subKey] || {}, fileDocs);
    } else if (relativePath.startsWith("dataframe/")) {
      Object.assign(docs.dataframe, fileDocs);
    } else if (relativePath.startsWith("datatypes/")) {
      Object.assign(docs.datatypes, fileDocs);
    } else if (relativePath.startsWith("exceptions/")) {
      Object.assign(docs.exceptions, fileDocs);
    } else if (relativePath.startsWith("functions/")) {
      Object.assign(docs.functions, fileDocs);
    }
  }

  const allTypeNames = Object.keys(typesMap);
  const allUtilNames = Object.keys(utilsMap);

  const sortEntry = (entry) => {
    const sorted = {};
    for (const k of Object.keys(entry).sort()) {
      sorted[k] = entry[k];
    }
    return sorted;
  };

  for (const [fnName, fnDoc] of Object.entries(docs.functions)) {
    const fullPath = path.join(srcDir, fnDoc.filePath);
    if (fs.existsSync(fullPath)) {
      const raw = fs.readFileSync(fullPath, "utf-8");
      const sf = ts.createSourceFile(fullPath, raw, ts.ScriptTarget.Latest, true);
      for (const stmt of sf.statements) {
        if (ts.isFunctionDeclaration(stmt) && stmt.name?.text === fnName) {
          fnDoc.code = stmt.getText(sf);
          const body = stmt.body ? stmt.body.getText(sf) : "";
          const refUtils = allUtilNames.filter(u => new RegExp(`\\b${u}\\s*\\(`).test(body)).sort();
          if (refUtils.length > 0) fnDoc.utils = refUtils;
          break;
        }
      }
    }
    const typeScanText = `${fnDoc.signature || ""}\n${fnDoc.code || ""}`;
    const refTypes = allTypeNames.filter(t => new RegExp(`\\b${t}\\b`).test(typeScanText)).sort();
    if (refTypes.length > 0) fnDoc.types = refTypes;
    docs.functions[fnName] = sortEntry(fnDoc);
  }

  const enrichEntry = (doc) => {
    if (!doc || typeof doc !== "object" || !doc.filePath) return;
    const fullPath = path.join(srcDir, doc.filePath);
    if (fs.existsSync(fullPath) && doc.lineStart && doc.lineEnd && !doc.code) {
      const lines = fs.readFileSync(fullPath, "utf-8").split(/\r?\n/);
      const snippet = lines.slice(doc.lineStart - 1, doc.lineEnd).join("\n");
      doc.code = snippet;
      const refUtils = allUtilNames.filter(u => new RegExp(`\\b${u}\\s*\\(`).test(snippet)).sort();
      if (refUtils.length > 0 && !doc.utils) doc.utils = refUtils;
    }
    const typeScanText = `${doc.signature || ""}\n${doc.code || ""}`;
    const refTypes = allTypeNames.filter(t => new RegExp(`\\b${t}\\b`).test(typeScanText)).sort();
    if (refTypes.length > 0 && !doc.types) doc.types = refTypes;
  };

  for (const subMap of Object.values(docs.columnExpressions)) {
    for (const doc of Object.values(subMap)) enrichEntry(doc);
  }
  for (const doc of Object.values(docs.dataframe)) enrichEntry(doc);
  for (const doc of Object.values(docs.datatypes)) enrichEntry(doc);
  for (const doc of Object.values(docs.exceptions)) enrichEntry(doc);

  const sortDeep = (val) => {
    if (Array.isArray(val)) return val.map(sortDeep);
    if (val && typeof val === "object") {
      const sorted = {};
      for (const k of Object.keys(val).sort()) {
        sorted[k] = sortDeep(val[k]);
      }
      return sorted;
    }
    return val;
  };

  const flatFunctions = {};
  const addFlat = (key, doc, owner, visibility) => {
    flatFunctions[key] = sortDeep({ ...doc, owner, visibility });
  };

  for (const [fnName, doc] of Object.entries(docs.functions)) {
    addFlat(`$df.${fnName}`, doc, "$df", "public");
  }
  for (const [fnName, doc] of Object.entries(docs.dataframe)) {
    addFlat(`DataFrame.${fnName}`, doc, "DataFrame", "public");
  }
  for (const [sub, subMap] of Object.entries(docs.columnExpressions)) {
    const owner = sub.charAt(0).toUpperCase() + sub.slice(1);
    for (const [fnName, doc] of Object.entries(subMap)) {
      addFlat(`${owner}.${fnName}`, doc, owner, "public");
    }
  }
  for (const [fnName, doc] of Object.entries(docs.datatypes)) {
    addFlat(`DataTypes.${fnName}`, doc, "DataTypes", "public");
  }
  for (const [fnName, doc] of Object.entries(docs.exceptions)) {
    addFlat(`Exceptions.${fnName}`, doc, "Exceptions", "public");
  }
  for (const [fnName, doc] of Object.entries(docs.utils)) {
    if (!docs.functions[fnName]) {
      addFlat(fnName, doc, "internal", "internal");
    }
  }

  const exportedSymbols = new Set();
  for (const filePath of sourceFiles) {
    const raw = fs.readFileSync(filePath, "utf-8");
    const rel = path.relative(srcDir, filePath).replace(/\\/g, "/");
    const sf = ts.createSourceFile(filePath, raw, ts.ScriptTarget.Latest, true);
    for (const stmt of sf.statements) {
      if (!stmt.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) continue;
      if ((ts.isFunctionDeclaration(stmt) || ts.isInterfaceDeclaration(stmt) || ts.isTypeAliasDeclaration(stmt)) && stmt.name) {
        exportedSymbols.add(`${rel}:${stmt.name.text}`);
      }
    }
  }

  const allClassNames = Object.keys(classes);
  const allConstNames = [...new Set(Object.values(constants).map(c => c.name))];
  const allFnShortNames = [...new Set(Object.keys(flatFunctions).map(k => (k.includes(".") ? k.split(".").pop() : k)))];
  const allCallableNames = [...new Set([...allUtilNames, ...allFnShortNames])];

  const testsRoot = path.resolve(__dirname, "../_tests");
  const loadFunctionTests = (filePath, shortName) => {
    if (!filePath) return undefined;
    const noExt = filePath.replace(/\.ts$/, "");
    const dir = path.dirname(filePath);
    const bases = [
      path.join(testsRoot, noExt, shortName),
      path.join(testsRoot, dir, shortName),
      path.join(testsRoot, noExt)
    ];
    const result = {};
    for (const [key, suffix] of [["bench", ".bench.ts"], ["test", ".test.ts"], ["test-d", ".test-d.ts"]]) {
      for (const base of bases) {
        const candidate = base + suffix;
        if (fs.existsSync(candidate)) {
          result[key] = fs.readFileSync(candidate, "utf-8");
          break;
        }
      }
    }
    return Object.keys(result).length > 0 ? result : undefined;
  };

  for (const [fnKey, fnDoc] of Object.entries(flatFunctions)) {
    if (!fnDoc || typeof fnDoc !== "object") continue;
    const shortName = fnKey.includes(".") ? fnKey.split(".").pop() : fnKey;
    const isExported = fnDoc.filePath ? exportedSymbols.has(`${fnDoc.filePath}:${shortName}`) : false;
    fnDoc.exported = isExported;
    if (!fnDoc.visibility) {
      fnDoc.visibility = shortName.startsWith("_") || fnDoc.category === "internal" ? "internal" : "public";
    }
    const scanText = `${fnDoc.signature || ""}\n${fnDoc.code || ""}`;
    const bodyText = fnDoc.code || "";
    const depClasses = allClassNames.filter(c => new RegExp(`\\b${c}\\b`).test(scanText)).sort();
    const depConstants = allConstNames.filter(c => new RegExp(`\\b${c}\\b`).test(scanText)).sort();
    const depFunctions = allCallableNames.filter(f => f !== shortName && new RegExp(`\\b${f}\\s*\\(`).test(bodyText)).sort();
    const depTypes = allTypeNames.filter(t => new RegExp(`\\b${t}\\b`).test(scanText)).sort();
    const deps = {
      ...(depClasses.length ? { classes: depClasses } : {}),
      ...(depConstants.length ? { constants: depConstants } : {}),
      ...(depFunctions.length ? { functions: depFunctions } : {}),
      ...(depTypes.length ? { types: depTypes } : {})
    };
    if (Object.keys(deps).length > 0) {
      fnDoc.dependencies = deps;
    }
    const fnTests = loadFunctionTests(fnDoc.filePath, shortName);
    if (fnTests) {
      fnDoc.tests = fnTests;
    }
    delete fnDoc.types;
    delete fnDoc.utils;
    delete fnDoc.category;
    delete fnDoc.owner;
  }

  for (const [typeName, typeDoc] of Object.entries(docs.types)) {
    if (!typeDoc || typeof typeDoc !== "object") continue;
    const isExported = typeDoc.filePath ? exportedSymbols.has(`${typeDoc.filePath}:${typeName}`) : false;
    typeDoc.exported = isExported;
    if (!typeDoc.visibility) {
      typeDoc.visibility = typeName.startsWith("_") ? "internal" : "public";
    }
  }

  return sortDeep({
    classes: docs.classes,
    constants: docs.constants,
    functions: flatFunctions,
    types: docs.types
  });
}

/**
 * Hydrates clean <!-- doc:KEY --> tags in compiled .d.ts files with full ASCII tables.
 */

/**
 * Verifies that every extracted example in docs.json is executable without errors.
 */
export async function validateExtractedDocExamples(docs) {
  // Dynamically import the compiled library bundle if available, or source
  let dfScript;
  const distEntry = path.resolve(__dirname, "../dist/index.js");
  if (fs.existsSync(distEntry)) {
    dfScript = await import(pathToFileURL(distEntry).href);
  } else {
    // If running prior to build, skip runtime eval
    console.log("  (dist/index.js not yet built; skipping runtime doctest validation)");
    return;
  }

  const { all, col, element, lit, when } = dfScript;
  const dfNs = dfScript.default || dfScript;

  let total = 0;
  let passed = 0;
  const errors = [];
  const shapeWarnings = [];

  function cleanCodeToRun(exampleStr) {
    const lines = exampleStr.split("\n");
    const codeLines = [];
    for (const l of lines) {
      const trimmed = l.trim();
      if (!trimmed || trimmed.startsWith("//")) continue;
      codeLines.push(l);
    }
    return codeLines.join("\n");
  }

  function walk(obj, currentPath) {
    if (!obj || typeof obj !== "object") return;
    if (obj.examples && Array.isArray(obj.examples)) {
      obj.examples.forEach((ex, idx) => {
        total++;
        const code = cleanCodeToRun(ex);
        try {
          const logs = [];
          const origLog = console.log;
          console.log = (...args) => logs.push(args.map(String).join(" "));
          try {
            const fn = new Function("$df", "all", "col", "element", "lit", "when", code);
            fn(dfNs, all, col, element, lit, when);
          } finally {
            console.log = origLog;
          }
          const expectedShape = ex.match(/shape:\s*\((\d+,\s*\d+)\)/)?.[1];
          const actualShape = logs.join("\n").match(/shape:\s*\((\d+,\s*\d+)\)/)?.[1];
          if (expectedShape && actualShape && expectedShape !== actualShape) {
            shapeWarnings.push(`${currentPath}[${idx}]: expected shape (${expectedShape}), got (${actualShape})`);
          }
          passed++;
        } catch (err) {
          errors.push({ path: `${currentPath}[${idx}]`, err: err.message, code });
        }
      });
    }
    for (const [k, v] of Object.entries(obj)) {
      walk(v, currentPath ? `${currentPath}.${k}` : k);
    }
  }

  walk(docs, "");
  if (errors.length > 0) {
    console.error(`❌ Doctest validation failed: ${errors.length} of ${total} examples threw errors:`);
    for (const e of errors) {
      console.error(`  - ${e.path}: ${e.err}`);
    }
    throw new Error(`Doc extraction aborted due to ${errors.length} invalid example(s).`);
  }
  console.log(`  ✓ Verified ${passed} of ${total} doc examples executed cleanly without error.`);
  if (shapeWarnings.length > 0) {
    console.warn(`  ⚠ ${shapeWarnings.length} doc example(s) have stale shape comments:`);
    for (const w of shapeWarnings) console.warn(`    - ${w}`);
  }
}

export function hydrateDtsInDir(dir) {
  let count = 0;
  for (const full of _walkFiles(dir, f => f.endsWith(".d.ts"))) {
    let content = fs.readFileSync(full, "utf-8");
    let changed = false;
    content = content.replace(
      /([ \t]*\*[ \t]*)<!-- @?doc:([a-zA-Z0-9_]+) -->/g,
      (_, _prefix, key) => {
        if (docExamples[key]) {
          changed = true;
          const lines = docExamples[key]
            .split("\n")
            .map(l => l.replace(/^[ \t]*\*[ \t]?/, "").trimEnd());
          return lines.map(line => ` * ${line}`).join("\n");
        }
        return "";
      }
    );
    if (changed) {
      fs.writeFileSync(full, content, "utf-8");
      count++;
    }
  }
  if (count > 0) {
    console.log(`  Hydrated JSDoc example tables in ${count} declaration (.d.ts) files.`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const isMain = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isMain) {
  const isSync = process.argv.includes("--sync");
  if (isSync) {
    console.log("Synchronizing JSDoc template tables in TypeScript source files...");
    const sourceFiles = getSourceFiles(srcDir);
    syncJSDocsInFiles(sourceFiles);
  }

  const outArg = process.argv.indexOf("--out");
  const outPath =
    outArg !== -1 ? path.resolve(process.argv[outArg + 1]) : path.resolve(__dirname, "../docs.json");

  console.log("Extracting raw docs and types recursively from source files...");
  const docs = extractRawDocs();
  const typeCount = Object.keys(docs.types).length;

  console.log(`  Extracted ${typeCount} TypeScript type definitions.`);

  await validateExtractedDocExamples(docs);

  fs.writeFileSync(outPath, JSON.stringify(docs, null, 2), "utf-8");
  console.log(`  Written to: ${outPath}`);

  const distDir = path.resolve(__dirname, "../dist");
  if (fs.existsSync(distDir)) {
    hydrateDtsInDir(distDir);
  }

  console.log("Done.");
}
