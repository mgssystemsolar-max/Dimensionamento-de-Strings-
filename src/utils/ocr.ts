import { InverterSpecs, ModuleSpecs } from './solar';
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      }
    };
    reader.onerror = error => reject(error);
  });
};

export async function extractInverterData(file: File): Promise<Partial<InverterSpecs>> {
  try {
    const base64Data = await fileToBase64(file);
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: file.type,
              data: base64Data,
            },
          },
          {
            text: "Extraia as especificações técnicas deste datasheet de inversor solar. Retorne APENAS um objeto JSON com os valores numéricos encontrados.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            maxInputVoltage: { type: Type.NUMBER, description: "Tensão máxima de entrada (Max Input Voltage / Max DC Voltage) em Volts" },
            minMpptVoltage: { type: Type.NUMBER, description: "Tensão mínima da faixa de MPPT (Min MPPT Voltage) em Volts" },
            maxMpptVoltage: { type: Type.NUMBER, description: "Tensão máxima da faixa de MPPT (Max MPPT Voltage) em Volts" },
            maxInputCurrent: { type: Type.NUMBER, description: "Corrente máxima de entrada (Max Input Current) em Amperes" },
            numMppts: { type: Type.NUMBER, description: "Número de rastreadores MPPT (Number of MPPTs)" },
          },
        },
      },
    });

    const text = response.text;
    if (!text) return {};
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini OCR Error:", error);
    throw error;
  }
}

export async function extractModuleData(file: File): Promise<Partial<ModuleSpecs>> {
  try {
    const base64Data = await fileToBase64(file);
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: file.type,
              data: base64Data,
            },
          },
          {
            text: "Extraia as especificações técnicas (STC - Standard Test Conditions) deste datasheet de módulo/painel solar fotovoltaico. Retorne APENAS um objeto JSON com os valores numéricos encontrados.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            power: { type: Type.NUMBER, description: "Potência nominal máxima (Pmax) em Watts" },
            voc: { type: Type.NUMBER, description: "Tensão de circuito aberto (Voc / Open Circuit Voltage) em Volts" },
            vmp: { type: Type.NUMBER, description: "Tensão de máxima potência (Vmp / Maximum Power Voltage) em Volts" },
            isc: { type: Type.NUMBER, description: "Corrente de curto-circuito (Isc / Short Circuit Current) em Amperes" },
            imp: { type: Type.NUMBER, description: "Corrente de máxima potência (Imp / Maximum Power Current) em Amperes" },
            tempCoeffVoc: { type: Type.NUMBER, description: "Coeficiente de temperatura do Voc (Temperature Coefficient of Voc) em %/°C. Geralmente é um valor negativo, ex: -0.25" },
            tempCoeffVmp: { type: Type.NUMBER, description: "Coeficiente de temperatura do Pmax (Temperature Coefficient of Pmax) em %/°C. Geralmente é um valor negativo, ex: -0.35" },
          },
        },
      },
    });

    const text = response.text;
    if (!text) return {};
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini OCR Error:", error);
    throw error;
  }
}
