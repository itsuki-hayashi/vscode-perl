"use strict";

import { spawn } from "child_process";
import { unlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { basename, sep } from "path";
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
    const tempfilepath =
      tmpdir() + sep + basename(this.document.fileName) + ".lint";
    writeFileSync(tempfilepath, this.document.getText());
    const proc = spawn(
      this.configuration.perlcritic,
      this.getCommandArguments(tempfilepath)
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
      unlinkSync(tempfilepath);
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
      DiagnosticSeverity.Error
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

  private isValidViolation(violation: string) {
    return violation.split("~|~").length === 6;
  }

  private getCommandArguments(tempfilepath: string): string[] {
    return ["--verbose", "%s~|~%l~|~%c~|~%m~|~%e~|~%p~||~%n", tempfilepath];
  }
}
