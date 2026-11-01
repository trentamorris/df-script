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

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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
} catch (e) {}

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
        /<!-- @?doc:([a-zA-Z0-9_]+) -->([\s\S]*?)(?=(\n\s*\* >>>|\n\s*\* @|\*\/))/g,
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

// ─── Regexes to capture JSDoc comments followed by identifiers ────────────────

// Capture any JSDoc block (not followed by another JSDoc block) + modifiers + immediate declaration name
const JSDOC_BLOCK_REGEX =
  /\/\*\*((?:(?!\*\/)[\s\S])*?)\*\/[\s\r\n]*?(?![\s\r\n]*\/\*\*)((?:(?:export|public|private|static|abstract|readonly|override|async|function|class|get|set)\s+|\*\s*)*)([a-zA-Z0-9_$]+)/g;

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
          const paramObj = { name: rawName };
          if (type) paramObj.type = type;
          if (defaultVal) paramObj.default = defaultVal;
          paramObj.desc = pDesc;
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
                /<!-- @?doc:([a-zA-Z0-9_]+) -->([\s\S]*?)(?=(\n\s*>>> (?:df\.[a-zA-Z0-9_$]|df1\.|df2\.|trades\.|quotes\.|\$df\.|\$col|\/\/)|$))/g,
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

export function extractSignatureAndEnd(rawContent, startIndex, symbolName, isGetter) {
  let parenDepth = 0;
  let braceDepth = 0;
  let angleDepth = 0;
  let inString = null;
  let isEscaped = false;
  let signature = isGetter ? "get " + symbolName : symbolName;

  let i = startIndex;
  while (i < rawContent.length && /\s/.test(rawContent[i])) i++;

  let bodyStartIndex = -1;

  // 1. Scan the signature until top-level '{' or ';'
  while (i < rawContent.length) {
    const char = rawContent[i];
    const prevChar = i > startIndex ? rawContent[i - 1] : "";

    if (inString) {
      if (char === inString && !isEscaped) {
        inString = null;
      }
      isEscaped = char === "\\" && !isEscaped;
    } else {
      if (char === '"' || char === "'" || char === "`") {
        inString = char;
      } else if (char === "(") parenDepth++;
      else if (char === ")") parenDepth--;
      else if (char === "{") {
        if (parenDepth === 0 && angleDepth === 0 && braceDepth === 0) {
          bodyStartIndex = i;
          break;
        }
        braceDepth++;
      } else if (char === "}") braceDepth--;
      else if (char === "<") angleDepth++;
      else if (char === ">" && prevChar !== "=") {
        if (angleDepth > 0) angleDepth--;
      } else if (char === ";" && parenDepth === 0 && braceDepth === 0 && angleDepth === 0) {
        let finalEnd = i;
        const implRegex = new RegExp(`^\\s*(?:export\\s+)?(?:async\\s+)?function\\s+${symbolName}\\b`);
        if (implRegex.test(rawContent.slice(i + 1))) {
          const nextBrace = rawContent.indexOf("{", i + 1);
          if (nextBrace !== -1) {
            bodyStartIndex = nextBrace;
            break;
          }
        }
        return {
          signature: signature.replace(/\s+/g, " ").trim(),
          endIndex: finalEnd
        };
      }
    }

    signature += char;
    i++;
  }

  // 2. If we found the opening brace of the function body, scan until matching closing brace
  let endIndex = bodyStartIndex !== -1 ? bodyStartIndex : i;
  if (bodyStartIndex !== -1) {
    let bodyBraceDepth = 0;
    let j = bodyStartIndex;
    let bodyString = null;
    let bodyEscaped = false;

    while (j < rawContent.length) {
      const char = rawContent[j];

      if (bodyString) {
        if (char === bodyString && !bodyEscaped) {
          bodyString = null;
        }
        bodyEscaped = char === "\\" && !bodyEscaped;
      } else {
        if (char === '"' || char === "'" || char === "`") {
          bodyString = char;
        } else if (char === "{") {
          bodyBraceDepth++;
        } else if (char === "}") {
          bodyBraceDepth--;
          if (bodyBraceDepth === 0) {
            endIndex = j;
            break;
          }
        }
      }
      j++;
    }
  }

  let normalizedSig = signature.replace(/\s+/g, " ").trim();
  if (isGetter) {
    normalizedSig = normalizedSig.replace(/^get\s+([a-zA-Z0-9_$]+)\s*\(\s*\)/, "$1");
  }

  return {
    signature: normalizedSig,
    endIndex
  };
}

// splitByComma: Splits a string on commas at the top-level (respecting strings, nested parentheses, curly braces, brackets, and generics).
export function splitByComma(str) {
  const parts = [];
  let current = "";
  let parenDepth = 0;
  let braceDepth = 0;
  let bracketDepth = 0;
  let angleDepth = 0;
  let inString = null;
  let isEscaped = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const prevChar = i > 0 ? str[i - 1] : "";

    if (inString) {
      if (char === inString && !isEscaped) {
        inString = null;
      }
      isEscaped = char === "\\" && !isEscaped;
      current += char;
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      inString = char;
    } else if (char === "(") parenDepth++;
    else if (char === ")") {
      if (parenDepth > 0) parenDepth--;
    } else if (char === "{") braceDepth++;
    else if (char === "}") {
      if (braceDepth > 0) braceDepth--;
    } else if (char === "[") bracketDepth++;
    else if (char === "]") {
      if (bracketDepth > 0) bracketDepth--;
    } else if (char === "<") angleDepth++;
    else if (char === ">" && prevChar !== "=") {
      if (angleDepth > 0) angleDepth--;
    }

    if (
      char === "," &&
      parenDepth === 0 &&
      braceDepth === 0 &&
      bracketDepth === 0 &&
      angleDepth === 0
    ) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    parts.push(current.trim());
  }
  return parts;
}

function findParamOpenParen(str) {
  let angleDepth = 0;
  let inString = null;
  let isEscaped = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const prevChar = i > 0 ? str[i - 1] : "";

    if (inString) {
      if (char === inString && !isEscaped) inString = null;
      isEscaped = char === "\\" && !isEscaped;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      inString = char;
    } else if (char === "<") {
      angleDepth++;
    } else if (char === ">" && prevChar !== "=") {
      if (angleDepth > 0) angleDepth--;
    } else if (char === "(" && angleDepth === 0) {
      return i;
    }
  }
  return -1;
}

function findMatchingCloseParen(str, openParenIdx) {
  let parenDepth = 0;
  let inString = null;
  let isEscaped = false;

  for (let i = openParenIdx; i < str.length; i++) {
    const char = str[i];

    if (inString) {
      if (char === inString && !isEscaped) inString = null;
      isEscaped = char === "\\" && !isEscaped;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      inString = char;
    } else if (char === "(") {
      parenDepth++;
    } else if (char === ")") {
      parenDepth--;
      if (parenDepth === 0) return i;
    }
  }
  return -1;
}

function splitParamNameAndType(paramStr) {
  let parenDepth = 0;
  let braceDepth = 0;
  let bracketDepth = 0;
  let angleDepth = 0;
  let inString = null;
  let isEscaped = false;

  for (let i = 0; i < paramStr.length; i++) {
    const char = paramStr[i];
    const prevChar = i > 0 ? paramStr[i - 1] : "";

    if (inString) {
      if (char === inString && !isEscaped) inString = null;
      isEscaped = char === "\\" && !isEscaped;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") inString = char;
    else if (char === "(") parenDepth++;
    else if (char === ")" && parenDepth > 0) parenDepth--;
    else if (char === "{") braceDepth++;
    else if (char === "}" && braceDepth > 0) braceDepth--;
    else if (char === "[") bracketDepth++;
    else if (char === "]" && bracketDepth > 0) bracketDepth--;
    else if (char === "<") angleDepth++;
    else if (char === ">" && prevChar !== "=" && angleDepth > 0) angleDepth--;
    else if (
      char === ":" &&
      parenDepth === 0 &&
      braceDepth === 0 &&
      bracketDepth === 0 &&
      angleDepth === 0
    ) {
      return {
        namePart: paramStr.substring(0, i).trim(),
        typeAndDefault: paramStr.substring(i + 1).trim()
      };
    }
  }
  return { namePart: paramStr.trim(), typeAndDefault: "" };
}

// formatSignature: splits params onto individual lines when there are 2+ params or a destructured parameter,
// and keeps 0 or 1 simple parameter on a single line.
export function formatSignature(signatureStr) {
  const firstParen = findParamOpenParen(signatureStr);
  if (firstParen === -1) {
    return signatureStr;
  }
  const lastParen = findMatchingCloseParen(signatureStr, firstParen);
  if (lastParen === -1) {
    return signatureStr;
  }

  const prefix = signatureStr.substring(0, firstParen);
  const paramsStr = signatureStr.substring(firstParen + 1, lastParen);
  const suffix = signatureStr.substring(lastParen + 1);

  const rawParams = splitByComma(paramsStr);

  if (rawParams.length === 0) {
    return `${prefix}()${suffix}`;
  }

  const formattedParams = rawParams.map(p => {
    const { namePart, typeAndDefault } = splitParamNameAndType(p);

    // Check if the parameter is destructured (e.g. "{ a, b }: Type = {}")
    if (namePart.startsWith("{") && namePart.endsWith("}") && typeAndDefault) {
      const fieldsStr = namePart.slice(1, -1).trim();
      const fields = splitByComma(fieldsStr).map(f => {
        const colonIdx = f.indexOf(":");
        if (colonIdx !== -1 && !f.includes("=")) {
          return f.substring(0, colonIdx).trim();
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
 * Replaces comments and string literals with spaces while preserving exact character offsets and newlines.
 */
function maskCommentsAndStrings(str) {
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
 * Extracts all top-level TypeScript `interface` and `type` declarations from a file's raw content.
 */
export function extractTypesFromContent(rawContent, filePath = "", typesMap = {}) {
  const normalized = rawContent.replace(/\r\n/g, "\n");
  const masked = maskCommentsAndStrings(normalized);
  const declRegex = /^[ \t]*(?:export\s+)?(interface|type)\s+([A-Za-z_$][A-Za-z0-9_$]*)\b/gm;

  let match;
  while ((match = declRegex.exec(masked)) !== null) {
    const kind = match[1];
    const typeName = match[2];
    const firstNonSpaceOffset = match[0].search(/\S/);
    const declStart = match.index + (firstNonSpaceOffset !== -1 ? firstNonSpaceOffset : 0);
    let cursor = match.index + match[0].length;
    let declEnd = -1;

    if (kind === "interface") {
      // Scan until opening '{' of interface body (skipping generic <...> and extends clause)
      let angleDepth = 0;
      let parenDepth = 0;
      let openBraceIdx = -1;

      for (let i = cursor; i < masked.length; i++) {
        const ch = masked[i];
        const prev = i > cursor ? masked[i - 1] : "";
        if (ch === "<") angleDepth++;
        else if (ch === ">" && prev !== "=" && angleDepth > 0) angleDepth--;
        else if (ch === "(") parenDepth++;
        else if (ch === ")" && parenDepth > 0) parenDepth--;
        else if (ch === "{" && angleDepth === 0 && parenDepth === 0) {
          openBraceIdx = i;
          break;
        }
      }

      if (openBraceIdx === -1) continue;

      let braceDepth = 0;
      for (let i = openBraceIdx; i < masked.length; i++) {
        const ch = masked[i];
        if (ch === "{") braceDepth++;
        else if (ch === "}") {
          braceDepth--;
          if (braceDepth === 0) {
            declEnd = i;
            break;
          }
        }
      }
    } else if (kind === "type") {
      // Scan until top-level '=' (skipping generic parameter list <...>)
      let angleDepth = 0;
      let parenDepth = 0;
      let braceDepth = 0;
      let bracketDepth = 0;
      let eqIdx = -1;

      for (let i = cursor; i < masked.length; i++) {
        const ch = masked[i];
        const prev = i > cursor ? masked[i - 1] : "";
        const next = i + 1 < masked.length ? masked[i + 1] : "";
        if (ch === "<") angleDepth++;
        else if (ch === ">" && prev !== "=" && angleDepth > 0) angleDepth--;
        else if (ch === "(") parenDepth++;
        else if (ch === ")" && parenDepth > 0) parenDepth--;
        else if (ch === "{") braceDepth++;
        else if (ch === "}" && braceDepth > 0) braceDepth--;
        else if (ch === "[") bracketDepth++;
        else if (ch === "]" && bracketDepth > 0) bracketDepth--;
        else if (
          ch === "=" &&
          next !== ">" &&
          angleDepth === 0 &&
          parenDepth === 0 &&
          braceDepth === 0 &&
          bracketDepth === 0
        ) {
          eqIdx = i;
          break;
        } else if (
          ch === ";" &&
          angleDepth === 0 &&
          parenDepth === 0 &&
          braceDepth === 0 &&
          bracketDepth === 0
        ) {
          break;
        }
      }

      if (eqIdx === -1) continue;

      // Scan RHS of type alias until top-level ';' (or end of top-level type expression)
      angleDepth = 0;
      parenDepth = 0;
      braceDepth = 0;
      bracketDepth = 0;

      for (let i = eqIdx + 1; i < masked.length; i++) {
        const ch = masked[i];
        const prev = i > eqIdx + 1 ? masked[i - 1] : "";
        if (ch === "<") angleDepth++;
        else if (ch === ">" && prev !== "=" && angleDepth > 0) angleDepth--;
        else if (ch === "(") parenDepth++;
        else if (ch === ")" && parenDepth > 0) parenDepth--;
        else if (ch === "{") braceDepth++;
        else if (ch === "}" && braceDepth > 0) braceDepth--;
        else if (ch === "[") bracketDepth++;
        else if (ch === "]" && bracketDepth > 0) bracketDepth--;
        else if (
          ch === ";" &&
          angleDepth === 0 &&
          parenDepth === 0 &&
          braceDepth === 0 &&
          bracketDepth === 0
        ) {
          declEnd = i;
          break;
        } else if (
          ch === "\n" &&
          angleDepth === 0 &&
          parenDepth === 0 &&
          braceDepth === 0 &&
          bracketDepth === 0
        ) {
          const rest = masked.slice(i + 1).trimStart();
          if (
            /^(?:export|interface|type|function|const|let|var|class|abstract)\b/.test(rest)
          ) {
            declEnd = i - 1;
            break;
          }
        }
      }
      if (declEnd === -1) {
        declEnd = masked.length - 1;
      }
    }

    if (declEnd === -1) continue;

    const signature = normalized.substring(declStart, declEnd + 1).trim();
    const lineStart = normalized.substring(0, declStart).split("\n").length;
    const lineEnd = normalized.substring(0, declEnd + 1).split("\n").length;

    typesMap[typeName] = {
      filePath,
      lineStart,
      lineEnd,
      signature,
      subTypes: []
    };

    declRegex.lastIndex = declEnd + 1;
  }

  return typesMap;
}

/**
 * Extracts all referenced project type keys from a signature string.
 */
export function extractSubTypes(signature, typesMap, selfName = null) {
  if (!signature || !typesMap) return [];
  const masked = maskCommentsAndStrings(signature);
  const subTypes = [];
  const idRegex = /\b([A-Za-z_$][A-Za-z0-9_$]*)\b/g;

  let m;
  while ((m = idRegex.exec(masked)) !== null) {
    const id = m[1];
    if (id === selfName) continue;
    if (!Object.prototype.hasOwnProperty.call(typesMap, id)) continue;

    // Skip if this identifier is a parameter or property name immediately followed by ':' or '?:'
    const afterStr = masked.slice(m.index + id.length);
    if (/^\s*\??\s*:/.test(afterStr)) continue;

    if (!subTypes.includes(id)) {
      subTypes.push(id);
    }
  }

  return subTypes;
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
    typeEntry.subTypes = extractSubTypes(typeEntry.signature, typesMap, typeName);
  }

  return typesMap;
}

// ─── Recursive Directory Walker ──────────────────────────────────────────────

export function getSourceFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getSourceFiles(filePath));
    } else if (file.endsWith(".ts") && !file.endsWith(".d.ts")) {
      results.push(filePath);
    }
  }
  return results;
}

// ─── Pure Raw Extraction ─────────────────────────────────────────────────────

export function extractRawDocsFromContent(rawContent, relativePath = "", typesMap = null) {
  let fileDocs = null;
  let match;

  // Scan the raw file content for an `@namespace <value>` tag in any JSDoc block
  const namespaceMatch = rawContent.match(NAMESPACE_REGEX);
  const fileNamespace = namespaceMatch ? namespaceMatch[1].trim() : null;

  // Scan for `@category <value>`
  const categoryMatch = rawContent.match(CATEGORY_REGEX);
  const fileCategory = categoryMatch ? categoryMatch[1].trim() : "ColumnExpression";

  // Scan for `@syntax <template>`
  const syntaxMatch = rawContent.match(SYNTAX_REGEX);
  const fileSyntaxTemplate = syntaxMatch ? syntaxMatch[1].trim() : null;

  JSDOC_BLOCK_REGEX.lastIndex = 0;
  while ((match = JSDOC_BLOCK_REGEX.exec(rawContent)) !== null) {
    const comment = match[1];
    const modifiers = match[2] || "";
    const symbolName = match[3];

    // Skip internal functions marked with @internal or @ignore, or constructor / leading underscore symbols
    if (
      comment.includes(TAG_INTERNAL) ||
      comment.includes(TAG_IGNORE) ||
      symbolName.startsWith("_") ||
      symbolName === "constructor"
    ) {
      continue;
    }

    const isClass = /\bclass\b/.test(modifiers);
    const isGetter = /\bget\b/.test(modifiers);

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

    const { signature: rawSignature, endIndex } = extractSignatureAndEnd(
      rawContent,
      JSDOC_BLOCK_REGEX.lastIndex,
      symbolName,
      isGetter
    );

    if (isClass && symbolCategory === "Exception") {
      const classBody = rawContent.substring(JSDOC_BLOCK_REGEX.lastIndex, endIndex + 1);
      const ctorMatch = classBody.match(/constructor\s*\(([\s\S]*?)\)/);
      const ctorParams = ctorMatch ? ctorMatch[1].replace(/\s+/g, " ").trim() : "message: string";
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
    parsed.lineStart = rawContent.substring(0, match.index + match[0].length).split("\n").length;
    parsed.lineEnd = rawContent.substring(0, endIndex + 1).split("\n").length;
    parsed.subTypes = typesMap ? extractSubTypes(parsed.signature, typesMap, symbolName) : [];

    if (parsed.desc || parsed.params || parsed.returns || parsed.examples || parsed.notes) {
      if (!fileDocs) {
        fileDocs = {};
      }
      fileDocs[symbolName] = parsed;
    }
  }

  return fileDocs;
}

export function extractRawDocs() {
  const typesMap = extractAllProjectTypes();
  const docs = {
    columnExpressions: {},
    dataframe: {},
    datatypes: {},
    exceptions: {},
    functions: {},
    types: typesMap
  };

  const sourceFiles = getSourceFiles(srcDir);

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

  return docs;
}

/**
 * Hydrates clean <!-- doc:KEY --> tags in compiled .d.ts files with full ASCII tables.
 */
export function hydrateDtsInDir(dir) {
  if (!fs.existsSync(dir)) return;
  let count = 0;
  function walk(currentDir) {
    for (const f of fs.readdirSync(currentDir)) {
      const full = path.join(currentDir, f);
      if (fs.statSync(full).isDirectory()) {
        walk(full);
      } else if (full.endsWith(".d.ts")) {
        let content = fs.readFileSync(full, "utf-8");
        let changed = false;
        content = content.replace(
          /([ \t]*\*[ \t]*)<!-- @?doc:([a-zA-Z0-9_]+) -->/g,
          (_, prefix, key) => {
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
    }
  }
  walk(dir);
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

  fs.writeFileSync(outPath, JSON.stringify(docs, null, 2), "utf-8");
  console.log(`  Written to: ${outPath}`);

  const distDir = path.resolve(__dirname, "../dist");
  if (fs.existsSync(distDir)) {
    hydrateDtsInDir(distDir);
  }

  console.log("Done.");
}
