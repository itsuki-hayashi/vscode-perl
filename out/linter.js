"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerlLinterProvider = void 0;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = require("path");
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
        const tempfilepath = os_1.tmpdir() + path_1.sep + path_1.basename(this.document.fileName) + ".lint";
        fs_1.writeFileSync(tempfilepath, this.document.getText());
        const proc = child_process_1.spawn(this.configuration.perlcritic, this.getCommandArguments(tempfilepath));
        proc.stdout.on("data", (data) => {
            decodedChunks.push(data);
        });
        proc.stderr.on("data", (data) => {
            console.log(`stderr: ${data}`);
        });
        proc.stdout.on("end", () => {
            this.diagnosticCollection.set(this.document.uri, this.getDiagnostics(decodedChunks.join()));
            fs_1.unlinkSync(tempfilepath);
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
        return new vscode_1.Diagnostic(this.getRange(tokens), this.getMessage(tokens), vscode_1.DiagnosticSeverity.Error);
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
    isValidViolation(violation) {
        return violation.split("~|~").length === 6;
    }
    getCommandArguments(tempfilepath) {
        return ["--verbose", "%s~|~%l~|~%c~|~%m~|~%e~|~%p~||~%n", tempfilepath];
    }
}
exports.PerlLinterProvider = PerlLinterProvider;
//# sourceMappingURL=linter.js.map