"use strict";

import { spawn } from "child_process";
import { unlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { basename, sep } from "path";
import {
    Diagnostic, DiagnosticCollection, DiagnosticSeverity, Disposable,
    languages, Position, Range, TextDocument, workspace, WorkspaceConfiguration,
} from "vscode";

export default class PerlLinterProvider {
    private diagnosticCollection: DiagnosticCollection;
    private configuration: WorkspaceConfiguration;

    public constructor(subscriptions: Disposable[]) {
        this.diagnosticCollection = languages.createDiagnosticCollection();
        this.configuration = workspace.getConfiguration("perl-toolbox.lint");

        workspace.onDidCloseTextDocument(
            (textDocument) => {
                this.diagnosticCollection.delete(textDocument.uri);
            },
            null,
            subscriptions,
        );

        workspace.onDidOpenTextDocument(this.lint, this, subscriptions);
        workspace.onDidSaveTextDocument(this.lint, this);

        workspace.onDidCloseTextDocument(
            (textDocument) => {
                this.diagnosticCollection.delete(textDocument.uri);
            },
            null,
            subscriptions,
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
        if (!this.configuration.enabled) {
            return;
        }
        const decodedChunks: Buffer[] = [];
        const tempfilepath =
            tmpdir() +
            sep +
            basename(textDocument.fileName) +
            ".lint";
        writeFileSync(tempfilepath, textDocument.getText());
        const proc = spawn(
            this.configuration.exec,
            this.getCommandArguments(tempfilepath),
            this.getCommandOptions(),
        );
        proc.stdout.on("data", (data: Buffer) => {
            decodedChunks.push(data);
        });

        proc.stderr.on("data", (data: Buffer) => {
            console.log(`stderr: ${data}`);
        });

        proc.stdout.on("end", () => {
            this.diagnosticCollection.set(
                textDocument.uri,
                this.getDiagnostics(decodedChunks.join(), textDocument),
            );
            unlinkSync(tempfilepath);
        });
    }

    private getDiagnostics(output: string, document: TextDocument) {
        const diagnostics: Diagnostic[] = [];
        output.split("\n").forEach((violation) => {
            if (this.isValidViolation(violation)) {
                diagnostics.push(this.createDiagnostic(violation, document));
            }
        });
        return diagnostics;
    }

    private createDiagnostic(violation: string, document: TextDocument) {
        const tokens = violation.replace("~||~", "").split("~|~");

        return new Diagnostic(
            this.getRange(tokens, document),
            this.getMessage(tokens),
            this.getSeverity(tokens),
        );
    }

    private getRange(tokens: string[], document: TextDocument) {
        if (this.configuration.highlightMode === "word") {
            return document.getWordRangeAtPosition(
                new Position(Number(tokens[1]) - 1, Number(tokens[2]) - 1),
                /[^\s]+/,
            )!!;
        }

        return new Range(
            Number(tokens[1]) - 1,
            Number(tokens[2]) - 1,
            Number(tokens[1]) - 1,
            Number.MAX_VALUE,
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

    private getCommandOptions() {
        return {
            cwd: this.configuration.path,
            shell: true,
        };
    }

    private getCommandArguments(tempfilepath: string): string[] {
        return [
            "--" + this.getLintSeverity(),
            this.useProfile(),
            this.getExcludedPolicies(),
            "--verbose",
            "\"%s~|~%l~|~%c~|~%m~|~%e~|~%p~||~%n\"",
            tempfilepath,
        ];
    }

    private getExcludedPolicies() {
        const policies: string[] = [];
        this.configuration.excludedPolicies.forEach((policy: string) => {
            policies.push("--exclude");
            policies.push(policy);
        });
        return policies.join(" ");
    }

    private useProfile(): string {
        if (!this.configuration.useProfile) {
            return "--noprofile";
        } else {
            return "";
        }
    }
    private getLintSeverity() {
        return this.configuration.severity;
    }
}
