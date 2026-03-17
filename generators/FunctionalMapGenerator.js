/**
 * Functional Map Generator
 *
 * Produces an end-to-end functional map that connects FlexiPages, Flows,
 * LWC components, Apex classes, Triggers, and Objects using known relationships.
 * Output is a Mermaid flowchart with clickable nodes that deep-link into
 * the relevant pages.
 */

import { BaseGenerator } from './BaseGenerator.js';

export class FunctionalMapGenerator extends BaseGenerator {
  constructor(repoRoot, data) {
    super(repoRoot, data);
    this.type = 'architecture'; // writes under pages/architecture/
  }

  async generate() {
    await this.generateFunctionalMapPage();
  }

  sanitize(name) {
    return (name || '').replace(/__c/g, '_c').replace(/[^a-zA-Z0-9_]/g, '_');
  }

  /**
   * Sanitize a name for use inside a Mermaid node label.
   * Escapes double-quotes (which would break the `["..."]` syntax).
   */
  mermaidLabel(name) {
    return String(name || '').replace(/"/g, '#quot;');
  }

  node(id, type, name, cls = 'node') {
    // Build label with safe parts; <br/> rendered by Mermaid with securityLevel:'loose'
    const safeType = this.mermaidLabel(type);
    const safeName = this.mermaidLabel(name);
    return `    ${id}["${safeType}<br/>${safeName}"]:::${cls}`;
  }

  click(id, url, tooltip = 'Open') {
    return `    click ${id} "${url}" "${tooltip}"`;
  }

  buildMapMermaid() {
    const rel = this.data.relationships || {};
    const maxPerType = { flexipage: 30, lwc: 50, apex: 80, flow: 40, object: 40, trigger: 40 };

    let lines = [];
    lines.push('flowchart LR');
    lines.push('    classDef fp fill:#eef6ff,stroke:#60a5fa,color:#0f172a');
    lines.push('    classDef lwc fill:#fef3c7,stroke:#f59e0b,color:#111827');
    lines.push('    classDef apex fill:#e5e7eb,stroke:#4b5563,color:#111827');
    lines.push('    classDef flow fill:#dcfce7,stroke:#22c55e,color:#052e16');
    lines.push('    classDef obj fill:#ffe4e6,stroke:#fb7185,color:#111827');
    lines.push('    classDef trig fill:#f3e8ff,stroke:#a78bfa,color:#111827');

    const added = new Set();
    const add = (s) => { if (!added.has(s)) { lines.push(s); added.add(s); } };

    // Collect nodes with caps
    const fpNames = Object.keys(this.data.flexiPages || {}).slice(0, maxPerType.flexipage);
    const lwcNames = Object.keys(this.data.lwcComponents || {}).slice(0, maxPerType.lwc);
    const flowNames = Object.keys(this.data.flows || {}).slice(0, maxPerType.flow);
    const apexNames = Object.keys(this.data.apexClasses || {}).slice(0, maxPerType.apex);
    const objNames = Object.keys(this.data.objects || {}).slice(0, maxPerType.object);

    // Nodes + clicks
    for (const fp of fpNames) {
      const id = `FP_${this.sanitize(fp)}`; add(this.node(id, 'FlexiPage', fp, 'fp'));
      add(this.click(id, `../ui/index.html#flexiPagesTable`, `FlexiPage ${fp}`));
      // FP -> LWC
      const lwcs = (rel.flexiPageToLWC && rel.flexiPageToLWC[fp]) ? rel.flexiPageToLWC[fp] : [];
      for (const l of lwcs) {
        if (!lwcNames.includes(l)) continue;
        const lid = `LWC_${this.sanitize(l)}`; add(this.node(lid, 'LWC', l, 'lwc'));
        add(this.click(lid, `../ui/lwc-${this.sanitize(l)}.html`, `LWC ${l}`));
        add(`    ${id} --> ${lid}`);
      }
    }

    // LWC -> Apex (from lwc.apexMethods)
    for (const l of lwcNames) {
      const lwc = this.data.lwcComponents[l];
      const methods = new Set(lwc?.apexMethods || []);
      const classNames = Array.from(methods).map(m => m.split('.')[0]).filter(Boolean);
      for (const a of classNames) {
        if (!apexNames.includes(a)) continue;
        const lid = `LWC_${this.sanitize(l)}`; add(this.node(lid, 'LWC', l, 'lwc'));
        add(this.click(lid, `../ui/lwc-${this.sanitize(l)}.html`, `LWC ${l}`));
        const aid = `APX_${this.sanitize(a)}`; add(this.node(aid, 'Apex', a, 'apex'));
        add(this.click(aid, `../apex/class-${this.sanitize(a)}.html`, `Apex ${a}`));
        add(`    ${lid} --> ${aid}`);
      }
    }

    // Flow -> Apex
    for (const f of flowNames) {
      const apx = (rel.flowToApex && rel.flowToApex[f]) || [];
      if (!apx.length) continue;
      const fid = `FLW_${this.sanitize(f)}`; add(this.node(fid, 'Flow', f, 'flow'));
      add(this.click(fid, `../flows/flow-${this.sanitizeNodeName(f)}.html`, `Flow ${f}`));
      for (const a of apx) {
        if (!apexNames.includes(a)) continue;
        const aid = `APX_${this.sanitize(a)}`; add(this.node(aid, 'Apex', a, 'apex'));
        add(this.click(aid, `../apex/class-${this.sanitize(a)}.html`, `Apex ${a}`));
        add(`    ${fid} --> ${aid}`);
      }
    }

    // Apex -> Objects
    for (const a of apexNames) {
      const objs = (rel.apexToObjects && rel.apexToObjects[a]) || [];
      for (const o of objs) {
        if (!objNames.includes(o)) continue;
        const aid = `APX_${this.sanitize(a)}`; add(this.node(aid, 'Apex', a, 'apex'));
        add(this.click(aid, `../apex/class-${this.sanitize(a)}.html`, `Apex ${a}`));
        const oid = `OBJ_${this.sanitize(o)}`; add(this.node(oid, 'Object', o, 'obj'));
        add(this.click(oid, `../objects/object-${this.sanitize(o)}.html`, `Object ${o}`));
        add(`    ${aid} --> ${oid}`);
      }
    }

    // Object -> Trigger, Trigger -> Apex (handlers)
    for (const o of objNames) {
      const trigs = (rel.objectToTriggers && rel.objectToTriggers[o]) || [];
      for (const t of trigs) {
        const oid = `OBJ_${this.sanitize(o)}`; add(this.node(oid, 'Object', o, 'obj'));
        add(this.click(oid, `../objects/object-${this.sanitize(o)}.html`, `Object ${o}`));
        const tid = `TRG_${this.sanitize(t)}`; add(this.node(tid, 'Trigger', t, 'trig'));
        add(this.click(tid, `../automation/index.html`, `Trigger ${t}`));
        add(`    ${oid} --> ${tid}`);
        const handlers = (this.data.triggers?.[t]?.handlers) || (rel.classToTrigger && Object.keys(rel.classToTrigger).filter(a => (rel.classToTrigger[a]||[]).includes(t))) || [];
        for (const a of handlers) {
          const aid = `APX_${this.sanitize(a)}`; add(this.node(aid, 'Apex', a, 'apex'));
          add(this.click(aid, `../apex/class-${this.sanitize(a)}.html`, `Apex ${a}`));
          add(`    ${tid} --> ${aid}`);
        }
      }
    }

    return lines.join('\n');
  }

  async generateFunctionalMapPage() {
    const mermaid = this.buildMapMermaid();
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Functional Map - Salesforce Technical Documentation</title>
  <link rel="stylesheet" href="../../css/styles.css">
</head>
<body>
  <div class="container">
    <header>
      <div class="header-left"><h1 class="logo"><a href="../../index.html">Salesforce Technical Documentation</a></h1></div>
      <nav class="breadcrumb"><a href="../../index.html">Home</a> / Architecture / Functional Map</nav>
    </header>
    <div class="content-wrapper">
      <nav class="sidebar">
        <div class="nav-section">
          <h3>Architecture Navigation</h3>
          <ul>
            <li><a href="index.html">Overview</a></li>
            <li><a href="repository-structure.html">Repository Structure</a></li>
            <li><a href="functional-map.html" class="active">Functional Map</a></li>
          </ul>
        </div>
      </nav>
      <main class="main-content">
        <h2>Functional Map</h2>
        <section>
          <h3>Overview</h3>
          <p>This map shows how FlexiPages, Flows, Lightning Web Components (LWC), Apex classes, Triggers and Objects connect. Nodes are clickable to open their documentation pages.</p>
          <div class="uml-container">
            <div class="mermaid">${mermaid}</div>
          </div>
          <p class="muted">Note: The diagram shows a capped subset per type for readability. Use global search to jump to any component and navigate via links in the map.</p>
        </section>
      </main>
    </div>
    <footer><p>Salesforce Technical Documentation</p></footer>
  </div>
  <script src="../../js/app.js"></script>
</body>
</html>`;

    await this.writePage('architecture', 'functional-map.html', html, {
      standardizeLayout: true,
      currentPage: 'architecture',
      currentSubPage: 'functional-map',
      depthToRoot: 2,
      sectionNavHtml: `
        <div class="nav-section">
          <h3>Architecture Navigation</h3>
          <ul>
            <li><a href="index.html">Overview</a></li>
            <li><a href="repository-structure.html">Repository Structure</a></li>
            <li><a href="functional-map.html" class="active">Functional Map</a></li>
          </ul>
        </div>
      `,
      activeTop: 'guides'
    });
  }
}
