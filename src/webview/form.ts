import { FormPlayground } from '@bpmn-io/form-js';

import '@bpmn-io/form-js/dist/assets/form-js.css';
import '@bpmn-io/form-js/dist/assets/form-js-editor.css';
import '@bpmn-io/form-js/dist/assets/form-js-playground.css';
import '@bpmn-io/form-js/dist/assets/properties-panel.css';
import '@bpmn-io/form-js-editor/dist/assets/dragula.css';
import './form.css';

import { log, showLogPanel } from './logger';
import { vscode } from './vscodeApi';

const EMPTY_FORM = {
	type: 'default',
	components: [],
};

const container = document.getElementById('form-editor') as HTMLElement;
const statusEl = document.getElementById('status') as HTMLElement;

log('info', 'Form Playground initialized.');

// Sentinel so the very first `update` (even for an empty file) always initializes.
let currentJson: string | undefined = undefined;
let initialized = false;
let playground: FormPlayground | undefined;
let suppressNextChange = false;

function setStatus(message: string, isError = false): void {
	statusEl.textContent = message;
	statusEl.classList.toggle('error', isError);
}

function parseSchema(json: string): unknown {
	return json.trim() ? JSON.parse(json) : EMPTY_FORM;
}

function persistSchema(): void {
	if (!playground) {
		return;
	}
	try {
		const schema = playground.getSchema();
		const json = JSON.stringify(schema, null, 2);
		if (json !== currentJson) {
			currentJson = json;
			vscode.postMessage({ type: 'edit', json });
		}
	} catch (err) {
		const msg = (err as Error).message;
		setStatus(`Save error: ${msg}`, true);
		log('error', `Save failed: ${msg}`);
		showLogPanel();
	}
}

let layoutEnhanced = false;
let changeHooked = false;

/**
 * The playground ships a fixed 2x2 grid. We restructure it into two flex rows
 * (top: Definition + Preview, bottom: Input + Output) and add a collapse toggle
 * to each section header so panels can be folded individually.
 */
function enhanceLayout(): void {
	if (layoutEnhanced) {
		return;
	}
	const main = container.querySelector('.fjs-pgl-main');
	if (!main) {
		return;
	}
	const sections = Array.from(main.querySelectorAll(':scope > .fjs-pgl-section'));
	if (sections.length < 4) {
		return;
	}

	const topRow = document.createElement('div');
	topRow.className = 'pgl-row pgl-row-top';
	const bottomRow = document.createElement('div');
	bottomRow.className = 'pgl-row pgl-row-bottom';

	topRow.appendChild(sections[0]);
	topRow.appendChild(sections[1]);
	bottomRow.appendChild(sections[2]);
	bottomRow.appendChild(sections[3]);

	main.appendChild(topRow);
	main.appendChild(bottomRow);

	sections.forEach((section) => addCollapseToggle(section as HTMLElement));
	updateRowState(topRow);
	updateRowState(bottomRow);

	layoutEnhanced = true;
}

function addCollapseToggle(section: HTMLElement): void {
	const header = section.querySelector('.header') as HTMLElement | null;
	if (!header || header.querySelector('.pgl-collapse-btn')) {
		return;
	}

	// Wrap the bare title text in a span so we can rotate it cleanly when collapsed.
	if (!header.querySelector('.pgl-title')) {
		const titleSpan = document.createElement('span');
		titleSpan.className = 'pgl-title';
		Array.from(header.childNodes).forEach((node) => {
			if (node.nodeType === 3 && node.textContent && node.textContent.trim()) {
				titleSpan.textContent += node.textContent.trim();
				header.removeChild(node);
			}
		});
		header.appendChild(titleSpan);
	}

	const btn = document.createElement('button');
	btn.type = 'button';
	btn.className = 'pgl-collapse-btn';
	btn.title = 'Collapse / expand panel';
	btn.textContent = '▾';

	const toggle = (e: Event) => {
		e.stopPropagation();
		const collapsed = section.classList.toggle('collapsed');
		btn.textContent = collapsed ? '▸' : '▾';
		const row = section.closest('.pgl-row') as HTMLElement | null;
		if (row) {
			updateRowState(row);
		}
	};

	btn.addEventListener('click', toggle);
	header.addEventListener('click', (e) => {
		if ((e.target as HTMLElement).closest('.header-items')) {
			return;
		}
		toggle(e);
	});
	header.style.cursor = 'pointer';

	header.insertBefore(btn, header.firstChild);
}

/** A row with every section collapsed should not eat vertical space. */
function updateRowState(row: HTMLElement): void {
	const sections = Array.from(row.querySelectorAll(':scope > .fjs-pgl-section'));
	const allCollapsed = sections.length > 0 && sections.every((s) => s.classList.contains('collapsed'));
	row.classList.toggle('all-collapsed', allCollapsed);
}

function createPlayground(schema: unknown): void {
	playground = new FormPlayground({
		container,
		schema,
		data: {},
		actions: { display: false },
	});

	playground.on('formPlayground.rendered', () => {
		if (!changeHooked) {
			const editor = playground?.getEditor() as { on: (e: string, cb: () => void) => void } | undefined;
			editor?.on('changed', () => {
				if (suppressNextChange) {
					suppressNextChange = false;
					return;
				}
				persistSchema();
			});
			changeHooked = true;
		}
		enhanceLayout();
		setStatus('Ready');
		log('info', 'Form rendered.');
	});

	playground.on('formPlayground.inputDataError', (err: unknown) => {
		log('warn', `Input data is not valid JSON: ${String((err as Error)?.message ?? err)}`);
	});
}

function loadSchema(json: string): void {
	let schema: unknown;
	try {
		schema = parseSchema(json);
	} catch (err) {
		const msg = (err as Error).message;
		setStatus(`Invalid form JSON: ${msg}`, true);
		log('error', `Parse failed: ${msg}`);
		showLogPanel();
		return;
	}

	if (!playground) {
		createPlayground(schema);
		return;
	}

	// External change (e.g. file edited elsewhere) → reset schema without echo
	suppressNextChange = true;
	try {
		(playground as unknown as { setSchema: (s: unknown) => void }).setSchema(schema);
	} catch (err) {
		log('error', `Set schema failed: ${(err as Error).message}`);
	}
}

window.addEventListener('message', (event: MessageEvent) => {
	const message = event.data;
	switch (message.type) {
		case 'update':
			if (!initialized || message.json !== currentJson) {
				initialized = true;
				currentJson = message.json;
				loadSchema(message.json);
			}
			break;
	}
});

vscode.postMessage({ type: 'ready' });
setStatus('Loading…');
