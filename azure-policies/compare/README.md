# Policy and initiative comparison

The comparison page loads the current catalogues for its searchable selectors,
then `../versions-index.json` for the official versions available for each ID.
Each side loads `../versions/{policies|initiatives}/{id}/{version}.json` on
demand. Each file contains the full properties for one exact Azure version.

Versions come from Azure Resource Manager API `2026-07-01`, not from weekly
site snapshots. The exporter follows the built-in definition lists and their
pagination, reads the official `versions` list, and retrieves missing versions
through `/policyDefinitions/{id}/versions/{version}` or
`/policySetDefinitions/{id}/versions/{version}`. Full current properties are
reused when they match the requested version; already exported versions are
cached. A failure prevents publishing a replacement index.

The existing Azure refresh workflow runs `fetch-versions.mjs` from
`fetch-updates.ps1`, using its authenticated Azure context. Tokens remain in the
job environment and are removed after export. Local refreshes can use
`node azure-policies\fetch-versions.mjs` with an authenticated Azure CLI session.
The deployment workflow copies the index and version files to GitHub Pages.

Comparison URLs preserve `kind`, `left`, `right`, `leftVersion`, `rightVersion`
and `differences`. Older links without version parameters select the catalogue
version when available, otherwise the newest exported official version.
Unavailable versions display an explicit error and are never substituted.

Object key order is ignored in JSON comparisons; array order is significant.
Initiative member summaries match policy ID plus reference ID and compare
group names, pinned definition versions and parameter mappings. Full initiative
JSON also exposes initiative parameters and policy groups.
