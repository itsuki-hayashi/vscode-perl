// Referenced https://github.com/henriiik/vscode-perl
import { spawn } from "child_process";
import {
    DocumentRangeFormattingEditProvider,
    Range, TextDocument, TextEdit, workspace,
} from "vscode";

export class PerlFormattingProvider implements DocumentRangeFormattingEditProvider {
    public async provideDocumentRangeFormattingEdits(
        document: TextDocument,
        range: Range,
    ): Promise<TextEdit[]> {
        return new Promise<TextEdit[]>((resolve, reject) => {
            if (range.start.line !== range.end.line) {
                range = range.with(
                    range.start.with(range.start.line, 0),
                    range.end.with(range.end.line, Number.MAX_VALUE),
                );
            }

            const config = workspace.getConfiguration("perl");

            const executable = config.get("perltidy", "perltidy");
            const args = config.get("perltidyArgs", ["-q"]);

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

            child.on("close", (code) => {
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
                    resolve([new TextEdit(range, stdout)]);
                }
            });
        }).catch((reason) => {
            console.error(reason);
            return [];
        });
    }
}
