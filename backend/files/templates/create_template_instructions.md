# Creating the DOCX Template

## Quick Start - Create quote_anti_heeling.docx

1. Open Microsoft Word (or LibreOffice Writer, Google Docs)
2. Create a new document
3. Copy and paste this template content:

---

**FRAMO AS**
**Anti-Heeling System Quote**

**Date:** {{date}}
**Quote Number:** {{quote_number}}
**Project:** {{project_name}}

**VESSEL INFORMATION**
- Ship Owner: {{vessel_owner}}
- Shipyard: {{shipyard}}
- Vessel Type: {{vessel_type}}
- Vessel Name: {{vessel_name}}

**SCOPE OF SUPPLY**
{{scope_of_supply}}

**TECHNICAL SPECIFICATIONS**
- Flow Specification: {{flow_spec}}
- Pump Specification: {{pump_spec}}
- Tank Capacity: {{tank_capacity}}
- Power Requirements: {{power_requirements}}

**EQUIPMENT LIST**
{{equipment_list}}

**PRICING**
- Currency: {{currency}}
- Base Price: {{base_price}}
- Options: {{options_price}}
- **Total Price: {{total_price}}**

**DELIVERY**
- Estimated Delivery: {{delivery_time}}
- Delivery Terms: {{delivery_terms}}

**VALIDITY**
This quote is valid until: {{validity_date}}

**Contact Information:**
{{contact_name}}
{{contact_email}}
{{contact_phone}}

Best regards,
**FRAMO AS Sales Team**

---

4. Format it with:
   - Company header/logo
   - Professional fonts (Arial/Calibri)
   - Bold headers
   - Proper spacing
   
5. Save as: `quote_anti_heeling.docx` in this templates folder

## Testing
Once saved, test with:
```bash
curl -X POST http://localhost:4000/api/projects/1/generate-quote \
  -H "Content-Type: application/json" \
  -d '{"format": "docx"}' \
  --output test_quote.docx
```
