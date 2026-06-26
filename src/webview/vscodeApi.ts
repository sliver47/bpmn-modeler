export interface VsCodeApi {
	postMessage(message: unknown): void;
	getState(): unknown;
	setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

/** Acquire the VS Code webview API exactly once and share it across modules. */
export const vscode: VsCodeApi = acquireVsCodeApi();
