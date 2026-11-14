# vscode-openppl

The VS Code integration for OpenPPL, same thin-extension shape as `vscode-phh`/`vscode-ohh`.

## Now registry-backed, `openppl-ls`'s second release

Highlighting is still grammar/naming-convention-derived (a TextMate
grammar has no way to consult a language server), but hover/completion/
diagnostics now go through `openppl-ls`'s real registry
(`openppl/registry/symbols.json`), see `openppl-ls/README.md` for what
that added (real symbol hover and completion, unknown-symbol/unknown-
action warnings, the "false friends" case-collision hint) and its own
honestly-scoped limits (not every native OpenHoldem engine symbol is
covered; no second implementation to cross-check against).

## Build

```sh
npm install
npm run compile                # emits out/extension.js
node test/tokenize-corpus.js   # grammar verification, see below
```

To run it in VS Code: open this folder, press F5, then set
`openppl.serverPath` to `../openppl-ls/build/openppl-ls` and
`openppl.registryPath` to `../openppl/registry` if they aren't already
right for your machine (both already set in `.vscode/settings.json` for
this one). Both are required, `openppl-ls` refuses to guess either.

**Not published to the VS Code Marketplace.** This repo is pushed to
`github.com/MrPoloGit/vscode-openppl`, but there's no marketplace
listing, `vsce publish` has not been run, and `package.json` has no
`repository` field yet. The only ways to run this today are the
Extension Development Host above or a manually-built `.vsix`
(`npx @vscode/vsce package`), sideloaded via "Install from VSIX".

## What's implemented

- **Language registration**: `.ohf` → language id `openppl`
  (`package.json`, `language-configuration.json`): `//` line comments,
  bracket matching for `(`/`)` only (the only bracket-shaped construct
  the grammar has, `##...##` section headers aren't nested, so they're
  highlighted but not bracket-matched).
- **TextMate grammar** (`syntaxes/openppl.tmLanguage.json`): section
  headers, case-insensitive keywords (`WHEN`/`FORCE`/`SET`/`RETURN`,
  `AND`/`OR`/`XOR`/`NOT`/`MOD`/`SUITED`, matched via Oniguruma's
  `(?i:...)`, mirroring `tree-sitter-openppl/grammar.js`'s
  `caseInsensitive()` helper), the full operator set, `hand$`/`board$`
  expressions (both confirmed `board$...SUITED` forms), numbers/
  percentages, and a generic identifier fallback for every symbol/action/
  function name, deliberately not enumerated, same principle as the
  tree-sitter grammar's own `identifier` token.
- **Snippets** (`snippets/openppl.code-snippets`): the four reserved
  sections, a `WHEN` rule, an open-ended `WHEN` block, a handlist
  skeleton, and a user-defined-function skeleton, all built from the
  small, *confirmed* set of reserved names and syntax forms, not the
  registry (hundreds of symbols, no fixed skeleton makes sense for them).
- **Language client** (`src/extension.ts`): starts `openppl-ls` over
  stdio, full-document sync. Now has a `registryPath` setting, same
  shape as `vscode-phh`/`vscode-ohh`.

## How this was verified

1. **TypeScript compiles clean**; the extension **packages correctly**
   via `npx @vscode/vsce package` (10 files, 6.4 KB, the same two
   cosmetic warnings every other extension in this project produces).
2. **The TextMate grammar was tokenized against the real corpus**
   (`openppl/corpus/`) with `vscode-textmate`+`vscode-oniguruma`, no GUI
   launched. **13/13 checks pass**, including that the confirmed
   `hand$AKs` trap form and the space-separated `board$AT SUITED` form
   both tokenize correctly and distinctly, not just "without error."
3. **No bugs found this time**, unlike `vscode-phh`'s first draft (two
   real bugs) and consistent with `vscode-ohh`'s (zero), this grammar's
   case-insensitive-keyword and hand$/board$ patterns were written with
   `tree-sitter-openppl`'s own two confirmed lexer bugs already in mind
   (see that package's README), so the same mistakes were designed
   around from the start rather than rediscovered.

## Known limitations

- **No end-to-end VS Code window test**, same standing gap every
  extension in this project has (avoiding an unrequested GUI launch);
  press F5 to check by hand.
- **No bundled/downloaded server binary.**
- **Carries forward every scope limit `openppl-ls/README.md`
  documents**, no nesting-depth check (no grammar structure survives
  to check it against), and unknown-symbol/unknown-action warnings are
  explicitly approximate, not exhaustive; this extension only surfaces
  what the server actually produces.
