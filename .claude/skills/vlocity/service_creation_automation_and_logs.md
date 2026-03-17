# Automated Service Creation & Monitoring

## 1. Apex Batch Jobs Sequence
[cite_start]When the Service Creation is launched, three Apex jobs run in succession[cite: 360]:
1.  [cite_start]`AmplifonServiceCreation_SingleBatch`: The main Service Creation process[cite: 362].
2.  [cite_start]`AmplifonServiceCreation_ChildItemBatch`: Links accessories to offers[cite: 363].
3.  [cite_start]`EPCProductAttribJSONBatchJob`: A standard Vlocity batch that fixes the JSON Attribute field on the `Product2` object[cite: 364, 1986, 1994].

## 2. Error Logging & Troubleshooting
* [cite_start]**Log Object:** The results of the Service Creation job are stored in the `GT_LogTable__c` object[cite: 823, 827, 1641].
* **Common Errors to Validate:**
  * [cite_start]**Color Inconsistency:** "Color Desc field is empty but the item has color relationship" (Occurs when `GT_ColorDesc__c` is 'No Color' but `GT_Color__c` has a code)[cite: 830].
  * **Transcoding Error:** "Amplifon Subclass field is either empty or incorrectly populated." The custom setting `AMP_Transcod_ObjectType__c` maps `CustomFlag__c`, `OrgCode__c`, and `SubClass` to determine the correct ObjectType [cite: 832-840].
  * **Missing Attribute Assignment:** Ear Side attributes occasionally fail to assign and require manual Data Import intervention into the `vlocity_cmt__AttributeAssignment__c` object [cite: 848-850].

## 3. Deployment & Cache Management
* [cite_start]**Maintenance Jobs:** Following any catalog or pricing updates, three admin jobs must run: Product Hierarchy Maintenance, Clear Managed Platform Cache, and Refresh Platform Cache [cite: 256-258, 948-950, 1822].
* [cite_start]**DataPack Deployments:** When using the Vlocity Build Tool, Pricing Elements (`vlocity_cmt__PricingElement__c`) MUST be exported and deployed before Price List Entries (`vlocity_cmt__PriceListEntry__c`) to avoid "SObject/Id not found" references [cite: 1808-1809, 1883-1888].