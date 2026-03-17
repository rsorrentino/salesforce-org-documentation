# Pricing, Promotions, and VAT Logic

## 1. Pricing Structure Rules
* [cite_start]**Price Values:** Prices are always handled VAT excluded[cite: 3128].
* **Hearing Aid Color Rule:** It is NOT possible to have different prices for different colors of the same HA model within a given Pricelist. [cite_start]All colors MUST have the exact same price [cite: 2457-2458, 2470].
* [cite_start]**Virtual Items:** Virtual Items like "Welcome Kits" must have a `vlocity_cmt__PriceListEntry__c` with a price set to `0 €` and a Display Text of "El precio final depende de la configuración de la oferta"[cite: 1250, 1267, 1462].
* [cite_start]**Pricing Element Formatting:** * General Format: Max 6 decimal places, use `,` for decimals, `.` for thousands, and omit the currency symbol[cite: 3154, 3997].
  * [cite_start]One-Time Price Code Convention: `PLE-OT-AMOUNT` (e.g., `PLE-OT-100€`)[cite: 1842].

## 2. Promotions and Discounts (Adjustments)
* [cite_start]**Adjustment Records:** Discounts are configured as `vlocity_cmt__PricingElement__c` records with Charge Type = "Adjustment" and Sub-Type = "Standard" [cite: 1294-1296, 1307].
* [cite_start]**Abs vs Pct:** Use "One Time Std Price Adjustment Abs" for exact amount deductions, and "One Time Std Price Adjustment Pct" for percentage deductions[cite: 1301, 1307, 1311].
* [cite_start]**Discount Code Convention:** `PLE_ADJ_AMOUNT_EURO_OFF` (e.g., `PLE_ADJ_4.71_EURO_OFF`)[cite: 1341, 1850].

## 3. VAT (Rate Table) Updates
* [cite_start]The Service Creation generates records for each organization code in the `GT_RateTable__c` object[cite: 1523].
* Updates often require comparing `GT_VATType__c` (Ordinary vs. Reduced VAT) and modifying the `GT_RateDescription__c` based on the product subclass (e.g., Hearing Aids vs. Batteries vs. Implants) [cite: 1524, 1531-1594, 1597-1598].