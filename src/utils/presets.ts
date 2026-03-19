import { ModuleSpecs, InverterSpecs } from './solar';

export interface ModulePreset extends ModuleSpecs {
  name: string;
  manufacturer: string;
}

export interface InverterPreset extends InverterSpecs {
  name: string;
  manufacturer: string;
}

export const INVERTER_PRESETS: InverterPreset[] = [
  // GROWATT
  {
    manufacturer: "Growatt",
    name: "Growatt MIN 5000TL-X",
    maxInputVoltage: 550,
    minMpptVoltage: 80,
    maxMpptVoltage: 550,
    maxInputCurrent: 13.5,
    numMppts: 2
  },
  {
    manufacturer: "Growatt",
    name: "Growatt MIN 8000TL-X",
    maxInputVoltage: 600,
    minMpptVoltage: 80,
    maxMpptVoltage: 600,
    maxInputCurrent: 13.5,
    numMppts: 2
  },
  {
    manufacturer: "Growatt",
    name: "Growatt MAC 50KTL3-X LV",
    maxInputVoltage: 1100,
    minMpptVoltage: 200,
    maxMpptVoltage: 1000,
    maxInputCurrent: 32,
    numMppts: 3
  },

  // SUNGROW
  {
    manufacturer: "Sungrow",
    name: "Sungrow SG5.0RS",
    maxInputVoltage: 600,
    minMpptVoltage: 40,
    maxMpptVoltage: 560,
    maxInputCurrent: 16,
    numMppts: 2
  },
  {
    manufacturer: "Sungrow",
    name: "Sungrow SG10RT",
    maxInputVoltage: 1100,
    minMpptVoltage: 160,
    maxMpptVoltage: 1000,
    maxInputCurrent: 25,
    numMppts: 2
  },
  {
    manufacturer: "Sungrow",
    name: "Sungrow SG110CX",
    maxInputVoltage: 1100,
    minMpptVoltage: 200,
    maxMpptVoltage: 1000,
    maxInputCurrent: 26,
    numMppts: 9
  },

  // FRONIUS
  {
    manufacturer: "Fronius",
    name: "Fronius Primo 5.0-1",
    maxInputVoltage: 1000,
    minMpptVoltage: 80,
    maxMpptVoltage: 800,
    maxInputCurrent: 18,
    numMppts: 2
  },
  {
    manufacturer: "Fronius",
    name: "Fronius Symo 15.0-3-M",
    maxInputVoltage: 1000,
    minMpptVoltage: 200,
    maxMpptVoltage: 800,
    maxInputCurrent: 27,
    numMppts: 2
  },

  // WEG
  {
    manufacturer: "WEG",
    name: "WEG SIW300H M050",
    maxInputVoltage: 600,
    minMpptVoltage: 90,
    maxMpptVoltage: 520,
    maxInputCurrent: 14,
    numMppts: 2
  },
  {
    manufacturer: "WEG",
    name: "WEG SIW500H ST015",
    maxInputVoltage: 1000,
    minMpptVoltage: 160,
    maxMpptVoltage: 850,
    maxInputCurrent: 22,
    numMppts: 2
  },

  // DEYE
  {
    manufacturer: "Deye",
    name: "Deye SUN-5K-G05",
    maxInputVoltage: 550,
    minMpptVoltage: 70,
    maxMpptVoltage: 500,
    maxInputCurrent: 13,
    numMppts: 2
  },
  {
    manufacturer: "Deye",
    name: "Deye SUN-10K-G05",
    maxInputVoltage: 1000,
    minMpptVoltage: 140,
    maxMpptVoltage: 1000,
    maxInputCurrent: 13,
    numMppts: 2
  },

  // HUAWEI
  {
    manufacturer: "Huawei",
    name: "Huawei SUN2000-5KTL-L1",
    maxInputVoltage: 600,
    minMpptVoltage: 90,
    maxMpptVoltage: 560,
    maxInputCurrent: 12.5,
    numMppts: 2
  },
  {
    manufacturer: "Huawei",
    name: "Huawei SUN2000-10KTL-M1",
    maxInputVoltage: 1100,
    minMpptVoltage: 140,
    maxMpptVoltage: 980,
    maxInputCurrent: 11,
    numMppts: 2
  },

  // SOLIS
  {
    manufacturer: "Solis",
    name: "Solis-1P5K-4G",
    maxInputVoltage: 600,
    minMpptVoltage: 90,
    maxMpptVoltage: 520,
    maxInputCurrent: 11,
    numMppts: 2
  },
  {
    manufacturer: "Solis",
    name: "Solis-3P10K-4G",
    maxInputVoltage: 1000,
    minMpptVoltage: 160,
    maxMpptVoltage: 850,
    maxInputCurrent: 11,
    numMppts: 2
  },

  // GOODWE
  {
    manufacturer: "GoodWe",
    name: "GoodWe GW5000-MS",
    maxInputVoltage: 600,
    minMpptVoltage: 80,
    maxMpptVoltage: 550,
    maxInputCurrent: 12.5,
    numMppts: 3
  },
  {
    manufacturer: "GoodWe",
    name: "GoodWe GW10K-SDT-20",
    maxInputVoltage: 1000,
    minMpptVoltage: 180,
    maxMpptVoltage: 850,
    maxInputCurrent: 16,
    numMppts: 2
  },

  // SMA
  {
    manufacturer: "SMA",
    name: "SMA Sunny Boy 5.0",
    maxInputVoltage: 600,
    minMpptVoltage: 175,
    maxMpptVoltage: 500,
    maxInputCurrent: 15,
    numMppts: 2
  },
  {
    manufacturer: "SMA",
    name: "SMA Sunny Tripower 10.0",
    maxInputVoltage: 1000,
    minMpptVoltage: 320,
    maxMpptVoltage: 800,
    maxInputCurrent: 20,
    numMppts: 2
  }
];

export const MODULE_PRESETS: ModulePreset[] = [
  // CANADIAN SOLAR
  {
    manufacturer: "Canadian Solar",
    name: "Canadian Solar HiKu6 CS6W-550MS",
    power: 550,
    voc: 49.6,
    vmp: 41.7,
    isc: 14.0,
    imp: 13.2,
    tempCoeffVoc: -0.27,
    tempCoeffVmp: -0.34,
  },
  {
    manufacturer: "Canadian Solar",
    name: "Canadian Solar BiHiKu7 CS7N-660MB-AG",
    power: 660,
    voc: 45.6,
    vmp: 38.3,
    isc: 18.47,
    imp: 17.24,
    tempCoeffVoc: -0.27,
    tempCoeffVmp: -0.34,
  },
  {
    manufacturer: "Canadian Solar",
    name: "Canadian Solar HiKu7 CS7L-600MS",
    power: 600,
    voc: 41.3,
    vmp: 34.7,
    isc: 18.42,
    imp: 17.30,
    tempCoeffVoc: -0.27,
    tempCoeffVmp: -0.34,
  },

  // JINKO SOLAR
  {
    manufacturer: "Jinko Solar",
    name: "Jinko Tiger Neo N-Type 72HL4-BDV 570W",
    power: 570,
    voc: 50.74,
    vmp: 42.07,
    isc: 14.31,
    imp: 13.55,
    tempCoeffVoc: -0.25,
    tempCoeffVmp: -0.29,
  },
  {
    manufacturer: "Jinko Solar",
    name: "Jinko Tiger Pro 72HC 545W",
    power: 545,
    voc: 49.52,
    vmp: 40.80,
    isc: 13.94,
    imp: 13.36,
    tempCoeffVoc: -0.28,
    tempCoeffVmp: -0.35,
  },
  {
    manufacturer: "Jinko Solar",
    name: "Jinko Tiger Neo 78HL4-BDV 620W",
    power: 620,
    voc: 55.65,
    vmp: 46.10,
    isc: 14.13,
    imp: 13.45,
    tempCoeffVoc: -0.25,
    tempCoeffVmp: -0.29,
  },

  // TRINA SOLAR
  {
    manufacturer: "Trina Solar",
    name: "Trina Vertex DE19 550W",
    power: 550,
    voc: 37.9,
    vmp: 31.6,
    isc: 18.52,
    imp: 17.40,
    tempCoeffVoc: -0.25,
    tempCoeffVmp: -0.34,
  },
  {
    manufacturer: "Trina Solar",
    name: "Trina Vertex DE21 660W",
    power: 660,
    voc: 45.7,
    vmp: 38.3,
    isc: 18.53,
    imp: 17.24,
    tempCoeffVoc: -0.25,
    tempCoeffVmp: -0.34,
  },
  {
    manufacturer: "Trina Solar",
    name: "Trina Vertex S+ 440W (NEG9R.28)",
    power: 440,
    voc: 52.2,
    vmp: 44.0,
    isc: 10.67,
    imp: 10.0,
    tempCoeffVoc: -0.24,
    tempCoeffVmp: -0.30,
  },

  // JA SOLAR
  {
    manufacturer: "JA Solar",
    name: "JA Solar DeepBlue 3.0 JAM72S30-550/MR",
    power: 550,
    voc: 49.90,
    vmp: 41.96,
    isc: 14.00,
    imp: 13.11,
    tempCoeffVoc: -0.275,
    tempCoeffVmp: -0.35,
  },
  {
    manufacturer: "JA Solar",
    name: "JA Solar JAM78S30-600/MR",
    power: 600,
    voc: 53.65,
    vmp: 45.15,
    isc: 14.25,
    imp: 13.29,
    tempCoeffVoc: -0.275,
    tempCoeffVmp: -0.35,
  },

  // RISEN ENERGY
  {
    manufacturer: "Risen Energy",
    name: "Risen Titan S RSM110-8-550M",
    power: 550,
    voc: 38.02,
    vmp: 31.66,
    isc: 18.16,
    imp: 17.40,
    tempCoeffVoc: -0.25,
    tempCoeffVmp: -0.34,
  },

  // SUNPOWER / MAXEON
  {
    manufacturer: "SunPower",
    name: "SunPower Maxeon 6 AC 425W",
    power: 425,
    voc: 75.6,
    vmp: 63.8,
    isc: 6.75,
    imp: 6.67,
    tempCoeffVoc: -0.27,
    tempCoeffVmp: -0.29,
  },

  // QCELLS
  {
    manufacturer: "Qcells",
    name: "Q.PEAK DUO ML-G10+ 400",
    power: 400,
    voc: 45.30,
    vmp: 37.13,
    isc: 11.14,
    imp: 10.77,
    tempCoeffVoc: -0.27,
    tempCoeffVmp: -0.34,
  },
  {
    manufacturer: "Qcells",
    name: "Q.PEAK DUO XL-G11.3 570",
    power: 570,
    voc: 53.64,
    vmp: 44.49,
    isc: 13.51,
    imp: 12.81,
    tempCoeffVoc: -0.27,
    tempCoeffVmp: -0.34,
  },

  // DAH SOLAR
  {
    manufacturer: "DAH Solar",
    name: "DAH Solar DHM-72L9-550W",
    power: 550,
    voc: 49.8,
    vmp: 42.0,
    isc: 13.90,
    imp: 13.10,
    tempCoeffVoc: -0.27,
    tempCoeffVmp: -0.35,
  },

  // BYD
  {
    manufacturer: "BYD",
    name: "BYD 540W (BYD540MC-36)",
    power: 540,
    voc: 49.54,
    vmp: 41.32,
    isc: 13.89,
    imp: 13.07,
    tempCoeffVoc: -0.26,
    tempCoeffVmp: -0.32,
  },

  // OSNOVO
  {
    manufacturer: "Osnovo",
    name: "Osnovo OSN-550M",
    power: 550,
    voc: 49.8,
    vmp: 41.5,
    isc: 14.0,
    imp: 13.25,
    tempCoeffVoc: -0.27,
    tempCoeffVmp: -0.35,
  }
];
