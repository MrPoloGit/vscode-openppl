// Deliberately thin, same shape as vscode-phh/vscode-ohh's
// src/extension.ts: starts openppl-ls and hosts the LSP client, no
// parsing or validation logic here. Now has a registryPath setting,
// same as vscode-phh/vscode-ohh, openppl-ls's first release took no
// registry at all, but now loads openppl-data/registry/symbols.json.

import * as vscode from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";

let client: LanguageClient | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const config = vscode.workspace.getConfiguration("openppl");
  const serverPath = config.get<string>("serverPath", "openppl-ls");
  const registryPath = config.get<string>("registryPath", "");

  if (!registryPath) {
    vscode.window.showErrorMessage(
      'OpenPPL: the "openppl.registryPath" setting is not set. openppl-ls needs the path ' +
        "to the openppl-data/registry directory (it has no built-in default)."
    );
    return;
  }

  const serverOptions: ServerOptions = {
    command: serverPath,
    args: [registryPath],
    transport: TransportKind.stdio,
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "openppl" }],
  };

  client = new LanguageClient("openppl-ls", "OpenPPL Language Server", serverOptions, clientOptions);

  client.start().catch((err: unknown) => {
    vscode.window.showErrorMessage(
      `OpenPPL: failed to start openppl-ls at "${serverPath}": ${String(err)}`
    );
  });

  context.subscriptions.push({
    dispose: () => {
      void client?.stop();
    },
  });
}

export function deactivate(): Thenable<void> | undefined {
  return client?.stop();
}
