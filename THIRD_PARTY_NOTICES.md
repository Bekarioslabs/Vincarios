# Third-Party Notices

This file summarizes the main third-party components bundled with vincarios. The complete lockfile-derived runtime package inventory is stored in [licenses/npm-runtime-licenses.json](licenses/npm-runtime-licenses.json) and is verified by `npm run licenses:check`.

## Electron 44.10.0

- Package: [electron/electron](https://github.com/electron/electron)
- License: MIT; Chromium and bundled components retain their own notices.
- Use: Desktop application runtime.
- Full notices: Electron places `LICENSE` and `LICENSES.chromium.html` beside the packaged runtime.

## Inter Variable

- Package: [rsms/inter](https://github.com/rsms/inter)
- License: SIL Open Font License 1.1
- Use: Bundled interface font.
- Full text: [third_party/inter/LICENSE.txt](third_party/inter/LICENSE.txt)

## Lucide

- Package: [lucide-icons/lucide](https://github.com/lucide-icons/lucide)
- License: ISC
- Use: Bundled local SVG icons.
- Full text: [third_party/lucide/LICENSE](third_party/lucide/LICENSE)

## markdown-it 14.3.3

- Package: [markdown-it/markdown-it](https://github.com/markdown-it/markdown-it)
- License: MIT
- Use: Bundled Markdown rendering engine.
- Full text: [third_party/markdown-it/LICENSE](third_party/markdown-it/LICENSE)

## yaml 2.9.1

- Package: [eemeli/yaml](https://github.com/eemeli/yaml)
- License: ISC
- Use: Central Frontmatter Contract for bounded YAML parsing and serialization.
- Full text: [licenses/yaml-ISC.txt](licenses/yaml-ISC.txt)

## @huggingface/transformers 4.3.0

- Package: [huggingface/transformers.js](https://github.com/huggingface/transformers.js)
- License: Apache-2.0
- Use: Local ONNX embedding runtime.
- Full text: [licenses/Apache-2.0.txt](licenses/Apache-2.0.txt)

## paraphrase-multilingual-MiniLM-L12-v2

- Artifact repository: [Xenova/paraphrase-multilingual-MiniLM-L12-v2](https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2)
- Base model: [sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2](https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2)
- Pinned artifact revision: `2c4055b12046f11709e9df2c122e59ffbdc2f900`
- License: Apache-2.0 according to the model card metadata.
- Use: Bundled multilingual 384-dimensional embedding model.
- Integrity: All six required artifacts are checked against pinned SHA256 values before loading or packaging.
- Full text: [licenses/Apache-2.0.txt](licenses/Apache-2.0.txt)

## sharp / libvips

- Package: [lovell/sharp](https://github.com/lovell/sharp)
- License expression for the Windows x64 binary: Apache-2.0 AND LGPL-3.0-or-later.
- Use: Optional image tensor support loaded by the local Transformers runtime.
- Package and bundled-library notice: [licenses/sharp-win32-x64-NOTICE.md](licenses/sharp-win32-x64-NOTICE.md)
- Apache-2.0 text: [licenses/Apache-2.0.txt](licenses/Apache-2.0.txt)
- LGPL-3.0-or-later text: [licenses/LGPL-3.0-or-later.txt](licenses/LGPL-3.0-or-later.txt)

## Runtime npm Inventory

The committed inventory covers every non-development package resolution in `package-lock.json`, including platform-specific optional variants. New, missing, or unreviewed license expressions fail `npm run licenses:check` and CI until the inventory and notices are reviewed.
