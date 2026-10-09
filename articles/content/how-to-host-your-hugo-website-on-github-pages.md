+++
author = "Benoit G"
title = "Host a Hugo Site on GitHub Pages with Actions"
date = "2024-11-03"
description = "Prepare a Hugo source repository, select GitHub Actions as the Pages source, build a pinned Hugo version and verify the deployed site."
tags = ["Hugo", "GitHub"]
categories = ["Hugo"]
featureImage = "/articles/images/hugo.svg"
related = ["from-wordpress-to-hugo", "github-contribution-workflow"]
+++

This is an **Actions-based deployment of Hugo source**, not a destructive copy of a local folder over a repository. Reading time does not include setup, review, build or deployment. The current site's custom article generator is a different build system.

## 1. Check prerequisites

- Have Git, a GitHub repository you control, and a local Hugo site that builds successfully.
- Run `hugo version` and record the version/extended variant your theme requires.
- Know the repository's base branch and whether this is a user site (`OWNER.github.io`) or a project site (`OWNER.github.io/REPOSITORY/`).
- Set Hugo's `baseURL` for the actual published URL and confirm theme submodules/assets are present.
- Decide how you pin and update Actions/tool versions under your repository policy.

Tested Hugo/action versions and deployment validation: **not recorded**. Start from the current [official Hugo GitHub Pages guide](https://gohugo.io/host-and-deploy/host-on-github-pages/) and [GitHub custom workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). Do not assume the version installed on another computer is suitable for your theme.

## 2. Configure the Pages source

In **Repository → Settings → Pages → Build and deployment → Source**, select **GitHub Actions**. The expected setting is Actions, not "Deploy from a branch". Confirm that the repository's policy permits Pages and that you have permission to configure it.

Commit the Hugo source (`content`, layouts/theme references, assets and configuration), not an unrelated generated site. Check `git status` and the diff before committing; never delete the destination repository's files to make room for a copy.

## 3. Adapt the official deployment workflow

Create `.github/workflows/hugo.yaml` from the official Hugo workflow linked above. Review each of these fields rather than pasting a guessed version:

| Field | Adaptation | Expected checkpoint |
|---|---|---|
| Trigger branch | Your actual publishing branch | A reviewed push or manual run starts the workflow |
| Hugo version/extended variant | The version confirmed by your local build and theme requirements | Workflow logs print that intended version |
| Checkout/theme dependencies | Submodules and any documented theme build tools | Theme and assets are present before the build |
| Build command/base URL | Production build and correct user/project/custom-domain path | Output contains `public/index.html` and correctly rooted assets |
| Pages permissions | The official workflow's required contents/pages/id-token permissions | Artifact upload and protected Pages deployment succeed |
| Artifact path | Hugo's generated `public` directory | Source files and secrets are not published |
| Deployment environment | `github-pages` and its protection rules | Deployment URL is reported by the Pages job |

The maintained official workflow is the source of the executable pipeline. This article intentionally does not label an untested pipeline or arbitrary Hugo release as "verified".

## 4. First deployment and later updates

For the first deployment, push the reviewed source/workflow to your repository and inspect **Actions** for the build, artifact and deployment jobs. For later updates, edit source, run the local build, review the diff, and use the same pipeline. No recursive deletion/copy script is needed.

## 5. Verify publication

Open the URL reported by the Pages deployment, not a guessed hostname. Check the home page, one nested article, styles/images, internal links and a reload on a nested URL. For a project site, check the repository prefix; for a custom domain, check its DNS and HTTPS status separately.

| Failure | Check |
|---|---|
| Build cannot find theme or resource | Checkout/submodule settings, Hugo variant and required theme tooling |
| Deployment denied | Pages source, workflow permissions, repository policy and environment protection |
| Site loads without CSS or nested pages fail | `baseURL`, project-site prefix and artifact path |
| Old content remains | Actual branch/run, deployed commit and browser cache; confirm the deployment completed |

Keep the previous working commit/deployment information for rollback. Successful workflow execution still requires a real browser check of the published site; none is claimed here.
