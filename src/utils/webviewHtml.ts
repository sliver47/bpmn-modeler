import * as vscode from 'vscode';
import { getNonce } from './getNonce';

export interface WebviewHtmlOptions {
	webview: vscode.Webview;
	extensionUri: vscode.Uri;
	title: string;
	scriptName: string;
	styleName: string;
	bodyHtml: string;
}

/** Build a CSP-safe HTML shell for a custom editor webview. */
export function buildWebviewHtml(options: WebviewHtmlOptions): string {
	const { webview, extensionUri, title, scriptName, styleName, bodyHtml } = options;
	const nonce = getNonce();
	const base = vscode.Uri.joinPath(extensionUri, 'dist', 'webview');
	const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(base, scriptName));
	const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(base, styleName));
	const cspSource = webview.cspSource;

	return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} data:; font-src ${cspSource}; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<link href="${styleUri}" rel="stylesheet" />
	<title>${title}</title>
</head>
<body>
	${bodyHtml}
	<script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
