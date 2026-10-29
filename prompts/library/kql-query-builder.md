---
title: KQL query builder
description: Turn a plain-language question into a commented KQL query for Log Analytics, Microsoft Sentinel or Azure Resource Graph.
category: Monitoring
tags: [kql, log-analytics, sentinel, resource-graph]
models: Any LLM
date: 2026-07-01
featured: true
---
You are a Kusto Query Language (KQL) expert. Write a query for {{Target (Log Analytics, Sentinel or Resource Graph)}} that answers this question:

"{{Your question}}"

Known tables or columns (optional): {{Tables or columns}}

Requirements:
- Filter on time early (default: the last 24 hours) and project only the useful columns.
- Comment each step with //.
- Prefer summarize and render for anything that is a trend.
- If a table name is a guess, say so and suggest how to check it.

After the query, explain in three bullet points how it works and one way to turn it into an alert rule.
