Always read before starting the pan and implementation:

C:\Users\test\Documents\Workspace\Tools\salesforce-org-documentation\.claude\claude-dev-loop.md
C:\Users\test\Documents\Workspace\Tools\salesforce-org-documentation\.claude\instructions.md
C:\Users\test\Documents\Workspace\Tools\salesforce-org-documentation\.claude\skills
C:\Users\test\Documents\Workspace\Tools\salesforce-org-documentation\.claude\prompts

Sei un senior full-stack developer. Devi correggere bug e migliorare UX/UI dell'applicazione di documentazione Salesforce situata in http://localhost:8001. L'app è composta da file HTML statici in /pages/ con un CSS principale in /css/styles.css e JavaScript inline/script files.

## 🔴 CORREZIONI BUG CRITICI

### 1. Anchor link `#` sempre visibili — FIX CSS
In `css/styles.css`, aggiungi le seguenti regole per nascondere i link ancora di default e mostrarli solo in hover:
```css
.anchor-link {
  opacity: 0;
  margin-left: 0.4rem;
  font-size: 0.85em;
  color: #718096;
  text-decoration: none;
  transition: opacity 0.15s ease;
}

h1:hover .anchor-link,
h2:hover .anchor-link,
h3:hover .anchor-link,
h4:hover .anchor-link {
  opacity: 1;
}
```

### 2. Doppio pulsante "Download JSON" su pagine profilo
In ogni file `pages/profiles/profile-*.html`:
- Rimuovi il tag `<a class="btn" href="../../data/search/profile.json">Download JSON</a>`
- Mantieni SOLO il `<button class="btn download-json-btn">Download JSON</button>`
- Assicurati che il `download-json-btn` usi il JSON specifico del profilo corrente (non il file globale `profile.json`)
- Il JavaScript che gestisce il button deve costruire il path corretto: `../../data/profiles/${profileApiName}.json`

### 3. Pulsante "Ask AI" non funzionale
Implementa un pannello laterale (drawer) per la funzionalità Ask AI:
- Alla pressione del bottone "Ask AI", aprire un `<aside class="ai-panel">` con:
  - Header con titolo "Ask AI" e pulsante ✕ per chiudere
  - `<textarea>` per la domanda
  - Pulsante "Ask" (disabilitato con messaggio "Coming soon" se il backend non è disponibile)
  - Opzionalmente: suggerimenti di domande predefinite come chip cliccabili
- Animare con `transform: translateX(100%)` → `translateX(0)` su apertura

### 4. Hamburger menu non funziona su mobile
Nel JavaScript del layout comune (o in un file `js/nav.js`):
```javascript
const sidebarToggle = document.querySelector('.sidebar-toggle-btn');
const sidebar = document.querySelector('.sidebar, nav[class*="nav"]');

sidebarToggle?.addEventListener('click', () => {
  sidebar?.classList.toggle('sidebar-open');
  document.body.classList.toggle('sidebar-overlay-active');
});
```
In CSS:
```css
@media (max-width: 768px) {
  .sidebar { 
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    position: fixed;
    z-index: 200;
  }
  .sidebar.sidebar-open {
    transform: translateX(0);
  }
  .sidebar-overlay-active::after {
    content: '';
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    z-index: 199;
  }
}
```

### 5. Diagramma UML Data Model vuoto
In `pages/objects/index.html`, il diagramma Mermaid è vuoto. Assicurati che:
- Il testo Mermaid contenga almeno i nodi principali (Account, Contact, Opportunity, Lead, etc. con relazioni)
- Il container del diagramma abbia `min-height: 400px`
- Mermaid sia inizializzato DOPO il caricamento del DOM (usa `DOMContentLoaded`)

### 6. "-0" nel pannello What Changed
In `pages/maintenance/changes.html`, correggi la logica di visualizzazione:
```javascript
// Sostituisci
`${count < 0 ? '-' : '+'}${count}`
// Con
`${count === 0 ? '=' : count > 0 ? '+' : '-'}${Math.abs(count)}`
```

### 7. ESC non pulisce il campo di ricerca
Nel JavaScript della search (cerca nel codice il keydown/keyup listener):
```javascript
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    searchInput.value = '';        // ← aggiungi questa riga
    searchDropdown.style.display = 'none';
    searchInput.blur();
  }
});
```

### 8. Nessuna pagina 404 personalizzata
Crea il file `404.html` nella root con lo stesso layout delle altre pagine:
- Mostra messaggio "Pagina non trovata"
- Link "Torna alla Home"
- Se il server è Node/Express o nginx, configura l'handler 404 per servire questo file

---

## 🟡 CORREZIONI BUG GRAVI

### 9. LWC senza link di dettaglio
In `pages/ui/index.html`, nella tabella LWC Components, converti il nome da `<strong>` a link:
```html
<!-- PRIMA -->
<strong>aMPAddMultipleItemEnglish</strong>
<!-- DOPO -->
<a href="lwc-aMPAddMultipleItemEnglish.html">aMPAddMultipleItemEnglish</a>
```
Se le pagine di dettaglio LWC non esistono ancora, crearne una template base simile a quella degli Apex Class.

### 10. Formatter numeri inconsistente  
In `css/styles.css` e nei template HTML, usa una funzione JavaScript consistente per tutti i numeri:
```javascript
function formatNumber(n) {
  return n.toLocaleString('en-US');  // produce "1,648", "2,007" ecc.
}
```
Applica questa funzione ovunque vengano renderizzati contatori numerici (stat cards, heading sezioni, ecc.)

### 11. Inconsistenze nei conteggi (stat card vs tabella)
Il problema è che le stat card mostrano il totale complessivo mentre le sezioni mostrano subset filtrati. Soluzione:
- Nelle sezioni, usa il conteggio preciso del subset: `Profiles (48 custom)` oppure
- Usa tooltip sulle stat card che spiegano cosa include il numero
- Allinea il conteggio nella sezione header con quello della tabella

### 12. Filtro alfabetico — stato visivo errato
In `pages/objects/index.html`, nella logica del filtro A-Z:
```javascript
// Prima di impostare il nuovo filtro attivo, rimuovi tutti gli active
document.querySelectorAll('.alpha-filter button').forEach(b => b.classList.remove('active'));
// Poi imposta solo il button cliccato come active
clickedButton.classList.add('active');
```

### 13. Breadcrumb troncato
In CSS, cambia il breadcrumb da testo troncato a wrappable, o aggiungi tooltip:
```css
.breadcrumb { 
  overflow: hidden; 
  text-overflow: ellipsis; 
  white-space: nowrap;
}
/* Aggiungi in JS: element.setAttribute('title', element.textContent) */
```

---

## 🟢 MIGLIORAMENTI UX/UI

### A. Homepage — Griglia feature card bilanciata
Ristruttura l'homepage con una griglia 3×3 includendo tutte le sezioni principali:
```html
<!-- Aggiungi le card mancanti: UI Layer, Apex Layer, Integrations, Architecture, Deployment, Maintenance -->
<a class="card" href="pages/ui/index.html">
  <span class="card-icon">⚡</span>
  <h3>UI Layer <a class="anchor-link" href="#ui-layer">#</a></h3>
  <span class="card-count">1,648 components</span>
  <p>Lightning Web Components and FlexiPages</p>
</a>
```

### B. Stat card cliccabili sulla homepage
Rendi le 4 stat card (48, 2007, 1648, 348) cliccabili e linkate alle rispettive sezioni:
```html
<a href="pages/profiles/index.html" class="stat-card">
  <h3>48</h3>
  <p>Profiles</p>
</a>
```

### C. Tabelle — hover row, sort columns, tooltip truncation
In CSS:
```css
.data-table tbody tr:hover { background: rgba(0,0,0,0.03); }
.data-table th[data-sortable] { cursor: pointer; user-select: none; }
.data-table th[data-sortable]::after { content: ' ↕'; opacity: 0.4; }
.cell-truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }
.cell-truncate:hover { overflow: visible; }
```
In JS, aggiungi sort on click header e `title` attribute sulle celle troncate.

### D. "Back to Top" — mostrare solo dopo scroll
```javascript
const backToTop = document.querySelector('.back-to-top, #back-to-top');
window.addEventListener('scroll', () => {
  backToTop.style.display = window.scrollY > 300 ? 'block' : 'none';
});
```

### E. Search — UX migliorata
- Aggiungere stato "no results" con messaggio e suggerimento
- Separare risultati per categoria con sezione header più leggibile
- Aggiungere aria-live per accessibilità screen reader
- Mostrare keyboard hint (↑↓ per navigare, Enter per aprire, ESC per chiudere)

### F. Accessibilità collapsible sections
Per ogni sezione collassabile, aggiungi:
```html
<h3 role="button" 
    tabindex="0" 
    aria-expanded="false" 
    aria-controls="section-content-id"
    onclick="toggleSection(this)"
    onkeydown="if(event.key==='Enter'||event.key===' ')toggleSection(this)">
  Section Title
</h3>
```

### G. Loading state per diagrammi Mermaid
```html
<div class="diagram-container">
  <div class="diagram-loading">⏳ Rendering diagram...</div>
  <div class="mermaid" style="display:none">...</div>
</div>
<script>
mermaid.initialize({ startOnLoad: false });
mermaid.run().then(() => {
  document.querySelector('.diagram-loading').remove();
  document.querySelector('.mermaid').style.display = '';
});
</script>
```

### H. Pulsante Ask AI — icona e tooltip
```html
<button class="ask-ai-btn" title="Ask AI about this documentation" aria-label="Open AI assistant">
  <svg><!-- icona sparkle --></svg>
  Ask AI
</button>
```

### I. Sidebar navigazione — gerarchia visiva
Aggiungi label di gruppo e indentazione:
```html
<nav>
  <div class="nav-group-label">SECURITY</div>
  <a href="..." class="nav-link">Profile Navigation</a>
  <a href="..." class="nav-link">Security & Access</a>

  <div class="nav-group-label">DATA</div>
  <a href="..." class="nav-link">Data Model</a>
  <a href="..." class="nav-link">Automation</a>
  ...
</nav>
```

### J. Numero formattazione e unità
Sulle stat card, specifica l'unità dove ambiguo:
- "578 Objects" → "578 Salesforce Objects"
- "0 Permission Set Groups" → mantieni ma aggiungi tooltip "No Permission Set Groups configured"

---

## PRIORITÀ DI IMPLEMENTAZIONE

**Sprint 1 (critici — blocco UX):** BUG-01 (#link), BUG-02 (doppio JSON), BUG-03 (Ask AI), BUG-04 (mobile nav), BUG-08 (-0)

**Sprint 2 (gravi — affidabilità dati):** BUG-06 (inconsistenze dati), BUG-07 (LWC links), BUG-09 (ESC search), BUG-14 (numeri formato)

**Sprint 3 (UX miglioramenti):** UI-01 (griglia home), UI-13 (table UX), UI-16 (sort columns), UI-26 (a11y)

**Sprint 4 (polish):** UI-17 (tooltip truncation), UI-20 (Ask AI icon), UI-23 (diagram interattivo), BUG-17 (back-to-top visible)