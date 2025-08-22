// NOTE: This data is extracted from the provided PDF pricelist document.
// All prices are in NOK unless otherwise specified.

export type PumpVariant = 'CS' | 'CST' | 'CSTV';

export interface PriceEntry {
  length: number;
  CS?: number;
  CST?: number;
  CSTV?: number;
}

export interface Accessory {
  name: string;
  price: number;
  material?: string;
}

export interface PumpPriceData {
  description: string;
  prices: PriceEntry[];
  trunk?: Accessory[];
  optionalAccessories?: Accessory[];
}

type GenericPriceData = {
    [key: string]: PumpPriceData | { [key: string]: number } | any;
}

export const PRICING_DATA: GenericPriceData = {
    antiHeeling: {
        pumps: {
            'RBP-250': 57500,
            'RBP-300': 63000,
            'RBP-400': 99000,
        },
        motors: {
            nonEx: [
                { model: '160MLA', kw: 15, type: 'N', price: 11000 },
                { model: '160MLB', kw: 18.5, type: 'N', price: 13350 },
                { model: '160MLC', kw: 22, type: 'N', price: 14450 },
                { model: '160MLD', kw: 25, type: 'HO', price: 15200 },
                { model: '180MLA', kw: 27, type: 'N', price: 16700 },
                { model: '160MLE', kw: 30, type: 'HO', price: 18150 },
                { model: '180MLB', kw: 35, type: 'HO', price: 21000 },
                { model: '200MLA', kw: 37, type: 'N', price: 23300 },
                { model: '200MLB', kw: 45, type: 'N', price: 28260 },
                { model: '200MLC', kw: 52, type: 'HO', price: 31000 },
                { model: '225SMA', kw: 55, type: 'N', price: 34100 },
                { model: '200MLD', kw: 60, type: 'HO', price: 50000 },
                { model: '225SMB', kw: 65, type: 'HO', price: 52000 },
                { model: '225SMC', kw: 82, type: 'HO', price: 54000 },
                { model: '225SMD', kw: 85, type: 'HO', price: 58000 },
                { model: '250SMB', kw: 86, type: 'HO', price: 60000 },
                { model: '250SMA', kw: 90, type: 'N', price: 60000 },
                { model: '250SMC', kw: 99, type: 'HO', price: 67000 },
                { model: '280SMB', kw: 110, type: 'N', price: 71550 },
                { model: '280SMC', kw: 125, type: 'HO', price: 78000 },
                { model: '280MLA', kw: 132, type: 'N', price: 85000 },
                { model: '280MLB', kw: 160, type: 'HO', price: 106500 },
                { model: '280MLB', kw: 200, type: 'N', price: 126000 },
            ],
            exProof: [
                { model: '160MLB', kw: 18.5, type: 'N', price: 32500, iict4: 3000 },
                { model: '160MLC', kw: 22, type: 'N', price: 37800, iict4: 3000 },
                { model: '180MLB', kw: 30, type: 'HO', price: 47700, iict4: 3000 },
                { model: '200MLA', kw: 37, type: 'N', price: 58000, iict4: 5000 },
                { model: '180MLC', kw: 45, type: 'HO', price: 65000, iict4: 5000 },
                { model: '225SMB', kw: 55, type: 'N', price: 80000, iict4: 7000 },
                { model: '225SMD', kw: 75, type: 'HO', price: 92300, iict4: 8000 },
                { model: '280SMA', kw: 90, type: 'N', price: 106200, iict4: 8000 },
                { model: '280SMB', kw: 110, type: 'N', price: 138400, iict4: 8000 },
                { model: '315SMA', kw: 132, type: 'N', price: 168000, iict4: 13000 },
                { model: '315SMB', kw: 160, type: 'N', price: 203300, iict4: 13000 },
            ]
        },
        starters: {
            DOL: {
                '0-20kW': 22000,
                '20-60kW': 28000,
                '60-80kW': 34000,
                '80-100kW': 42000,
                '100-120kW': 46000,
                '120-150kW': 50000,
            },
            SOFT: {
                '0-20kW': 31000,
                '20-60kW': 36000,
                '60-80kW': 41500,
                '80-100kW': 43000,
                '100-120kW': 52000,
                '120-150kW': 58800,
            },
            YD: {
                '33kW Y/D': 46000,
                '70kW Y/D': 53000,
                '122kW Y/D': 60000,
                '132kW Y/D': 56000,
            },
            convertersWallMount: {
                '30kW 380-500V IP55 R4': { EUR: 1686, NOK: 16860 },
                '75kW 380-500V IP55 R6': { EUR: 2927, NOK: 29270 },
                '90kW 380-500V IP55 R7': { EUR: 3652, NOK: 36520 },
                '110kW 380-500V IP55 R7': { EUR: 4198, NOK: 41980 },
                '132kW 380-500V IP55 R8': { EUR: 4650, NOK: 46500 },
                '160kW 380-500V IP55 R8': { EUR: 5651, NOK: 56510 },
            },
            vfd690vWithFilter: {
                '75kW 690V IP55 R6': { EUR: 4033, NOK: 48610 },
                '90kW 690V IP55 R7': { EUR: 4632, NOK: 54600 },
                '110kW 690V IP55 R7': { EUR: 4945, NOK: 58370 },
                '132kW 690V IP55 R8': { EUR: 5800, NOK: 66920 },
                '160kW 690V IP55 R8': { EUR: 6594, NOK: 74860 },
                '160kW 380-500V IP55 R8': { EUR: 6791, NOK: 76830 },
                'du/dt filter 75/90kW': { EUR: 828 },
                'du/dt filter 110/132/160kW': { EUR: 892 },
                'CCS certificate VFD': { EUR: 3000 },
            },
            VFD: {
                '75kW 690V IP55 R6 (incl. filter)': 48610,
                '90kW 690V IP55 R7 (incl. filter)': 54600,
                '110kW 690V IP55 R7 (incl. filter)': 58370,
                '132kW 690V IP55 R8 (incl. filter)': 66920,
                '160kW 690V IP55 R8 (incl. filter)': 74860,
                '160kW 380-500V IP55 R8': 76830,
            }
        },
        levelSwitches: {
            'Std. switch for high/low level': 3000,
            'For tank top (20m cable)': 3000,
            'Transmitter (0110-0089-2)': 8700,
        },
        valvesPneumatic: {
            singleActing: {
                'DN200 Wafer': 15808,
                'DN250 Wafer': 17472,
                'DN250 Lug': 19968,
                'DN250 Semi-Lug': 15808,
                'DN300 Wafer': 21133,
                'DN300 Lug': 23962,
                'DN350 Wafer': 25126,
                'DN350 Lug': 25126,
                'DN400 Wafer': 31616,
                'DN400 Lug': 36109,
                'DN450 Lug': 46925,
                'DN500 Lug': 58406,
            },
            doubleActing: {
                'DN200 Wafer': 11520,
                'DN250 Wafer': 11904,
                'DN250 Lug': 12800,
                'DN250 Semi-Lug': 11520,
                'DN300 Wafer': 13696,
                'DN300 Lug': 16000,
                'DN350 Wafer': 16768,
                'DN350 Lug': 16768,
                'DN400 Wafer': 20480,
                'DN400 Lug': 22144,
                'DN450 Lug': 27648,
                'DN500 Lug': 31104,
            },
        },
                valvesElectroHydraulic: {
                    // ENK. EL-HYDR. (Single electro-hydraulic) Total prices with open/close seconds
                    'DN250 Wafer': { valveHouse: 3150, actuator: 33500, total: 36650, openSec: 13, closeSec: 16 },
                    'DN250 Lug': { valveHouse: 4000, actuator: 33500, total: 37500, openSec: 13, closeSec: 16 },
                    'DN250 DBL FLANGE': { valveHouse: 5300, actuator: 33500, total: 38800, openSec: 13, closeSec: 16 },
                    'DN300 Wafer': { valveHouse: 5800, actuator: 35800, total: 41600, openSec: 29, closeSec: 29 },
                    'DN300 Lug': { valveHouse: 6380, actuator: 35800, total: 42180, openSec: 29, closeSec: 29 },
                    'DN300 MONO': { valveHouse: 6000, actuator: 35800, total: 41800, openSec: 29, closeSec: 29 },
                    'DN300 DBL FLANGE': { valveHouse: 6500, actuator: 35800, total: 42300, openSec: 29, closeSec: 29 },
                    'DN350 Wafer': { valveHouse: 7000, actuator: 42000, total: 49000, openSec: 26, closeSec: 22 },
                    'DN350 Lug': { valveHouse: 7000, actuator: 42000, total: 49000, openSec: 26, closeSec: 22 },
                    'DN350 MONO': { valveHouse: 7200, actuator: 42000, total: 49200, openSec: 26, closeSec: 22 },
                    'DN350 DBL FLANGE': { valveHouse: 7800, actuator: 42000, total: 49800, openSec: 26, closeSec: 22 },
                    'DN400 Wafer': { valveHouse: 10800, actuator: 42400, total: 53200, openSec: 26, closeSec: 22 },
                    'DN400 Lug': { valveHouse: 11200, actuator: 42400, total: 53600, openSec: 26, closeSec: 22 },
                    'DN400 MONO': { valveHouse: 11600, actuator: 42400, total: 54000, openSec: 26, closeSec: 22 },
                    'DN400 DBL FLANGE': { valveHouse: 12400, actuator: 42400, total: 54800, openSec: 26, closeSec: 22 },
                    'DN450 Wafer': { valveHouse: 12800, actuator: 47000, total: 59800, openSec: 35, closeSec: 10 },
                    'DN450 Lug': { valveHouse: 13000, actuator: 47000, total: 60000, openSec: 35, closeSec: 10 },
                    'DN450 MONO': { valveHouse: 13500, actuator: 47000, total: 60500, openSec: 35, closeSec: 10 },
                    'DN450 DBL FLANGE': { valveHouse: 14000, actuator: 47000, total: 61000, openSec: 35, closeSec: 10 },
                    'DN500 Wafer': { valveHouse: 16000, actuator: 51700, total: 67700, openSec: 35, closeSec: 23 },
                    'DN500 Lug': { valveHouse: 17235, actuator: 51700, total: 68935, openSec: 35, closeSec: 23 },
                    'DN500 MONO': { valveHouse: 20000, actuator: 51700, total: 71700, openSec: 35, closeSec: 23 },
                    'DN500 DBL FLANGE (AFFCO)': { valveHouse: 22500, actuator: 51700, total: 74200, openSec: 35, closeSec: 23 },
                },
        // Pure Electric valves (Single-acting and Double-acting)
        valvesElectricPure: {
            singleActing: {
                // ENKV Pure EL.
                'DN250 Wafer': 46150,
                'DN250 Lug': 47000,
                'DN250 DBL FLANGE': 48300,
                'DN300 Wafer': 53100,
                'DN300 Lug': 53680,
                'DN300 MONO': 53300,
                'DN300 DBL FLANGE': 53800,
                'DN350 Wafer': 58600,
                'DN350 Lug': 58600,
                'DN350 MONO': 58800,
                'DN350 DBL FLANGE': 59400,
                'DN400 Wafer': 66700,
                'DN400 Lug': 67100,
                'DN400 MONO': 67500,
                'DN400 DBL FLANGE': 68300,
                'DN450 Wafer': 73000,
                'DN450 Lug': 73200,
                'DN450 MONO': 73700,
                'DN450 DBL FLANGE': 74200,
                'DN500 Wafer': 80500,
                'DN500 Lug': 81735,
                'DN500 MONO': 84500,
                'DN500 DBL FLANGE (AFFCO)': 87000,
            },
            doubleActing: {
                // DBL Pure EL.
                'DN250 Wafer': 12721.42857,
                'DN250 Lug': 13571.42857,
                'DN250 DBL FLANGE': 14871.42857,
                'DN300 Wafer': 16028.57143,
                'DN300 Lug': 16608.57143,
                'DN300 MONO': 16228.57143,
                'DN300 DBL FLANGE': 16728.57143,
                'DN350 Wafer': 19000,
                'DN350 Lug': 19000,
                'DN350 MONO': 19200,
                'DN350 DBL FLANGE': 19800,
                'DN400 Wafer': 22914.28571,
                'DN400 Lug': 23314.28571,
                'DN400 MONO': 23714.28571,
                'DN400 DBL FLANGE': 24514.28571,
                'DN450 Wafer': 26228.57143,
                'DN450 Lug': 26428.57143,
                'DN450 MONO': 26928.57143,
                'DN450 DBL FLANGE': 30000,
                'DN500 Wafer': 30771.42857,
                'DN500 Lug': 32006.42857,
                'DN500 MONO': 34771.42857,
                'DN500 DBL FLANGE (AFFCO)': 37271.42857,
            }
        },
        pumpAdditions: {
            'Manometer': 3000,
        },
        motorAdditions: {
            'Top Hat, cast': 1500,
        },
        starterAdditions: {
            'Local switch': 5100,
        },
        valveExtras: {
            'Cast steel body': 4000,
            'HandWheel': 4000,
        },
        controlSystemAH: {
            'Standard desk mounting': 34000,
            'Slave desk mounting': 13000,
            '15" screen': 7000,
            'ModBus (RS485)': 1100,
        },
        measurement: {
            'Pump pressure in/out': 4000,
        },
        otherEquipment: {
            'EX-proof actuator': 3000,
            'EX-proof switch': 4000,
            'Counter flanges': 3000,
            'Spare parts': 0,
        },
        startupLocations: {
            'Norway (Vard, Ulstein, etc.)': { dayRate: 17050, travel: 16280, average: 50600 },
            'Branch offices (Rotterdam, Singapore, Houston)': { dayRate: 13750, travel: 'All inclusive', average: 41800 },
            'Europe - General': { average: 70000 },
            'Germany': { average: 70000 },
            'Italy': { average: 70000 },
            'Netherlands': { average: 70000 },
            'Spain': { average: 70000 },
            'Balkan': { average: 70000 },
            'Turkey': { average: 70000 },
            'Europe - Min typical': { average: 50000 },
            'Korea (general)': { dayRate: 12500, travel: 'All inclusive', average: 45000 },
            'HHI': { average: 45000 },
            'HMD': { average: 45000 },
            'HHIC': { average: 45000 },
            'SHI': { average: 45000 },
            'DSME': { average: 45000 },
            'HHI Subic Philippines': { dayRate: 14850, travel: 19800, average: 71500 },
            'China - Shanghai area': { dayRate: 9460, average: 45000 },
            'China - Guangzhou/Dalian etc.': { dayRate: 11550, travel: 10120, average: 56000 },
            'Japan': { average: 56000 },
        },
    classCertification: {
            DNV: {
                '<100kW': { pump: 2500, price2: 500, price3: 0, system: 0 },
                '>100kW': { pump: 3500, price2: 5000, price3: 0, system: 0 },
            },
            KR: {
                '<100kW': { pump: 5000, price2: 4000, price3: 500, system: 4000 },
                '>100kW': { pump: 5000, price2: 5000, price3: 5000, system: 0 },
            },
            NK: {
                '<100kW': { pump: 0, price2: 0, price3: 0, system: 0 },
                '>100kW': { pump: 2500, price2: 3000, price3: 0, system: 0 },
            },
            CCS: {
                '<50kW': { pump: 5500, price2: 3000, price3: 3000, system: 1500 },
                '>50kW': { pump: 6000, price2: 6000, price3: 500, system: 2500 },
            },
            ABS: {
                '<100kW': { pump: 3500, price2: 6400, price3: 500, system: 0 },
                '>100kW': { pump: 3500, price2: 6400, price3: 11000, system: 5500 },
            },
            LR: {
                '<100kW': { pump: 5000, price2: 5000, price3: 500, system: 0 },
                '>100kW': { pump: 5000, price2: 7000, price3: 6500, system: 6000 },
            },
            BV: {
                '<100kW': { pump: 1500, price2: 500, price3: 0, system: 0 },
                '>100kW': { pump: 11500, price2: 4200, price3: 0, system: 0 },
            },
            RINA: {
                '<100kW': { pump: 7000, price2: 500, price3: 0, system: 0 },
                '>100kW': { pump: 7000, price2: 2000, price3: 0, system: 0 },
            }
    },
    },
  cargoPumps: {
    SD100: {
      description: '50 - 120 m³/h',
      prices: [
        { length: 5, CS: 165000, CST: 166000, CSTV: 172000 },
        { length: 6, CS: 167000, CST: 168000, CSTV: 174000 },
        { length: 7, CS: 168000, CST: 169000, CSTV: 176000 },
        { length: 8, CS: 174000, CST: 175000, CSTV: 182000 },
        { length: 9, CS: 175000, CST: 176000, CSTV: 184000 },
        { length: 10, CS: 177000, CST: 178000, CSTV: 186000 },
        { length: 11, CS: 178000, CST: 180000, CSTV: 188000 },
        { length: 12, CS: 179000, CST: 181000, CSTV: 189000 },
        { length: 13, CS: 181000, CST: 183000, CSTV: 191000 },
        { length: 14, CS: 215000, CST: 225000, CSTV: 233000 },
        { length: 15, CS: 216000, CST: 226000, CSTV: 235000 },
        { length: 16, CS: 218000, CST: 228000, CSTV: 236000 },
        { length: 17, CS: 223000, CST: 233000, CSTV: 243000 },
        { length: 18, CS: 225000, CST: 235000, CSTV: 244000 },
        { length: 19, CS: 226000, CST: 237000, CSTV: 246000 },
        { length: 20, CS: 227000, CST: 238000, CSTV: 248000 },
        { length: 21, CS: 229000, CST: 240000, CSTV: 250000 },
        { length: 22, CS: 230000, CST: 241000, CSTV: 252000 },
        { length: 23, CS: 232000, CST: 243000, CSTV: 254000 },
        { length: 24, CS: 233000, CST: 244000, CSTV: 256000 },
      ],
      trunk: [
        { name: 'TRUNK H=500 SD100 T=12 MA EN 1.4432', price: 2000 },
        { name: 'TRUNK H=500 SD100 T=12 MA EN 1.4462', price: 3000 }
      ],
      optionalAccessories: [
          { name: 'WELL SUCTION SD100 T=15 EN 1.4432', price: 6000 },
          { name: 'WELL SUCTION SD100 T=17 EN 1.4432', price: 7000 }
      ]
    },
    SD125: {
        description: '120 - 250 m³/h',
        prices: [
            { length: 5, CS: 186000, CST: 188000, CSTV: 199000 },
            { length: 6, CS: 188000, CST: 190000, CSTV: 201000 },
            { length: 7, CS: 190000, CST: 192000, CSTV: 203000 },
            { length: 8, CS: 195000, CST: 198000, CSTV: 209000 },
            { length: 9, CS: 197000, CST: 200000, CSTV: 211000 },
            { length: 10, CS: 199000, CST: 202000, CSTV: 214000 },
            { length: 11, CS: 201000, CST: 204000, CSTV: 216000 },
            { length: 12, CS: 203000, CST: 206000, CSTV: 218000 },
            { length: 13, CS: 205000, CST: 208000, CSTV: 220000 },
            { length: 14, CS: 241000, CST: 247000, CSTV: 259000 },
            { length: 15, CS: 243000, CST: 249000, CSTV: 261000 },
            { length: 16, CS: 245000, CST: 251000, CSTV: 264000 },
            { length: 17, CS: 251000, CST: 257000, CSTV: 270000 },
            { length: 18, CS: 253000, CST: 259000, CSTV: 272000 },
            { length: 19, CS: 255000, CST: 261000, CSTV: 274000 },
            { length: 20, CS: 257000, CST: 263000, CSTV: 276000 },
            { length: 21, CS: 259000, CST: 265000, CSTV: 279000 },
            { length: 22, CS: 261000, CST: 267000, CSTV: 281000 },
            { length: 23, CS: 262000, CST: 269000, CSTV: 283000 },
            { length: 24, CS: 264000, CST: 271000, CSTV: 285000 },
        ],
        trunk: [
            { name: 'TRUNK H=500 SD125 T=12 MA EN 1.4432', price: 2000 },
            { name: 'TRUNK H=500 SD125 T=12 MA EN 1.4462', price: 4000 }
        ],
        optionalAccessories: [
            { name: 'WELL SUCTION SD125/150 T=15 EN 1.4432', price: 9000 },
            { name: 'WELL SUCTION SD125/150 T=17 EN 1.4432', price: 9000 }
        ]
    },
    SD150: {
        description: '250 - 385 m³/h',
        prices: [
            { length: 5, CS: 193000, CST: 197000, CSTV: 204000 },
            { length: 6, CS: 195000, CST: 199000, CSTV: 206000 },
            { length: 7, CS: 197000, CST: 201000, CSTV: 209000 },
            { length: 8, CS: 203000, CST: 207000, CSTV: 215000 },
            { length: 9, CS: 205000, CST: 209000, CSTV: 218000 },
            { length: 10, CS: 208000, CST: 212000, CSTV: 220000 },
            { length: 11, CS: 210000, CST: 214000, CSTV: 222000 },
            { length: 12, CS: 212000, CST: 216000, CSTV: 225000 },
            { length: 13, CS: 214000, CST: 218000, CSTV: 227000 },
            { length: 14, CS: 252000, CST: 258000, CSTV: 266000 },
            { length: 15, CS: 254000, CST: 260000, CSTV: 268000 },
            { length: 16, CS: 256000, CST: 262000, CSTV: 270000 },
            { length: 17, CS: 262000, CST: 268000, CSTV: 277000 },
            { length: 18, CS: 264000, CST: 270000, CSTV: 279000 },
            { length: 19, CS: 266000, CST: 273000, CSTV: 281000 },
            { length: 20, CS: 269000, CST: 275000, CSTV: 284000 },
            { length: 21, CS: 271000, CST: 277000, CSTV: 286000 },
            { length: 22, CS: 273000, CST: 279000, CSTV: 289000 },
            { length: 23, CS: 275000, CST: 282000, CSTV: 291000 },
            { length: 24, CS: 277000, CST: 284000, CSTV: 293000 },
        ],
        trunk: [
            { name: 'TRUNK H=500 SD150 T=12 MA EN 1.4432', price: 2000 },
            { name: 'TRUNK H=500 SD150 T=12 MA EN 1.4462', price: 3000 }
        ],
        optionalAccessories: [
            { name: 'WELL SUCTION SD125/150 T=15 EN 1.4432', price: 9000 },
            { name: 'WELL SUCTION SD125/150 T=17 EN 1.4432', price: 9000 }
        ]
    },
    SD200: {
        description: '385 - 650 m³/h',
        prices: [
            { length: 14, CS: 310000, CST: 308000, CSTV: 315000 },
            { length: 15, CS: 313000, CST: 313000, CSTV: 320000 },
            { length: 16, CS: 316000, CST: 318000, CSTV: 325000 },
            { length: 17, CS: 324000, CST: 328000, CSTV: 336000 },
            { length: 18, CS: 327000, CST: 334000, CSTV: 341000 },
            { length: 19, CS: 330000, CST: 339000, CSTV: 346000 },
            { length: 20, CS: 333000, CST: 344000, CSTV: 352000 },
            { length: 21, CS: 336000, CST: 349000, CSTV: 357000 },
            { length: 22, CS: 339000, CST: 354000, CSTV: 362000 },
            { length: 23, CS: 342000, CST: 359000, CSTV: 367000 },
            { length: 24, CS: 345000, CST: 364000, CSTV: 373000 },
        ],
        trunk: [
            { name: 'TRUNK H=500 SD200 T=12 MA EN 1.4432', price: 4000 },
            { name: 'TRUNK H=500 SD200 T=12 MA EN 1.4462', price: 7000 }
        ],
        optionalAccessories: [
            { name: 'WELL SUCTION SD200 T=15 EN 1.4432', price: 15000 },
            { name: 'WELL SUCTION SD200 T=17 EN 1.4432', price: 17000 }
        ]
    },
    SD250: {
        description: '750 m³/h',
        prices: [
            { length: 14, CS: 425000, CST: 445000, CSTV: 444000 },
            { length: 15, CS: 428000, CST: 449000, CSTV: 448000 },
            { length: 16, CS: 432000, CST: 452000, CSTV: 452000 },
            { length: 17, CS: 443000, CST: 464000, CSTV: 464000 },
            { length: 18, CS: 447000, CST: 467000, CSTV: 468000 },
            { length: 19, CS: 450000, CST: 471000, CSTV: 472000 },
            { length: 20, CS: 454000, CST: 475000, CSTV: 476000 },
            { length: 21, CS: 458000, CST: 479000, CSTV: 480000 },
            { length: 22, CS: 461000, CST: 483000, CSTV: 484000 },
            { length: 23, CS: 465000, CST: 486000, CSTV: 488000 },
            { length: 24, CS: 469000, CST: 490000, CSTV: 492000 },
        ],
        optionalAccessories: [
            { name: 'WELL SUCTION SD250 T=17 EN 1.4432', price: 19000 }
        ]
    },
    SD250L: {
        description: '900 m³/h',
        prices: [
            { length: 14, CS: 516000, CST: 521000, CSTV: 532000 },
            { length: 15, CS: 520000, CST: 525000, CSTV: 536000 },
            { length: 16, CS: 523000, CST: 529000, CSTV: 540000 },
            { length: 17, CS: 534000, CST: 540000, CSTV: 551000 },
            { length: 18, CS: 538000, CST: 544000, CSTV: 555000 },
            { length: 19, CS: 542000, CST: 548000, CSTV: 559000 },
            { length: 20, CS: 546000, CST: 551000, CSTV: 563000 },
            { length: 21, CS: 549000, CST: 555000, CSTV: 567000 },
            { length: 22, CS: 553000, CST: 559000, CSTV: 571000 },
            { length: 23, CS: 557000, CST: 563000, CSTV: 575000 },
            { length: 24, CS: 560000, CST: 567000, CSTV: 579000 },
        ],
         optionalAccessories: [
            { name: 'WELL SUCTION SD250 T=17 EN 1.4432', price: 19000 }
        ]
    },
    SD300L: {
        description: '1250 m³/h',
        prices: [
            { length: 14, CS: 621000, CST: 634000 },
            { length: 15, CS: 625000, CST: 638000 },
            { length: 16, CS: 630000, CST: 643000 },
            { length: 17, CS: 644000, CST: 657000 },
            { length: 18, CS: 648000, CST: 661000 },
            { length: 19, CS: 652000, CST: 666000 },
            { length: 20, CS: 657000, CST: 670000 },
            { length: 21, CS: 661000, CST: 675000 },
            { length: 22, CS: 666000, CST: 679000 },
            { length: 23, CS: 670000, CST: 684000 },
            { length: 24, CS: 674000, CST: 688000 },
        ],
        optionalAccessories: [
            { name: 'WELL SUCTION SD300 T=17 EN 1.4432', price: 19000 }
        ]
    },
    SD350: {
        description: '1250 - 1800 m³/h',
        prices: [
            { length: 14, CS: 873000, CST: 880000 },
            { length: 15, CS: 878000, CST: 885000 },
            { length: 16, CS: 883000, CST: 890000 },
            { length: 17, CS: 899000, CST: 906000 },
            { length: 18, CS: 904000, CST: 912000 },
            { length: 19, CS: 909000, CST: 917000 },
            { length: 20, CS: 914000, CST: 922000 },
            { length: 21, CS: 919000, CST: 927000 },
            { length: 22, CS: 924000, CST: 932000 },
            { length: 23, CS: 929000, CST: 938000 },
            { length: 24, CS: 934000, CST: 943000 },
        ]
    },
  },
  surcharges: {
      'Complete pump in 254SMO': '+100%',
      'Complete pump in 2,7% Mo': '+10%',
      'SD125 and SD150 as submerged TCP': '+35000'
  },
  ejector: {
      'Stripping ejector with snap-on coupling and counter flange': 7500,
  },
  dummyCargoPumps: {
      SD100: 7000,
      SD125: 9000,
      SD150: 10000,
      SD200: 17000,
      SD250: 30000,
      'SD300-L': 36000,
      SD350: 45000,
  },
  dummyBallastPumps: {
      SB125: 9000,
      SB200: 9000,
      SB300: 10000,
      SB400: 11000,
      SB600: 10000,
  },
  portablePumps: {
      TK80: {
          basePrice: 165000,
          accessories: [
              { name: 'CARGO HOSE 3" - 18m', material: 'EN 1.4404', price: 12000 },
              { name: 'HATCH COVER', material: 'Aluminium', price: 7000 },
              { name: 'HATCH COVER TK80 PCD390 AS', material: 'EN 1.4432', price: 103000 },
          ]
      },
      TK100: {
          basePrice: 172000,
          accessories: [
              { name: 'CARGO HOSE 4" - 18m', material: 'EN 1.4404', price: 25000 },
              { name: 'HATCH COVER', material: 'Aluminium', price: 17000 },
              { name: 'HATCH COVER TK100 PCD435 AS', material: 'EN 1.4404', price: 103000 },
          ]
      },
      TK150: {
          basePrice: 266000,
          accessories: [
              { name: 'CARGO HOSE 6" - 25m', material: 'Rubber fuel hose', price: 62000 },
              { name: 'HATCH COVER', material: 'Aluminium', price: 22000 },
              { name: 'HATCH COVER TK150 PCD445 AS', material: 'EN 1.4432', price: 107000 },
          ]
      },
      'Pair of snap-on couplings with ball valve and blind flange': 4600,
  },
  ballastPumps: {
      dryMounted: {
          SB125: 208000,
          SB200: 250000,
          SB300: 284000,
          SB400: 538000,
      },
      pricesByLength: {
        SB125: [
            { length: 5, price: 282000 }, { length: 6, price: 283000 }, { length: 7, price: 285000 },
            { length: 8, price: 290000 }, { length: 9, price: 291000 }, { length: 10, price: 293000 },
            { length: 11, price: 295000 }, { length: 12, price: 296000 }, { length: 13, price: 298000 },
        ],
        SB200: [
            { length: 5, price: 336000 }, { length: 6, price: 338000 }, { length: 7, price: 339000 },
            { length: 8, price: 344000 }, { length: 9, price: 346000 }, { length: 10, price: 348000 },
            { length: 11, price: 349000 }, { length: 12, price: 351000 }, { length: 13, price: 352000 },
            { length: 14, price: 382000 }, { length: 15, price: 384000 }, { length: 16, price: 385000 },
            { length: 17, price: 390000 }, { length: 18, price: 392000 }, { length: 19, price: 393000 },
            { length: 20, price: 395000 }, { length: 21, price: 396000 }, { length: 22, price: 398000 },
            { length: 23, price: 400000 }, { length: 24, price: 401000 },
        ],
        SB300: [
            { length: 14, price: 386000 }, { length: 15, price: 388000 }, { length: 16, price: 390000 },
            { length: 17, price: 393000 }, { length: 18, price: 395000 }, { length: 19, price: 397000 },
            { length: 20, price: 398000 }, { length: 21, price: 400000 }, { length: 22, price: 402000 },
            { length: 23, price: 403000 }, { length: 24, price: 405000 },
        ],
        SB400: [
            { length: 14, price: 694000 }, { length: 15, price: 696000 }, { length: 16, price: 698000 },
            { length: 17, price: 703000 }, { length: 18, price: 705000 }, { length: 19, price: 707000 },
            { length: 20, price: 709000 }, { length: 21, price: 711000 }, { length: 22, price: 713000 },
            { length: 23, price: 715000 }, { length: 24, price: 717000 },
        ],
        SB600: [
            { length: 14, price: 1018000 }, { length: 15, price: 1020000 }, { length: 16, price: 1022000 },
            { length: 17, price: 1027000 }, { length: 18, price: 1029000 }, { length: 19, price: 1031000 },
            { length: 20, price: 1033000 }, { length: 21, price: 1036000 }, { length: 22, price: 1038000 },
            { length: 23, price: 1040000 }, { length: 24, price: 1042000 },
        ],
      },
      optionalAccessories: {
          'TRANSMITTER PRESSURE SUBMERGD SUCTION GT403A0A6D': 16000,
          'TRANSMITTER PRESSURE SUBMERGED DISCH GT403A0H10': 16000,
      }
  },
  tankCleaningPumps: {
      'MA150/200-2 Max capacity 300 m3/h': {
          basePrice: 155000,
          accessories: {
              EJECTOR: 13000,
              'TRANSMITTER SUCTION': 5000,
              'TRANSMITTER DISCHARGE': 5000,
          }
      }
  },
  hpuVertical: [
      { type: 'CCE125-3', powerKw: '3x112', flow: '210 l/min x 3= 630 l/min', freshWater: 1346000, seaWater: 1361000 },
      { type: 'CCE125-3', powerKw: '3x125', flow: '210 l/min x 3= 630 l/min', freshWater: 1366000, seaWater: 1380000 },
      { type: 'CCE190-3', powerKw: '3x125', flow: '318 l/min x 3= 954 l/min', freshWater: 1390000, seaWater: 1393000 },
      { type: 'CCE190-3', powerKw: '3x160', flow: '318 l/min x 3= 954 l/min', freshWater: 1409000, seaWater: 1411000 },
      { type: 'CCE190-3', powerKw: '3x190', flow: '318 l/min x 3= 954 l/min', freshWater: 1446000, seaWater: 1448000 },
      { type: 'CCE260-3', powerKw: '3x190', flow: '435 l/min x 3= 1305 l/min', freshWater: 1532000, seaWater: 1547000 },
      { type: 'CCE260-3', powerKw: '3x230', flow: '435 l/min x 3= 1305 l/min', freshWater: 1566000, seaWater: 1580000 },
      { type: 'CCE260-3', powerKw: '3x260', flow: '435 l/min x 3= 1305 l/min', freshWater: 1597000, seaWater: 1612000 },
      { type: 'CCE370-3', powerKw: '3x260', flow: '620 l/min x 3= 1860 l/min', freshWater: 1685000, seaWater: 1700000 },
      { type: 'CCE370-3', powerKw: '3x315', flow: '620 l/min x 3= 1860 l/min', freshWater: 1736000, seaWater: 1751000 },
      { type: 'CCE370-3', powerKw: '3x362', flow: '620 l/min x 3= 1860 l/min', freshWater: 1775000, seaWater: 1790000 },
      { type: 'CCE370-4', powerKw: '4x260', flow: '620 l/min x 4= 2480 l/min', freshWater: 2073000, seaWater: 2073000 },
      { type: 'CCE370-4', powerKw: '4x315', flow: '620 l/min x 4= 2480 l/min', freshWater: 2141000, seaWater: 2141000 },
      { type: 'CCE370-4', powerKw: '4x362', flow: '620 l/min x 4= 2480 l/min', freshWater: 2193000, seaWater: 2193000 },
  ],
  hpuHorizontal: {
      'CCC520-3': { '0EL+3DE': 3857000, '1EL+2DE': 3391000, '2EL+1DE': 2924000, '3EL+0DE': 2430000 },
      'CCC520-4': { '0EL+4DE': 4652000, '1EL+3DE': 4185000, '2EL+2DE': 3691000, '3EL+1DE': 3251000, '4EL+0DE': 2758000 },
      'CCC520-5': { '0EL+5DE': 5534000, '1EL+4DE': 5067000, '2EL+3DE': 4600000, '3EL+2DE': 4107000, '4EL+1DE': 3667000, '5EL+0DE': 3173000 },
      'CCC520-6': { '0EL+6DE': 6328000, '1EL+5DE': 5861000, '2EL+4DE': 5394000, '3EL+3DE': 4928000, '4EL+2DE': 4461000, '5EL+1DE': 3994000, '6EL+0DE': 3500000 },
      'CCC520-7': { '0EL+7DE': 6908000, '1EL+6DE': 6442000, '2EL+5DE': 5975000, '3EL+4DE': 5508000, '4EL+3DE': 5041000, '5EL+2DE': 4574000, '6EL+1DE': 4108000, '7EL+0DE': 3614000 },
      'CCC520-8': { '0EL+8DE': 7703000, '1EL+7DE': 7236000, '2EL+6DE': 6769000, '3EL+5DE': 6302000, '4EL+4DE': 5835000, '5EL+3DE': 5342000, '6EL+2DE': 4902000, '7EL+1DE': 4435000, '8EL+0DE': 3942000 },
  },
  hpuMethanol: [
      { type: 'OCE28-2', powerKw: '18 kW', cost: 329000 },
      { type: 'OCE28-2', powerKw: '25 kW', cost: 335000 },
      { type: 'OCE45-2', powerKw: '25 kW', cost: 341000 },
      { type: 'OCE45-2', powerKw: '37 kW', cost: 350000 },
  ],
  cargoHeaters: {
      'HE 225 Max 360 kW': 87000,
      'HE 430 Max 850 kW': 122000,
      'HE 500 Max 1550 kW': 186000,
  },
  cargoCoolers: {
      'HE 150': 248000,
  },
  cargoAgitationSystems: {
      'DIN 125': 13000,
      'DIN 150': 13000,
  },
  bowThrusterMotors: {
      motors: [
          { hydraulicMotor: '1 x A2F 500', maxSpeed: 1900, maxOilQuantity: 990, powerKw: 320, cost: 322000 },
          { hydraulicMotor: '1 x A4V 750', maxSpeed: 1550, maxOilQuantity: 1220, powerKw: 395, cost: 379000 },
          { hydraulicMotor: '1 x A2F 1000', maxSpeed: 1600, maxOilQuantity: 1665, powerKw: 535, cost: 360000 },
          { hydraulicMotor: '2 x A4V 750', maxSpeed: 1550, maxOilQuantity: 2450, powerKw: 790, cost: 446000 },
          { hydraulicMotor: '2 x A4V 1000', maxSpeed: 1500, maxOilQuantity: 3160, powerKw: 1000, cost: 546000 },
      ],
      'Additional cost for 2 of wing control panels': 23000,
  },
  hydraulicMotors: {
      A2FM23_CCW: 13000, A2FM32_CCW: 16000, A2FM56_CCW: 16000,
      A2FM63_CW: 16000, A2FM80_CW: 16000, A2FM90_CW: 17000,
      A2FM107_CCW: 21000, A2FM125_CCW: 23000, A2FM160_CW: 44000,
      A2FLM355_CCW: 64000, '2xA4V750_Tandem': 210000,
  },
  electricMotorStarters: [
      { power: '1,5kW', type: 'Jockey Pump Starter', cost: 25000 },
      { power: '11kW', type: 'DOL', cost: 18000 },
      { power: '11kW', type: 'VFD', cost: 43000 },
      { power: '25kW', type: 'Wall- mounted VFD', cost: 20000 },
      { power: '33kW', type: 'Star/Delta', cost: 46000 },
      { power: '70kW', type: 'Star/Delta', cost: 53000 },
      { power: '122kW', type: 'Star/Delta', cost: 60000 },
      { power: '210kW', type: 'Star/Delta', cost: 51000 },
      { power: '260kW', type: 'Star/Delta', cost: 55000 },
      { power: '315kW', type: 'Star/Delta', cost: 60000 },
      { power: '362kW', type: 'Star/Delta', cost: 60000 },
      { power: '420kW', type: 'Softstarter', cost: 106000 },
      { power: '425kW', type: 'Star/Delta', cost: 61000 },
  ],
  variousPartsDefault: 115000,
  controlSystem: {
      'Control panel for 18 pumps': 261000,
      'Additional/subtraction per pump beyond 18 included': 3000,
      'Diesel panel': 12000,
      'Full interface': 19000,
      'Thruster': 37000,
      'Deduction for loose plates / without desk': -30000,
  },
  rcvAssembly: [
      { pumps: 1, cost: 28000 }, { pumps: 2, cost: 35000 },
      { pumps: 3, cost: 44000 }, { pumps: 4, cost: 51000 },
      { pumps: 5, cost: 58000 }, { pumps: 6, cost: 65000 },
      { pumps: 7, cost: 75000 }, { pumps: 8, cost: 82000 },
      { pumps: 9, cost: 92000 }, { pumps: 10, cost: 99000 },
      { pumps: 11, cost: 106000 }, { pumps: 12, cost: 113000 },
      { pumps: 13, cost: 124000 }, { pumps: 14, cost: 130000 },
      { pumps: 15, cost: 158000 }, { pumps: 16, cost: 165000 },
      { pumps: 17, cost: 174000 }, { pumps: 18, cost: 184000 },
      { pumps: 19, cost: 191000 }, { pumps: 20, cost: 197000 },
      { pumps: 21, cost: 205000 }, { pumps: 22, cost: 213000 },
      { pumps: 23, cost: 220000 }, { pumps: 24, cost: 226000 },
      { pumps: 25, cost: 237000 }, { pumps: 26, cost: 247000 },
      { pumps: 27, cost: 254000 }, { pumps: 28, cost: 261000 },
  ],
  commissioning: {
      'If more than 17 pumps': '+ 1 week',
      'For systems with bowthruster additional': '+ 23000',
      'For commisioning at HMD reduction': '- 46000',
      'Course Florvagl/Fusa, duration 3 days (max 10 persons)': 32000,
      'Course offices abroad, yard or onboard, duration 3 days': 32000,
      'Assistance first discharge': 10000,
  },
  travelExpenses: {
      Asia: { weeklyRate: 90000, travelExpense: 95000 },
      Europe: { weeklyRate: 90000, travelExpense: 55000 },
      Singapore: { weeklyRate: 90000, travelExpense: 100000 },
      'South America': { weeklyRate: 90000, travelExpense: 80000 },
      USA: { weeklyRate: 90000, travelExpense: 100000 },
  },
  shipmentCosts: {
      general: {
          'General cargo': 4500,
          'Containers': 29000,
          'Additional for steel frame': 11000,
          'Semi-trailers': 29000,
      },
      europeTruck: {
          'Rijeka, Croatia': 65000, 'Trogir, Croatia': 65000,
          'Ancona, Italy': 45000, 'Livorno, Italy': 42000,
          'Groningen, Netherlands': 25000, 'Rotterdam, Netherlands': 25000,
          'Szczecin, Poland': 26000,
          'Constanta, Romania': 65000,
          'Gijon, Spain': 58000, 'Sestao, Spain': 53000, 'Valencia, Spain': 58000, 'Vigo, Spain': 58000,
          'Istanbul, Turkey': 75000,
      },
      globalSeafreight: {
          'Chongquin, China': { '20HC': 21000, '40HC': 28000, '45HC': 32000 },
          'Dalian, China': { '20HC': 21000, '40HC': 28000, '45HC': 32000 },
          'Guangzhou, China': { '20HC': 21000, '40HC': 28000, '45HC': 32000 },
          'Nanjing, China': { '20HC': 21000, '40HC': 28000, '45HC': 32000 },
          'Shanghai, China': { '20HC': 21000, '40HC': 28000, '45HC': 32000 },
          'Wuhan, China': { '20HC': 21000, '40HC': 28000, '45HC': 32000 },
          'Yangzhou, China': { '20HC': 21000, '40HC': 28000, '45HC': 32000 },
          'Jebel Ali Dubai, Dubai': { '20HC': 24000, '40HC': 25000, '45HC': 25000 },
          'Hakata, Japan': { '20HC': 21000, '40HC': 28000, '45HC': 'NA' },
          'Kobe, Japan': { '20HC': 21000, '40HC': 28000, '45HC': 32000 },
          'Yokohama, Japan': { '20HC': 20000, '40HC': 27000, '45HC': 30000 },
          'Busan, Korea': { '20HC': 19000, '40HC': 26000, '45HC': 30000 },
          'Singapore, Singapore': { '20HC': 19000, '40HC': 26000, '45HC': 30000 },
          'Philadelphia, USA': { '20HC': 75000, '40HC': 55000, '45HC': 60000 },
      }
  },
  spareparts: {
      '0-30k': 50000,
      '30-80k': 90000,
      '80k+': 125000,
  },
  pipingSystems: {
      bulkDeliveries: [
          { dwt: '5K', dl: '50 m', q: '1000 l/min', mainLine: 'HP=DN60/LP=DN80', pumps: '10xSD125+2xSD100', price: 1213000 },
          { dwt: '10K', dl: '70 m', q: '1800 l/min', mainLine: 'HP=DN70/LP=DN100', pumps: '14xSD150+2xSD100', price: 1490000 },
          { dwt: '20K', dl: '100 m', q: '2400 l/min', mainLine: 'HP=DN80/LP=DN100', pumps: '16xSD150+2xSD100', price: 1728000 },
          { dwt: '30K', dl: '110 m', q: '2800 l/min', mainLine: 'HP=DN100/LP=DN125', pumps: '12xSD200+2xSD125', price: 1873000 },
          { dwt: '45K', dl: '120 m', q: '3200 l/min', mainLine: 'HP=DN100/LP=DN125', pumps: '12xSD200+2xSD150', price: 1966000 },
          { dwt: '70K*', dl: '160 m', q: '4950 l/min', mainLine: 'HP=DN110/LP=DN150', pumps: '12xSD250+2xSD150', price: 3143000 },
          { dwt: '70K*', dl: '160 m', q: '5600 l/min', mainLine: 'HP=1xDN110/1xDN80, LP=1xDN200', pumps: '12xSD300+2xSD150', price: 3832000 },
          { dwt: '115K*1', dl: '200 m', q: '7000 l/min', mainLine: 'HP=2xDN100, LP=1xDN200', pumps: '12xSD300+2xSD200, +1xSD100', price: 3765000 },
          { dwt: '115K*1', dl: '200 m', q: '7000 l/min', mainLine: 'HP=1xDN150, LP=1xDN200', pumps: '12xSD300+2xSD200, +1xSD100', price: 4131000 },
      ],
      bulkDeliveriesAddition: [
          { dwt: '5K', qtyM: 12, mainLine: 'HP=DN60/LP=DN80', price: 59400 },
          { dwt: '10K', qtyM: 15, mainLine: 'HP=DN70/LP=DN100', price: 65200 },
          { dwt: '20K', qtyM: 20, mainLine: 'HP=DN80/LP=DN100', price: 83400 },
          { dwt: '30K', qtyM: 20, mainLine: 'HP=DN100/LP=DN125', price: 108300 },
          { dwt: '45K', qtyM: 30, mainLine: 'HP=DN100/LP=DN125', price: 158200 },
          { dwt: '70K', qtyM: 35, mainLine: '*HP=1xDN110, LP=1xDN200', price: 327100 },
          { dwt: '115K', qtyM: 40, mainLine: '*HP=1xDN100, LP=1xDN200', price: 330100 },
      ],
      branches: {
          SD100: { '6m': 14700, '12m': 21800, '18m': 27800, '24m': 34800 },
          SD125: { '6m': 14900, '12m': 21900, '18m': 27900, '24m': 35000 },
          SD150: { '6m': 18200, '12m': 26700, '18m': 33900, '24m': 42400 },
          SD200: { '6m': 21800, '12m': 32700, '18m': 42000, '24m': 52900 },
          'SD300/250': { '6m': 47000, '12m': 60900, '18m': 73400, '24m': 87400 },
          SD350: { '6m': 48300, '12m': 64000, '18m': 79700, '24m': 95500 },
          SB125: { '12m': 25300, '18m': 31400, '24m': 37000 },
          SB200: { '12m': 30000, '18m': 37300, '24m': 43900 },
          SB300: { '12m': 44400, '18m': 56900, '24m': 68200 },
          SB400: { '12m': 44400, '18m': 56900, '24m': 84100 },
          SB600: { '12m': 48500, '18m': 61300, '24m': 88700 },
          'MA PUMP': { '12m': 34200, '18m': 40300, '24m': 45900 },
      },
      pumproomPumps: {
          commonPipes: [
              { desc: '400 l/min - 10 m', odxt: '45x5/54x2', price: 33300 },
              { desc: '600 l/min - 20 m', odxt: '54x6/54x2', price: 44700 },
              { desc: '700 l/min - 10 m', odxt: '65x7/76,1x2', price: 54300 },
              { desc: '900 l/min - 20 m', odxt: '65x7/76,1x2', price: 68400 },
          ],
          branches: [
              { type: 'MA150', odxt: '38x5/42x3', price: 11000 },
              { type: 'SB125', odxt: '38x5/42x3', price: 10800 },
              { type: 'SB200', odxt: '45x5/42x3', price: 12000 },
              { type: 'SB300', odxt: '65x7/54x2', price: 18300 },
              { type: 'SB400', odxt: '65x7/54x2', price: 18300 },
              { type: 'SB600', odxt: '65x7/54x2', price: 23200 },
          ]
      },
      bowThrusterPiping: [
          { type: 'A2F 500', odxt: '65x7/86x3', price: 79900 },
          { type: 'A4V 750', odxt: '65x7/86x3', price: 86200 },
          { type: '2 x A4V 750', odxt: '100x10-65x7/106x3', price: 98800 },
          { type: '2 x A4F 1000', odxt: '100x10-65x7/106x3', price: 98800 },
      ]
  },
  deckMachinery: {
      mainDeckWinches: [
          { pipeDN: '30/40', odxt: '38x3,5/44,5x2', branch6m: 15500, branch12m: 23300 },
          { pipeDN: '35/50', odxt: '45x4/54x2', branch6m: 14600, branch12m: 23100 },
      ],
      aftDeckWinches: [
          { pipeDN: '35/50', odxt: '45x5/54x2', '5/10/20K': 91200, '30/40K': 95700, '50/70K': 111300, '100K': 120300 },
          { pipeDN: '40/65', odxt: '54x6/76,1x2', '5/10/20K': null, '30/40K': 104300, '50/70K': 121000, '100K': 131800 },
          { pipeDN: '50/65', odxt: '65x7/76,1x2', '5/10/20K': null, '30/40K': 122800, '50/70K': 141400, '100K': 151900 },
      ],
      anchorWinchesWithBowthruster: [
          { pipeDN: '30/40', odxt: '38x3,5/44,5x2', '5/10/20K': 48400, '30/40K': 48400, '50/70K': 57600, '100K': 57600 },
          { pipeDN: '35/50', odxt: '45x4/54x2', '5/10/20K': 49600, '30/40K': 49600, '50/70K': 59700, '100K': 59700 },
      ],
      anchorWinchesNoBowthruster: [
          { pipeDN: '30/40', odxt: '38x3,5/44,5x2', '5/10/20K': 48200, '30/40K': 67700, '50/70K': 77500, '100K': null },
          { pipeDN: '35/50', odxt: '45x4/54x2', '5/10/20K': null, '30/40K': 45100, '50/70K': 84900, '100K': 94700 },
      ]
  },
  pipingSystemJapan: {
    'CS/CS': [
        { size: '5K', dl: 50, q: 800, mainPipes: 'HP=DN65A/LP=DN80A', pumpAlt: '10xSD125+2xSD100', price: 246000 },
        { size: '10K', dl: 70, q: 1200, mainPipes: 'HP=DN80A/LP=DN100A', pumpAlt: '10xSD150+10xSD125', price: 339000 },
        { size: '20K', dl: 100, q: 1250, mainPipes: 'HP=DN80A/LP=DN100A', pumpAlt: '10xSD150+10xSD125', price: 374000 },
        { size: '30K', dl: 110, q: 2400, mainPipes: 'HP=DN100/LP=DN100', pumpAlt: '14xSD150+2xSD125', price: 396000 },
        { size: '45K', dl: 120, q: 3200, mainPipes: 'HP=DN100/LP=DN125', pumpAlt: '12xSD200+2xSD150', price: 521000 },
    ],
    'CS/316L': [
        { size: '5K', dl: 50, q: 800, mainPipes: 'HP=DN65A/LP=DN80A', pumpAlt: '10xSD125+2xSD100', price: 283000 },
        { size: '10K', dl: 70, q: 1200, mainPipes: 'HP=DN80A/LP=DN100A', pumpAlt: '10xSD150+10xSD125', price: 354000 },
        { size: '20K', dl: 100, q: 1250, mainPipes: 'HP=DN80A/LP=DN100A', pumpAlt: '10xSD150+10xSD125', price: 445000 },
        { size: '30K', dl: 110, q: 2400, mainPipes: 'HP=DN100/LP=DN100', pumpAlt: '14xSD150+2xSD125', price: 446000 },
        { size: '45K', dl: 120, q: 3200, mainPipes: 'HP=DN100/LP=DN125', pumpAlt: '12xSD200+2xSD150', price: 599000 },
    ],
    'Duplex/316L': [
        { size: '5K', dl: 50, q: 800, mainPipes: 'HP=DN65A/LP=DN80A', pumpAlt: '10xSD125+2xSD100', price: 480000 },
        { size: '10K', dl: 70, q: 1200, mainPipes: 'HP=DN80A/LP=DN100A', pumpAlt: '10xSD150+10xSD125', price: 522000 },
        { size: '20K', dl: 100, q: 1250, mainPipes: 'HP=DN80A/LP=DN100A', pumpAlt: '10xSD150+10xSD125', price: 556000 },
        { size: '30K', dl: 110, q: 2400, mainPipes: 'HP=DN100/LP=DN100', pumpAlt: '14xSD150+2xSD125', price: 548000 },
        { size: '45K', dl: 120, q: 3200, mainPipes: 'HP=DN100/LP=DN125', pumpAlt: '12xSD200+2xSD150', price: 669000 },
    ],
    pilotPipingDuplex: [
        { size: '5K', pipeM: 710, pumps: 12, price: 142000, addPrice: 11700 },
        { size: '10K', pipeM: 1460, pumps: 20, price: 287000, addPrice: 14100 },
        { size: '20K', pipeM: 1880, pumps: 20, price: 352000, addPrice: 17600 },
        { size: '30K', pipeM: 1620, pumps: 16, price: 299000, addPrice: 18800 },
        { size: '45K', pipeM: 1520, pumps: 14, price: 277000, addPrice: 20000 },
    ]
  },
  unitPrices: {
      cargoPumps: [
          { type: 'SD100', cs_cs: 8200, cs_316: 10200, duplex_316: 15200 },
          { type: 'SD125', cs_cs: 7400, cs_316: 11100, duplex_316: 15100 },
          { type: 'SD150', cs_cs: 9100, cs_316: 11100, duplex_316: 15800 },
          { type: 'SD200', cs_cs: 14600, cs_316: 19200, duplex_316: 24600 },
      ],
      ballastPumps: [
          { type: 'VH150/200', cs_cs: null, cs_316: null },
          { type: 'VH250/300', cs_cs: null, cs_316: 13800 },
          { type: 'SB200', cs_cs: 4300, cs_316: 5600 },
          { type: 'SB300', cs_cs: 4600, cs_316: 5900 },
          { type: 'SB200-T', cs_cs: 9000, cs_316: 10300 },
          { type: 'SB300-T', cs_cs: 9300, cs_316: 10600 },
      ],
      tcPumps: [
          { type: 'MA 150/200', cs_cs: 15000, cs_316: 16300 },
          { type: '4VF1', cs_cs: null, cs_316: null },
      ],
      boosterOilTransferPumps: [
          { type: 'Boostermotor 250', cs_cs: null, cs_316: null },
          { type: 'Oil transfer', cs_cs: 8900, cs_316: 8900 },
      ],
      bulkheadPenetrations: [
          { dimension: 'DN25/32A', hpcs: 7300, lpcs: 6900, hpss: 7200, lpss: 7700 },
          { dimension: 'DN40A', hpcs: 7100, lpcs: 6800, hpss: 8100, lpss: 7700 },
          { dimension: 'DN50A', hpcs: 8500, lpcs: 6700, hpss: 19300, lpss: 9400 },
          { dimension: 'DN65A', hpcs: 10000, lpcs: 9100, hpss: 17800, lpss: 9900 },
          { dimension: 'DN80A', hpcs: 9000, lpcs: 8500, hpss: 17000, lpss: 9400 },
          { dimension: 'DN100A', hpcs: 17500, lpcs: 10900, hpss: 27700, lpss: 14700 },
          { dimension: 'DN125A', hpcs: null, lpcs: 10000, hpss: 27700, lpss: 15700 },
      ],
      deckMachineryWeldoflanges: [
          { desc: '* 2 vinsjer akter (SS)', '5/10K': 55700, '20/30K': 72900, '45K': 78700 },
          { desc: '** 2 windlass fwd (SS)', '5/10K': 10400, '20/30K': 12000, '45K': 11800 },
          { desc: 'Mooring winch, dekk (SS)', '5/10K': 6500, '20/30K': 10400, '45K': 8300 },
      ]
  }
};