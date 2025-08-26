# DOCX Template Creation Guide

## Step 1: Create the Word Document

Create a new Microsoft Word document and copy this EXACT content:

---

**FRAMO AS**
**Postboks 151, 5047 Bergen, Norway**
**Tel: +47 55 99 42 00**
**Email: sales@framo.no**
**www.framo.no**

---

# ANTI-HEELING SYSTEM QUOTATION

**Date:** {{date}}
**Quote Number:** AH-{{project_no}}-{{quote_number}}
**Project:** {{project_name}}

---

## VESSEL INFORMATION

| Field | Details |
|-------|---------|
| **Ship Owner** | {{vessel_owner}} |
| **Shipyard** | {{shipyard}} |
| **Vessel Type** | {{vessel_type}} |
| **Vessel Name** | {{vessel_name}} |
| **Vessel Size** | {{vessel_size}} {{vessel_size_unit}} |

---

## SCOPE OF SUPPLY

{{scope_of_supply}}

**Standard Delivery Includes:**
- Anti-heeling pump units as specified
- Control and monitoring system
- Installation drawings and documentation
- Factory testing and quality certification

---

## TECHNICAL SPECIFICATIONS

### Flow Requirements
- **Flow Specification:** {{flow_spec}}
- **Flow Capacity:** {{flow_capacity_m3h}} m³/h
- **Flow Head:** {{flow_mwc}} mWC
- **Power Requirements:** {{flow_power_kw}} kW

### System Details
- **Pump Quantity:** {{pump_quantity}} units
- **Tank Capacity:** {{tank_capacity}} m³
- **Power Supply:** {{power_requirements}}
- **Control System:** Advanced PLC-based control with HMI

---

## EQUIPMENT LIST

### Anti-Heeling Pumps
- **Type:** Framo Self-Priming Centrifugal Pumps
- **Quantity:** {{pump_quantity}} units
- **Capacity:** {{flow_capacity_m3h}} m³/h per pump
- **Head:** {{flow_mwc}} mWC
- **Power:** {{flow_power_kw}} kW per pump

### Control System
- **PLC Control Panel** with touch screen HMI
- **Level sensors** for tank monitoring
- **Flow meters** for accurate measurement
- **Emergency stop** and safety systems

### Installation Package
- Piping and valves
- Electrical cables and control cables
- Installation manual and drawings
- Commissioning support

---

## COMMERCIAL TERMS

| Description | Amount |
|------------|--------|
| **Currency** | {{currency}} |
| **Base Price per Vessel** | {{base_price}} {{currency}} |
| **Options/Extras** | {{options_price}} {{currency}} |
| **Number of Vessels** | {{number_of_vessels}} |
| **Total Price** | **{{total_price}} {{currency}}** |

### Price Includes:
- All equipment as specified above
- Factory testing and documentation
- Standard delivery terms (Ex-Works Bergen, Norway)
- Technical support during installation

### Price Excludes:
- Transportation and installation
- Commissioning and startup (available as option)
- Local permits and approvals

---

## DELIVERY & TERMS

- **Delivery Time:** {{delivery_time}} from contract signature
- **Delivery Terms:** Ex-Works Bergen, Norway
- **Payment Terms:** 30% advance, 60% on delivery, 10% after commissioning
- **Warranty:** 12 months from delivery or 6 months from startup

---

## VALIDITY

This quotation is valid for **{{validity}}** from the date of issue.

---

## OPTIONAL EXTRAS

| Description | Price ({{currency}}) |
|------------|---------------------|
| Commissioning and startup support | Available on request |
| Extended warranty (24 months) | Available on request |
| Spare parts package | Available on request |
| Training program | Available on request |

---

## CONTACT INFORMATION

**Sales Contact:**
{{contact_name}}
Email: {{contact_email}}
Phone: {{contact_phone}}

**Technical Contact:**
Framo Technical Department
Email: technical@framo.no
Phone: +47 55 99 42 50

---

*This quotation has been automatically generated based on your project specifications. Please contact us for any clarifications or modifications.*

**Best regards,**

**FRAMO AS**
**Sales Department**

---

## Step 2: Format the Document

1. **Header Styling:**
   - Company name: Bold, 18pt, Blue color
   - Contact details: 10pt, Gray color
   - Add company logo if available

2. **Main Title:**
   - "ANTI-HEELING SYSTEM QUOTATION": Bold, 16pt, Center aligned

3. **Section Headers:**
   - Make all ## headers Bold, 14pt, Blue color
   - Add space before and after sections

4. **Tables:**
   - Add borders and light gray background for headers
   - Align numbers to the right

5. **Important Information:**
   - Make total price Bold and larger font
   - Highlight validity period

## Step 3: Save the Template

1. Save the document as: `quote_anti_heeling.docx`
2. Place it in: `/Users/kingston/VsCode/FramoCRM/backend/files/templates/`
3. Make sure all placeholders ({{text}}) are preserved exactly as shown

## Step 4: Test the Template

After creating the template, test it with:

```bash
curl -X POST http://localhost:4000/api/projects/7/generate-quote \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [your-token]" \
  -d '{"format": "docx"}' \
  --output test_quote.docx
```

The system will automatically populate all the placeholders with real data!
