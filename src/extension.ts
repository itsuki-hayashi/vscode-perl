// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { DocumentFilter, ExtensionContext, languages } from "vscode";
import { PerlFormattingProvider } from "./format";
import { PerlLinterProvider } from "./linter";
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: ExtensionContext) {
    console.log("simple-perl has been activated.");
    const selector: DocumentFilter = { language: "perl", scheme: "file" };
    const formatProvider = new PerlFormattingProvider();
    context.subscriptions.push(languages.registerDocumentRangeFormattingEditProvider(selector, formatProvider));
    const linterProvider = new PerlLinterProvider();
    linterProvider.activate(context.subscriptions);
}
