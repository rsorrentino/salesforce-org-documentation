# Business Logic & Amplifon Macros

## 1. Product Lifecycle & End of Life (EOL) Approval Flow
* [cite_start]**Phases:** Prelaunch, Phase In (PI), In portfolio (MA Managed), Next Phase Out (NP), Phase Out (PO), End of Life (EL), and Dismissed (DI)[cite: 2109].
* **Dismissed Rule:** The lifecycle is mono-directional. [cite_start]Dismissed products are never included in the Salesforce catalogue [cite: 2110-2111].
* [cite_start]**EOL Cart Rules:** Items in "End Of Life" can be sold if in stock at the shop[cite: 2116]. [cite_start]To order an EOL item, an Audiologist (AUD) must trigger a Back Office Approval Workflow and provide a reason (Loss/Theft, Repair, Bino, Other) [cite: 2117-2118, 2250-2254].

## 2. Amplifon Custom UI Macros
[cite_start]The business uses custom Lightning Apps to bypass complex Vlocity object structures for real-time updates [cite: 2975-2976, 2981-2989, 3600-3603]:
* [cite_start]**Amplifon Catalog Macro:** Used to update Prices (VAT excluded), Product Flags (Trial, Next, Earside Management, Amplisolution Level), and Promotions (Dates, Status) [cite: 3014, 3128, 3275, 3406-3407, 3479-3483].
* **Validation within Macro:** If `Earside Mgt Flag` is "N", `Ear Side` must be "B" or empty. [cite_start]If "Y", `Ear Side` must be "L" or "R"[cite: 3340].
* [cite_start]**Amplifon Commercial Field Macro:** Used to update "Shop Visibility" (restricting specific SKUs to partner shops) and "Best Seller" status (optimizing cart search speed) [cite: 3605, 3609, 3685, 4087-4088, 4109-4113].

## 3. Commercial Offer Naming Conventions
* [cite_start]Free Market & Social Customer: `NAME HEARING AIDS "OF"`[cite: 1855].
* [cite_start]Social Customer Infantil: `NAME HEARING AIDS "Social Customer Infantil OF"`[cite: 1858].
* [cite_start]Social Market Junior: `NOME HEARING AIDS "OF Social Junior"`[cite: 1860].
* [cite_start]Paid Up Market Magic: `NOME HEARING AIDS "OF Paid Up"`[cite: 1862].