# Slideshow inbox

Drop a deck here and push to `main`: the **Publish Slideshow Decks** workflow
(`.github/workflows/slideshow-publish.yaml`) publishes it to https://benoit-gaumard.io/slideshow/
and removes it from this folder.

| File | Role |
| --- | --- |
| `my-deck.pptx` | The PowerPoint deck. Slides are rendered with LibreOffice; titles, chapters and slide text are read from it (speaker notes are never published). |
| `my-deck.pdf` | Optional. A PDF exported from PowerPoint (*File > Export > PDF*). When present, slides are rendered from it: exact PowerPoint fonts and layout. A PDF alone also works. |
| `my-deck.json` | Optional metadata. |

```json
{
  "id": "my-deck",
  "title": "My deck",
  "description": "One or two sentences shown on the deck card.",
  "language": "en",
  "date": "2026-10-27",
  "tags": ["Azure", "AI"]
}
```

Defaults: `id` from the file name, `title`/`description`/`tags` from the PowerPoint document
properties (Title, Subject, Keywords), `language` `en`, `date` today. Publishing a deck with an
existing `id` replaces it.

The deck must not be encrypted: remove any password and apply a sensitivity label without
encryption (e.g. *Public*) before dropping it (a PDF exported from a protected deck stays
protected). Otherwise the workflow fails with an explicit message. Hidden slides are skipped.
