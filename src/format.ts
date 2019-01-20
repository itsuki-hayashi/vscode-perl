// Referenced https://github.com/henriiik/vscode-perl
import { spawn } from "child_process";
import {
    CancellationToken, DocumentRangeFormattingEditProvider,
    FormattingOptions, Range, TextDocument, TextEdit, workspace,
} from "vscode";

export class PerlFormattingProvider implements DocumentRangeFormattingEditProvider {
    public async provideDocumentRangeFormattingEdits(
        document: TextDocument,
        range: Range,
        options: FormattingOptions,
        token: CancellationToken,
    ): Promise<TextEdit[]> {
        // if perltidy is not defined, then skip the formatting
        if (!workspace.getConfiguration("perl").get("perltidy")) {
            return [];
        }

        return new Promise<TextEdit[]>((resolve, reject) => {
            if (range.start.line !== range.end.line) {
                range = range.with(
                    range.start.with(range.start.line, 0),
                    range.end.with(range.end.line, Number.MAX_VALUE),
                );
            }

            const config = workspace.getConfiguration("perl");

            let executable = config.get("perltidy", "perltidy");
            let args = config.get("perltidyArgs", ["-q"]);
            const container = config.get("perltidyContainer", "");
            if (container !== "") {
                args = ["exec", "-i", container, executable].concat(args);
                executable = "docker";
            }

            const text = document.getText(range);
            const child = spawn(executable, args);
            child.stdin.write(text);
            child.stdin.end();

            let stdout = "";
            child.stdout.on("data", (out: Buffer) => {
                stdout += out.toString();
            });

            let stderr = "";
            child.stderr.on("data", (out: Buffer) => {
                stderr += out.toString();
            });

            let error: Error;
            child.on("error", (err: Error) => {
                error = err;
            });

            child.on("close", (code, signal) => {
                let message = "";

                if (error) {
                    message = error.message;
                } else if (stderr) {
                    message = stderr;
                } else if (code !== 0) {
                    message = stdout;
                }

                if (code !== 0) {
                    message = message.trim();
                    const formatted = `Could not format, code: ${code}, error: ${message}`;
                    reject(formatted);
                } else {
                    if (!text.endsWith("\n")) {
                        stdout = stdout.slice(0, -1); // remove trailing newline
                    }
                    resolve([new TextEdit(range, stdout)]);
                }
            });
        }).catch((reason) => {
            console.error(reason);
            return [];
        });
    }
}
