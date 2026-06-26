import BpmnModeler from 'bpmn-js/lib/Modeler';
import {
	BpmnPropertiesPanelModule,
	BpmnPropertiesProviderModule,
	CamundaPlatformPropertiesProviderModule,
} from 'bpmn-js-properties-panel';
import { CreateAppendAnythingModule } from 'bpmn-js-create-append-anything';
import camundaPlatformBehaviors from 'camunda-bpmn-js-behaviors/lib/camunda-platform';
import camundaModdle from 'camunda-bpmn-moddle/resources/camunda.json';
import BpmnColorPickerModule from 'bpmn-js-color-picker';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import '@bpmn-io/properties-panel/assets/properties-panel.css';
import 'bpmn-js-color-picker/colors/color-picker.css';
import './webview.css';

import { log } from './logger';
import { vscode } from './vscodeApi';

window.addEventListener('error', (e) => {
	log('error', `Uncaught: ${e.message} @ ${e.filename}:${e.lineno}`);
});
window.addEventListener('unhandledrejection', (e) => {
	log('error', `Unhandled rejection: ${String((e as PromiseRejectionEvent).reason)}`);
});

const EMPTY_DIAGRAM = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:camunda="http://camunda.org/schema/1.0/bpmn" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn" exporter="bpmn-modeler" exporterVersion="1.0.0">
  <bpmn:process id="Process_1" isExecutable="true" />
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1" />
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

const canvas = document.getElementById('canvas') as HTMLElement;
const statusEl = document.getElementById('status') as HTMLElement;

log('info', 'BPMN Modeler initialized.');

let modeler: BpmnModeler;
try {
	modeler = new BpmnModeler({
		container: canvas,
		propertiesPanel: {
			parent: '#properties',
		},
		additionalModules: [
			BpmnPropertiesPanelModule,
			BpmnPropertiesProviderModule,
			CamundaPlatformPropertiesProviderModule,
			camundaPlatformBehaviors,
			CreateAppendAnythingModule,
			BpmnColorPickerModule,
		],
		moddleExtensions: {
			camunda: camundaModdle,
		},
		keyboard: { bindTo: document },
	});
} catch (err) {
	log('error', `Modeler construction failed: ${(err as Error).message}`);
	log('error', String((err as Error).stack ?? ''));
	throw err;
}

let currentXml = '';
let importing = false;

function setStatus(message: string, isError = false): void {
	statusEl.textContent = message;
	statusEl.classList.toggle('error', isError);
}

async function importXml(xml: string): Promise<void> {
	importing = true;
	try {
		const result = await modeler.importXML(xml || EMPTY_DIAGRAM);
		(modeler.get('canvas') as { zoom: (m: string) => void }).zoom('fit-viewport');
		setStatus('Ready');
		log('info', 'Diagram imported successfully.');
		if (result.warnings?.length) {
			for (const w of result.warnings) {
				log('warn', String(w.message ?? w));
			}
		}
	} catch (err) {
		const msg = (err as Error).message;
		setStatus(`Import error: ${msg}`, true);
		log('error', `Import failed: ${msg}`);
	} finally {
		importing = false;
	}
}

async function getXml(): Promise<string | undefined> {
	try {
		const { xml } = await modeler.saveXML({ format: true });
		return typeof xml === 'string' ? xml : undefined;
	} catch (err) {
		const msg = (err as Error).message;
		setStatus(`Save error: ${msg}`, true);
		log('error', `Save failed: ${msg}`);
		return undefined;
	}
}

async function saveXml(): Promise<void> {
	if (importing) {
		return;
	}
	const xml = await getXml();
	if (xml && xml !== currentXml) {
		currentXml = xml;
		vscode.postMessage({ type: 'edit', xml });
	}
}

modeler.on('commandStack.changed', () => {
	void saveXml();
});

const eventBus = modeler.get('eventBus') as {
	on: (event: string, cb: (e: { element?: { id?: string }; newSelection?: { id?: string }[] }) => void) => void;
};
eventBus.on('selection.changed', (e) => {
	const el = e.newSelection?.[0];
	if (el?.id) {
		log('info', `Selected: ${el.id}`);
	}
});

modeler.on('error', (err: unknown) => {
	log('error', String((err as Error)?.message ?? err));
});

window.addEventListener('message', (event: MessageEvent) => {
	const message = event.data;
	switch (message.type) {
		case 'update':
			if (message.xml !== currentXml) {
				currentXml = message.xml;
				void importXml(message.xml);
			}
			break;
		case 'deployResult':
			if (message.success) {
				setStatus('Deployed');
				log('info', message.message as string);
			} else {
				setStatus('Deploy failed', true);
				log('error', message.message as string);
			}
			break;
		case 'triggerDeploy':
			document.getElementById('deploy')?.click();
			break;
	}
});

document.getElementById('zoom-in')?.addEventListener('click', () => {
	const c = modeler.get('canvas') as { zoom: (z?: number) => number };
	c.zoom(c.zoom() + 0.2);
});
document.getElementById('zoom-out')?.addEventListener('click', () => {
	const c = modeler.get('canvas') as { zoom: (z?: number) => number };
	c.zoom(c.zoom() - 0.2);
});
document.getElementById('zoom-fit')?.addEventListener('click', () => {
	(modeler.get('canvas') as { zoom: (m: string) => void }).zoom('fit-viewport');
});

document.getElementById('deploy')?.addEventListener('click', () => {
	log('info', 'Starting deployment wizard…');
	vscode.postMessage({ type: 'requestDeploy' });
});

vscode.postMessage({ type: 'ready' });
setStatus('Loading…');
