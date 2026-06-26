import * as vscode from 'vscode';

export type FileIconKind = 'bpmn' | 'form';

/** Theme-aware file icons for BPMN / Form resources and editor tabs. */
export function getFileIconPaths(
	extensionUri: vscode.Uri,
	kind: FileIconKind
): { light: vscode.Uri; dark: vscode.Uri } {
	const base = vscode.Uri.joinPath(extensionUri, 'resources', 'icons');
	return {
		light: vscode.Uri.joinPath(base, 'light', `${kind}.svg`),
		dark: vscode.Uri.joinPath(base, 'dark', `${kind}.svg`),
	};
}
