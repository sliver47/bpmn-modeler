import * as vscode from 'vscode';
import * as path from 'path';
import { BpmnEditorProvider } from '../providers/bpmnEditorProvider';
import { FormEditorProvider } from '../providers/formEditorProvider';

const EMPTY_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:camunda="http://camunda.org/schema/1.0/bpmn" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn" exporter="bpmn-modeler" exporterVersion="1.0.0">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_1" bpmnElement="StartEvent_1">
        <dc:Bounds x="173" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`;

const EMPTY_FORM = `{
  "type": "default",
  "components": []
}
`;

async function resolveTargetFolder(uri?: vscode.Uri): Promise<vscode.Uri | undefined> {
	if (uri) {
		try {
			const stat = await vscode.workspace.fs.stat(uri);
			if (stat.type === vscode.FileType.Directory) {
				return uri;
			}
			return vscode.Uri.file(path.dirname(uri.fsPath));
		} catch {
			return vscode.Uri.file(path.dirname(uri.fsPath));
		}
	}

	const folders = vscode.workspace.workspaceFolders;
	if (!folders?.length) {
		void vscode.window.showWarningMessage('Open a workspace folder first.');
		return undefined;
	}
	if (folders.length === 1) {
		return folders[0].uri;
	}

	const picked = await vscode.window.showWorkspaceFolderPick({ placeHolder: 'Select folder for the new file' });
	return picked?.uri;
}

async function promptFileName(
	title: string,
	defaultName: string,
	extension: string
): Promise<string | undefined> {
	const value = await vscode.window.showInputBox({
		title,
		prompt: `File name (without ${extension})`,
		value: defaultName,
		ignoreFocusOut: true,
		validateInput: (name) => {
			const trimmed = name.trim();
			if (!trimmed) {
				return 'Name is required.';
			}
			if (/[/\\]/.test(trimmed)) {
				return 'Name cannot contain path separators.';
			}
			return undefined;
		},
	});
	if (!value?.trim()) {
		return undefined;
	}
	return value.trim();
}

async function createFile(
	folder: vscode.Uri,
	fileName: string,
	content: string,
	editorViewType: string
): Promise<void> {
	const fileUri = vscode.Uri.joinPath(folder, fileName);
	try {
		await vscode.workspace.fs.stat(fileUri);
		const overwrite = await vscode.window.showWarningMessage(
			`${fileName} already exists. Overwrite?`,
			{ modal: true },
			'Overwrite'
		);
		if (overwrite !== 'Overwrite') {
			return;
		}
	} catch {
		// file does not exist
	}

	await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, 'utf8'));
	const doc = await vscode.workspace.openTextDocument(fileUri);
	await vscode.commands.executeCommand('vscode.openWith', doc.uri, editorViewType);
}

export async function createNewBpmn(target?: vscode.Uri): Promise<void> {
	const folder = await resolveTargetFolder(target);
	if (!folder) {
		return;
	}

	const baseName = await promptFileName('New BPMN Diagram', 'diagram', '.bpmn');
	if (!baseName) {
		return;
	}

	const fileName = baseName.endsWith('.bpmn') ? baseName : `${baseName}.bpmn`;
	await createFile(folder, fileName, EMPTY_BPMN, BpmnEditorProvider.viewType);
}

export async function createNewForm(target?: vscode.Uri): Promise<void> {
	const folder = await resolveTargetFolder(target);
	if (!folder) {
		return;
	}

	const baseName = await promptFileName('New Camunda Form', 'form', '.form');
	if (!baseName) {
		return;
	}

	const fileName = baseName.endsWith('.form') ? baseName : `${baseName}.form`;
	await createFile(folder, fileName, EMPTY_FORM, FormEditorProvider.viewType);
}
