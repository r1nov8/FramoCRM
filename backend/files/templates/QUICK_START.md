**QUICK START: Create Your DOCX Template**

1. **Open Microsoft Word**
2. **Copy and paste this exact content:**

---

FRAMO AS
Anti-Heeling System Quotation

Date: {{date}}
Quote Number: AH-{{project_no}}-{{quote_number}}
Project: {{project_name}}

VESSEL INFORMATION
Ship Owner: {{vessel_owner}}
Shipyard: {{shipyard}}
Vessel Type: {{vessel_type}}
Vessel Name: {{vessel_name}}
Vessel Size: {{vessel_size}} {{vessel_size_unit}}

SCOPE OF SUPPLY
{{scope_of_supply}}

TECHNICAL SPECIFICATIONS
Flow Specification: {{flow_spec}}
Flow Capacity: {{flow_capacity_m3h}} m³/h
Flow Head: {{flow_mwc}} mWC
Power: {{flow_power_kw}} kW
Pump Quantity: {{pump_quantity}} units
Tank Capacity: {{tank_capacity}} m³
Power Requirements: {{power_requirements}}

COMMERCIAL TERMS
Currency: {{currency}}
Base Price: {{base_price}} {{currency}}
Options: {{options_price}} {{currency}}
Number of Vessels: {{number_of_vessels}}
TOTAL PRICE: {{total_price}} {{currency}}

DELIVERY
Delivery Time: {{delivery_time}}
Validity: {{validity}}

CONTACT
{{contact_name}}
{{contact_email}}
{{contact_phone}}

---

3. **Format it nicely** (fonts, colors, spacing)
4. **Save as:** `quote_anti_heeling.docx` 
5. **Place in:** `/Users/kingston/VsCode/FramoCRM/backend/files/templates/`

That's it! The system will now generate proper DOCX files.
