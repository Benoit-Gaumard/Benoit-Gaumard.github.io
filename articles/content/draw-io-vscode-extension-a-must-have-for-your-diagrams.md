+++
author = "Benoit G"
title = "Edit and Version Draw.io Diagrams in VS Code"
date = "2024-11-05"
description = "Install the unofficial Draw.io integration, choose an editable file format and create your first diagram alongside source code in desktop VS Code."
tags = ["Productivity", "Tools", "Diagrams"]
categories = ["Tools"]
featureImage = "/articles/images/VSCode.svg"
related = ["github-contribution-workflow"]
+++

If you want an integrated solution and avoid multiple external tools (like Visio, PowerPoint, etc.) to create diagrams, here is a very helpful extension.

This unofficial extension integrates Draw.io (also known as diagrams.net) into VS Code.

## Start on your desktop

1. Open [Draw.io Integration in the VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=hediet.vscode-drawio) and review/install the extension in desktop VS Code.
2. Create an empty `architecture.drawio` file in your project, open it and add two labelled shapes with a connector.
3. Save, close and reopen the file. Confirm the shapes remain editable, then review and version the file with your code.

On a phone, bookmark the extension link for your workstation; installation is not a mobile browser task. No tested extension version or execution date is recorded here.

## Choose a format

| Format | Choose when | Check |
|---|---|---|
| `.drawio` | The editable source is the primary deliverable | Export a separate image when needed |
| `.drawio.svg` | You want a vector preview plus embedded editable source | Reopen after other tools process it; optimisation can remove embedded metadata |
| `.drawio.png` | A raster preview is needed by the destination | Image dimensions affect readability; preserve embedded source metadata |

To create a new diagram, just create an empty `*.drawio`, `*.drawio.svg`, or `*.drawio.png` file and open it.

- `.drawio.svg` files are valid `.svg` files that can be embedded in GitHub readme files - no export needed.
- `.drawio.png` files are valid `.png` files - no export needed.

You should use `.svg` whenever possible. It's very practical when you make updates without re-importing everything - just make the change and that's all.

Download is available here: [Draw.io Integration - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=hediet.vscode-drawio)

Here is the demo:

![Draw.io VS Code extension demo](https://github.com/hediet/vscode-drawio/raw/HEAD/docs/demo.gif)

The three numbered steps above are the text alternative to the animation. For reusable source examples, use the extension repository's [documentation and examples](https://github.com/hediet/vscode-drawio); for cloud symbols, browse the site's [icon gallery](/icons/). Check each asset's source terms rather than assuming a blanket licence.
