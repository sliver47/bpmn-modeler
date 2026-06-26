import * as vscode from 'vscode';
import { BpmnEditorProvider } from './providers/bpmnEditorProvider';
import { FormEditorProvider } from './providers/formEditorProvider';
import { createNewBpmn, createNewForm } from './services/createFile';
import { runDeploy } from './services/deployService';
import { getOutputChannel } from './services/outputChannel';

export function activate(context: vscode.ExtensionContext): void {
	const bpmnProvider = new BpmnEditorProvider(context);
	const formProvider = new FormEditorProvider(context);

	context.subscriptions.push(
		getOutputChannel(),
		vscode.window.registerCustomEditorProvider(
			BpmnEditorProvider.viewType,
			bpmnProvider,
			{
				webviewOptions: { retainContextWhenHidden: true },
				supportsMultipleEditorsPerDocument: false,
			}
		),
		vscode.window.registerCustomEditorProvider(
			FormEditorProvider.viewType,
			formProvider,
			{
				webviewOptions: { retainContextWhenHidden: true },
				supportsMultipleEditorsPerDocument: false,
			}
		),
		vscode.commands.registerCommand('bpmn-modeler.openWithModeler', async (uri?: vscode.Uri) => {
			const target = uri ?? vscode.window.activeTextEditor?.document.uri;
			if (!target) {
				void vscode.window.showWarningMessage('No BPMN file selected.');
				return;
			}
			await vscode.commands.executeCommand('vscode.openWith', target, BpmnEditorProvider.viewType);
		}),
		vscode.commands.registerCommand('bpmn-modeler.openFormEditor', async (uri?: vscode.Uri) => {
			const target = uri ?? vscode.window.activeTextEditor?.document.uri;
			if (!target) {
				void vscode.window.showWarningMessage('No form file selected.');
				return;
			}
			await vscode.commands.executeCommand('vscode.openWith', target, FormEditorProvider.viewType);
		}),
		vscode.commands.registerCommand('bpmn-modeler.deploy', async (uri?: vscode.Uri) => {
			const target = uri ?? vscode.window.activeTextEditor?.document.uri;
			if (!target || (!target.fsPath.endsWith('.bpmn') && !target.fsPath.endsWith('.form'))) {
				void vscode.window.showWarningMessage('Open a .bpmn or .form file to deploy.');
				return;
			}
			await runDeploy(target);
		}),
		vscode.commands.registerCommand('bpmn-modeler.showOutput', () => {
			getOutputChannel().show(true);
		}),
		vscode.commands.registerCommand('bpmn-modeler.newBpmn', (uri?: vscode.Uri) => createNewBpmn(uri)),
		vscode.commands.registerCommand('bpmn-modeler.newForm', (uri?: vscode.Uri) => createNewForm(uri))
	);
}

export function deactivate(): void {}
