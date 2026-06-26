# Third-Party Notices

This extension bundles and uses open-source components. The extension itself is
licensed under the MIT License (see [LICENSE](LICENSE)).

## bpmn.io toolkits (bpmn-js, form-js, and related packages)

Copyright (c) 2014-present Camunda Services GmbH

The modeling libraries (`bpmn-js`, `@bpmn-io/form-js`, and related packages) are
distributed under the [bpmn.io License](https://bpmn.io/license/). In addition to
the MIT-style grant, that license requires:

- The copyright and permission notice to be included in distributions.
- The bpmn.io watermark rendered inside diagrams/forms **must remain visible** and
  must not be removed, hidden, or overlapped.

This extension complies by leaving the default watermark in the webview editors.

## Other dependencies

See `package.json` and `package-lock.json` for the full dependency tree. Key
packages include `camunda-bpmn-moddle`, `bpmn-js-properties-panel`, and
`camunda-bpmn-js-behaviors`, each under their respective licenses in
`node_modules/<package>/LICENSE`.
