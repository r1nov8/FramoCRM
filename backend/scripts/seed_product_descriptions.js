import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Ensure we read backend/.env even if running from repo root
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const poolOpts = { connectionString: process.env.DATABASE_URL, max: 1 };
if ((process.env.DATABASE_URL || '').includes('render.com') || (process.env.DATABASE_URL || '').includes('sslmode=require')) {
  poolOpts.ssl = { rejectUnauthorized: false };
}
const pool = new Pool(poolOpts);

// Minimal, curated product description templates with placeholders
const items = [
  // Pumps
  ['ah_pump_rbp_300', 'Reversible propeller pump RBP-300, capacity {{capacity}} m³/h @ {{head}} mwc @ {{motorRating}} kW, vertically coupled to IP55 electric motor rated {{motorRating}} kW at 440 V/60 Hz/3-ph. Stainless-steel pump housing with Ni-Al bronze propeller. Mechanical seal with oil-filled cofferdam, leak detector, thermistor and space heater included.'],
  ['ah_pump_rbp_250', 'Reversible propeller pump RBP-250 (DN250) for anti-heeling service. Typical capacity {{capacity}} m³/h at {{head}} mwc. Constructed from stainless steel with Ni-Al bronze propeller. Bi-directional flow for rapid ballast transfer. Supplied with IP55 motor ({{motorVariant}}) with thermistor and space heater, and mechanical seal with cofferdam and leak sensor.'],
  ['ah_pump_rbp_400', 'Reversible propeller pump RBP-400 (DN400) engineered for high-capacity anti-heeling. Delivers {{capacity}} m³/h at {{head}} mwc. Stainless-steel casing, Ni-Al bronze propeller and leak-safe mechanical seal. Driven by IP55 electric motor sized {{motorRating}} kW, with thermistor and space heater.'],

  // Motors
  ['ah_motor_non_ex', 'Three-phase Non-Ex TEFC electric motor sized for the selected pump duty. Rated IP55, 380–690 V, 50/60 Hz. Includes embedded thermistors and space heater. Selected rating {{motorRating}} kW.'],
  ['ah_motor_ex_proof', 'Explosion-proof electric motor sized for the selected pump duty. Certified II 2 G Ex d IIC T4 for hazardous areas. IP55, TEFC. Includes thermistors and space heater. Selected rating {{motorRating}} kW.'],

  // Starters
  ['ah_starter_dol', 'Direct-On-Line starter panel for the electric motor, complete with contactors, overload relays, ammeter, running-hour meter and emergency stop.'],
  ['ah_starter_yd', 'Star-Delta starter cabinet for reduced inrush current. Includes contactors, timer relay, over-current protection and emergency stop.'],
  ['ah_starter_soft', 'Electronic soft-starter providing controlled ramp-up and ramp-down of motor speed. Reduces mechanical and electrical stresses. Panel includes overload protection, bypass contactor and emergency stop.'],
  ['ah_starter_vfd', 'Variable Frequency Drive for full speed control of the pump motor (0–100 Hz). Includes filter and braking resistor where required. Provides soft-start/stop and PID control inputs.'],

  // Valves
  ['ah_valve_pne_single', 'Pneumatic butterfly valve, single-acting, Lug type, stainless-steel disc and EPDM seat. Complete with solenoid valve, air filter/regulator and limit switches for open/closed indication.'],
  ['ah_valve_pne_double', 'Pneumatic butterfly valve, double-acting, Lug type, sized to pipeline. Delivered with air dryer/filter. Provides quick open/close action for anti-heeling operation.'],
  ['ah_valve_electric_single', 'Electric-actuated butterfly valve, single-acting, IP67 actuator housing, manual override and built-in limit switches. Suitable for remote control via MCU. Stainless-steel disc and EPDM seat.'],
  ['ah_valve_electric_double', 'Electric-actuated butterfly valve, double-acting (failsafe), with weatherproof actuator and local handwheel. Supplied with limit switches and position indicator.'],

  // Instrumentation & extras
  ['ah_level_switch', 'High/low level switch for ballast tanks: float sensor in stainless-steel tube with reed contacts. Provides discrete signals to the MCU for automatic shut-off or alarm.'],
  ['ah_local_switch_panel', 'Local switch panel for starter: start/stop push buttons, reset and status lamps. Installed near pump or starter cabinet.'],
  ['ah_pressure_mon', 'Pressure gauge and transmitter set for monitoring pump suction and discharge pressure. Stainless-steel gauges and 4–20 mA transmitters with cable glands and test block.'],
  ['ah_ex_actuator', 'Explosion-proof electric actuator for valves in hazardous area, certified Ex d IIB T4. With position feedback and manual override.'],
  ['ah_valve_handwheel', 'Manual handwheel for pneumatic or electric valves, enabling local operation in the event of actuator failure.'],
  ['ah_valve_cast_body', 'Cast-steel body option for butterfly valves, suitable for higher pressure ratings or class requirements.'],
  ['ah_counter_flanges', 'Set of counter flanges, bolts and nuts (carbon or stainless steel) for connecting pump and valves to yard piping.'],
  ['ah_spare_parts', 'Recommended spare parts package for the anti-heeling pump(s), including mechanical seals, gaskets, bearings and O-rings for one complete overhaul.'],

  // Control systems
  ['ah_control_mcu', 'Automatically or manually operated control system (MCU) with 7″ touch screen; desk- or cabinet-wall mounted. PLC with anti-heeling logic, manual overrides and emergency stop. Digital/analogue I/O and ModBus RS-485 interface to vessel IAS.'],
  ['ah_control_slave', 'Secondary control desk with duplicate controls and display for anti-heeling system. Allows operation from a remote location on the vessel.'],
  ['ah_control_screen_15', 'Upgrade of HMI to a 15″ touch screen with enhanced graphical interface. Includes larger panel door and mounting kit.'],

  // Certification & services
  ['ah_class_cert', 'Class certification by {{classSociety}}, including design review, witness tests and issuance of certificates for pump, valves and control system. Pricing per power bracket {{classBracket}}.'],
  ['ah_tools_manuals', 'Tools, service manuals and class-required certificates for the complete anti-heeling system.'],
  ['ah_commissioning', 'Assistance at start-up and commissioning. Includes 1-man service engineer for {{commissionDays}} working days, supervising installation, functional testing, class witness and crew training. Additional days on request.'],
];

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_descriptions (
        key TEXT PRIMARY KEY,
        scope_template TEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    if (process.argv.includes('--reset')) {
      await client.query('TRUNCATE TABLE product_descriptions');
    }
    for (const [key, tpl] of items) {
      await client.query(
        `INSERT INTO product_descriptions(key, scope_template)
         VALUES ($1,$2)
         ON CONFLICT (key) DO UPDATE SET scope_template = EXCLUDED.scope_template, updated_at = NOW()`,
        [key, tpl]
      );
    }
    console.log(`Seeded ${items.length} product descriptions.`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((e) => { console.error(e?.message || e); process.exit(1); });

