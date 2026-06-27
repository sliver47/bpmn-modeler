import * as vscode from 'vscode';
import { logToOutput } from '../services/outputChannel';
import { applyFullDocumentEdit } from '../utils/documentEdit';
import { getFileIconPaths } from '../utils/fileIcons';
import { buildWebviewHtml } from '../utils/webviewHtml';

/** Custom text editor for Camunda .form files (JSON schema). */
export class FormEditorProvider implements vscode.CustomTextEditorProvider {
	public static readonly viewType = 'bpmn-modeler.formEditor';

	constructor(private readonly context: vscode.ExtensionContext) {}

	async resolveCustomTextEditor(
		document: vscode.TextDocument,
		webviewPanel: vscode.WebviewPanel,
		_token: vscode.CancellationToken
	): Promise<void> {
		const docKey = document.uri.toString();

		webviewPanel.webview.options = {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview')],
		};

		webviewPanel.iconPath = getFileIconPaths(this.context.extensionUri, 'form');
		webviewPanel.webview.html = this.getHtml(webviewPanel.webview);

		const updateWebview = () => {
			webviewPanel.webview.postMessage({ type: 'update', json: document.getText() });
		};

		const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
			if (e.document.uri.toString() === docKey) {
				updateWebview();
			}
		});

		webviewPanel.onDidDispose(() => {
			changeDocumentSubscription.dispose();
		});

		webviewPanel.webview.onDidReceiveMessage(async (message) => {
			switch (message.type) {
				case 'ready':
					updateWebview();
					break;
				case 'edit':
					applyFullDocumentEdit(document, message.json as string);
					break;
				case 'log':
					logToOutput(message.level as 'info' | 'warn' | 'error', message.message as string);
					break;
			}
		});
	}

	private getHtml(webview: vscode.Webview): string {
		return buildWebviewHtml({
			webview,
			extensionUri: this.context.extensionUri,
			title: 'Form Editor',
			scriptName: 'form.js',
			styleName: 'form.css',
			bodyHtml: /* html */ `<div id="app">
		<header class="toolbar">
			<span class="title">Form Editor</span>
			<span class="hint">Tip: click a panel title to collapse it</span>
			<span id="status" class="status"></span>
		</header>
		<div id="form-editor" class="pd-light-surface pd-light-scrollbars" aria-label="Form editor canvas"></div>
	</div>`,
		});
	}
}
