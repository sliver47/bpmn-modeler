import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logToOutput } from './outputChannel';

export interface DeployResult {
	success: boolean;
	message: string;
}

export interface CamundaEndpoint {
	name: string;
	endpointUrl: string;
	restPath: string;
	basicAuthUser: string;
	basicAuthPassword: string;
}

export function getEndpoints(): CamundaEndpoint[] {
	const config = vscode.workspace.getConfiguration('bpmnModeler');
	const endpoints = config.get<CamundaEndpoint[]>('camunda.endpoints');

	if (endpoints?.length) {
		return endpoints.map((e) => ({
			name: e.name || e.endpointUrl,
			endpointUrl: e.endpointUrl.replace(/\/$/, ''),
			restPath: e.restPath || '/engine-rest',
			basicAuthUser: e.basicAuthUser || '',
			basicAuthPassword: e.basicAuthPassword || '',
		}));
	}

	// Legacy single-endpoint settings
	const legacy = config.get<{ endpointUrl?: string; restPath?: string; basicAuthUser?: string; basicAuthPassword?: string }>('camunda');
	return [{
		name: 'Default',
		endpointUrl: (legacy?.endpointUrl ?? 'http://localhost:8080').replace(/\/$/, ''),
		restPath: legacy?.restPath ?? '/engine-rest',
		basicAuthUser: legacy?.basicAuthUser ?? '',
		basicAuthPassword: legacy?.basicAuthPassword ?? '',
	}];
}

const MANUAL_ENTRY = '$(edit) Enter address manually…';

export async function pickEndpoint(): Promise<CamundaEndpoint | undefined> {
	const endpoints = getEndpoints();

	const items: (vscode.QuickPickItem & { endpoint?: CamundaEndpoint })[] = endpoints.map((e) => ({
		label: e.name,
		description: `${e.endpointUrl}${e.restPath}`,
		endpoint: e,
	}));
	items.push({ label: MANUAL_ENTRY });

	const picked = await vscode.window.showQuickPick(items, {
		placeHolder: 'Select Camunda deployment target',
		title: 'Deploy to Camunda — Step 1/2: Target',
	});

	if (!picked) {
		return undefined;
	}

	if (picked.label === MANUAL_ENTRY) {
		return promptManualEndpoint(endpoints[0]);
	}

	return picked.endpoint;
}

async function promptManualEndpoint(
	defaults?: CamundaEndpoint
): Promise<CamundaEndpoint | undefined> {
	const endpointUrl = await vscode.window.showInputBox({
		title: 'Deploy to Camunda — REST endpoint',
		prompt: 'Enter the Camunda REST API base URL',
		value: defaults?.endpointUrl ?? 'http://localhost:8080',
		ignoreFocusOut: true,
		validateInput: (v) => (/^https?:\/\/.+/.test(v.trim()) ? undefined : 'Enter a valid http(s) URL'),
	});
	if (!endpointUrl) {
		return undefined;
	}

	const restPath = await vscode.window.showInputBox({
		title: 'Deploy to Camunda — REST path',
		prompt: 'Enter the REST API path',
		value: defaults?.restPath ?? '/engine-rest',
		ignoreFocusOut: true,
	});
	if (restPath === undefined) {
		return undefined;
	}

	const basicAuthUser = await vscode.window.showInputBox({
		title: 'Deploy to Camunda — Username (optional)',
		prompt: 'Basic auth username (leave empty for none)',
		value: defaults?.basicAuthUser ?? '',
		ignoreFocusOut: true,
	});
	if (basicAuthUser === undefined) {
		return undefined;
	}

	let basicAuthPassword = '';
	if (basicAuthUser) {
		basicAuthPassword = (await vscode.window.showInputBox({
			title: 'Deploy to Camunda — Password',
			prompt: 'Basic auth password',
			password: true,
			ignoreFocusOut: true,
		})) ?? '';
	}

	return {
		name: 'Manual',
		endpointUrl: endpointUrl.trim().replace(/\/$/, ''),
		restPath: restPath.trim() || '/engine-rest',
		basicAuthUser,
		basicAuthPassword,
	};
}

/** Find deployable .bpmn / .form files in the same folder as the anchor file */
export async function findDeployCandidates(anchorUri: vscode.Uri): Promise<vscode.Uri[]> {
	const folder = vscode.Uri.file(path.dirname(anchorUri.fsPath));
	const pattern = new vscode.RelativePattern(folder, '*.{bpmn,form}');
	return vscode.workspace.findFiles(pattern, '**/node_modules/**');
}

export async function pickDeployFiles(anchorUri: vscode.Uri): Promise<vscode.Uri[] | undefined> {
	const candidates = await findDeployCandidates(anchorUri);
	if (!candidates.length) {
		void vscode.window.showWarningMessage('No .bpmn or .form files found in this folder.');
		return undefined;
	}

	const anchorPath = anchorUri.fsPath;
	const items = candidates.map((uri) => ({
		label: path.basename(uri.fsPath),
		description: vscode.workspace.asRelativePath(uri),
		uri,
		picked: uri.fsPath === anchorPath || uri.fsPath.startsWith(anchorPath.replace(/\.[^.]+$/, '')),
	}));

	// Always pre-select the anchor file
	for (const item of items) {
		if (item.uri.fsPath === anchorPath) {
			item.picked = true;
		}
	}

	const selected = await vscode.window.showQuickPick(items, {
		canPickMany: true,
		placeHolder: 'Select files to deploy (BPMN + Form)',
		title: 'Deploy to Camunda — Step 2/2: Files',
	});
	if (!selected?.length) {
		return undefined;
	}
	return selected.map((s) => s.uri);
}

/** Run the deploy wizard and surface the result in the UI (and optionally the webview). */
export async function runDeploy(
	anchorUri: vscode.Uri,
	panel?: vscode.WebviewPanel
): Promise<DeployResult> {
	const result = await runDeployWizard(anchorUri);
	if (panel) {
		panel.webview.postMessage({
			type: 'deployResult',
			success: result.success,
			message: result.message,
		});
	}
	if (result.success) {
		void vscode.window.showInformationMessage(result.message);
	} else if (result.message !== 'Deployment cancelled.') {
		void vscode.window.showErrorMessage(result.message);
	}
	return result;
}

export async function runDeployWizard(anchorUri: vscode.Uri): Promise<DeployResult> {
	const endpoint = await pickEndpoint();
	if (!endpoint) {
		return { success: false, message: 'Deployment cancelled.' };
	}

	const files = await pickDeployFiles(anchorUri);
	if (!files?.length) {
		return { success: false, message: 'Deployment cancelled.' };
	}

	const deploymentName = path.basename(anchorUri.fsPath).replace(/\.(bpmn|form)$/i, '') || 'deployment';
	const filePayloads: { name: string; content: string }[] = [];

	for (const uri of files) {
		const content = await fs.readFile(uri.fsPath, 'utf8');
		filePayloads.push({ name: path.basename(uri.fsPath), content });
	}

	return deployFiles(endpoint, deploymentName, filePayloads);
}

export async function deployFiles(
	endpoint: CamundaEndpoint,
	deploymentName: string,
	files: { name: string; content: string }[]
): Promise<DeployResult> {
	const url = `${endpoint.endpointUrl}${endpoint.restPath}/deployment/create`;

	const form = new FormData();
	form.append('deployment-name', deploymentName);
	form.append('deploy-changed-only', 'true');
	form.append('enable-duplicate-filtering', 'true');

	for (const file of files) {
		const mime = file.name.endsWith('.form') ? 'application/json' : 'application/xml';
		form.append('file', new Blob([file.content], { type: mime }), file.name);
	}

	const headers: Record<string, string> = {};
	if (endpoint.basicAuthUser) {
		headers.Authorization = `Basic ${Buffer.from(`${endpoint.basicAuthUser}:${endpoint.basicAuthPassword}`).toString('base64')}`;
	}

	const fileList = files.map((f) => f.name).join(', ');
	logToOutput('info', `Deploying [${fileList}] to ${url}…`);

	try {
		const response = await fetch(url, { method: 'POST', headers, body: form });
		const body = await response.text();

		if (!response.ok) {
			const msg = `Deploy failed (${response.status}): ${body || response.statusText}`;
			logToOutput('error', msg);
			return { success: false, message: msg };
		}

		let detail = body;
		try {
			const json = JSON.parse(body) as { id?: string; name?: string };
			detail = `Deployment "${json.name ?? deploymentName}" (id: ${json.id ?? 'n/a'}) created with: ${fileList}`;
		} catch {
			detail = `Deployment created with: ${fileList}`;
		}

		logToOutput('info', detail);
		return { success: true, message: detail };
	} catch (err) {
		const msg = `Deploy error: ${(err as Error).message}`;
		logToOutput('error', msg);
		return { success: false, message: msg };
	}
}
