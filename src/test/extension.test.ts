import * as assert from 'assert';
import { BpmnEditorProvider } from '../providers/bpmnEditorProvider';
import { FormEditorProvider } from '../providers/formEditorProvider';

suite('Extension Test Suite', () => {
	test('custom editor view types match package.json contributions', () => {
		assert.strictEqual(BpmnEditorProvider.viewType, 'bpmn-modeler.bpmnEditor');
		assert.strictEqual(FormEditorProvider.viewType, 'bpmn-modeler.formEditor');
	});
});
