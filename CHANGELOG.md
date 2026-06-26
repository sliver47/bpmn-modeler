# Change Log

All notable changes to the "bpmn-modeler" extension are documented in this file.

## [0.0.1] - 2026-06-26

### Added

- Custom editor for `.bpmn` with bpmn-js: canvas, palette, zoom, properties panel, Camunda moddle, color picker
- Custom editor for `.form` with form-js Playground (definition, preview, input/output panels)
- Collapsible form panels with horizontal bar layout when an entire row is collapsed
- Deploy wizard: select Camunda endpoint (configured or manual) and multi-select files in folder
- Commands to create new BPMN and Form files from templates
- In-editor output log (BPMN) and shared Output channel
- Webpack triple-target build (extension + BPMN webview + Form webview)

### Notes

- Requires VS Code / Cursor `^1.96.0`
- DMN support is planned but not included in this release
- bpmn.io canvas watermark is shown per [bpmn.io License](https://bpmn.io/license/)
