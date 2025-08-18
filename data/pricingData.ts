// NOTE: This is a sample of the pricing data structure based on the provided OCR.
// In a real application, this would be a comprehensive database of all products.
// All prices are in NOK as per the price lists.

export interface PriceEntry {
  length: number;
  CS?: number;
  CST?: number;
  CSTV?: number;
}

export interface Accessory {
  name: string;
  price: number;
}

export interface PumpPriceData {
  description: string;
  prices: PriceEntry[];
  trunk?: Accessory[];
  optionalAccessories?: Accessory[];
}

type CargoPumpsData = {
    [key: string]: PumpPriceData;
}

export const PRICING_DATA: {
    cargoPumps: CargoPumpsData;
    dummyCargoPumps: { [key: string]: number };
    controlSystem: { [key: string]: number };
    hydraulicPiping: { [key: string]: number };
} = {
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
  dummyCargoPumps: {
      SD100: 7000,
      SD125: 9000,
      SD150: 10000,
      SD200: 17000,
      SD250: 30000,
      'SD300-L': 36000,
      SD350: 45000,
  },
  controlSystem: {
    basicPanel18Pumps: 261000,
    perPumpAddition: 3000,
    dieselPanel: 12000,
    fullInterface: 19000,
    thruster: 37000,
    deductionNoDesk: -30000,
  },
  hydraulicPiping: {
      '5K': 1213000,
      '10K': 1490000,
      '20K': 1728000,
  }
};