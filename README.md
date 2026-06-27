# Process Designer (VS Code Extension)

**Extension ID:** `RineSong.process-designer`

Webview-based BPMN and Camunda Form editor for VS Code / Cursor — a lightweight alternative to the [Camunda Modeler](https://github.com/camunda/camunda-modeler) desktop app.

> **Disclaimer:** This is an **unofficial** community extension. It is not affiliated with, endorsed by, or maintained by Camunda Services GmbH or the bpmn.io project.

## Features

| Area | Status |
|------|--------|
| **BPMN** (`.bpmn`) | Canvas, palette, zoom, properties panel, Camunda extensions, color picker |
| **Forms** (`.form`) | Form Playground (definition / preview / input / output), collapsible panels |
| **Deploy** | Wizard: pick Camunda endpoint + multi-select `.bpmn` / `.form` in folder |
| **New files** | Command palette / explorer: New BPMN Diagram, New Camunda Form |
| **Output** | In-editor log panel (BPMN); shared Output channel (does not auto-pop on errors) |
| **DMN** | Not yet implemented |

## Webview technology stack

This extension does **not** use React or Vue in its own code. The webviews are plain **TypeScript + DOM**, bundled with **Webpack**:

| Layer | What we write | What we embed |
|-------|---------------|---------------|
| **BPMN editor** (`src/webview/index.ts`) | Vanilla TS: `postMessage`, toolbar buttons, zoom/deploy | [bpmn-js](https://github.com/bpmn-io/bpmn-js) (diagram-js, SVG/DOM), properties panel, Camunda moddle |
| **Form editor** (`src/webview/form.ts`) | Vanilla TS: layout tweaks, collapse toggles, save/sync | [@bpmn-io/form-js](https://github.com/bpmn-io/form-js) `FormPlayground` |
| **UI framework inside libraries** | — | form-js editor/playground uses **Preact** internally (not authored by us); webpack aliases a single `preact` copy to avoid hook errors |

**Extension host** (`src/extension.ts`, providers, services) runs in **Node.js** and uses the VS Code API only — no browser UI there.

### Dark theme strategy

bpmn-js and form-js ship **fixed light (Carbon) themes**. VS Code dark themes inject light foreground colors and `color-scheme: dark` into webviews, which breaks inputs, icons, and scrollbars if left unchecked.

We isolate editor surfaces with `pd-light-surface` (`src/webview/theme.css`): white background, dark text, `color-scheme: light`. The outer toolbar/log areas still follow VS Code theme variables.

**Known limitation:** In some dark themes, a form component-palette scrollbar may briefly flash a dark track on hover after scrolling (VS Code-injected `::-webkit-scrollbar` vs Chromium overlay scrollbars). Mitigations are in `theme.css` but not 100% reliable across all hosts.

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
│  ├─ theme.css                 shared light-surface tokens │
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

Press **F5** in the extension project to launch an **Extension Development Host** (uses `dist/` directly). Sample files live in `samples/`.

To open `.bpmn` / `.form` with the custom editor by default:

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
    fileIcons.ts
    getNonce.ts
    webviewHtml.ts
  webview/
    index.ts          # BPMN entry (bpmn-js)
    form.ts           # Form entry (form-js playground)
    theme.css         # Light-surface tokens for dark IDE themes
    logger.ts
    vscodeApi.ts
    webview.css
    form.css
resources/
  logo.png
  icons/light|dark/
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

## Publishing

```bash
npm run package
npm_config_registry=https://registry.npmjs.org npx @vscode/vsce package --no-dependencies
# → process-designer-x.y.z.vsix

vsce login RineSong
vsce publish --no-dependencies          # VS Code Marketplace

# Cursor / VSCodium also need Open VSX (Eclipse account + Publisher Agreement):
npx ovsx publish process-designer-x.y.z.vsix -p <OpenVSX-Token>
```

Before publishing, verify:

- `publisher` is `RineSong`, `name` is `process-designer`
- [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) — bpmn.io watermark must stay visible in editors
- README disclaimer is visible on the Marketplace listing

## Legal & attribution

| Asset | Notes |
|-------|-------|
| **bpmn-js / form-js** | [bpmn.io License](https://bpmn.io/license/) — watermark in canvas must remain visible |
| **Extension icon** (`logo.png`) | Use with clear “unofficial” disclaimer |
| **File icons** (`resources/icons/`) | Generic BPMN/form glyphs — not Camunda trademarks |
| **Extension code** | MIT — see [LICENSE](LICENSE) |

## License

MIT — see [LICENSE](LICENSE). Third-party notices: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
