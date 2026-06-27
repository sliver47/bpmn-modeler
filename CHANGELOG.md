# Change Log

All notable changes to the "Process Designer" extension are documented in this file.

## [0.0.2] - 2026-06-27

### Fixed

- Dark theme: form editor (definition/preview/input/output) now renders as a consistent light surface instead of inheriting partial dark styling (grey titles, unreadable inputs)
- Dark theme: BPMN properties panel inputs (e.g. ID field) are now readable (pinned to the tested light theme)
- Dark theme: BPMN canvas palette/context-pad icons no longer appear faint/disabled (icons pinned to dark on the white canvas)
- Properties panel left divider is now always visible against the white canvas
- Form component palette scrollbar no longer flashes a black track on hover in dark theme

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
