
export interface ModuleSpecs {
  model?: string; // Model Name
  power: number; // Watts
  voc: number; // Volts
  vmp: number; // Volts
  isc: number; // Amps
  imp: number; // Amps
  tempCoeffVoc: number; // %/°C (usually negative, e.g., -0.29)
  tempCoeffVmp: number; // %/°C (usually negative, e.g., -0.35)
  area?: number; // m²
}

export interface InverterSpecs {
  model?: string; // Model Name
  maxInputVoltage: number; // Volts
  minMpptVoltage: number; // Volts
  maxMpptVoltage: number; // Volts
  maxInputCurrent: number; // Amps
  numMppts?: number; // Number of MPPTs
}

export interface SiteConditions {
  minTemp: number; // °C
  maxTemp: number; // °C
  desiredPowerKw?: number; // kWp
  availableSpaceM2?: number; // m²
}

export interface SizingResult {
  maxModules: number;
  minModules: number;
  vocMax: number; // Voc at min temp
  vmpMin: number; // Vmp at max temp
  isCompatible: boolean;
  warnings: string[];
  errorFields: string[];
  warningFields: string[];
  recommendedModules?: number;
  recommendedStrings?: number;
  totalSystemPowerKw?: number;
  totalAreaM2?: number;
  minStringVoltage?: number;
  maxStringVoltage?: number;
}

export function calculateStringSizing(
  module: ModuleSpecs,
  inverter: InverterSpecs,
  site: SiteConditions
): SizingResult {
  const warnings: string[] = [];
  const errorFields: string[] = [];
  const warningFields: string[] = [];

  // --- 0. Input Sanity Checks ---

  // Module Checks
  if (module.power <= 0) {
    warnings.push("A potência do módulo deve ser maior que 0.");
    errorFields.push("module.power");
  }
  if (module.voc <= 0) {
    warnings.push("A tensão de circuito aberto (Voc) deve ser maior que 0.");
    errorFields.push("module.voc");
  }
  if (module.vmp <= 0) {
    warnings.push("A tensão de máxima potência (Vmp) deve ser maior que 0.");
    errorFields.push("module.vmp");
  }
  if (module.vmp >= module.voc && module.voc > 0) {
    warnings.push("A tensão Vmp deve ser menor que Voc.");
    errorFields.push("module.vmp", "module.voc");
  }
  if (module.isc <= 0) {
    warnings.push("A corrente de curto-circuito (Isc) deve ser maior que 0.");
    errorFields.push("module.isc");
  }
  if (module.imp <= 0) {
    warnings.push("A corrente de máxima potência (Imp) deve ser maior que 0.");
    errorFields.push("module.imp");
  }
  if (module.imp >= module.isc && module.isc > 0) {
    warnings.push("A corrente Imp deve ser menor que Isc.");
    errorFields.push("module.imp", "module.isc");
  }
  if (module.tempCoeffVoc > 0) {
    warnings.push("O coeficiente de temperatura do Voc geralmente é negativo.");
    warningFields.push("module.tempCoeffVoc");
  }
  if (module.tempCoeffVmp > 0) {
    warnings.push("O coeficiente de temperatura do Vmp (Pmax) geralmente é negativo.");
    warningFields.push("module.tempCoeffVmp");
  }
  if (module.area !== undefined && module.area <= 0) {
    warnings.push("A área do módulo deve ser maior que 0.");
    warningFields.push("module.area");
  }

  // Inverter Checks
  if (inverter.maxInputVoltage <= 0) {
    warnings.push("A tensão máxima de entrada do inversor deve ser maior que 0.");
    errorFields.push("inverter.maxInputVoltage");
  } else if (inverter.maxInputVoltage > 2500) {
    warnings.push("A tensão máxima de entrada do inversor está muito alta (acima de 2500V). Verifique o valor.");
    warningFields.push("inverter.maxInputVoltage");
  }

  if (inverter.minMpptVoltage <= 0) {
    warnings.push("A tensão mínima do MPPT deve ser maior que 0.");
    errorFields.push("inverter.minMpptVoltage");
  }
  
  if (inverter.maxMpptVoltage <= inverter.minMpptVoltage) {
    warnings.push("A tensão máxima do MPPT deve ser maior que a mínima.");
    errorFields.push("inverter.maxMpptVoltage", "inverter.minMpptVoltage");
  } else if (inverter.maxMpptVoltage > 2000) {
    warnings.push("A tensão máxima do MPPT está muito alta (acima de 2000V). Verifique o valor.");
    warningFields.push("inverter.maxMpptVoltage");
  }

  if (inverter.maxMpptVoltage > inverter.maxInputVoltage) {
    warnings.push("A tensão máxima do MPPT não deve exceder a tensão máxima de entrada.");
    warningFields.push("inverter.maxMpptVoltage", "inverter.maxInputVoltage");
  }
  
  if (inverter.maxInputCurrent <= 0) {
    warnings.push("A corrente máxima de entrada do inversor deve ser maior que 0.");
    errorFields.push("inverter.maxInputCurrent");
  } else if (inverter.maxInputCurrent > 500) {
    warnings.push("A corrente máxima de entrada do inversor está muito alta (acima de 500A). Verifique o valor.");
    warningFields.push("inverter.maxInputCurrent");
  }

  if (inverter.numMppts !== undefined && inverter.numMppts <= 0) {
    warnings.push("O número de MPPTs deve ser pelo menos 1.");
    errorFields.push("inverter.numMppts");
  } else if (inverter.numMppts !== undefined && inverter.numMppts > 20) {
    warnings.push("O número de MPPTs está muito alto (acima de 20). Verifique o valor.");
    warningFields.push("inverter.numMppts");
  }

  // Site Checks
  if (site.minTemp > site.maxTemp) {
    warnings.push("A temperatura mínima não pode ser maior que a máxima.");
    errorFields.push("site.minTemp", "site.maxTemp");
  }
  if (site.desiredPowerKw !== undefined && site.desiredPowerKw < 0) {
    warnings.push("A potência desejada não pode ser negativa.");
    errorFields.push("site.desiredPowerKw");
  }
  if (site.availableSpaceM2 !== undefined && site.availableSpaceM2 < 0) {
    warnings.push("A área disponível não pode ser negativa.");
    errorFields.push("site.availableSpaceM2");
  }

  // If we have critical errors, stop calculation or return early with errors
  if (errorFields.length > 0) {
    return {
      maxModules: 0,
      minModules: 0,
      vocMax: 0,
      vmpMin: 0,
      isCompatible: false,
      warnings,
      errorFields,
      warningFields
    };
  }

  // 1. Calculate Temperature Corrected Voltages
  // Formula: V_new = V_stc * (1 + (T_new - 25) * (Coeff / 100))
  
  // Voc rises as temp drops. We need Voc at Min Temp to ensure we don't blow the inverter.
  const vocMax = module.voc * (1 + (site.minTemp - 25) * (module.tempCoeffVoc / 100));
  
  // Vmp drops as temp rises. We need Vmp at Max Temp to ensure we stay above Min MPPT.
  const vmpMin = module.vmp * (1 + (site.maxTemp - 25) * (module.tempCoeffVmp / 100));

  // 2. Calculate Limits
  const maxModules = Math.floor(inverter.maxInputVoltage / vocMax);
  const minModules = Math.ceil(inverter.minMpptVoltage / vmpMin);

  // 3. Validation
  if (vocMax > inverter.maxInputVoltage) {
    warnings.push("A tensão de circuito aberto (Voc) de um único módulo excede a entrada máxima do inversor em baixa temperatura!");
    errorFields.push("module.voc", "site.minTemp", "inverter.maxInputVoltage");
  }

  if (minModules > maxModules) {
    warnings.push("Incompatível: O número mínimo de módulos excede o máximo permitido.");
    errorFields.push("inverter.minMpptVoltage", "inverter.maxInputVoltage", "module.voc", "module.vmp");
  }

  if (module.isc > inverter.maxInputCurrent) {
    warnings.push(`Incompatível: A corrente de curto-circuito do módulo (${module.isc}A) excede a corrente máxima de entrada do inversor (${inverter.maxInputCurrent}A).`);
    errorFields.push("module.isc", "inverter.maxInputCurrent");
  } else if (module.imp > inverter.maxInputCurrent) {
    warnings.push(`Atenção: A corrente de operação do módulo (${module.imp}A) excede a corrente máxima do inversor (${inverter.maxInputCurrent}A). O inversor irá limitar a potência (clipping).`);
    warningFields.push("module.imp", "inverter.maxInputCurrent");
  }

  // 4. Calculate Recommended Sizing based on Desired Power and Space
  let recommendedModules: number | undefined;
  let recommendedStrings: number | undefined;
  let totalSystemPowerKw: number | undefined;
  let totalAreaM2: number | undefined;

  if (site.desiredPowerKw && site.desiredPowerKw > 0) {
    const desiredPowerW = site.desiredPowerKw * 1000;
    const targetModules = Math.ceil(desiredPowerW / module.power);
    
    // Check space constraint if provided
    let allowedModulesBySpace = targetModules;
    if (site.availableSpaceM2 && site.availableSpaceM2 > 0 && module.area && module.area > 0) {
      allowedModulesBySpace = Math.floor(site.availableSpaceM2 / module.area);
      if (targetModules > allowedModulesBySpace) {
        warnings.push(`Atenção: A área disponível (${site.availableSpaceM2}m²) comporta no máximo ${allowedModulesBySpace} módulos, o que é menor que os ${targetModules} módulos necessários para a potência desejada.`);
        warningFields.push("site.availableSpaceM2", "site.desiredPowerKw");
      }
    }

    const actualModules = Math.min(targetModules, allowedModulesBySpace);
    
    if (actualModules > 0) {
      // Try to distribute modules into strings
      const numMppts = inverter.numMppts || 1;
      // We want to find a number of strings that fits the modules and respects min/max limits
      // Simplest approach: divide modules equally among MPPTs
      // If actualModules / numMppts > maxModules, we need more strings per MPPT (parallel), but let's assume 1 string per MPPT for simplicity first.
      
      let strings = numMppts;
      let modulesPerString = Math.ceil(actualModules / strings);
      
      if (modulesPerString > maxModules) {
        // Need more strings
        strings = Math.ceil(actualModules / maxModules);
        modulesPerString = Math.ceil(actualModules / strings);
      }
      
      if (modulesPerString < minModules) {
        warnings.push(`Atenção: A quantidade de módulos por string (${modulesPerString}) para atingir a potência desejada é menor que o mínimo exigido pelo inversor (${minModules}).`);
        warningFields.push("site.desiredPowerKw");
      } else if (modulesPerString > maxModules) {
        warnings.push(`Atenção: Não é possível atingir a potência desejada sem exceder a tensão máxima do inversor.`);
      } else {
        // Check current with parallel strings
        const stringsPerMppt = Math.ceil(strings / numMppts);
        const totalImpPerMppt = stringsPerMppt * module.imp;
        const totalIscPerMppt = stringsPerMppt * module.isc;

        if (totalIscPerMppt > inverter.maxInputCurrent) {
           warnings.push(`Incompatível: O arranjo recomendado possui ${stringsPerMppt} string(s) em paralelo por MPPT, resultando em uma corrente de curto-circuito de ${totalIscPerMppt.toFixed(1)}A, que excede a corrente máxima do inversor (${inverter.maxInputCurrent}A).`);
           errorFields.push("site.desiredPowerKw", "inverter.maxInputCurrent");
        } else if (totalImpPerMppt > inverter.maxInputCurrent) {
           warnings.push(`Atenção: O arranjo recomendado possui ${stringsPerMppt} string(s) em paralelo por MPPT, resultando em uma corrente de operação de ${totalImpPerMppt.toFixed(1)}A, que excede a corrente máxima do inversor (${inverter.maxInputCurrent}A). Haverá limitação de potência (clipping).`);
           warningFields.push("site.desiredPowerKw", "inverter.maxInputCurrent");
        }

        recommendedModules = actualModules;
        recommendedStrings = strings;
        totalSystemPowerKw = (actualModules * module.power) / 1000;
        if (module.area) {
          totalAreaM2 = actualModules * module.area;
        }
      }
    }
  }

  return {
    maxModules: Math.max(0, maxModules),
    minModules: Math.max(0, minModules),
    vocMax,
    vmpMin,
    isCompatible: errorFields.length === 0 && (warnings.length === 0 || warnings.every(w => w.includes("clipping") || w.includes("Atenção"))),
    warnings,
    errorFields,
    warningFields,
    recommendedModules,
    recommendedStrings,
    totalSystemPowerKw,
    totalAreaM2,
    minStringVoltage: Math.max(0, minModules) * vmpMin,
    maxStringVoltage: Math.max(0, maxModules) * vocMax
  };
}
