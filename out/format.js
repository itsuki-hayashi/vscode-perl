"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerlFormattingProvider = void 0;
// Referenced https://github.com/henriiik/vscode-perl
const child_process_1 = require("child_process");
const vscode_1 = require("vscode");
class PerlFormattingProvider {
    provideDocumentRangeFormattingEdits(document, range) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                if (range.start.line !== range.end.line) {
                    range = range.with(range.start.with(range.start.line, 0), range.end.with(range.end.line, Number.MAX_VALUE));
                }
                const config = vscode_1.workspace.getConfiguration("simple-perl");
                const executable = config.get("perltidy", "perltidy");
                const args = config.get("perltidyArgs", ["-q"]);
                const text = document.getText(range);
                const child = child_process_1.spawn(executable, args);
                child.stdin.write(text);
                child.stdin.end();
                const stdoutChunks = [];
                child.stdout.on("data", (chunk) => {
                    stdoutChunks.push(chunk.toString());
                });
                const stderrChunks = [];
                child.stderr.on("data", (chunk) => {
                    stderrChunks.push(chunk.toString());
                });
                child.on("error", (error) => {
                    stderrChunks.push(error.message);
                });
                child.on("close", (code) => {
                    const stderr = stderrChunks.join("");
                    const stdout = stdoutChunks.join("");
                    if (stderrChunks.length > 0 || code !== 0) {
                        const errorMessage = stderr.concat(stdout).trim();
                        reject(`Could not format, code: ${code}, error: ${errorMessage}`);
                    }
                    else {
                        resolve([new vscode_1.TextEdit(range, stdout)]);
                    }
                });
            }).catch((reason) => {
                console.error(reason);
                return [];
            });
        });
    }
}
exports.PerlFormattingProvider = PerlFormattingProvider;
//# sourceMappingURL=format.js.map