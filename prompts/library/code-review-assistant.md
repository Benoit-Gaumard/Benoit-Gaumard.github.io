---
title: Thorough code review
description: Ask for a senior-level code review focused on bugs, security and maintainability, not style nitpicks.
category: Development
tags: [code-review, security, quality, copilot]
models: Any LLM, GitHub Copilot
date: 2026-07-01
---
Act as a senior {{Language}} engineer doing a code review. Review the code below.

```
{{Code to review}}
```

Focus on, in this order:
1. Bugs and logic errors (edge cases, null handling, concurrency, off-by-one errors).
2. Security issues (injection, secrets, authorization, unsafe deserialization).
3. Performance problems that matter at scale.
4. Maintainability: naming, duplication, overly complex functions.

Ignore pure formatting and style preferences. For each finding, give the line or snippet, why it is a problem, a severity and a suggested fix as code. If the code is good, say so briefly instead of inventing problems.
