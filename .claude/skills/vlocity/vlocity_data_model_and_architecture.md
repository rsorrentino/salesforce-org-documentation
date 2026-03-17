# Vlocity & Amplifon Custom Architecture

## 1. Core Data Flow & Staging
* [cite_start]**Ingestion:** Product data originates from Product Hub and is loaded into the Salesforce `GT_StagingArea__c` table[cite: 206, 215, 811].
* **Administrative Tables:** The Service Creation process splits staging data into three core administrative tables: Rate Table (`GT_RateTable__c`), Product Table (`Product2`), and SKU Table (`GT_ProductSKU__c`) [cite: 208, 213, 218, 222, 757-758].
* **Status Flags:** A dedicated `GT_RecordStatus__c` field is updated in each table to drive further actions (e.g., 'New', 'Updated', 'Error')[cite: 225, 276, 816, 823, 826].

## 2. EPC Catalog Structure
* **Objects Used:** The catalog hierarchy relies on `vlocity_cmt__Catalog__c` (Catalog Anagraphic), `vlocity_cmt__CatalogRelationship__c` (Parent-Child links), and `vlocity_cmt__CatalogProductRelationship__c` (Product-to-Catalog links) [cite: 10-12, 99-101, 1482].
* **Naming Conventions:**
  * Catalog: `Name of the catalog` + `abbreviation of the pricelist` (e.g., "07. Implants FM")[cite: 47].
  * [cite_start]Catalog Relationship: `Child Catalog Name` + "To" + `Father Catalog Name`[cite: 140].
  * [cite_start]Catalog Product Relationship: `Product Name` + "To" + `Catalog Name`[cite: 168, 1501].

## 3. Commercial Offers & Bundles
* **Object Used:** Bundles are built using the `vlocity_cmt__ProductChildItem__c` (PCI) object to establish Parent-Child product hierarchies [cite: 759-776, 1466, 1468].
* [cite_start]**Composition:** A standard Hearing Aid (HA) offer typically includes the Hearing Aid itself, a "Welcome Kit" (flagged as a Virtual Item with Cardinality 1, 1, 1), and Accessories[cite: 1416, 1424, 1426].
* [cite_start]**Root PCI:** The system automatically generates a "Root PCI" record for each product; these must be excluded in queries (`WHERE Name != 'Root PCI'`)[cite: 1469, 1677].