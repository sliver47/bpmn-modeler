import * as vscode from 'vscode';

/** Replace the entire document text (used by custom editor webviews). */
export function applyFullDocumentEdit(document: vscode.TextDocument, content: string): void {
	const edit = new vscode.WorkspaceEdit();
	const fullRange = new vscode.Range(
		document.positionAt(0),
		document.positionAt(document.getText().length)
	);
	edit.replace(document.uri, fullRange, content);
	void vscode.workspace.applyEdit(edit);
}
