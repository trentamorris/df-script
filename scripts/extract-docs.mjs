/**
 * extract-docs.mjs
 *
 * Reads JSDoc comments from the df-script library source files recursively
 * and outputs a static, structured docs.json file grouped by file paths.
 *
 * Usage:
 *   node scripts/extract-docs.mjs
 *   node scripts/extract-docs.mjs --out ./docs.json
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
function syncJSDocsInFiles(sourceFiles) {
    let updatedCount = 0;
    const tagRegex = /\/\*[\s\S]*?\*\//g;

    for (const filePath of sourceFiles) {
        let content = fs.readFileSync(filePath, "utf-8");
        let changed = false;

        content = content.replace(tagRegex, (jsdoc) => {
            return jsdoc.replace(/<!-- @?doc:([a-zA-Z0-9_]+) -->([\s\S]*?)(?=(\n\s*\* >>>|\n\s*\* @|\*\/))/g, (match, key, tableContent) => {
                if (tableContent && tableContent.trim()) {
                    changed = true;
                    return `<!-- doc:${key} -->`;
                }
                return match;
            });
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

// Capture any JSDoc block + the immediate next declaration name (method, function, or class)
const JSDOC_BLOCK_REGEX = /\/\*\*([\s\S]*?)\*\/[\s\r\n]*?(?:(?:export|public|private|static|function|class|get|set)\s+|\*\s*)*([a-zA-Z0-9_$]+)/g;

// Regexes for specific tags
const PARAM_REGEX = new RegExp(`${TAG_PARAM}\\s+(?:\\{([^{}]*(?:\\{[^{}]*\\}[^{}]*)*)\\}\\s+)?([\\[\\]a-zA-Z0-9_$.?]+)\\s+(.*)`);
const RETURNS_REGEX = new RegExp(`${TAG_RETURNS}\\s+(.*)`);
const NAMESPACE_REGEX = new RegExp(`${TAG_NAMESPACE}\\s+([a-zA-Z0-9_$..]+)`);
const CATEGORY_REGEX = new RegExp(`${TAG_CATEGORY}\\s+([a-zA-Z0-9_$..]+)`);
const SYNTAX_REGEX = new RegExp(`${TAG_SYNTAX}\\s+(.+)`);

// ─── JSDoc Parser ────────────────────────────────────────────────────────────

function parseJSDocComment(comment) {
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
          const name = m[2];
          const desc = m[3].trim();
          paramsList.push(type ? { name, type, desc } : { name, desc });
        }
      } else if (trimmed.startsWith(TAG_RETURNS)) {
        const m = trimmed.match(RETURNS_REGEX);
        if (m) returns = m[1].trim();
      }
    } else {
      if (inExample) {
        currentExampleLines.push(line);
      } else if (inNote && notesList.length > 0 && trimmed.length > 0) {
        notesList[notesList.length - 1] += " " + trimmed;
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
    examples: examplesList.length > 0 ? examplesList.map(ex => {
        return ex.replace(/<!-- @?doc:([a-zA-Z0-9_]+) -->([\s\S]*?)(?=(\n\s*>>> (?:df\.[a-zA-Z0-9_$]|df1\.|df2\.|trades\.|quotes\.|\$df\.|\$col|\/\/)|$))/g, (_, key) => {
            return docExamples[key] ? docExamples[key].replace(/^ {5}\* /gm, "") : "";
        }).trim();
    }) : undefined,
    params: paramsList.length > 0 ? paramsList : undefined,
    notes: notesList.length > 0 ? notesList : undefined,
    returns
  };
}

function extractSignatureAndEnd(rawContent, startIndex, symbolName, isGetter) {
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
      else if (char === ">") {
        if (angleDepth > 0) angleDepth--;
      } else if (char === ";" && parenDepth === 0 && braceDepth === 0) {
        return {
          signature: signature.replace(/\s+/g, " ").trim(),
          endIndex: i
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

  return {
    signature: signature.replace(/\s+/g, " ").trim(),
    endIndex
  };
}

// splitByComma: Splits a string on commas at the top-level (respecting nested parentheses, curly braces, and generics).
function splitByComma(str) {
  const parts = [];
  let current = "";
  let parenDepth = 0;
  let braceDepth = 0;
  let angleDepth = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === "(") parenDepth++;
    else if (char === ")") parenDepth--;
    else if (char === "{") braceDepth++;
    else if (char === "}") braceDepth--;
    else if (char === "<") angleDepth++;
    else if (char === ">") {
      if (angleDepth > 0) angleDepth--;
    }
    
    if (char === "," && parenDepth === 0 && braceDepth === 0 && angleDepth === 0) {
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

// formatSignature: splits params onto individual lines and, when a function has a
// single config/options param with documented sub-properties, expands them inline.
function formatSignature(signatureStr, params) {
  const firstParen = signatureStr.indexOf("(");
  const lastParen = signatureStr.lastIndexOf(")");
  if (firstParen === -1 || lastParen === -1) {
    return signatureStr;
  }
  
  const prefix = signatureStr.substring(0, firstParen);
  const paramsStr = signatureStr.substring(firstParen + 1, lastParen);
  const suffix = signatureStr.substring(lastParen + 1);
  
  // Split top-level params from the raw signature
  const rawParams = splitByComma(paramsStr);
  
  if (rawParams.length === 0) {
    return `${prefix}()${suffix}`;
  }

  // Try to expand a config/options param using JSDoc sub-params
  const expandedParams = rawParams.map(p => {
    // 1. Check if the parameter is destructured (e.g. "{ a, b }: Type = {}")
    const destructuringMatch = p.match(/^\s*\{([\s\S]*)\}\s*:\s*([a-zA-Z0-9_$<>, ]+)\s*(?:=\s*([\s\S]*))?$/);
    if (destructuringMatch) {
      const fieldsStr = destructuringMatch[1].trim();
      const typeName = destructuringMatch[2].trim();
      const defaultValue = destructuringMatch[3] ? destructuringMatch[3].trim() : undefined;
      
      const fields = splitByComma(fieldsStr);

      const lines = fields.map(f => `    ${f}`);
      const defaultPart = defaultValue ? ` = ${defaultValue}` : "";
      return `  {\n${lines.join(",\n")}\n  }: ${typeName}${defaultPart}`;
    }

    // 2. Otherwise, check if we can expand a named config object parameter using JSDoc sub-params
    let namePart = p;
    let typePart = "";
    
    const lastColon = p.lastIndexOf(":");
    if (lastColon !== -1) {
      namePart = p.substring(0, lastColon).trim();
      typePart = p.substring(lastColon + 1).trim();
    }

    let cleanType = typePart.split("=")[0].trim();
    let isOptionalParam = namePart.endsWith("?") || typePart.includes("=");
    let paramName = namePart.replace(/\?$/, "").trim();

    if (!paramName || !cleanType || !params) return "  " + p;

    // Collect documented sub-params for this param name (e.g. config.on, config.values)
    const subParams = params.filter(pr => {
      const cleanName = pr.name.replace(/^\[|\]$/g, ""); // strip optional brackets
      return cleanName.startsWith(paramName + ".");
    });

    if (subParams.length === 0) return "  " + p;

    const lines = subParams.map(sp => {
      const cleanName = sp.name.replace(/^\[|\]$/g, "");
      const propName = cleanName.slice(paramName.length + 1); // strip "config."
      const isOptional = sp.name.startsWith("[");
      const typePart = sp.type ? `: ${sp.type}` : "";
      return `    ${propName}${isOptional ? "?" : ""}${typePart}`;
    });

    return `  ${paramName}${isOptionalParam ? "?" : ""}: {\n${lines.join(",\n")}\n  }`;
  });
  
  return `${prefix}(\n${expandedParams.join(",\n")}\n)${suffix}`;
}

// ─── Recursive Directory Walker ──────────────────────────────────────────────

function getSourceFiles(dir) {
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

function extractRawDocs() {
  const docs = {};
  const sourceFiles = getSourceFiles(srcDir);

  for (const filePath of sourceFiles) {
    const rawContent = fs.readFileSync(filePath, "utf-8");

    // Skip pure type definition files (@typefile) or internal utility files (@internalfile)
    if (rawContent.includes(TAG_TYPEFILE) || rawContent.includes(TAG_INTERNALFILE)) {
      continue;
    }

    // Normalize path to relative format with forward slashes for cross-platform stability
    const relativePath = path.relative(srcDir, filePath).replace(/\\/g, "/");

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
      const symbolName = match[2];

      // Skip internal functions marked with @internal or @ignore, or constructor / leading underscore symbols
      if (comment.includes(TAG_INTERNAL) || comment.includes(TAG_IGNORE) || symbolName.startsWith("_") || symbolName === "constructor") {
        continue;
      }

      const parsed = parseJSDocComment(comment);

      // Parse @namespace from the individual JSDoc if overridden, otherwise use file-level namespace
      let symbolNamespace = fileNamespace;
      const localNamespaceMatch = comment.match(NAMESPACE_REGEX);
      if (localNamespaceMatch) {
        symbolNamespace = localNamespaceMatch[1].trim();
      }

      if (symbolNamespace) {
        parsed.namespace = symbolNamespace;
      }

      // Parse @category from the individual JSDoc if overridden, otherwise use file-level category
      let symbolCategory = fileCategory;
      const localCategoryMatch = comment.match(CATEGORY_REGEX);
      if (localCategoryMatch) {
        symbolCategory = localCategoryMatch[1].trim();
      }
      parsed.category = symbolCategory;

      // Parse @syntax from the individual JSDoc if overridden, otherwise use file-level syntax template
      let symbolSyntax = null;
      const localSyntaxMatch = comment.match(SYNTAX_REGEX);
      if (localSyntaxMatch) {
        symbolSyntax = localSyntaxMatch[1].trim().replace("{symbol}", symbolName);
      } else if (fileSyntaxTemplate) {
        symbolSyntax = fileSyntaxTemplate.replace("{symbol}", symbolName);
      } else {
        symbolSyntax = `$df.col(<column_name>).${symbolName}(...)`;
      }
      parsed.syntax = symbolSyntax;

      const afterComment = match[0].substring(match[0].lastIndexOf("*/") + 2);
      const isGetter = /\bget\b/.test(afterComment);
      const { signature: rawSignature, endIndex } = extractSignatureAndEnd(rawContent, JSDOC_BLOCK_REGEX.lastIndex, symbolName, isGetter);
      const formattedSignature = formatSignature(rawSignature, parsed.params);

      const symbolIndex = symbolSyntax.indexOf(symbolName);
      const callerPrefix = symbolIndex !== -1 ? symbolSyntax.substring(0, symbolIndex) : "";
      parsed.signature = callerPrefix + formattedSignature;

      // Compute 1-based start and end line numbers of the symbol declaration for GitHub source linking (#L{lineStart}-L{lineEnd}).
      parsed.lineStart = rawContent.substring(0, match.index + match[0].length).split("\n").length;
      parsed.lineEnd = rawContent.substring(0, endIndex + 1).split("\n").length;

      // If we successfully parsed JSDoc details, add them
      if (parsed.desc || parsed.params || parsed.returns || parsed.examples || parsed.notes) {
        if (!fileDocs) {
          fileDocs = {};
        }
        fileDocs[symbolName] = parsed;
      }
    }

    if (fileDocs) {
      docs[relativePath] = fileDocs;
    }
  }

  return docs;
}

/**
 * Hydrates clean <!-- doc:KEY --> tags in compiled .d.ts files with full ASCII tables.
 */
function hydrateDtsInDir(dir) {
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
        content = content.replace(/([ \t]*\*[ \t]*)<!-- @?doc:([a-zA-Z0-9_]+) -->/g, (_, prefix, key) => {
          if (docExamples[key]) {
            changed = true;
            const lines = docExamples[key].split("\n").map(l => l.replace(/^[ \t]*\*[ \t]?/, "").trimEnd());
            return lines.map(line => ` * ${line}`).join("\n");
          }
          return "";
        });
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

const isSync = process.argv.includes("--sync");
if (isSync) {
  console.log("Synchronizing JSDoc template tables in TypeScript source files...");
  const sourceFiles = getSourceFiles(srcDir);
  syncJSDocsInFiles(sourceFiles);
}

const outArg = process.argv.indexOf("--out");
const outPath = outArg !== -1
  ? path.resolve(process.argv[outArg + 1])
  : path.resolve(__dirname, "../docs.json");

console.log("Extracting raw docs recursively from source files...");
const docs = extractRawDocs();
const fileCount = Object.keys(docs).length;
const symbolCount = Object.values(docs).reduce((acc, f) => acc + Object.keys(f).length, 0);

console.log(`  Found JSDocs in ${fileCount} files containing ${symbolCount} documented symbols.`);

fs.writeFileSync(outPath, JSON.stringify(docs, null, 2), "utf-8");
console.log(`  Written to: ${outPath}`);

const distDir = path.resolve(__dirname, "../dist");
if (fs.existsSync(distDir)) {
  hydrateDtsInDir(distDir);
}

console.log("Done.");
