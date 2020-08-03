"use strict";

import { spawn } from "child_process";
import {
  Diagnostic,
  DiagnosticCollection,
  DiagnosticSeverity,
  Disposable,
  Range,
  TextDocument,
  WorkspaceConfiguration,
  languages,
  workspace,
} from "vscode";

export class PerlLinterProvider {
  private diagnosticCollection: DiagnosticCollection;
  private configuration: WorkspaceConfiguration;
  private document!: TextDocument;

  public constructor() {
    this.diagnosticCollection = languages.createDiagnosticCollection();
    this.configuration = workspace.getConfiguration("simple-perl");
  }

  public activate(subscriptions: Disposable[]): void {
    workspace.onDidOpenTextDocument(this.lint, this, subscriptions);
    workspace.onDidSaveTextDocument(this.lint, this);
    workspace.onDidCloseTextDocument(
      (textDocument) => {
        this.diagnosticCollection.delete(textDocument.uri);
      },
      null,
      subscriptions
    );
  }

  public dispose(): void {
    this.diagnosticCollection.clear();
    this.diagnosticCollection.dispose();
  }

  private lint(textDocument: TextDocument) {
    if (textDocument.languageId !== "perl") {
      return;
    }
    this.document = textDocument;
    const decodedChunks: Buffer[] = [];
    const cwd = this.getWorkspaceFolder();
    const proc = spawn(
      this.configuration.perlcritic,
      this.getCommandArguments(),
      { cwd }
    );
    proc.stdout.on("data", (data: Buffer) => {
      decodedChunks.push(data);
    });

    proc.stderr.on("data", (data: Buffer) => {
      console.log(`stderr: ${data}`);
    });

    proc.stdout.on("end", () => {
      this.diagnosticCollection.set(
        this.document.uri,
        this.getDiagnostics(decodedChunks.join())
      );
    });
  }

  private getDiagnostics(output: string) {
    const diagnostics: Diagnostic[] = [];
    output.split("\n").forEach((violation) => {
      if (this.isValidViolation(violation)) {
        diagnostics.push(this.createDiagnostic(violation));
      }
    });
    return diagnostics;
  }

  private createDiagnostic(violation: string) {
    const tokens = violation.replace("~||~", "").split("~|~");

    return new Diagnostic(
      this.getRange(tokens),
      this.getMessage(tokens),
      this.getSeverity(tokens)
    );
  }

  private getRange(tokens: string[]) {
    return new Range(
      Number(tokens[1]) - 1,
      Number(tokens[2]) - 1,
      Number(tokens[1]) - 1,
      Number.MAX_VALUE
    );
  }

  private getMessage(tokens: string[]) {
    return (
      "Lint: " +
      this.getSeverityAsText(tokens[0]).toUpperCase() +
      ": " +
      tokens[3]
    );
  }

  private getSeverityAsText(severity: string) {
    switch (parseInt(severity, 10)) {
      case 5:
        return "gentle";
      case 4:
        return "stern";
      case 3:
        return "harsh";
      case 2:
        return "cruel";
      default:
        return "brutal";
    }
  }

  private getSeverity(tokens: string[]) {
    switch (this.configuration[this.getSeverityAsText(tokens[0])]) {
      case "hint":
        return DiagnosticSeverity.Hint;
      case "info":
        return DiagnosticSeverity.Information;
      case "warning":
        return DiagnosticSeverity.Warning;
      default:
        return DiagnosticSeverity.Error;
    }
  }

  private isValidViolation(violation: string) {
    return violation.split("~|~").length === 6;
  }

  private getWorkspaceFolder(): string | undefined {
    if (workspace.workspaceFolders) {
      if (this.document) {
        const workspaceFolder = workspace.getWorkspaceFolder(this.document.uri);
        if (workspaceFolder) {
          return workspaceFolder.uri.fsPath;
        }
      }
      return workspace.workspaceFolders[0].uri.fsPath;
    } else {
      return undefined;
    }
  }

  private getCommandArguments(): string[] {
    return [
      "--verbose",
      "%s~|~%l~|~%c~|~%m~|~%e~|~%p~||~%n",
      this.document.fileName,
    ];
  }
}
