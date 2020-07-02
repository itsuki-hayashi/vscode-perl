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
exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode_1 = require("vscode");
const format_1 = require("./format");
const linter_1 = require("./linter");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("simple-perl has been activated.");
        const selector = { language: "perl", scheme: "file" };
        const formatProvider = new format_1.PerlFormattingProvider();
        context.subscriptions.push(vscode_1.languages.registerDocumentRangeFormattingEditProvider(selector, formatProvider));
        const linterProvider = new linter_1.PerlLinterProvider();
        linterProvider.activate(context.subscriptions);
    });
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map