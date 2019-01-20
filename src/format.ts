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

            const stdoutChunks: string[]  = [];
            child.stdout.on("data", (chunk: Buffer) => {
                stdoutChunks.push(chunk.toString());
            });

            const stderrChunks: string[] = [];
            child.stderr.on("data", (chunk: Buffer) => {
                stderrChunks.push(chunk.toString());
            });

            child.on("error", (error: Error) => {
                stderrChunks.push(error.message);
            });

            child.on("close", (code) => {
                if (stderrChunks.length > 0 || code !== 0) {
                    const message = stderrChunks.join("").concat(stdoutChunks.join("")).trim();
                    reject(`Could not format, code: ${code}, error: ${message}`);
                } else {
                    resolve([new TextEdit(range, stdoutChunks.join(""))]) ;
                }
            });
        }).catch((reason) => {
            console.error(reason);
            return [];
        });
    }
}
