declare module '*.css';

declare module '*.json' {
	const value: Record<string, unknown>;
	export default value;
}

declare module 'bpmn-js/lib/Modeler' {
	export default class BpmnModeler {
		constructor(options?: Record<string, unknown>);
		importXML(xml: string): Promise<{ warnings: { message?: string }[] }>;
		saveXML(options?: { format?: boolean }): Promise<{ xml?: string }>;
		get<T = unknown>(name: string): T;
		on(event: string, callback: (...args: unknown[]) => void): void;
		destroy(): void;
	}
}

declare module 'bpmn-js-properties-panel' {
	export const BpmnPropertiesPanelModule: unknown;
	export const BpmnPropertiesProviderModule: unknown;
	export const CamundaPlatformPropertiesProviderModule: unknown;
}

declare module 'bpmn-js-create-append-anything' {
	export const CreateAppendAnythingModule: unknown;
}

declare module 'bpmn-js-color-picker' {
	const module: unknown;
	export default module;
}

declare module 'camunda-bpmn-js-behaviors/lib/camunda-platform' {
	const module: unknown;
	export default module;
}

declare module 'camunda-bpmn-moddle/resources/camunda.json' {
	const descriptor: Record<string, unknown>;
	export default descriptor;
}

declare module '@bpmn-io/form-js-editor' {
	export class FormEditor {
		constructor(options?: { container?: HTMLElement });
		importSchema(schema: unknown): Promise<{ warnings: { message?: string }[] }>;
		saveSchema(): unknown;
		on(event: string, handler: (...args: unknown[]) => void): void;
		destroy(): void;
	}
}

declare module '@bpmn-io/form-js' {
	export class FormPlayground {
		constructor(options: {
			container: HTMLElement;
			schema: unknown;
			data?: unknown;
			[key: string]: unknown;
		});
		on(event: string, handler: (...args: unknown[]) => void): void;
		off(event: string, handler: (...args: unknown[]) => void): void;
		getSchema(): unknown;
		saveSchema(): unknown;
		setSchema(schema: unknown): void;
		getEditor(): unknown;
		destroy(): void;
	}
}
