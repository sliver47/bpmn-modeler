import * as vscode from 'vscode';

let channel: vscode.OutputChannel | undefined;

export function getOutputChannel(): vscode.OutputChannel {
	if (!channel) {
		channel = vscode.window.createOutputChannel('BPMN Modeler');
	}
	return channel;
}

export function logToOutput(level: 'info' | 'warn' | 'error', message: string): void {
	const line = `[${level.toUpperCase()}] ${message}`;
	// Append only; never auto-reveal the panel so we don't steal focus on errors.
	getOutputChannel().appendLine(line);
}
