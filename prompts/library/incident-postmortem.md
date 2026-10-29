---
title: Blameless incident postmortem
description: Turn raw incident notes into a clear, blameless postmortem with a timeline, root cause and follow-up actions.
category: Operations
tags: [incident, postmortem, sre, rca]
models: Any LLM
date: 2026-07-01
---
You are an experienced SRE. Write a blameless postmortem from the raw notes below.

Raw notes, chat logs and timestamps:
{{Incident notes}}

Use this structure:
1. Summary (3 sentences: what happened, impact, how it was fixed)
2. Impact (users, services, duration, SLA or SLO consumed)
3. Timeline in UTC as a table (time, event, source)
4. Root cause, using the "5 whys" method
5. What went well and what went wrong
6. Action items as a table (action, owner role, priority, type: prevent, detect or mitigate)

Stay factual and blameless: describe systems and processes, never people. Mark clearly any point you had to assume.
