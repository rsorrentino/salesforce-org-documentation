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
  constructor(repoRoot, data, toolDir) {
    super(repoRoot, data, toolDir);
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

  /**
   * Count connections for a node to determine its "importance".
   * More connections = higher priority in top-50 selection.
   */
  countConnections(rel, fpNames, lwcNames, flowNames, apexNames, objNames) {
    const counts = {};
    const inc = (id) => { counts[id] = (counts[id] || 0) + 1; };

    for (const fp of fpNames) {
      const lwcs = (rel.flexiPageToLWC && rel.flexiPageToLWC[fp]) || [];
      if (lwcs.length) { inc(`FP_${fp}`); lwcs.forEach(l => inc(`LWC_${l}`)); }
    }
    for (const l of lwcNames) {
      const lwc = this.data.lwcComponents[l];
      const classNames = Array.from(new Set(lwc?.apexMethods || [])).map(m => m.split('.')[0]).filter(Boolean);
      classNames.forEach(a => { inc(`LWC_${l}`); inc(`APX_${a}`); });
    }
    for (const f of flowNames) {
      const apx = (rel.flowToApex && rel.flowToApex[f]) || [];
      if (apx.length) { inc(`FLW_${f}`); apx.forEach(a => inc(`APX_${a}`)); }
    }
    for (const a of apexNames) {
      const objs = (rel.apexToObjects && rel.apexToObjects[a]) || [];
      objs.forEach(o => { inc(`APX_${a}`); inc(`OBJ_${o}`); });
    }
    for (const o of objNames) {
      const trigs = (rel.objectToTriggers && rel.objectToTriggers[o]) || [];
      trigs.forEach(t => { inc(`OBJ_${o}`); inc(`TRG_${t}`); });
    }
    return counts;
  }

  buildMapMermaid() {
    const rel = this.data.relationships || {};
    const MAX_TOTAL = 50;

    // Collect all candidate nodes
    const allFp = Object.keys(this.data.flexiPages || {});
    const allLwc = Object.keys(this.data.lwcComponents || {});
    const allFlow = Object.keys(this.data.flows || {});
    const allApex = Object.keys(this.data.apexClasses || {});
    const allObj = Object.keys(this.data.objects || {});

    // Count connections to rank nodes
    const counts = this.countConnections(rel, allFp, allLwc, allFlow, allApex, allObj);

    // Build sorted lists by connection count, then limit each type proportionally
    const sort = (names, prefix) =>
      names.slice().sort((a, b) => (counts[`${prefix}_${b}`] || 0) - (counts[`${prefix}_${a}`] || 0));

    const fpSorted = sort(allFp, 'FP');
    const lwcSorted = sort(allLwc, 'LWC');
    const flowSorted = sort(allFlow, 'FLW');
    const apexSorted = sort(allApex, 'APX');
    const objSorted = sort(allObj, 'OBJ');

    // Distribute limit: presentation 10, components 10, logic 15, data 15
    const fpNames = fpSorted.slice(0, Math.min(10, MAX_TOTAL));
    const lwcNames = lwcSorted.slice(0, Math.min(10, MAX_TOTAL));
    const flowNames = flowSorted.slice(0, Math.min(10, MAX_TOTAL));
    const apexNames = apexSorted.slice(0, Math.min(15, MAX_TOTAL));
    const objNames = objSorted.slice(0, Math.min(10, MAX_TOTAL));

    let lines = [];
    lines.push('flowchart LR');
    lines.push('    classDef fp fill:#eef6ff,stroke:#60a5fa,color:#0f172a');
    lines.push('    classDef lwc fill:#fef3c7,stroke:#f59e0b,color:#111827');
    lines.push('    classDef apex fill:#e5e7eb,stroke:#4b5563,color:#111827');
    lines.push('    classDef flow fill:#dcfce7,stroke:#22c55e,color:#052e16');
    lines.push('    classDef obj fill:#ffe4e6,stroke:#fb7185,color:#111827');
    lines.push('    classDef trig fill:#f3e8ff,stroke:#a78bfa,color:#111827');
    lines.push('    classDef legend fill:#f8fafc,stroke:#cbd5e0,color:#374151,font-size:11px');

    const added = new Set();
    const edges = [];
    const add = (s) => { if (!added.has(s)) { lines.push(s); added.add(s); } };
    const addEdge = (s) => { if (!added.has(s)) { edges.push(s); added.add(s); } };

    // Track which nodes actually appear in edges (to populate subgraphs)
    const fpUsed = new Set();
    const lwcUsed = new Set();
    const flowUsed = new Set();
    const apexUsed = new Set();
    const objUsed = new Set();
    const trigUsed = new Set();

    // FP -> LWC edges
    for (const fp of fpNames) {
      const lwcs = (rel.flexiPageToLWC && rel.flexiPageToLWC[fp]) || [];
      for (const l of lwcs) {
        if (!lwcNames.includes(l)) continue;
        const fpId = `FP_${this.sanitize(fp)}`;
        const lid = `LWC_${this.sanitize(l)}`;
        fpUsed.add(fp); lwcUsed.add(l);
        addEdge(`    ${fpId} --> ${lid}`);
      }
    }

    // LWC -> Apex edges
    for (const l of lwcNames) {
      const lwc = this.data.lwcComponents[l];
      const classNames = Array.from(new Set(lwc?.apexMethods || [])).map(m => m.split('.')[0]).filter(Boolean);
      for (const a of classNames) {
        if (!apexNames.includes(a)) continue;
        const lid = `LWC_${this.sanitize(l)}`;
        const aid = `APX_${this.sanitize(a)}`;
        lwcUsed.add(l); apexUsed.add(a);
        addEdge(`    ${lid} --> ${aid}`);
      }
    }

    // Flow -> Apex edges
    for (const f of flowNames) {
      const apx = (rel.flowToApex && rel.flowToApex[f]) || [];
      for (const a of apx) {
        if (!apexNames.includes(a)) continue;
        const fid = `FLW_${this.sanitize(f)}`;
        const aid = `APX_${this.sanitize(a)}`;
        flowUsed.add(f); apexUsed.add(a);
        addEdge(`    ${fid} --> ${aid}`);
      }
    }

    // Apex -> Objects edges
    for (const a of apexNames) {
      const objs = (rel.apexToObjects && rel.apexToObjects[a]) || [];
      for (const o of objs) {
        if (!objNames.includes(o)) continue;
        const aid = `APX_${this.sanitize(a)}`;
        const oid = `OBJ_${this.sanitize(o)}`;
        apexUsed.add(a); objUsed.add(o);
        addEdge(`    ${aid} --> ${oid}`);
      }
    }

    // Object -> Trigger -> Apex edges
    for (const o of objNames) {
      const trigs = (rel.objectToTriggers && rel.objectToTriggers[o]) || [];
      for (const t of trigs) {
        const oid = `OBJ_${this.sanitize(o)}`;
        const tid = `TRG_${this.sanitize(t)}`;
        objUsed.add(o); trigUsed.add(t);
        addEdge(`    ${oid} --> ${tid}`);
        const handlers = (this.data.triggers?.[t]?.handlers) ||
          (rel.classToTrigger && Object.keys(rel.classToTrigger).filter(a => (rel.classToTrigger[a]||[]).includes(t))) || [];
        for (const a of handlers) {
          if (!apexUsed.has(a) && apexNames.includes(a)) apexUsed.add(a);
          if (apexNames.includes(a) || apexUsed.has(a)) {
            const aid = `APX_${this.sanitize(a)}`;
            apexUsed.add(a);
            addEdge(`    ${tid} --> ${aid}`);
          }
        }
      }
    }

    // Subgraph: Presentation (FlexiPages)
    if (fpUsed.size > 0) {
      lines.push('    subgraph Presentation["Presentation (FlexiPages)"]');
      for (const fp of fpNames) {
        if (!fpUsed.has(fp)) continue;
        const id = `FP_${this.sanitize(fp)}`;
        add(`        ${id}["FlexiPage<br/>${this.mermaidLabel(fp)}"]:::fp`);
        add(`        click ${id} "../ui/index.html#flexiPagesTable" "FlexiPage ${this.mermaidLabel(fp)}"`);
      }
      lines.push('    end');
    }

    // Subgraph: Components (LWC/Aura)
    if (lwcUsed.size > 0) {
      lines.push('    subgraph Components["Components (LWC/Aura)"]');
      for (const l of lwcNames) {
        if (!lwcUsed.has(l)) continue;
        const id = `LWC_${this.sanitize(l)}`;
        add(`        ${id}["LWC<br/>${this.mermaidLabel(l)}"]:::lwc`);
        add(`        click ${id} "../ui/lwc-${this.sanitize(l)}.html" "LWC ${this.mermaidLabel(l)}"`);
      }
      lines.push('    end');
    }

    // Subgraph: Logic (Apex/Flows/Triggers)
    const logicItems = [...flowUsed].map(f => ({ type: 'flow', name: f }))
      .concat([...apexUsed].map(a => ({ type: 'apex', name: a })))
      .concat([...trigUsed].map(t => ({ type: 'trig', name: t })));
    if (logicItems.length > 0) {
      lines.push('    subgraph Logic["Logic (Apex / Flows / Triggers)"]');
      for (const f of flowNames) {
        if (!flowUsed.has(f)) continue;
        const id = `FLW_${this.sanitize(f)}`;
        add(`        ${id}["Flow<br/>${this.mermaidLabel(f)}"]:::flow`);
        add(`        click ${id} "../flows/flow-${this.sanitizeNodeName(f)}.html" "Flow ${this.mermaidLabel(f)}"`);
      }
      for (const a of apexNames) {
        if (!apexUsed.has(a)) continue;
        const id = `APX_${this.sanitize(a)}`;
        add(`        ${id}["Apex<br/>${this.mermaidLabel(a)}"]:::apex`);
        add(`        click ${id} "../apex/class-${this.sanitize(a)}.html" "Apex ${this.mermaidLabel(a)}"`);
      }
      for (const t of [...trigUsed]) {
        const id = `TRG_${this.sanitize(t)}`;
        add(`        ${id}["Trigger<br/>${this.mermaidLabel(t)}"]:::trig`);
        add(`        click ${id} "../automation/index.html" "Trigger ${this.mermaidLabel(t)}"`);
      }
      lines.push('    end');
    }

    // Subgraph: Data (Objects)
    if (objUsed.size > 0) {
      lines.push('    subgraph Data["Data (Objects)"]');
      for (const o of objNames) {
        if (!objUsed.has(o)) continue;
        const id = `OBJ_${this.sanitize(o)}`;
        add(`        ${id}["Object<br/>${this.mermaidLabel(o)}"]:::obj`);
        add(`        click ${id} "../objects/object-${this.sanitize(o)}.html" "Object ${this.mermaidLabel(o)}"`);
      }
      lines.push('    end');
    }

    // Append all edges
    edges.forEach(e => lines.push(e));

    // Legend
    lines.push('    subgraph Legend["Legend"]');
    lines.push('        L1["FlexiPage"]:::fp');
    lines.push('        L2["LWC/Aura"]:::lwc');
    lines.push('        L3["Flow"]:::flow');
    lines.push('        L4["Apex"]:::apex');
    lines.push('        L5["Trigger"]:::trig');
    lines.push('        L6["Object"]:::obj');
    lines.push('    end');

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
