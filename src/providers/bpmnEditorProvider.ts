import * as vscode from 'vscode';
import { runDeploy } from '../services/deployService';
import { logToOutput } from '../services/outputChannel';
import { applyFullDocumentEdit } from '../utils/documentEdit';
import { getFileIconPaths } from '../utils/fileIcons';
import { buildWebviewHtml } from '../utils/webviewHtml';

/**
 * Custom text editor that renders BPMN XML in a webview.
 */
export class BpmnEditorProvider implements vscode.CustomTextEditorProvider {
	public static readonly viewType = 'bpmn-modeler.bpmnEditor';

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

		webviewPanel.iconPath = getFileIconPaths(this.context.extensionUri, 'bpmn');
		webviewPanel.webview.html = this.getHtml(webviewPanel.webview);

		const updateWebview = () => {
			webviewPanel.webview.postMessage({ type: 'update', xml: document.getText() });
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
					applyFullDocumentEdit(document, message.xml as string);
					break;
				case 'log':
					logToOutput(message.level as 'info' | 'warn' | 'error', message.message as string);
					break;
				case 'requestDeploy':
					await runDeploy(document.uri, webviewPanel);
					break;
			}
		});
	}

	private getHtml(webview: vscode.Webview): string {
		return buildWebviewHtml({
			webview,
			extensionUri: this.context.extensionUri,
			title: 'BPMN Modeler',
			scriptName: 'index.js',
			styleName: 'index.css',
			bodyHtml: /* html */ `<div id="app">
		<header class="toolbar">
			<span class="title">BPMN Modeler</span>
			<button id="zoom-in" title="Zoom in">＋</button>
			<button id="zoom-out" title="Zoom out">－</button>
			<button id="zoom-fit" title="Fit to viewport">Fit</button>
			<button id="deploy" class="primary" title="Deploy to Camunda">Deploy</button>
			<button id="log-toggle" title="Toggle output panel">Output ▲</button>
			<span id="status" class="status"></span>
		</header>
		<div class="workspace">
			<div class="modeler-area">
				<div id="canvas" class="pd-light-surface" aria-label="BPMN diagram canvas"></div>
				<div class="log-panel collapsed" id="log-panel" aria-label="Output log">
					<div class="log-header">
						<span>Output</span>
						<button id="log-clear" title="Clear log">Clear</button>
					</div>
					<div id="log-body"></div>
				</div>
			</div>
			<aside id="properties" class="pd-light-surface pd-light-scrollbars" aria-label="Properties panel"></aside>
		</div>
	</div>`,
		});
	}
}
