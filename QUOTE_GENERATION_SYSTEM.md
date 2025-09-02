Quote Generation System
=======================

Goals
- Generate project quotes from Estimator inputs.
- Produce structured line items (item no, qty, unit, description) and sync them to DB.
- Prefer branded DOCX; auto-fallback to programmatic DOCX or TXT for reliability.

Data Flow
- Estimator saves payload per project into `project_estimates (data JSONB)` via
  `POST /api/projects/:id/estimates { type, data }`.
- Quote generation reads project + estimate, builds an items list, then:
  1) writes a DOCX file to `project_files` (using preferred template or programmatic DOCX fallback; TXT as last resort),
  2) syncs AUTO-tagged items into `project_line_items` (idempotent; previous AUTO items are replaced).

API
- Save estimate: `POST /api/projects/:id/estimates`
  - body: `{ type: 'anti_heeling' | 'fuel_transfer' | string, data: object }`
- Generate quote + sync items: `POST /api/projects/:id/generate-quote`
  - body: `{ type?: string, syncLineItems?: boolean, format?: 'docx' | 'txt' }`
  - defaults: `{ type: 'anti_heeling', syncLineItems: true, format: 'docx' }`
  - behavior: if a preferred template exists it’s used; otherwise a programmatic DOCX with an Items table is generated; TXT fallback last.

Line Items API (Project-scoped)
- List: `GET /api/projects/:id/line-items`
  - returns: `[ { id, projectId, productVariantId, type, quantity, capacity, head, unitPrice, currency, discount, unit, notes, createdAt, updatedAt } ]`
- Create: `POST /api/projects/:id/line-items` (auth)
  - body: `{ productVariantId?, type?, quantity?, capacity?, head?, unitPrice?, currency?, discount?, unit?, description? | notes? }`
- Update: `PUT /api/line-items/:itemId` (auth)
  - body: any writable subset of the above fields (use `description` to set `notes`)
- Delete: `DELETE /api/line-items/:itemId` (auth)

Estimator → Items Mapping (initial)
- Pump item
  - Inputs (from estimate data; fallbacks shown in parens):
    - `pumpQuantity` (fallback: `projects.pumps_per_vessel` or 1)
    - `pumpType` (fallback: `"RBP-250 inline reversible single stage propeller pump"`)
    - `capacity_m3h` (fallback: `projects.flow_capacity_m3h`)
    - `head_mwc` (fallback: `projects.flow_mwc`)
    - `power_kw` (fallback: `projects.flow_power_kw`)
    - `ex` boolean or `motorRating` contains "EX"
    - `motorType` (fallback: `"Ex motor"` when ex true, else `"IE3"`)
    - `motor_power_kw` (fallback: `power_kw`)
    - `supply` (fallback: `"440V/60Hz/3ph"`)
  - Description format:
    - `<pumpType>, capacity <cap> @ <head> @ <power>, <IP/Ex> el. motor rating <motor_power_kw> kW (<motorType>) at <supply>. Thermistor and space-heater included.`
  - DB write:
    - `project_line_items` rows with
      - `project_id`, `legacy_type = 'pump'`, `quantity`, `capacity`, `head`, `notes = 'AUTO: ' + description`.

- Control system (MCU)
  - Inputs: `controlSystemQty` (default 1), `controlSystemMode`, `controlSystemScreen`, `controlSystemMount`, `controlSystemInterface`
  - Default description: "Automatically or manually operated control system (MCU) with 7” touch screen, desk or cabinet-wall mounted. ModBus RS485 for interface to vessel IAS."

- Starters
  - Inputs: `starterQty` (default = pumpQuantity)
  - Description: "DOL starter for the el. motor with ammeter, running-hour and emergency stop."

- Butterfly valves
  - Inputs: `valveQty`, `valveDN` (e.g., DN400), `valveType` (e.g., LUG), `valveSingleActingQty` (default 1), `valveDoubleActingQty` (default 1), `valveAirDryFilter` (default true)
  - Description example: "Pneumatically butterfly valve DN400 LUG. 1-of single + 1-of double acting with air dry filter."

- Level switches
  - Inputs: `levelSwitchQty`
  - Description: "Level switch for high/low level alarm in tanks"

- Tools / manuals / certificates (set)
  - Inputs: `toolsSet: true`
  - Unit: `set`
  - Description: "Tools, service manuals and class required certificates."

- Startup assistance
  - Inputs: `startupSupport: true`, `startupSupportPersons` (default 1), `startupSupportDays` (optional)
  - Description: "Assistance at start-up commissioning of the system, <persons>-man, <days>-working days."

Output
- Default is DOCX. The generator will first try your template at `backend/files/templates/Quote Anti-Heeling MAL.docx` (preferred) or `Quote MAL.docx`.
  Then `quote_anti_heeling.docx` / `quote.docx`, then the first `.docx` in that folder. If no template is available, it falls back to a
  programmatic DOCX; if that fails, to TXT. The table shows Item, Qty, Unit, Description and a footer `Price: <CURRENCY> <TOTAL>`.

Extensibility
- Add mappers for additional components (piping, install, services).
- Add pricing to items and compute totals from line items when available.

Backward Compatibility
- Additive changes only; existing endpoints and file outputs remain.
- Legacy `products` API remains usable; `project_line_items` is preferred going forward.
