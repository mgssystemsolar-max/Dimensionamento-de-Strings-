import { InverterSpecs, ModuleSpecs } from './solar';
import { GoogleGenAI, Type } from "@google/genai";
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("A chave da API do Gemini (GEMINI_API_KEY) não está configurada. Por favor, adicione-a nas variáveis de ambiente.");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

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

const convertPdfToImages = async (file: File): Promise<string[]> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    const images: string[] = [];

    // Limit to first 5 pages to avoid sending too much data
    const maxPages = Math.min(numPages, 5);

    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) continue;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Fill with white background to prevent transparent areas from becoming black in JPEG
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: context,
        canvas: canvas,
        viewport: viewport
      }).promise;

      const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      images.push(base64);
    }

    return images;
  } catch (error) {
    console.error("Error converting PDF to images:", error);
    throw new Error("Falha ao processar o arquivo PDF. Verifique se o arquivo é válido.");
  }
};

const prepareFileParts = async (file: File) => {
  if (file.type === 'application/pdf') {
    const base64Images = await convertPdfToImages(file);
    return base64Images.map(base64 => ({
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64,
      },
    }));
  } else {
    const base64Data = await fileToBase64(file);
    return [{
      inlineData: {
        mimeType: file.type,
        data: base64Data,
      },
    }];
  }
};

function cleanAndParseJSON(text: string) {
  try {
    // Try to parse directly first
    return JSON.parse(text);
  } catch (e) {
    // If it fails, try to clean up markdown code blocks
    const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch (e2) {
      // If it still fails, it might be truncated or severely malformed
      console.error("Failed to parse JSON even after cleanup. Raw text:", text.substring(0, 500) + "...");
      throw new Error("Não foi possível extrair os dados do documento. O formato retornado é inválido.");
    }
  }
}

export async function extractInverterData(file: File): Promise<Partial<InverterSpecs>> {
  try {
    const ai = getAiClient();
    const parts = await prepareFileParts(file);
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          ...parts,
          {
            text: `Extraia as especificações técnicas (STC - Standard Test Conditions) deste datasheet solar com foco em segurança elétrica. Retorne APENAS um objeto JSON seguindo o esquema fornecido.

REGRAS CRÍTICAS PARA EVITAR ERROS:

Fidelidade Numérica: Extraia os valores exatamente como impressos. Não arredonde e não tente deduzir valores ausentes. Limite todos os números a no máximo 2 casas decimais.

Diferenciação de Corrente: No caso de inversores, diferencie 'Max. Input Current' (total do MPPT) de 'Max. Current per Connector' (limite físico do terminal MC4). Se o campo 'per connector' não existir, procure por 'Max. fuse rating' ou mencione no campo de modelo.

Coeficientes de Temperatura: Capture o sinal (geralmente negativo, ex: -0.28). Se o datasheet fornecer em V/°C, mantenha o valor e adicione a unidade na string do modelo para que eu possa tratar via código.

Limites MPPT: Identifique com precisão a 'Tensão de Partida' (Start-up voltage) e a 'Tensão Mínima de MPPT'.

COMPATIBILIDADE TÉCNICA (Check Interno):
Compare a Corrente de Máxima Potência (Imp) do módulo com a Corrente Máxima por Conector do inversor. Se o módulo for superior, adicione um campo 'Alerta_Seguranca' no JSON detalhando o risco de superaquecimento dos conectores. OMITA o campo 'Alerta_Seguranca' se não houver risco ou se os dados não estiverem disponíveis. O alerta deve ter no máximo 100 caracteres.`,
          },
        ],
      },
      config: {
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            model: { type: Type.STRING, description: "Nome do modelo do inversor (máx 50 caracteres)" },
            manufacturer: { type: Type.STRING, description: "Nome do fabricante do inversor (máx 50 caracteres)" },
            maxInputVoltage: { type: Type.NUMBER, description: "Tensão máxima de entrada (Max Input Voltage / Max DC Voltage) em Volts" },
            minMpptVoltage: { type: Type.NUMBER, description: "Tensão mínima da faixa de MPPT (Min MPPT Voltage) em Volts" },
            maxMpptVoltage: { type: Type.NUMBER, description: "Tensão máxima da faixa de MPPT (Max MPPT Voltage) em Volts" },
            maxInputCurrent: { type: Type.NUMBER, description: "Corrente máxima de entrada (Max Input Current) em Amperes" },
            numMppts: { type: Type.NUMBER, description: "Número de rastreadores MPPT (Number of MPPTs)" },
            startupVoltage: { type: Type.NUMBER, description: "Tensão de Partida (Start-up voltage) em Volts" },
            maxCurrentPerConnector: { type: Type.NUMBER, description: "Corrente Máxima por Conector (Max. Current per Connector) em Amperes" },
            Alerta_Seguranca: { type: Type.STRING, description: "Alerta de segurança sobre superaquecimento de conectores, se aplicável" },
          },
        },
      },
    });

    const text = response.text;
    if (!text) return {};
    
    return cleanAndParseJSON(text);
  } catch (error) {
    console.error("Gemini OCR Error:", error);
    throw error;
  }
}

export async function extractModuleData(file: File): Promise<Partial<ModuleSpecs>> {
  try {
    const ai = getAiClient();
    const parts = await prepareFileParts(file);
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          ...parts,
          {
            text: `Extraia as especificações técnicas (STC - Standard Test Conditions) deste datasheet solar com foco em segurança elétrica. Retorne APENAS um objeto JSON seguindo o esquema fornecido.

REGRAS CRÍTICAS PARA EVITAR ERROS:

Fidelidade Numérica: Extraia os valores exatamente como impressos. Não arredonde e não tente deduzir valores ausentes. Limite todos os números a no máximo 2 casas decimais.

Diferenciação de Corrente: No caso de inversores, diferencie 'Max. Input Current' (total do MPPT) de 'Max. Current per Connector' (limite físico do terminal MC4). Se o campo 'per connector' não existir, procure por 'Max. fuse rating' ou mencione no campo de modelo.

Coeficientes de Temperatura: Capture o sinal (geralmente negativo, ex: -0.28). Se o datasheet fornecer em V/°C, mantenha o valor e adicione a unidade na string do modelo para que eu possa tratar via código.

Limites MPPT: Identifique com precisão a 'Tensão de Partida' (Start-up voltage) e a 'Tensão Mínima de MPPT'.

COMPATIBILIDADE TÉCNICA (Check Interno):
Compare a Corrente de Máxima Potência (Imp) do módulo com a Corrente Máxima por Conector do inversor. Se o módulo for superior, adicione um campo 'Alerta_Seguranca' no JSON detalhando o risco de superaquecimento dos conectores. OMITA o campo 'Alerta_Seguranca' se não houver risco ou se os dados não estiverem disponíveis. O alerta deve ter no máximo 100 caracteres.`,
          },
        ],
      },
      config: {
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            model: { type: Type.STRING, description: "Nome do modelo do módulo solar (máx 50 caracteres)" },
            manufacturer: { type: Type.STRING, description: "Nome do fabricante do módulo solar (máx 50 caracteres)" },
            power: { type: Type.NUMBER, description: "Potência nominal máxima (Pmax) em Watts" },
            voc: { type: Type.NUMBER, description: "Tensão de circuito aberto (Voc / Open Circuit Voltage) em Volts" },
            vmp: { type: Type.NUMBER, description: "Tensão de máxima potência (Vmp / Maximum Power Voltage) em Volts" },
            isc: { type: Type.NUMBER, description: "Corrente de curto-circuito (Isc / Short Circuit Current) em Amperes" },
            imp: { type: Type.NUMBER, description: "Corrente de máxima potência (Imp / Maximum Power Current) em Amperes" },
            tempCoeffVoc: { type: Type.NUMBER, description: "Coeficiente de temperatura do Voc (Temperature Coefficient of Voc) em %/°C. Geralmente é um valor negativo, ex: -0.25" },
            tempCoeffVmp: { type: Type.NUMBER, description: "Coeficiente de temperatura do Pmax (Temperature Coefficient of Pmax) em %/°C. Geralmente é um valor negativo, ex: -0.35" },
            tempSTC: { type: Type.NUMBER, description: "Temperatura de teste STC (Standard Test Conditions) em °C. Geralmente é 25°C." },
            width: { type: Type.NUMBER, description: "Largura do módulo (Width) em milímetros (mm)" },
            length: { type: Type.NUMBER, description: "Comprimento do módulo (Length/Height) em milímetros (mm)" },
            Alerta_Seguranca: { type: Type.STRING, description: "Alerta de segurança sobre superaquecimento de conectores, se aplicável" },
          },
        },
      },
    });

    const text = response.text;
    if (!text) return {};
    
    const data = cleanAndParseJSON(text) as Partial<ModuleSpecs>;
    
    // Check if tempCoeffVoc or tempCoeffVmp are in V/°C (indicated in the model string)
    if (data.model && data.model.includes("V/°C")) {
      if (data.tempCoeffVoc && data.voc) {
        // Convert V/°C to %/°C
        data.tempCoeffVoc = (data.tempCoeffVoc / data.voc) * 100;
        // Round to 3 decimal places
        data.tempCoeffVoc = Math.round(data.tempCoeffVoc * 1000) / 1000;
      }
      if (data.tempCoeffVmp && data.vmp) {
        // Convert V/°C to %/°C
        data.tempCoeffVmp = (data.tempCoeffVmp / data.vmp) * 100;
        // Round to 3 decimal places
        data.tempCoeffVmp = Math.round(data.tempCoeffVmp * 1000) / 1000;
      }
      // Remove the unit from the model name to keep it clean
      data.model = data.model.replace(/\s*\(?V\/°C\)?/g, "").trim();
    }
    
    return data;
  } catch (error) {
    console.error("Gemini OCR Error:", error);
    throw error;
  }
}
