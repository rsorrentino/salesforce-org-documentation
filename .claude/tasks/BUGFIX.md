Always read before starting the pan and implementation:

C:\Users\test\Documents\Workspace\Tools\salesforce-org-documentation\.claude\claude-dev-loop.md
C:\Users\test\Documents\Workspace\Tools\salesforce-org-documentation\.claude\instructions.md
C:\Users\test\Documents\Workspace\Tools\salesforce-org-documentation\.claude\skills
C:\Users\test\Documents\Workspace\Tools\salesforce-org-documentation\.claude\prompts

Sei un senior Node.js developer. Devi correggere tre famiglie di bug nel generatore di documentazione Salesforce.
Il progetto ha questa struttura:
- `analyzer.js` — analizza i metadati XML Salesforce
- `generators/` — generatori HTML modulari (FlowsGenerator.js, ProfilesGenerator.js, ObjectsGenerator.js, ecc.)
- `js/app.js` — JavaScript front-end
- `css/styles.css` — fogli di stile

---

## 🔴 FAMIGLIA 1: PARSING XML — Valori booleani non letti correttamente

### Causa Radice
In `analyzer.js`, il parser `fast-xml-parser` è configurato con `parseAttributeValue: true`.
Questo converte il contenuto testuale dei nodi XML come `<allowRead>true</allowRead>` in booleani JavaScript nativi (`true`/`false`) invece di stringhe.
La funzione `getText(element, defaultValue)` non gestisce il tipo `boolean` e ritorna il `defaultValue` (stringa vuota `''`).
Risultato: tutte le permission fields booleane (allowRead, allowCreate, allowEdit, allowDelete, enabled, active, visible, ecc.) risultano sempre `false`/`''`.

### FIX 1A — Aggiungere `parseNodeValue: false` al parser XML

In `analyzer.js`, modifica la configurazione del parser:
```javascript
// PRIMA (bug):
this.parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseAttributeValue: true,
    trimValues: true
});

// DOPO (fix):
this.parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseAttributeValue: false,   // ← CAMBIA: non convertire attributi XML in tipi JS
    parseNodeValue: false,        // ← AGGIUNGE: non convertire valori nodo in tipi JS (mantieni tutto come stringa)
    trimValues: true
});
```

Questo garantisce che `<allowRead>true</allowRead>` rimanga la stringa `"true"` e non il booleano `true`.

### FIX 1B — Aggiornare la funzione `getText()` per gestire booleani (difesa in profondità)

Anche dopo il fix 1A, aggiornare `getText()` in `analyzer.js` per gestire qualsiasi tipo:
```javascript
getText(element, defaultValue = '') {
    if (element === null || element === undefined) return defaultValue;
    if (element === 0) return '0';
    if (typeof element === 'boolean') return element ? 'true' : 'false';  // ← AGGIUNGE
    if (typeof element === 'number') return String(element);
    if (typeof element === 'string') return element;
    if (element['#text'] !== undefined && element['#text'] !== null) {
        return typeof element['#text'] === 'boolean'
            ? (element['#text'] ? 'true' : 'false')                      // ← AGGIUNGE
            : String(element['#text']);
    }
    if (Array.isArray(element) && element.length > 0) {
        return this.getText(element[0], defaultValue);
    }
    return defaultValue;
}
```

### FIX 1C — Correggere la logica Yes/No in `ProfilesGenerator.js`

Nel metodo `generateObjectsList()` in `generators/ProfilesGenerator.js`, il codice attuale usa:
```javascript
// PRIMA (bug - restituisce il valore booleano grezzo o 'No'):
const read = perm.read || perm.allowRead || 'No';
const create = perm.create || perm.allowCreate || 'No';
const edit = perm.edit || perm.allowEdit || 'No';
const del = perm.delete || perm.allowDelete || 'No';
```

Con il fix 1A, `perm.allowRead` sarà `true` (stringa `"true"`? no — sarà già stringa dopo fix 1A). Ma per sicurezza, rendere la conversione esplicita:
```javascript
// DOPO (fix - conversione booleana esplicita):
const toBool = (v) => v === true || v === 'true' || v === '1';
const yesNo = (v) => toBool(v) ? 'Yes' : 'No';

const read   = yesNo(perm.allowRead   ?? perm.read);
const create = yesNo(perm.allowCreate ?? perm.create);
const edit   = yesNo(perm.allowEdit   ?? perm.edit);
const del    = yesNo(perm.allowDelete ?? perm.delete);
```

Applica la stessa logica `toBool`/`yesNo` a **tutte** le occorrenze simili in tutti i generatori, incluse:
- Apex class `enabled` (Enabled/Disabled)
- Application `visible` (Visible/Hidden)
- Record Type `active` (Active/Inactive)
- Validation Rule `active`
- Field `required`, `nillable`, `unique`
- Profile `tabVisibility`
- PermissionSet `enabled`

### FIX 1D — Correggere il conteggio dei metadati

I numeri nelle stat card (es. "2007 Apex Classes" vs "59 mostrate") sono inconsistenti perché i conteggi vengono calcolati sia dal parser XML durante l'analisi, sia dal conteggio degli array risultanti dopo il parsing. Dopo aver applicato i fix 1A e 1B:

1. Rigenera tutta la documentazione (`node generate.js --source=<path>`)
2. Verifica che i numeri nelle stat card corrispondano al conteggio effettivo delle tabelle
3. Se ancora inconsistenti, assicurati che il conteggio nelle stat card venga letto dalla stessa sorgente dati delle tabelle (non da variabili separate calcolate prima del fix)

---

## 🔴 FAMIGLIA 2: DIAGRAMMI MERMAID — Colori illeggibili e stile CSS

### Causa Radice
`FlowsGenerator.js` (e altri generator con diagrammi) scrive direttamente nel sorgente Mermaid `classDef` con colori hardcoded inaccettabili:

Questi `classDef` Mermaid producono stili inline `!important` nell'SVG renderizzato che sovrascrivono qualsiasi CSS esterno.

### FIX 2A — Sostituire i colori `classDef` con colori leggibili

In `generators/FlowsGenerator.js`, nel metodo che genera il codice Mermaid (circa righe 380-383), sostituisci i `classDef` con colori progettati per leggibilità:
```javascript
// PRIMA (bug - nero su nero, rosso pieno come sfondo):
mermaid += '    classDef decision fill:#E31E24,stroke:#B8151A,stroke-width:2px,color:#fff\n';
mermaid += '    classDef action fill:#2C2C2C,stroke:#1a1a1a,stroke-width:2px,color:#fff\n';
mermaid += '    classDef startEnd fill:#F5F5F5,stroke:#E0E0E0,stroke-width:2px\n';

// DOPO (fix - colori leggibili con buon contrasto):
mermaid += '    classDef decision fill:#FFF3F3,stroke:#E31E24,stroke-width:2px,color:#9B0000\n';
mermaid += '    classDef action fill:#F0F4FF,stroke:#4A6FA5,stroke-width:1.5px,color:#1A3A6B\n';
mermaid += '    classDef startEnd fill:#F0FFF4,stroke:#38A169,stroke-width:1.5px,color:#1A5C38\n';
```

**Logica del design:**
- `decision` (diamanti): sfondo bianco/rosato tenue, bordo rosso brand, testo rosso scuro → distinguibile ma leggibile
- `action` (rettangoli): sfondo bianco/azzurro, bordo blu, testo blu scuro → neutro e leggibile
- `startEnd` (stadi): sfondo bianco/verde, bordo verde, testo verde scuro → inizio/fine chiari

### FIX 2B — Correggere la configurazione Mermaid in `js/app.js`

Nel metodo `initMermaidDiagrams()` in `js/app.js`, la configurazione `themeVariables` usa `secondaryColor` (usato per default su alcuni tipi di nodo) che non è coerente. Aggiorna:
```javascript
// PRIMA (bug):
window.mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    theme: 'base',
    themeVariables: {
        primaryColor: '#E31E24',
        primaryBorderColor: '#B8151A',
        primaryTextColor: '#1a1a1a',
        lineColor: '#cbd5e0',
        secondaryColor: '#f8f9fa',
        tertiaryColor: '#f1f3f5',
        nodeBorder: '#e2e8f0',
        nodeTextColor: '#1a1a1a',
        clusterBkg: '#f8f9fa',
        clusterBorder: '#e2e8f0',
        edgeLabelBackground: '#ffffff',
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif"
    }
});

// DOPO (fix):
window.mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    theme: 'base',
    themeVariables: {
        primaryColor: '#F0F4FF',           // ← nodi default: sfondo azzurro chiaro
        primaryBorderColor: '#4A6FA5',     // ← bordo blu
        primaryTextColor: '#1A3A6B',       // ← testo blu scuro leggibile
        lineColor: '#718096',              // ← frecce: grigio medio
        secondaryColor: '#F8F9FA',         // ← sfondo secondario: bianco sporco
        tertiaryColor: '#EDF2F7',          // ← sfondo terziario
        nodeBorder: '#CBD5E0',             // ← bordo nodo default
        nodeTextColor: '#1a1a1a',          // ← testo nodo
        clusterBkg: '#F8F9FA',
        clusterBorder: '#E2E8F0',
        edgeLabelBackground: '#FFFFFF',
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
        fontSize: '14px'                   // ← AGGIUNGE: dimensione font leggibile
    },
    flowchart: {
        htmlLabels: true,
        curve: 'basis',
        padding: 20,                       // ← AGGIUNGE: padding nei nodi
        nodeSpacing: 50,                   // ← AGGIUNGE: spaziatura tra nodi
        rankSpacing: 60                    // ← AGGIUNGE: spaziatura tra livelli
    }
});
```

### FIX 2C — Rimuovere il Mermaid init inline nei template HTML dei singoli oggetti

In `generators/ObjectsGenerator.js`, nella funzione che genera il template HTML della pagina singolo oggetto (circa linea 169), c'è uno script Mermaid inline con `secondaryColor:'#2C2C2C'` che causa nodi neri. Rimuovilo:
```javascript
// PRIMA (bug - ha un init Mermaid inline con secondaryColor nero):
    <script>mermaid.initialize({startOnLoad:true,theme:'default',themeVariables:{primaryColor:'#E31E24',primaryTextColor:'#fff',primaryBorderColor:'#B8151A',lineColor:'#2C2C2C',secondaryColor:'#2C2C2C',tertiaryColor:'#F5F5F5'}});</script>
    <script src="../../js/app.js"></script>

// DOPO (fix - rimuovi il init inline, lascia solo app.js che già inizializza Mermaid):
    <script src="../../js/app.js"></script>
```

### FIX 2D — Aggiungere wrapping e troncamento controllato nelle label Mermaid

I nodi Mermaid troncano le label lunghe senza avviso. Per mitigare nel generatore di flow, tronca le label al momento della scrittura:
```javascript
// In FlowsGenerator.js, nel metodo che scrive i nodi:
const maxLabelLen = 30;
const truncateLabel = (label) => 
    label.length > maxLabelLen 
        ? label.substring(0, maxLabelLen - 1) + '…' 
        : label;

// Per i nodi action (rettangoli):
mermaid += `    ${nodeId}["${truncateLabel(nodeLabel)}"]\n`;
// Con tooltip come commento per il fullscreen:
// mermaid += `    %% full: ${nodeLabel}\n`;

// Per i nodi decision (diamanti):
mermaid += `    ${nodeId}{"${truncateLabel(nodeLabel)}"}\n`;
```

### FIX 2E — Correggere il diagramma UML ER vuoto in Data Model

Il diagramma `erDiagram` nella pagina `pages/objects/index.html` si renderizza con `viewBox: -8 -8 16 16` (praticamente vuoto). In `generators/ObjectsGenerator.js`, nel metodo che genera l'erDiagram:

1. **Verifica che gli oggetti abbiano davvero relazioni**: Il parser potrebbe non leggere correttamente le lookup fields a causa del bug #1. Dopo fix 1A/1B, rigenera e verifica.

2. **Aggiungere un fallback visibile se non ci sono relazioni**:
```javascript
// Se il diagramma risulta vuoto (nessuna relazione trovata):
if (relationshipCount === 0) {
    return `erDiagram
    Account {
        string Name
        string Industry  
        string BillingCity
    }
    Contact {
        string FirstName
        string LastName
        string Email
    }
    Account ||--o{ Contact : "has"
    %% Note: relationships detected: 0. Check metadata parsing.`;
}
```

3. **Aumentare il min-height del container**:
```css
/* In css/styles.css */
.uml-container {
    min-height: 300px;
    overflow-x: auto;
    overflow-y: auto;
}
.uml-container .mermaid svg {
    min-height: 200px;
    width: 100%;
    height: auto;
}
```

---

## 🟡 FAMIGLIA 3: INCONSISTENZE DATI — Numero di entità non corrisponde tra pagine diverse

Questi bug derivano direttamente dalla **Famiglia 1** (parsing booleani). Dopo aver applicato tutti i fix della Famiglia 1 e rigenerato, verifica i seguenti casi:

### FIX 3A — Stat card vs. tabelle nei conteggi

Dopo la rigenerazione:
- **Apex Layer**: stat "2007 Apex Classes" vs tabella "of 59" → con fix parser, il conteggio deve allinearsi
- **UI Layer**: stat "1648 LWC" vs tabella "of 238" → le LWC potrebbero avere una logica di conteggio diversa (tutte le LWC vs solo quelle esposte). Chiarire la differenza con un tooltip o aggiungere una nota sotto la stat card
- **Repository Structure**: i numeri (1977, 1614, ecc.) sono snapshot del repository diversi → aggiornare automaticamente al momento della generazione

### FIX 3B — "Repository Structure" numeri hardcoded

In `generators/ArchitectureGenerator.js` (o file simile), i numeri nella pagina Repository Structure potrebbero essere hardcoded invece di letti da `this.data`. Cerca tutte le occorrenze di numeri hardcoded come `1977`, `332`, `1614`, `124` e sostituiscili con:
```javascript
const apexCount = Object.keys(this.data.apexClasses || {}).length;
const flowCount = Object.keys(this.data.flows || {}).length;
const lwcCount = Object.keys(this.data.lwcComponents || {}).length;
// ecc.
```

### FIX 3C — Contatore "Profiles (48)" vs "Showing 1-50 of 66"

In `generators/ProfilesGenerator.js`, la sezione "Profiles (48)" mostra 48 ma la tabella mostra 66. Il `(48)` si riferisce probabilmente ai profili custom mentre la tabella include anche quelli standard. Chiarire l'etichetta:
```javascript
// PRIMA:
`Profiles (${profileCount})`

// DOPO (specificare cosa si conta):
`All Profiles (${totalProfileCount})` // oppure separare:
`Custom Profiles (${customCount}) + Standard Profiles (${standardCount})`
```

---

## 📋 SEQUENZA DI ESECUZIONE
```bash
# 1. Applica tutti i fix ai file sorgente:
#    - analyzer.js (FIX 1A, 1B)
#    - generators/ProfilesGenerator.js (FIX 1C)
#    - generators/FlowsGenerator.js (FIX 2A, 2D)
#    - generators/ObjectsGenerator.js (FIX 2C, 2E)
#    - js/app.js (FIX 2B)
#    - css/styles.css (FIX 2E CSS)
#    - tutti i generator con logica toBool (FIX 1C generalizzato)

# 2. Rigenera la documentazione:
node generate.js --source=<percorso-al-repo-salesforce>

# 3. Verifica:
node serve.js
# → Apri http://localhost:8001/pages/profiles/profile-Admin.html
#   Verifica: oggetti con Read/Create/Edit/Delete = "Yes" dove appropriato
#   Verifica: Apex Classes con "Enabled" dove appropriato
# → Apri un flow con decisioni e verifica: nodi chiari e leggibili
# → Apri Data Model: verifica che erDiagram mostri oggetti e relazioni
```

---

## RIEPILOGO DEI FILE DA MODIFICARE

| File | Fix da applicare |
|------|-----------------|
| `analyzer.js` | parseAttributeValue→false, parseNodeValue→false, getText() con boolean handler |
| `generators/ProfilesGenerator.js` | toBool()/yesNo() per tutti i flag booleani |
| `generators/FlowsGenerator.js` | classDef con colori leggibili, truncateLabel() |
| `generators/ObjectsGenerator.js` | Rimuovi Mermaid init inline, fix erDiagram vuoto |
| `generators/ArchitectureGenerator.js` | Sostituisci numeri hardcoded con `this.data.*` counts |
| `generators/AutomationGenerator.js` | toBool() per enabled/active |
| `generators/ApexGenerator.js` | toBool() per enabled |
| `js/app.js` | Aggiorna themeVariables Mermaid (colori + fontSize + spacing) |
| `css/styles.css` | min-height per diagram container |