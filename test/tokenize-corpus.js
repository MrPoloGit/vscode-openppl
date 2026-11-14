// Validates syntaxes/openppl.tmLanguage.json against the real corpus,
// outside any VS Code window, same approach as vscode-phh/vscode-ohh's
// own tokenize-corpus.js.
"use strict";

const fs = require("fs");
const path = require("path");
const oniguruma = require("vscode-oniguruma");
const { Registry, INITIAL, parseRawGrammar } = require("vscode-textmate");

const GRAMMAR_PATH = path.join(__dirname, "..", "syntaxes", "openppl.tmLanguage.json");
const CORPUS_ROOT = path.join(__dirname, "..", "..", "openppl", "corpus");

async function loadOniguruma() {
  const wasmPath = require.resolve("vscode-oniguruma/release/onig.wasm");
  const wasmBin = fs.readFileSync(wasmPath).buffer;
  await oniguruma.loadWASM(wasmBin);
  return {
    createOnigScanner(patterns) {
      return new oniguruma.OnigScanner(patterns);
    },
    createOnigString(s) {
      return new oniguruma.OnigString(s);
    },
  };
}

function listCorpusFiles() {
  const out = [];
  for (const sub of ["valid", "invalid"]) {
    const dir = path.join(CORPUS_ROOT, sub);
    for (const name of fs.readdirSync(dir)) {
      if (name.endsWith(".ohf")) out.push({ sub, path: path.join(dir, name), name });
    }
  }
  return out;
}

function scopesAt(tokens, lineText, needle) {
  const idx = lineText.indexOf(needle);
  if (idx === -1) return null;
  for (const t of tokens) {
    if (idx >= t.startIndex && idx < t.endIndex) return t.scopes;
  }
  return null;
}

function tokenizeFile(grammar, text) {
  const lines = text.split(/\r?\n/);
  let ruleStack = INITIAL;
  const perLineTokens = [];
  for (const line of lines) {
    const result = grammar.tokenizeLine(line, ruleStack);
    ruleStack = result.ruleStack;
    perLineTokens.push(result.tokens);
  }
  return { lines, perLineTokens };
}

async function main() {
  const vscodeOnigLib = loadOniguruma();
  const registry = new Registry({
    onigLib: vscodeOnigLib,
    loadGrammar: async (scopeName) => {
      if (scopeName !== "source.openppl") return null;
      const content = fs.readFileSync(GRAMMAR_PATH, "utf8");
      return parseRawGrammar(content, GRAMMAR_PATH);
    },
  });

  const grammar = await registry.loadGrammar("source.openppl");
  if (!grammar) throw new Error("failed to load source.openppl grammar");

  let failures = 0;
  function check(label, cond) {
    console.log(`[${cond ? "ok" : "FAIL"}] ${label}`);
    if (!cond) failures++;
  }

  const files = listCorpusFiles();
  check("found corpus files to tokenize", files.length > 0);

  for (const file of files) {
    const text = fs.readFileSync(file.path, "utf8");
    const { perLineTokens } = tokenizeFile(grammar, text);
    let anyErrorScope = false;
    for (const tokens of perLineTokens) {
      for (const t of tokens) {
        if (t.scopes.some((s) => s.includes("invalid"))) anyErrorScope = true;
      }
    }
    check(`${file.sub}/${file.name}: tokenizes with no 'invalid' scope`, !anyErrorScope);
  }

  // Targeted scope checks against the real structure example.
  {
    const file = path.join(CORPUS_ROOT, "valid", "structure-example.ohf");
    const text = fs.readFileSync(file, "utf8");
    const { lines, perLineTokens } = tokenizeFile(grammar, text);

    const headerLineIdx = 0;
    const headerScopes = scopesAt(perLineTokens[headerLineIdx], lines[headerLineIdx], "f$preflop");
    check(
      "##f$preflop## section name gets entity.name.function.openppl",
      !!headerScopes && headerScopes.some((s) => s === "entity.name.function.openppl")
    );

    const whenLineIdx = lines.findIndex((l) => l.includes("WHEN hand$AA"));
    const whenTokens = perLineTokens[whenLineIdx];
    const whenLine = lines[whenLineIdx];
    check(
      "WHEN keyword gets keyword.control.openppl",
      !!scopesAt(whenTokens, whenLine, "WHEN")?.some((s) => s === "keyword.control.openppl")
    );
    check(
      "hand$AA's hand/board prefix gets keyword.other.openppl",
      !!scopesAt(whenTokens, whenLine, "hand$")?.some((s) => s === "keyword.other.openppl")
    );
    check(
      "hand$AA's spec gets string.special.openppl",
      !!scopesAt(whenTokens, whenLine, "AA")?.some((s) => s === "string.special.openppl")
    );
    check(
      "FORCE keyword gets keyword.control.openppl",
      !!scopesAt(whenTokens, whenLine, "FORCE")?.some((s) => s === "keyword.control.openppl")
    );

    const commentLineIdx = lines.findIndex((l) => l.trim().startsWith("//"));
    check(
      "a // comment gets comment.line.double-slash.openppl",
      !!scopesAt(perLineTokens[commentLineIdx], lines[commentLineIdx], "//")?.some(
        (s) => s === "comment.line.double-slash.openppl"
      )
    );
  }

  // The confirmed hand$AKs trap and the board$ space-separated SUITED
  // form both need to tokenize distinctly, not just "not error".
  {
    const file = path.join(CORPUS_ROOT, "valid", "operators.ohf");
    const text = fs.readFileSync(file, "utf8");
    const { lines, perLineTokens } = tokenizeFile(grammar, text);

    const aksLineIdx = lines.findIndex((l) => l.includes("hand$AKs"));
    check(
      "hand$AKs's spec (the trap form) still gets string.special.openppl, same as any hand$ spec",
      !!scopesAt(perLineTokens[aksLineIdx], lines[aksLineIdx], "AKs")?.some(
        (s) => s === "string.special.openppl"
      )
    );

    const boardSuitedLineIdx = lines.findIndex((l) => l.includes("board$AT SUITED"));
    check(
      "the space-separated SUITED keyword after board$AT gets keyword.operator.openppl",
      !!scopesAt(perLineTokens[boardSuitedLineIdx], lines[boardSuitedLineIdx], "SUITED")?.some(
        (s) => s === "keyword.operator.openppl"
      )
    );
  }

  console.log();
  if (failures > 0) {
    console.log(`${failures} FAILURE(S)`);
    process.exit(1);
  }
  console.log("All grammar checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
