"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerlLinterProvider = void 0;
const child_process_1 = require("child_process");
const vscode_1 = require("vscode");
class PerlLinterProvider {
    constructor() {
        this.diagnosticCollection = vscode_1.languages.createDiagnosticCollection();
        this.configuration = vscode_1.workspace.getConfiguration("simple-perl");
    }
    activate(subscriptions) {
        vscode_1.workspace.onDidOpenTextDocument(this.lint, this, subscriptions);
        vscode_1.workspace.onDidSaveTextDocument(this.lint, this);
        vscode_1.workspace.onDidCloseTextDocument((textDocument) => {
            this.diagnosticCollection.delete(textDocument.uri);
        }, null, subscriptions);
    }
    dispose() {
        this.diagnosticCollection.clear();
        this.diagnosticCollection.dispose();
    }
    lint(textDocument) {
        if (textDocument.languageId !== "perl") {
            return;
        }
        this.document = textDocument;
        const decodedChunks = [];
        const cwd = this.getWorkspaceFolder();
        const proc = child_process_1.spawn(this.configuration.perlcritic, this.getCommandArguments(), { cwd });
        proc.stdout.on("data", (data) => {
            decodedChunks.push(data);
        });
        proc.stderr.on("data", (data) => {
            console.log(`stderr: ${data}`);
        });
        proc.stdout.on("end", () => {
            this.diagnosticCollection.set(this.document.uri, this.getDiagnostics(decodedChunks.join()));
        });
    }
    getDiagnostics(output) {
        const diagnostics = [];
        output.split("\n").forEach((violation) => {
            if (this.isValidViolation(violation)) {
                diagnostics.push(this.createDiagnostic(violation));
            }
        });
        return diagnostics;
    }
    createDiagnostic(violation) {
        const tokens = violation.replace("~||~", "").split("~|~");
        return new vscode_1.Diagnostic(this.getRange(tokens), this.getMessage(tokens), this.getSeverity(tokens));
    }
    getRange(tokens) {
        return new vscode_1.Range(Number(tokens[1]) - 1, Number(tokens[2]) - 1, Number(tokens[1]) - 1, Number.MAX_VALUE);
    }
    getMessage(tokens) {
        return ("Lint: " +
            this.getSeverityAsText(tokens[0]).toUpperCase() +
            ": " +
            tokens[3]);
    }
    getSeverityAsText(severity) {
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
    getSeverity(tokens) {
        switch (this.configuration[this.getSeverityAsText(tokens[0])]) {
            case "hint":
                return vscode_1.DiagnosticSeverity.Hint;
            case "info":
                return vscode_1.DiagnosticSeverity.Information;
            case "warning":
                return vscode_1.DiagnosticSeverity.Warning;
            default:
                return vscode_1.DiagnosticSeverity.Error;
        }
    }
    isValidViolation(violation) {
        return violation.split("~|~").length === 6;
    }
    getWorkspaceFolder() {
        if (vscode_1.workspace.workspaceFolders) {
            if (this.document) {
                const workspaceFolder = vscode_1.workspace.getWorkspaceFolder(this.document.uri);
                if (workspaceFolder) {
                    return workspaceFolder.uri.fsPath;
                }
            }
            return vscode_1.workspace.workspaceFolders[0].uri.fsPath;
        }
        else {
            return undefined;
        }
    }
    getCommandArguments() {
        return [
            "--verbose",
            "%s~|~%l~|~%c~|~%m~|~%e~|~%p~||~%n",
            this.document.fileName,
        ];
    }
}
exports.PerlLinterProvider = PerlLinterProvider;
//# sourceMappingURL=linter.js.map