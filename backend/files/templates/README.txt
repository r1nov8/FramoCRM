This is a basic template file. You should replace this with your actual .docx template.

Template placeholders you can use in your Word document:

BASIC PROJECT INFO:
{{date}} - Current date
{{project_name}} - Project name
{{project_no}} - Opportunity/Project number
{{is_anti_heeling}} - Boolean flag for Anti-Heeling projects

COMPANIES:
{{shipyard}} - Shipyard company name
{{vessel_owner}} - Vessel owner company name

VESSEL DETAILS:
{{vessel_size}} - Vessel size number
{{vessel_size_unit}} - Vessel size unit (e.g., "m", "ft")
{{vessel_type}} - Type of vessel

COMMERCIAL:
{{currency}} - Currency code (e.g., "USD", "EUR")
{{price_per_vessel}} - Price per vessel
{{number_of_vessels}} - Number of vessels
{{total_quote}} - Total quote amount
{{gross_margin_percent}} - Gross margin percentage

TECHNICAL:
{{flow_description}} - Flow description text
{{flow_spec}} - Formatted flow specification

ESTIMATE DETAILS:
{{comments}} - Comments from estimate
{{shipping_region}} - Shipping region
{{startup_location}} - Startup location

PRODUCTS:
{{products_summary}} - Formatted products list
{{scope_of_supply_summary}} - Formatted scope of supply

To use this:
1. Create a Word document (.docx) with the placeholders above
2. Save it as "quote_anti_heeling.docx" in this templates folder
3. The system will automatically use it for quote generation
