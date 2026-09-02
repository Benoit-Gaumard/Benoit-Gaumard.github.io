<?xml version="1.0" encoding="UTF-8"?>
<!--
  Human-readable rendering for sitemap.xml and blog/sitemap.xml.

  Search engines ignore this stylesheet entirely; it only exists so the file is
  legible when a person opens it. Chrome has deprecated XSLT, so the sitemaps
  are also kept free of elements in the XHTML namespace: that keeps the browser's
  native XML tree viewer available as the fallback once XSLT is removed.

  No script here on purpose - scripts injected by an XSLT transform never run.
-->
<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9"
                exclude-result-prefixes="s">
  <xsl:output method="html" encoding="UTF-8" indent="yes"
              doctype-system="about:legacy-compat"/>

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <meta name="robots" content="noindex, follow"/>
        <title>Sitemap | Benoit Gaumard</title>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml"/>
        <style>
          :root {
            color-scheme: light;
            --cp-bg: #f5faff;
            --cp-surface: #ffffff;
            --cp-surface-soft: #eef7ff;
            --cp-border: #d8e8f5;
            --cp-border-strong: #89afd0;
            --cp-text: #17324d;
            --cp-text-muted: #536f88;
            --cp-accent: #0b6fb8;
            --cp-accent-soft: rgba(11, 111, 184, 0.09);
            --cp-link: #0969b5;
            --cp-shadow: 0 18px 48px rgba(36, 92, 136, 0.14);
            --radius: 8px;
          }
          @media (prefers-color-scheme: dark) {
            :root {
              color-scheme: dark;
              --cp-bg: #0c1420;
              --cp-surface: #16233a;
              --cp-surface-soft: #1c2c42;
              --cp-border: #253b52;
              --cp-border-strong: #3f6280;
              --cp-text: #e8f1fa;
              --cp-text-muted: #9db3c7;
              --cp-accent: #4fa8ea;
              --cp-accent-soft: rgba(79, 168, 234, 0.16);
              --cp-link: #6fbdf3;
              --cp-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
            }
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            min-width: 18rem;
            font-family: "Segoe UI", Aptos, Calibri, -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 15px;
            line-height: 1.7;
            color: var(--cp-text);
            background: var(--cp-bg);
            -webkit-font-smoothing: antialiased;
          }
          .wrap { max-width: 68rem; margin: 0 auto; padding: 2.5rem 1.25rem 4rem; }
          .eyebrow {
            font-size: 0.75rem;
            font-weight: 600;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--cp-accent);
          }
          h1 {
            font-size: clamp(1.6rem, 4vw, 2.4rem);
            font-weight: 800;
            line-height: 1.2;
            letter-spacing: -0.02em;
            margin: 0.15rem 0 0.5rem;
          }
          .lede { color: var(--cp-text-muted); max-width: 46rem; }
          .lede a { color: var(--cp-link); }
          .stats { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 1.25rem 0 1.5rem; }
          .pill {
            display: inline-flex;
            align-items: baseline;
            gap: 0.4rem;
            padding: 0.3rem 0.7rem;
            border: 1px solid var(--cp-border);
            border-radius: 999px;
            background: var(--cp-surface);
            font-size: 0.85rem;
            color: var(--cp-text-muted);
          }
          .pill b { color: var(--cp-text); font-weight: 650; }
          .panel {
            background: var(--cp-surface);
            border: 1px solid var(--cp-border);
            border-radius: var(--radius);
            box-shadow: var(--cp-shadow);
            overflow: hidden;
          }
          table { width: 100%; border-collapse: collapse; }
          th, td {
            padding: 0.6rem 0.9rem;
            text-align: left;
            border-bottom: 1px solid var(--cp-border);
            vertical-align: middle;
          }
          thead th {
            position: sticky;
            top: 0;
            z-index: 1;
            background: var(--cp-surface-soft);
            font-size: 0.75rem;
            font-weight: 650;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: var(--cp-text-muted);
            border-bottom: 1px solid var(--cp-border-strong);
          }
          tbody tr:last-child td { border-bottom: 0; }
          tbody tr:nth-child(even) { background: var(--cp-accent-soft); }
          td.num {
            width: 3.5rem;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            font-size: 0.8rem;
            color: var(--cp-text-muted);
            text-align: right;
          }
          td.loc a { color: var(--cp-link); text-decoration: none; word-break: break-all; }
          td.loc a:hover { text-decoration: underline; }
          td.meta {
            width: 9rem;
            white-space: nowrap;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            font-size: 0.8rem;
            color: var(--cp-text-muted);
          }
          td.prio { width: 8rem; }
          .bar {
            position: relative;
            height: 0.4rem;
            border-radius: 999px;
            background: var(--cp-border);
            overflow: hidden;
          }
          .bar span { display: block; height: 100%; background: var(--cp-accent); }
          .bar-label {
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            font-size: 0.7rem;
            color: var(--cp-text-muted);
          }
          footer { margin-top: 1.5rem; font-size: 0.85rem; color: var(--cp-text-muted); }
          footer a { color: var(--cp-link); }
          @media (max-width: 40rem) {
            td.prio, th.prio { display: none; }
            td.meta, th.meta { width: auto; }
          }
        </style>
      </head>
      <body>
        <div class="wrap">
          <p class="eyebrow">XML Sitemap</p>
          <h1>Sitemap</h1>
          <p class="lede">
            This file lists every indexable page for search engines. It is normally read by
            crawlers, not humans - this stylesheet only makes it readable.
            Back to <a href="https://benoit-gaumard.io/">benoit-gaumard.io</a>.
          </p>
          <xsl:apply-templates select="s:urlset|s:sitemapindex"/>
          <footer>
            Generated by <code>build-sitemap.mjs</code> - see also
            <a href="/robots.txt">robots.txt</a> and <a href="/llms.txt">llms.txt</a>.
          </footer>
        </div>
      </body>
    </html>
  </xsl:template>

  <xsl:template match="s:urlset">
    <!-- ISO-8601 dates sort chronologically as plain strings, so the newest
         lastmod is just the first of a descending string sort. -->
    <xsl:variable name="latest">
      <xsl:for-each select="s:url/s:lastmod">
        <xsl:sort select="substring(., 1, 10)" order="descending"/>
        <xsl:if test="position() = 1"><xsl:value-of select="substring(., 1, 10)"/></xsl:if>
      </xsl:for-each>
    </xsl:variable>
    <div class="stats">
      <span class="pill"><b><xsl:value-of select="count(s:url)"/></b> URLs</span>
      <xsl:if test="string($latest)">
        <span class="pill">Last modified <b><xsl:value-of select="$latest"/></b></span>
      </xsl:if>
    </div>
    <div class="panel">
      <table>
        <thead>
          <tr>
            <th class="num">#</th>
            <th>URL</th>
            <xsl:if test="s:url/s:changefreq"><th class="meta">Change</th></xsl:if>
            <th class="meta">Last modified</th>
            <th class="prio">Priority</th>
          </tr>
        </thead>
        <tbody>
          <xsl:for-each select="s:url">
            <tr>
              <td class="num"><xsl:value-of select="position()"/></td>
              <td class="loc">
                <a href="{s:loc}"><xsl:value-of select="s:loc"/></a>
              </td>
              <xsl:if test="../s:url/s:changefreq">
                <td class="meta"><xsl:value-of select="s:changefreq"/></td>
              </xsl:if>
              <td class="meta"><xsl:value-of select="substring(s:lastmod, 1, 10)"/></td>
              <td class="prio">
                <xsl:choose>
                  <xsl:when test="s:priority">
                    <div class="bar"><span style="width:{s:priority * 100}%"></span></div>
                    <div class="bar-label"><xsl:value-of select="s:priority"/></div>
                  </xsl:when>
                  <xsl:otherwise><span class="bar-label">-</span></xsl:otherwise>
                </xsl:choose>
              </td>
            </tr>
          </xsl:for-each>
        </tbody>
      </table>
    </div>
  </xsl:template>

  <!-- A sitemap index is not used today, but robots.txt advertises two sitemaps
       and either could become an index later. -->
  <xsl:template match="s:sitemapindex">
    <div class="stats">
      <span class="pill"><b><xsl:value-of select="count(s:sitemap)"/></b> sitemaps</span>
    </div>
    <div class="panel">
      <table>
        <thead>
          <tr>
            <th class="num">#</th>
            <th>Sitemap</th>
            <th class="meta">Last modified</th>
          </tr>
        </thead>
        <tbody>
          <xsl:for-each select="s:sitemap">
            <tr>
              <td class="num"><xsl:value-of select="position()"/></td>
              <td class="loc"><a href="{s:loc}"><xsl:value-of select="s:loc"/></a></td>
              <td class="meta"><xsl:value-of select="substring(s:lastmod, 1, 10)"/></td>
            </tr>
          </xsl:for-each>
        </tbody>
      </table>
    </div>
  </xsl:template>
</xsl:stylesheet>
