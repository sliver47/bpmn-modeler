# BPMN Modeler (VS Code Extension)

Webview-based BPMN and Camunda Form editor for VS Code / Cursor — a lightweight alternative to the [Camunda Modeler](https://github.com/camunda/camunda-modeler) desktop app.

## Features

| Area | Status |
|------|--------|
| **BPMN** (`.bpmn`) | Canvas, palette, zoom, properties panel, Camunda extensions, color picker |
| **Forms** (`.form`) | Form Playground (definition / preview / input / output), collapsible panels |
| **Deploy** | Wizard: pick Camunda endpoint + multi-select `.bpmn` / `.form` in folder |
| **New files** | Command palette / explorer: New BPMN Diagram, New Camunda Form |
| **Output** | In-editor log panel (BPMN); shared Output channel (does not auto-pop on errors) |
| **DMN** | Not yet implemented |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Extension host (Node.js)          src/                     │
│  ├─ extension.ts              activation, commands          │
│  ├─ providers/                CustomTextEditorProvider    │
│  ├─ services/                 deploy, createFile, logging   │
│  └─ utils/                    nonce, webview HTML, edits    │
└──────────────────────────┬──────────────────────────────────┘
                           │ postMessage (edit / update / log / deploy)
┌──────────────────────────▼──────────────────────────────────┐
│  Webview (browser bundle)          src/webview/           │
│  ├─ index.ts + webview.css    bpmn-js modeler             │
│  ├─ form.ts + form.css        @bpmn-io/form-js playground │
│  ├─ logger.ts, vscodeApi.ts   shared webview utilities    │
│  └─ tsconfig.json             DOM types (separate from ext) │
└───────────────────────────────────────────────────────────┘
                           ▲
                           │ webpack (3 targets)
                    dist/extension.js
                    dist/webview/index.{js,css}
                    dist/webview/form.{js,css}
```

### Message protocol (extension ↔ webview)

| Direction | `type` | Payload | Purpose |
|-----------|--------|---------|---------|
| ext → webview | `update` | `xml` or `json` | Push file content after open / external edit |
| webview → ext | `ready` | — | Webview loaded; triggers initial `update` |
| webview → ext | `edit` | `xml` or `json` | Persist diagram / form schema to document |
| webview → ext | `log` | `level`, `message` | Forward to Output channel |
| webview → ext | `requestDeploy` | — | BPMN toolbar deploy (runs wizard) |
| ext → webview | `deployResult` | `success`, `message` | Deploy outcome for in-editor log |

### Build notes

- **Dual TypeScript targets:** root `tsconfig.json` excludes `src/webview`; webview uses `src/webview/tsconfig.json` with DOM libs.
- **Webpack `ts-loader` instances:** `instance: 'extension'` vs `instance: 'webview'` prevent cross-target type-check conflicts.
- **Preact alias:** form-js bundles a nested `preact`; webpack aliases force a single copy to avoid hook context errors.

## Getting started

```bash
npm install
npm run compile
```

Press **F5** to launch an Extension Development Host. Sample files live in `samples/`.

To open `.bpmn` / `.form` with the custom editor by default, add to workspace settings:

```json
{
  "workbench.editorAssociations": {
    "*.bpmn": "bpmn-modeler.bpmnEditor",
    "*.form": "bpmn-modeler.formEditor"
  }
}
```

## Commands

| Command | Description |
|---------|-------------|
| `BPMN Modeler: New BPMN Diagram` | Create `*.bpmn` from template |
| `BPMN Modeler: New Camunda Form` | Create `*.form` from template |
| `BPMN Modeler: Deploy to Camunda` | Deploy wizard (endpoint + files) |
| `BPMN Modeler: Show Output` | Open the Output channel |
| `BPMN Modeler: Open with BPMN Modeler` | Re-open `.bpmn` in custom editor |
| `BPMN Modeler: Open with Form Editor` | Re-open `.form` in custom editor |

## Configuration

`bpmnModeler.camunda.endpoints` — array of deployment targets:

```json
{
  "bpmnModeler.camunda.endpoints": [
    {
      "name": "Local Camunda 7",
      "endpointUrl": "http://localhost:8080",
      "restPath": "/engine-rest",
      "basicAuthUser": "",
      "basicAuthPassword": ""
    }
  ]
}
```

Legacy single-endpoint keys (`bpmnModeler.camunda.endpointUrl`, etc.) still work as a fallback.

## Project layout

```
src/
  extension.ts
  providers/
    bpmnEditorProvider.ts
    formEditorProvider.ts
  services/
    createFile.ts
    deployService.ts
    outputChannel.ts
  utils/
    documentEdit.ts
    getNonce.ts
    webviewHtml.ts
  webview/
    index.ts          # BPMN entry
    form.ts           # Form entry
    logger.ts
    vscodeApi.ts
    webview.css
    form.css
samples/
  empty.bpmn
  empty.form
webpack.config.js     # extension + 2 webview bundles
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run compile` | Development webpack build |
| `npm run watch` | Watch mode |
| `npm run package` | Production bundle (for `.vsix`) |
| `npm test` | Extension tests |
| `npm run lint` | ESLint |

## Roadmap

1. DMN custom editor (`dmn-js`)
2. Zeebe / Camunda 8 moddle and deployment targets
3. Element templates, linting (parity with Camunda Modeler plugins)

## License

MIT — see [LICENSE](LICENSE)
