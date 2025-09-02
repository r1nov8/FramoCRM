# Framo CRM Hub – Liquefied Gas & Fuel Team (PRD)

Author: Reno Kingston  
Version: 1.0  
Last updated: 2025-09-02

## Executive summary

Build a CRM hub that centralizes the daily workflow for the Liquefied Gas & Fuel team: market intelligence → lead → opportunity/project → RFQ → quote → PO → order handover. The hub should automate repetitive steps (data capture, document handling, quoting), align with Framo’s sales process, and give clear pipeline visibility by fuel type (Methanol, LNG, NH3) and segment.

## Goals and non-goals

Goals
- Single source of truth for vessels, shipyards, owners, opportunities/projects, RFQs, quotes, POs, and order handover artifacts.
- Streamlined lead intake from market intelligence (manual first, optional scraping later).
- Fast creation of Opportunity No. (fuel) or Project No. (anti-heeling) with minimal required info.
- RFQ handling with spec capture, deviation list, Technical Proposal (TP), and Owner Benefit Package (OBP) attachments.
- Integrated quoting using the existing estimate calculator and pricing data.
- Collaboration with Framo abroad offices (China/Korea/Japan) and clear ownership.
- Reporting/forecasting by fuel type, yard, owner, and stage.

Non-goals (for now)
- Direct ERP integration (handover artifacts only, future integration later).
- Fully automated paid-data scraping (manual upload + optional semi-automation; compliant with site ToS and contracts).
- Engineering document control beyond sales scope (link/reference only).

## Users and roles

- Sales Engineer (HQ): creates/updates leads, opportunities/projects; handles RFQs/quotes; collaborates with abroad offices; owns deals.
- Sales Manager: forecasting, approvals (discounts/terms), pipeline oversight.
- Abroad office (CN/KR/JP): contributes intel, validates yard/owner, co-owns regional comms.
- Admin: user/role management, pricing master updates.

Permissions (high-level)
- Read-only vs. edit per module; approvals required for discount thresholds and terms; audit trail on changes.

## End-to-end workflow (happy path)

1) Market intelligence
- Daily review of Tradewinds, ship.energy, Clarksons (manual capture initially). 
- Create Market Intel item with: source, link, vessel(s), segment, fuel type, date, notes. 
- Request validation from abroad office (CN/KR/JP) when applicable.
- Decision: Promote to Lead or Discard.

2) Lead → Opportunity/Project
- Lead minimal fields: vessel type, shipyard, owner, fuel type, region, number of vessels, expected yard, status.
- Choose track: Opportunity (Fuel Transfer Pump) vs Project (Anti-Heeling). 
- System assigns unique number: Opportunity No. (fuel) or Project No. (anti-heeling).
- Attach drawings/specs if available.

3) Engagement
- Identify contacts (owner, shipyard, designer). 
- Coordinate with abroad office when shipyard falls under their territory.
- Log activities (calls/emails/meetings) and next steps.

4) RFQ management
- Receive RFQ from shipyard; store and link to opportunity/project. 
- Capture specs: m³/h, mlc/bar, temperature, viscosity, materials, standards, approvals, accessories. 
- Generate/attach Deviation List (manual create + template). 
- Attach TP and optionally OBP (owner-facing).

5) Quoting
- Use Estimate Calculator (existing) with pricing master to produce price. 
- Include provisions/admin/commissioning logic; accessories and options. 
- Export branded quote (PDF/DOCX). 
- Track quote status: Draft → Sent → Pending → Revised → Accepted/Rejected.

6) PO → Order handover
- Register PO, assign Order No., capture delivery terms, payment schedule. 
- Generate order handover package for execution (production/logistics/commissioning) per Framo procedure. 
- Mark sales completion and track milestones for forecasting.

## Functional requirements

Market intelligence
- Create/edit Market Intel items with source metadata and links. 
- Request/record validation input from CN/KR/JP offices. 
- Promote to Lead or Discard; maintain reason codes.

Lead, opportunity, project
- Create/edit/delete leads; convert to opportunity/project. 
- Auto-generate identifiers (Opportunity No., Project No.). 
- Store vessel/yard/owner/fuel basics; multi-vessel support (batch). 
- Ownership assignment (primary SE, supporting office).

Companies and contacts
- Manage Shipyards, Owners, Designers; dedupe logic; link to opportunities/projects. 
- Manage contacts with role (owner/yard/designer), territory, and communication preferences.

RFQ and documents
- Upload RFQs; structured spec fields; attach revisions. 
- Deviation list builder with sections (standards, materials, testing, docs). 
- TP/OBP attachment handling; versioning; approver sign-off.

Quoting
- Use Estimate Calculator module; pull pricing master and accessory catalog. 
- Pricing rules: region factors, currency, discounts, validity, incoterms. 
- Output export (PDF/DOCX) and email-send with logging. 
- Approval gates for discount > threshold; require manager approval.

Order and milestones
- Register PO with terms (downpayment %, LC, CIF/FOB, delivery window). 
- Handover checklist (BOM snapshot, scope, options, commissioning assumptions). 
- Milestone tracking (PO date, DP received, FAT, shipment, commissioning, payment milestones).

Activities and tasks
- Log calls/emails/meetings; reminders and assignments; activity feed on entity pages. 
- Task templates (RFQ response due, quote follow-up, PO chase).

Reporting and forecasting
- Pipeline by stage/fuel type/yard/owner/region. 
- Forecast value with probability; expected close date. 
- Win/loss reasons; Quote turnaround time; PO conversion rate.

Notifications and collaboration
- Mentions and subscriptions on entities; digest emails; SLA alerts (RFQ > X days). 
- Regional collaboration: tag abroad office; visibility rules.

Audit and compliance
- Field-level history; document versioning; export audit log.

## Non-functional requirements

- Stack: React + Tailwind (frontend), Node/Express (backend), Postgres (Render). 
- Performance: core views < 2s on broadband; pagination/virtualization for large tables. 
- Security: RBAC, JWT sessions, password resets, audit; PII minimal. 
- Availability: target 99.5% for internal use; graceful degradation if backend unavailable. 
- Data retention: retain sales records 7 years; hard-delete only for test data. 
- Internationalization: support EN baseline; later CN/KR/JP labels.

## Key objects and fields (data model overview)

Note: bullets list core fields; implement via migrations incrementally. Types map to `types.ts` and backend API.

MarketIntel
- id, createdAt, source (Tradewinds | ship.energy | Clarksons | Other), url, summary, region, fuelType (Methanol | LNG | NH3), vesselType, vesselsCount, notes, validatedByOffice (CN|KR|JP|None), validationNotes, status (Open | Promoted | Discarded), discardedReason.

Lead
- id, createdAt, vesselType, fuelType, shipyardId, ownerId, region, vesselsCount, sourceIntelId?, status (Open|Converted|Lost), ownerUserId.

Opportunity (Fuel)
- id, oppNo, leadId?, vesselType, fuelType, shipyardId, ownerId, designerId?, country, region, vesselsCount, valueEstimate, probability, stage (Discovery|RFQ|Quoted|PO|ClosedWon|ClosedLost), ownerUserId, abroadOffice (CN|KR|JP|None).

Project (Anti-Heeling)
- id, projectNo, leadId?, vesselType, shipyardId, ownerId, designerId?, vesselsCount, stage, ownerUserId.

Company
- id, type (Shipyard|Owner|Designer|Other), name, country, website, address, region, notes, externalIds?.

Contact
- id, companyId, name, title, email, phone, role (Owner|Shipyard|Designer), territory, notes.

RFQ
- id, entityType (Opportunity|Project), entityId, rfqNo?, receivedDate, dueDate?, specs { flow_m3h, head_mlc_or_bar, temp_C, viscosity_cSt, materials, standards, power_supply, approvals }, attachments[], revision, status (Open|Responded|Won|Lost).

Deviation
- id, rfqId, sections[{ title, items[{ requirement, proposed, impact, notes }] }], approval { requestedBy, approvedBy?, date }.

TechnicalProposal (TP)
- id, rfqId, version, fileId, summary, createdBy, approvedBy?.

OwnerBenefitPackage (OBP)
- id, rfqId, version, fileId, highlights[].

Quote
- id, rfqId, quoteNo, currency, basePrice, options[], discounts[], incoterms, validityDays, deliveryWeeks, exportedFileId?, status (Draft|Sent|Pending|Revised|Accepted|Rejected), approvals[].

PurchaseOrder
- id, entityType, entityId, poNo, date, amount, currency, incoterms, paymentSchedule[{ milestone, percent, due }], documents[], orderNo.

OrderHandover
- id, poId, checklist[{ item, status, notes }], bomSnapshotRef, commissioningAssumptions, logisticsNotes, status.

Activity
- id, entityType, entityId, type (Call|Email|Meeting|Note), date, byUserId, summary, nextAction?, dueDate?.

File
- id, fileName, mimeType, size, storagePath, uploadedBy, entityType, entityId, version?, tags[].

Task
- id, title, dueDate, assigneeId, entityType, entityId, template?, status.

## UX and navigation (maps to current repo)

- Sidebar: add entries for Intelligence, Leads, Opportunities, Projects, RFQs, Quotes, Orders, Reports. 
- Spreadsheet-style grids (reuse `CompanyInfoPage.tsx` patterns) for fast inline edits; virtualized rows for performance.
- Detail views: tabs for Details, RFQ, Quote, Files, Activities, Tasks.
- Modals (existing): `EstimateCalculatorModal.tsx`, `EditProjectModal.tsx`, `ManageTeamModal.tsx`.

Suggested components to add
- `MarketIntelPage.tsx` (grid + validate/promote actions). 
- `LeadListPage.tsx`, `LeadDetails.tsx`. 
- `OpportunityDetails.tsx` (Fuel) and `ProjectDetails.tsx` (Anti-Heeling). 
- `RFQSection.tsx` with DeviationList editor and TP/OBP attachments. 
- `QuoteBuilder.tsx` integrating the Estimate Calculator and pricing.

## API surface (backend `backend/index.js`)

Market Intel
- GET/POST/PATCH/DELETE /api/intel

Leads
- GET/POST/PATCH/DELETE /api/leads 
- POST /api/leads/:id/convert → { type: "opportunity"|"project" }

Opportunities & Projects
- GET/POST/PATCH/DELETE /api/opportunities
- GET/POST/PATCH/DELETE /api/projects

Companies & Contacts
- GET/POST/PATCH/DELETE /api/companies 
- GET/POST/PATCH/DELETE /api/contacts

RFQ & Docs
- GET/POST/PATCH/DELETE /api/rfqs
- POST /api/rfqs/:id/deviations
- POST /api/rfqs/:id/tp
- POST /api/rfqs/:id/obp

Quotes
- GET/POST/PATCH/DELETE /api/quotes
- POST /api/quotes/:id/export (PDF/DOCX)
- POST /api/quotes/:id/send

POs & Orders
- GET/POST/PATCH/DELETE /api/pos
- GET/POST/PATCH/DELETE /api/orders

Activities & Tasks
- GET/POST/PATCH/DELETE /api/activities
- GET/POST/PATCH/DELETE /api/tasks

Auth & Users
- POST /api/auth/login, POST /api/auth/reset
- GET/POST/PATCH /api/users, /api/roles

## Data migrations plan (Postgres)

Phase 1
- Companies, Contacts (may exist); add types and country/website if missing. 
- Opportunities, Projects tables with minimal fields and number generators. 
- Activities, Files (linking via entityType/entityId). 
- Pricing master tables if not persisted (initially can live in `pricingData.ts`).

Phase 2
- MarketIntel, Leads, RFQs, Quotes. 
- Deviation, TP, OBP, PO, OrderHandover, Tasks.

General
- Use new SQL migration files per change (no edits to old migrations). 
- Add FKs and indices for lookups (companyId, ownerId, shipyardId, entityId compound). 
- Soft delete pattern via deletedAt when appropriate.

## Reporting and KPIs

- Pipeline value by stage/fuel type (Methanol/LNG/NH3). 
- Lead → RFQ → Quote → PO conversion rates. 
- Quote turnaround time (RFQ received → quote sent). 
- Win/Loss by yard/owner/region; reasons. 
- Forecast by close date and probability. 
- SLA: RFQ response ≤ X business days; follow-up cadences.

## Acceptance criteria (Phase 1: CRM core)

- Can create Companies (Shipyard/Owner/Designer) and Contacts; search and link to opportunities/projects. 
- Can log Market Intel and promote to Lead, then convert to Opportunity/Project. 
- Can create Opportunity (fuel) with oppNo and Project (anti-heeling) with projectNo. 
- Can attach files to an Opportunity/Project.
- Can log Activities and Tasks with reminders. 
- Basic pipeline view filtered by fuel type and stage. 
- Auth with roles (SE, Manager, Admin); audit changes on key entities.

## Acceptance criteria (Phase 2: RFQ + Quote)

- Can create RFQ with spec fields and attachments; track revisions. 
- Can build Deviation list and attach TP/OBP. 
- Can generate a Quote using Estimate Calculator and export PDF; track statuses and approvals.

## Acceptance criteria (Phase 3: PO + Handover)

- Can register PO with terms and schedule; auto-generate Order No. 
- Handover checklist captured and exportable; milestone tracking visible on pipeline.

## Risks and mitigations

- Data source compliance: avoid automated scraping that violates ToS; prefer manual input or APIs with agreements. 
- Data quality: enforce required fields and deduplication; office validation step. 
- Change management: start with minimal fields, iterate with real usage; add help text/tooltips. 
- Security: enforce least-privilege roles; audit trail; avoid storing sensitive owner data unnecessarily.

## Rollout plan

- Pilot with 1–2 Sales Engineers for 2 weeks (Phase 1). 
- Iterate UI based on usage; then expand to abroad offices. 
- Train on RFQ/Quote flow (Phase 2); add templates. 
- Align handover package with execution teams (Phase 3).

## Mapping to repo (quick pointers)

- Frontend: React + Tailwind at root. Add new pages/components under `components/` as listed. Update `types.ts` with entities above. Use `context/DataContext.tsx` and `hooks/useCrmData.ts` for fetching/state. Spreadsheet-style grids follow `CompanyInfoPage.tsx` pattern. 
- Backend: `backend/index.js` for REST endpoints; add routes listed under API surface. SQL migrations live in `/backend/*.sql`—create new files for each schema change. 
- Pricing: start with `data/pricingData.ts`, move to DB tables later for multi-user updates.

## Glossary

- RFQ: Request for Quote from shipyard with spec requirements. 
- TP: Technical Proposal. 
- OBP: Owner Benefit Package (owner-facing value drivers). 
- Opp No.: Unique identifier for fuel opportunities. 
- Project No.: Unique identifier for anti-heeling projects.
