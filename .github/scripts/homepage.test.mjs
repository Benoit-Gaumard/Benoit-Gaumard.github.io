import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { Script } from 'node:vm';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

const pages = ['index.html', 'index_fr.html'].map(file => ({
  file,
  html: readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n'),
}));
function block(html, start, end) {
  const from = html.indexOf(start);
  const to = html.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `Missing block ${start}`);
  return html.slice(from, to);
}

test('both homepages keep the same layout and interactions', () => {
  for (const [start, end] of [
    ['  <style>\n    :root {', '  </style>'],
    ["  <script>\n    document.getElementById('currentYear')", '<script data-share-script>'],
    ['      <div class="certs">', '      <a class="transcript"'],
  ]) {
    assert.equal(block(pages[0].html, start, end), block(pages[1].html, start, end));
  }
});

for (const { file, html } of pages) {
  test(`${file}: language navigation is available only in the header`, () => {
    const locale = file === 'index_fr.html' ? 'fr' : 'en';
    const header = block(html, '<header class="site-header">', '</header>');
    const footer = block(html, '<footer class="site-footer">', '</footer>');
    assert.doesNotMatch(footer, /class="lang-switch"|<strong>(?:Language|Langue)<\/strong>/);
    const switches = [...header.matchAll(/<nav class="lang-switch" aria-label="([^"]+)">([\s\S]*?)<\/nav>/g)];
    assert.equal(switches.length, 1);
    const [, label, links] = switches[0];
    assert.equal(label, locale === 'fr' ? 'Langue' : 'Language');
    assert.doesNotMatch(links, /<svg|>FR<|>EN<|>\/</);
    const anchors = [...links.matchAll(/<a ([^>]+)>([\s\S]*?)<\/a>/g)];
    assert.equal(anchors.length, 2);
    assert.equal(anchors.filter(([, attributes]) => attributes.includes('aria-current="page"')).length, 1);
    for (const [, attributes, content] of anchors) {
      const flag = content.match(/^<img class="lang-flag" src="\/flags\/(fr|en)\.png" alt="" width="24" height="18">$/);
      assert.ok(flag);
      const language = flag[1];
      const name = language === 'fr' ? 'Français' : 'English';
      assert.ok(attributes.includes(`hreflang="${language}"`));
      assert.ok(attributes.includes(` lang="${language}"`));
      assert.ok(attributes.includes(`aria-label="${name}"`));
      assert.ok(attributes.includes(`title="${name}"`));
      assert.ok(attributes.includes(`href="${language === 'fr' ? '/index_fr.html' : '/'}"`));
      assert.equal(attributes.includes('aria-current="page"'), language === locale);
    }
    const styles = block(html, '    .lang-switch {', '    .link-language {');
    assert.match(styles, /border: 0; background: transparent;/);
    assert.doesNotMatch(styles, /border-color:|border-radius:/);
    assert.match(styles, /\.lang-switch a\[aria-current="page"\]::after/);
    assert.match(styles, /width: 24px; height: 18px; object-fit: contain/);
    assert.match(html, /a:focus-visible/);
  });

  test(`${file}: inline scripts and structured data parse`, () => {
    for (const [, attributes, content] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (attributes.includes('application/ld+json')) JSON.parse(content);
      else new Script(content, { filename: file });
    }
  });

  test(`${file}: the hero has no contact buttons and the contact section retains both destinations`, () => {
    const hero = block(html, '<div class="glass term hero"', '<nav class="section-nav"');
    assert.doesNotMatch(hero, /mailto:|linkedin\.com|class="btn\b/);
    assert.doesNotMatch(html, /hero-actions/);
    const contact = block(html, '<!-- CONTACT -->', '</main>');
    assert.match(contact, /href="mailto:contact@benoit-gaumard\.io"/);
    assert.match(contact, /href="https:\/\/www\.linkedin\.com\/in\/benoit-gaumard\/"/);
    const introduction = file === 'index_fr.html'
      ? "Bonjour, je suis consultant et architecte cloud, spécialisé dans Microsoft Azure et les services associés. Au sein de Microsoft, je suis passionné par l’architecture cloud, l’automatisation, l’infrastructure as code (IaC), le DevOps et les solutions cloud-native."
      : "Hi, I'm a Cloud Consultant and Architect focused on Microsoft Azure and related services. As part of Microsoft, I’m passionate about cloud architecture, automation, infrastructure as code (IaC), DevOps and cloud-native solutions.";
    assert.ok(hero.includes(`<p>${introduction}</p>`));
    const status = file === 'index_fr.html' ? 'Statut : ouvert aux discussions' : 'Status: Open to discuss';
    assert.ok(hero.includes(`<p class="hero-status">${status}</p>`));
    assert.match(html, /\.loc-badge, \.hero-status \{[\s\S]*?border-radius: 999px;[\s\S]*?background: var\(--cp-success-bg\);[\s\S]*?border: 1px solid var\(--cp-success\);/);
    assert.ok(hero.indexOf(introduction) < hero.indexOf('hero-photo'));
    assert.doesNotMatch(hero, /class="[^"]*\breveal\b|class="cursor"/);
  });

  test(`${file}: all career responsibilities and 22 references are displayed without accordions`, () => {
    const experience = block(html, '<section id="experience"', '<!-- CERTIFICATIONS -->');
    assert.equal([...experience.matchAll(/class="client"/g)].length, 22);
    assert.equal([...experience.matchAll(/exp-card--current/g)].length, 1);
    assert.equal([...experience.matchAll(/exp-card--previous/g)].length, 4);
    assert.doesNotMatch(experience, /<\/?(?:details|summary)\b|\bhidden(?:\s|>|=)/);
    assert.doesNotMatch(html, /exp-details|printDetails|when-closed|when-open/);
    const roles = [...experience.matchAll(/<article class="glass exp-card [^"]+">([\s\S]*?)<\/article>/g)].map(match => match[1]);
    assert.deepEqual(roles.map(role => [...role.matchAll(/<li>/g)].length), [5, 4, 3, 3, 5]);
    const currentResponsibilities = file === 'index_fr.html' ? [
      "Membre de l'équipe de services de conseil ISD.",
      "Réalisation de missions cloud et infrastructure innovantes et variées pour de grandes entreprises du CAC40.",
      "Conception et déploiement d'infrastructures Azure (Bicep, Terraform, IaC).",
      "Mise en place de pipelines CI/CD (GitHub Actions, Azure DevOps).",
      "Gouvernance, sécurité et optimisation des coûts cloud.",
    ] : [
      "Part of the ISD consulting services team.",
      "Delivery of innovative and varied cloud & infrastructure missions for large CAC40 companies.",
      "Design and deployment of Azure infrastructures (Bicep, Terraform, IaC).",
      "CI/CD pipelines setup (GitHub Actions, Azure DevOps).",
      "Governance, security and cloud cost optimization.",
    ];
    assert.deepEqual([...roles[0].matchAll(/<li>([^<]+)<\/li>/g)].map(match => match[1].replace(/&amp;/g, '&')), currentResponsibilities);
    assert.doesNotMatch(html, /exp-summary/);
    const cibResponsibilities = file === 'index_fr.html' ? [
      "Développement d'applications web (React, TypeScript, Node.js).",
      "Automatisation de processus et outils internes.",
      "Collaboration avec les équipes métiers et support technique.",
      "Support N3.",
    ] : [
      "Web application development (React, TypeScript, Node.js).",
      "Process automation and internal tooling.",
      "Collaboration with business teams and technical support.",
      "N3 support",
    ];
    assert.deepEqual([...roles[1].matchAll(/<li>([^<]+)<\/li>/g)].map(match => match[1]), cibResponsibilities);
    const axaResponsibilities = file === 'index_fr.html' ? [
      "Plateformes de cloud privé & virtualisation (VMware, Hyper-V).",
      "Automatisation et exploitation des infrastructures.",
      "Support N3.",
    ] : [
      "Private cloud & virtualization platforms (VMware, Hyper-V).",
      "Automation and infrastructure operations.",
      "N3 support",
    ];
    assert.deepEqual([...roles[2].matchAll(/<li>([^<]+)<\/li>/g)].map(match => match[1].replace(/&amp;/g, '&')), axaResponsibilities);
    const bnpResponsibilities = file === 'index_fr.html' ? [
      "Administration Windows Server et des infrastructures de datacenter.",
      "Support production et fiabilité des systèmes.",
      "Support N3.",
    ] : [
      "Windows Server & datacenter infrastructure administration.",
      "Production support and system reliability.",
      "N3 support",
    ];
    assert.deepEqual([...roles[3].matchAll(/<li>([^<]+)<\/li>/g)].map(match => match[1].replace(/&amp;/g, '&')), bnpResponsibilities);
    const bouyguesResponsibilities = file === 'index_fr.html' ? [
      "Support et déploiement informatique sur les chantiers de construction.",
      "Installation et maintenance des postes de travail.",
      "AD & DNS.",
      "Configuration des commutateurs, pare-feux et du routage.",
      "Support N1/N2.",
    ] : [
      "On-site IT support and deployment for construction projects.",
      "Workstation setup and maintenance.",
      "AD & DNS",
      "Switches, firewalls and routing configuration",
      "N1/N2 support",
    ];
    assert.deepEqual([...roles[4].matchAll(/<li>([^<]+)<\/li>/g)].map(match => match[1].replace(/&amp;/g, '&')), bouyguesResponsibilities);
    assert.match(html, /\.exp-card li::before \{ content: "\+ "; color: var\(--cp-success\); \}/);
    const references = block(experience, '<div class="clients">', '</article>');
    const referencesLabel = file === 'index_fr.html'
      ? 'Références de clients accompagnés (liste non exhaustive) :'
      : 'Supported clients references (non-exhaustive):';
    assert.ok(experience.includes(`<div class="clients-label">${referencesLabel}</div>`));
    assert.equal([...experience.matchAll(/class="clients"/g)].length, 1);
    assert.equal([...references.matchAll(/class="client"/g)].length, 22);
    const label = file === 'index_fr.html' ? "Et bien d'autres…" : 'And more…';
    assert.equal([...experience.matchAll(/class="client client--more"/g)].length, 1);
    assert.match(references, /HB Antwerp<\/span>\s*<span class="client client--more" title="[^"]+">[^<]+<\/span>\s*<\/div>\s*$/);
    assert.ok(references.includes(`>${label}</span>`));
  });

  test(`${file}: owner-requested key figures stay static and retain certification evidence`, () => {
    const stats = block(html, '<!-- STATS -->', '<!-- EXPERIENCE -->');
    assert.deepEqual([...stats.matchAll(/<div class="n">([^<]+)<\/div>/g)].map(match => match[1]), ['8x', '20+', '80+']);
    assert.match(stats, file === 'index_fr.html' ? /Ans d'expérience/ : /Years of experience/);
    assert.match(stats, file === 'index_fr.html' ? />Projets</ : />Projects</);
    assert.doesNotMatch(stats, /2005|career started|Début de mon parcours/);
    assert.doesNotMatch(stats, /<a\b|transcript|Consulter mon relevé/);
    assert.doesNotMatch(html, /data-n=|animateNums/);
    const certs = block(html, '<div class="certs">', '<!-- SKILLS -->');
    assert.equal([...certs.matchAll(/<a class="cert glass" href="https:\/\/learn\.microsoft\.com\/en-us\/credentials\/certifications\//g)].length, 8);
    assert.match(certs, /learn\.microsoft\.com\/en-us\/users\/benoitgaumard-0811\/transcript\//);
  });

  test(`${file}: all nine expertise sections retain their original icons and technologies`, () => {
    const skills = block(html, '<!-- SKILLS -->', '<!-- TOOLS -->');
    assert.equal([...skills.matchAll(/class="skill glass"/g)].length, 9);
    const headings = [...skills.matchAll(/<h3><span class="ic" aria-hidden="true">[\s\S]*?<\/span>([^<]+)<\/h3>/g)].map(match => match[1].replace(/&amp;/g, '&'));
    assert.deepEqual(headings, file === 'index_fr.html'
      ? ['Cloud Azure', 'FinOps', 'Identité & Sécurité', 'Infrastructure', 'Automatisation & Scripting', 'Sécurité & Conformité', 'DevOps', 'Cloud Souverain', 'Développement']
      : ['Azure Cloud', 'FinOps', 'Identity & Security', 'Infrastructure', 'Automation & Scripting', 'Security & Compliance', 'DevOps', 'Sovereign Cloud', 'Development']);
    const logos = [...skills.matchAll(/<img src="([^"]+)" alt="" loading="lazy" width="18" height="18"/g)].map(match => match[1]);
    assert.equal(logos.length, 6);
    for (const source of logos) {
      assert.ok(source.startsWith('/icons/export/'));
      assert.match(readFileSync(new URL(`../..${source}`, import.meta.url), 'utf8'), /<svg\b/);
    }
    for (const icon of ['🔐', '🖥️', '🤖']) assert.ok(skills.includes(icon));
    for (const technology of ['Terraform', 'Bicep', 'PowerShell', 'Python', 'PIM', 'Intune', 'Veeam', 'BLEU', 'PHP', 'Node.js', 'SQL Server', 'EA/MCA']) {
      assert.ok(skills.includes(technology), technology);
    }
    const tools = block(html, '<!-- TOOLS -->', '<!-- CONTACT -->');
    assert.deepEqual([...tools.matchAll(/<a class="tool glass" href="([^"]+)"/g)].map(m => m[1]), [
      'https://benoit-gaumard.io/articles/', '/tools/', '/icons/', '/favorite-links/',
      'https://quickquotemaker.com', 'https://www.travelstorymaker.com/',
    ]);
  });

  test(`${file}: all resource cards open a new tab without changing in-page navigation`, () => {
    const tools = block(html, '<!-- TOOLS -->', '<!-- CONTACT -->');
    const links = [...tools.matchAll(/<a\b[^>]*>/g)].map(match => match[0]);
    assert.equal(links.length, 6);
    for (const link of links) {
      assert.match(link, /target="_blank"/);
      assert.match(link, /rel="noopener"/);
    }
    assert.doesNotMatch(block(html, '<nav class="section-nav"', '</nav>'), /target="_blank"/);
    assert.doesNotMatch(block(html, '<nav class="header-links"', '</nav>'), /target="_blank"/);
  });

  test(`${file}: section links have unique targets`, () => {
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    assert.equal(new Set(ids).size, ids.length);
    const nav = block(html, '<nav class="section-nav"', '</nav>');
    for (const [, id] of nav.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(id), id);
  });
}

test('French home links preserve the current language', () => {
  const html = pages[1].html.replace(/<nav class="lang-switch"[^>]*>[\s\S]*?<\/nav>/g, '');
  assert.doesNotMatch(html, /<a\b[^>]*href="\/(?:index\.html)?"/);
  assert.match(block(html, '<nav class="header-links"', '</nav>'), /href="\/index_fr\.html" aria-current="page"/);
});

test('TravelStoryMaker uses the refreshed local favicon with a matching cache version', () => {
  const icon = readFileSync(new URL('../../favicons/travelstorymaker.com.png', import.meta.url));
  const version = createHash('sha256').update(icon).digest('hex').slice(0, 12);
  assert.equal(icon.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(icon.readUInt32BE(16), 64);
  assert.equal(icon.readUInt32BE(20), 64);
  assert.ok(icon.length < 16384);
  for (const { html } of pages) {
    assert.ok(html.includes(`<img src="/favicons/travelstorymaker.com.png?v=${version}" alt="" loading="lazy" width="26" height="26"`));
  }
});

test('French navigation identifies English-only site destinations', () => {
  const destinations = new Set([
    '/articles/', '/tools/', '/icons/', '/favorite-links/', '/emoji-sheet/',
    '/azure-release-updates/', '/m365-release-updates/', '/privacy/',
  ]);
  for (const [, attributes, href, content] of pages[1].html.matchAll(/<a\b([^>]*href="([^"]+)"[^>]*)>([\s\S]*?)<\/a>/g)) {
    const pathname = new URL(href, 'https://benoit-gaumard.io').pathname;
    if (!destinations.has(pathname)) continue;
    assert.match(attributes, /hreflang="en"/, href);
    assert.match(content, /en anglais/, href);
  }
  assert.match(pages[1].html, /Les intitulés officiels et les pages de référence Microsoft Learn sont en anglais\./);
});

test('French role vocabulary is consistent without translating product names', () => {
  const html = pages[1].html;
  assert.match(html, /<p class="role">Consultant Azure Infra &amp; DevOps<\/p>/);
  assert.match(html, /<h3>Consultant Azure Infra &amp; DevOps<\/h3>/);
  assert.match(block(html, '<div class="footer-about">', '</div>'), /Consultant Azure Infra &amp; DevOps/);
  for (const product of ['Azure API Management', 'Azure Automation Runbooks', 'Logic Apps', 'GitHub Actions', 'Windows Server']) {
    assert.ok(html.includes(product), product);
  }
});
