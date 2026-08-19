+++
author = "Benoit G"
title = "Display GitHub Secrets for Debug"
date = "2024-12-02"
description = "A quick method to print a GitHub Actions secret for debugging purposes, spaced out so it can't be read directly from the log."
tags = ["GitHub"]
categories = ["GitHub"]
featureImage = "/articles/images/github-actions.svg"
+++

Using this command line:

```yaml
run: echo ${{ secrets.MYSECRET }} | sed 's/./& /g'
```

Here is an example workflow:

```yaml
name: Print GitHub Secrets

on:
  push:

jobs:
  print_secrets:
    runs-on: ubuntu-latest
    steps:
      - name: Debug secret in variable
        run: echo ${{ secrets.MYSECRET }} | sed 's/./& /g'
```

:::warning
This method is intended solely for debugging purposes. Avoid using it in production environments and never expose secrets in your pipelines!
:::
