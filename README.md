# vscode-openppl

The VS Code integration for OpenPPL.

## Now registry-backed, `openppl-ls`'s second release

Highlighting is still grammar/naming-convention-derived (a TextMate
grammar has no way to consult a language server), but hover/completion/
diagnostics now go through `openppl-ls`'s real registry
(`openppl-data/registry/symbols.json`), see `openppl-ls/README.md` for what
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
`openppl.registryPath` to `../openppl-data/registry` if they aren't already
right for your machine (both already set in `.vscode/settings.json` for
this one). Both are required, `openppl-ls` refuses to guess either.

**Not published to the VS Code Marketplace.** This repo is pushed to
`github.com/MrPoloGit/vscode-openppl`, but there's no marketplace
listing, `vsce publish` has not been run, and `package.json` has no
`repository` field yet. The only ways to run this today are the
Extension Development Host above or a manually-built `.vsix`
(`npx @vscode/vsce package`), sideloaded via "Install from VSIX".
