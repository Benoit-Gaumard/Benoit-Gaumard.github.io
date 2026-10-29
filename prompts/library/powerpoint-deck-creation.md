---
title: PowerPoint deck creation
description: Create complete French and US English PowerPoint decks with a dark developer-style design, editable visuals, sources and slide-by-slide quality checks.
category: Writing
tags: [powerpoint, pptx, presentation, slides, bilingual, design]
models: AI assistant with file generation, code execution, web search and image generation
date: 2026-10-29
---
## 1. The request

Create a PowerPoint presentation (.pptx) about **{{Topic}}**.

- **Audience**: {{Audience (for example, beginners, decision-makers or developers)}}.
- **Goal**: {{Goal (for example, explain the basics, persuade or train)}}.
- **Languages**: produce **two separate, complete decks**, one in **French** (`{{Deck name}}-FR.pptx`) and one in **US English** (`{{Deck name}}-EN.pptx`). Each deck is 100% in a single language. Write the two versions separately rather than translating word for word. Only product names and commands stay as they are.
- **Author** on the title slide and the closing slide: {{Author full name}} · {{Company}} · {{Month Year}}.
- **Sections I want**: {{Sections to cover}}, plus anything else you think is relevant.

## 2. Tone and language

- Write for beginners: short sentences, everyday words, no unexplained jargon.
- Explain every technical concept with **an everyday analogy**. Examples: "an LLM is like your phone keyboard, only far more powerful", "the instructions file is the note you leave for the babysitter", "a GPU is a whole kitchen crew working at once".
- Prefer **concrete examples without code**. Show code only when it is essential, and always inside a "code editor" card.
- Use plain, meaningful slide titles ("Asking the right way" rather than "Prompt engineering").
- Use the tools' **exact terminology** and check technical accuracy: command names, retired features, and so on.

## 3. Visual design (follow it strictly)

**Format**: 16:9 widescreen (13.33 × 7.5 inches), generated with code (pptxgenjs). Margins of 0.7 inch.

**Dark "developer-style" background on every slide**:

| Role | Color |
| --- | --- |
| Content slide background | `#0D1117` |
| Title, transition and closing slide background | `#010409` |
| Cards | `#161B22` (highlighted cards: `#1C2230`) |
| Borders | `#30363D` |
| Main text | `#E6EDF3` |
| Secondary text | `#9AA4B2` |
| Accents | violet `#A371F7` · blue `#58A6FF` · green `#3FB950` · amber `#E3B341` · pink `#F778BA` · cyan `#39C5CF` |

**Typography**:

- Titles and body text: **Segoe UI**.
- "Code" elements (kickers, labels, numbers): **Consolas**.
- Sizes: slide title 30 pt bold; intro line 14–15 pt in gray; body text 11–14 pt; sources 8.5–10 pt, gray italic.

**The visual motif, repeated on every slide**:

- A **code-style kicker** above the title, in the section's accent color, formatted like `// 02 · understand ai`.
- The title, then a one-line gray intro sentence.
- **Rounded cards** (0.11-inch radius) with a thin border, colored when the item is highlighted.
- **Icons in rounded square chips**, with a `#1C2230` fill and a border in the accent color. Icons come from react-icons and are converted to PNG in their real color, never black.
- A **takeaway bar** at the bottom of the slide: a bold colored keyword ("Key point", "In practice", "Tip"), then a dash and one sentence.
- **"Code editor" cards** for code: `#010409` background, three dots (pink, amber, green) at the top, Consolas font.

**Varied layouts.** Never use the same layout twice in a row. Alternate between:

- grids of 2 to 6 cards;
- side-by-side comparison columns ("Avoid / Better", "Without / With");
- comparison tables with one column highlighted by a badge ("our topic");
- step timelines linked by chevrons;
- ring diagrams or nested-box diagrams;
- big numbers (30–34 pt) with their source;
- a ranking podium;
- gauges and progress bars drawn with shapes, never a native chart object or a picture of a chart.

**Avoid**:

- decorative lines under titles and full-width colored bands;
- centered text in paragraphs;
- text-only slides;
- emojis.

## 4. Images

- **Title slide**: the product's official logo if it exists among the brand icons (react-icons/si), otherwise a simple icon.
- **Section and appendix transition slides**: an AI-generated illustration, in a round medallion on the right of the slide.
- Keep **the same style for every image** by repeating this description word for word in each image request:*glowing holographic neon illustration made of fine light lines and luminous particles, [section color] light with soft bloom, futuristic tech aesthetic. Isolated subject centered on a transparent background, no text, no letters, no logos.*
- An image in this style can also illustrate a key slide, for example a glowing brain to talk about memory.
- Never use generated images for diagrams, charts or text: build those as editable PowerPoint shapes.

## 5. Deck structure

1. **Title**: code kicker, large title, colored subtitle, one-line hook. On the right, a panel with the logo and 3 "what it does" items.
2. **Agenda by parts**: 4 to 5 colored cards (Part 1 to 4, then "Wrapping up"), each listing its topics, with an "Appendix" strip at the bottom.
3. **Words to know**: a glossary of 8 terms, each defined in one simple sentence.
4. **A transition slide before each part**: a large subtle number, "// part N of 4", the title, the list of topics, a 4-segment progress bar and an illustration in a round medallion.
5. **The content**, organized in parts: discover, understand, use, use well.
6. **Interactive slides**: a "Your turn" workshop (a vague request, the questions to ask, a precise version), and a "True or false?" quiz over 2 slides (the questions, then the answers with a TRUE or FALSE badge and an explanation).
7. **Wrapping up**: "What's next?" (trends), frequently asked questions, key takeaways, then a "Thank you / Questions?" slide.
8. **"Going further" appendix**: the detailed reference slides and the resources (clickable links).

Aim for about **30 to 35 presentation slides**, plus the appendix.

## 6. Accuracy and sources

- **Search the web** for up-to-date information (products, prices, figures, rankings) before writing. Never include a number without a source.
- Cite the **source at the bottom of the slide** (name, date), in small gray italics, for every figure, study, price or ranking.
- For anything that changes fast (models, prices, rankings), add a note such as "List as of [date]".
- If I provide an article, rephrase it in your own words without copying the text, and credit its author.

## 7. Quality check before delivery

- Render each deck to images and **check every slide**: no text overflowing or overlapping, margins of at least 0.5 inch, good contrast, no word broken at the end of a line.
- Check that each deck is entirely in its own language (« » quotes and decimal commas in French, " " quotes and decimal points in English).
- Fix any issues, then check the corrected slides a second time.
- Deliver both .pptx files and summarize the deck's content in a few lines.
