import jsPDF from 'jspdf';
import { SizingResult, ModuleSpecs, InverterSpecs, SiteConditions } from './solar';

export function generatePDF(
  result: SizingResult,
  module: ModuleSpecs,
  inverter: InverterSpecs,
  site: SiteConditions,
  moduleName: string = "Custom Module",
  inverterName: string = "Custom Inverter",
  techName: string = "",
  companyName: string = "",
  projectDetails?: { 
    clientName: string, 
    projectName: string, 
    concessionaria: string,
    date?: string,
    time?: string,
    street?: string,
    neighborhood?: string,
    city?: string,
    state?: string
  },
  companyLogo?: string,
  diagramDataUrl?: string
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = margin;

  // --- Header ---
  if (companyLogo) {
    try {
      // Extract format from data URI (e.g., "data:image/png;base64,...")
      const match = companyLogo.match(/^data:image\/(png|jpeg|jpg);base64,/);
      const format = match ? match[1].toUpperCase() : 'PNG';
      
      doc.addImage(companyLogo, format, margin, y, 40, 20, '', 'FAST');
    } catch (e) {
      console.error("Error adding logo to PDF", e);
      // Fallback to placeholder
      doc.setFillColor('#F0F0F0');
      doc.rect(margin, y, 40, 20, 'F');
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text("LOGO", margin + 12, y + 12);
    }
  } else {
    // Logo Placeholder (Gray Box)
    doc.setFillColor('#F0F0F0');
    doc.rect(margin, y, 40, 20, 'F');
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("LOGO", margin + 12, y + 12);
  }

  // Company Info
  doc.setTextColor(50);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(companyName || "SolarString Pro", pageWidth - margin, y + 8, { align: "right" });
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Relatório Técnico de Dimensionamento", pageWidth - margin, y + 16, { align: "right" });
  
  y += 30;

  // --- Title & Date ---
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("LAUDO TÉCNICO DE COMPATIBILIDADE", pageWidth / 2, y, { align: "center" });
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, y, { align: "center" });
  y += 10;

  if (techName) {
    doc.text(`Responsável Técnico: ${techName}`, pageWidth / 2, y, { align: "center" });
    y += 10;
  }

  if (projectDetails) {
    doc.setTextColor(50);
    doc.setFont("helvetica", "bold");
    doc.text("Detalhes do Projeto:", margin, y);
    doc.setFont("helvetica", "normal");
    y += 6;
    doc.text(`Cliente: ${projectDetails.clientName || 'Não informado'}`, margin, y);
    y += 6;
    doc.text(`Projeto: ${projectDetails.projectName || 'Não informado'}`, margin, y);
    y += 6;
    doc.text(`Concessionária: ${projectDetails.concessionaria || 'Não informada'}`, margin, y);
    
    if (projectDetails.date || projectDetails.time || projectDetails.street || projectDetails.city) {
      y += 6;
      doc.setFont("helvetica", "bold");
      doc.text("Localização e Data do Entendimento:", margin, y);
      doc.setFont("helvetica", "normal");
      y += 6;
      
      const dateTimeStr = [
        projectDetails.date ? `Data: ${projectDetails.date.split('-').reverse().join('/')}` : null,
        projectDetails.time ? `Hora: ${projectDetails.time}` : null
      ].filter(Boolean).join(' às ');
      if (dateTimeStr) {
        doc.text(dateTimeStr, margin, y);
        y += 6;
      }

      const addressParts = [
        projectDetails.street,
        projectDetails.neighborhood,
        projectDetails.city,
        projectDetails.state
      ].filter(Boolean);
      
      if (addressParts.length > 0) {
        doc.text(`Endereço: ${addressParts.join(', ')}`, margin, y);
        y += 6;
      }
    }
    
    y += 4;
  }

  y += 5;

  // --- Section 1: Parâmetros do Projeto ---
  const sectionTitle = (title: string) => {
    doc.setFillColor('#F59E0B'); // Amber-500
    doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F');
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title.toUpperCase(), margin + 5, y + 5.5);
    y += 14;
    doc.setTextColor(50);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
  };

  const row = (label: string, value: string, xOffset: number = 0) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, margin + xOffset, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, margin + xOffset + 45, y);
  };

  sectionTitle("1. Especificações dos Equipamentos");

  // Module
  doc.setFont("helvetica", "bold");
  doc.text("Módulo Fotovoltaico:", margin, y);
  y += 6;
  row("Modelo:", module.model || moduleName);
  y += 6;
  row("Potência (Pmax):", `${module.power} W`);
  row("Voc (STC):", `${module.voc} V`, 90);
  y += 6;
  row("Isc (STC):", `${module.isc} A`);
  row("Vmp (STC):", `${module.vmp} V`, 90);
  y += 6;
  row("Coef. Temp. Voc:", `${module.tempCoeffVoc} %/°C`);
  y += 10;

  // Inverter
  doc.setFont("helvetica", "bold");
  doc.text("Inversor:", margin, y);
  y += 6;
  row("Modelo:", inverter.model || inverterName);
  y += 6;
  row("Tensão Máx. Entrada:", `${inverter.maxInputVoltage} V`);
  row("Faixa MPPT:", `${inverter.minMpptVoltage} V - ${inverter.maxMpptVoltage} V`, 90);
  y += 6;
  row("Corrente Máx. Entrada:", `${inverter.maxInputCurrent} A`);
  y += 12;

  // Site
  sectionTitle("2. Condições Locais");
  row("Temperatura Mínima:", `${site.minTemp}°C`);
  row("Temperatura Máxima:", `${site.maxTemp}°C`, 90);
  y += 12;

  // --- Section 3: Análise Técnica ---
  sectionTitle("3. Análise de Dimensionamento (String)");

  // Calculations Box
  doc.setDrawColor(220);
  doc.setFillColor('#FAFAFA');
  doc.roundedRect(margin, y, pageWidth - (margin * 2), 35, 2, 2, 'FD');
  
  let calcY = y + 8;
  doc.text(`Tensão de Circuito Aberto Máxima (Voc @ ${site.minTemp}°C):`, margin + 5, calcY);
  doc.setFont("helvetica", "bold");
  doc.text(`${result.vocMax.toFixed(2)} V`, pageWidth - margin - 30, calcY);
  
  calcY += 8;
  doc.setFont("helvetica", "normal");
  doc.text(`Tensão de Operação Mínima (Vmp @ ${site.maxTemp}°C):`, margin + 5, calcY);
  doc.setFont("helvetica", "bold");
  doc.text(`${result.vmpMin.toFixed(2)} V`, pageWidth - margin - 30, calcY);

  calcY += 8;
  doc.setFont("helvetica", "normal");
  doc.text(`Corrente de Operação (Imp):`, margin + 5, calcY);
  doc.setFont("helvetica", "bold");
  doc.text(`${module.imp} A`, pageWidth - margin - 30, calcY);

  y += 45;

  // Limits
  doc.setFont("helvetica", "bold");
  doc.text("Limites Calculados:", margin, y);
  y += 8;
  
  doc.setDrawColor(0);
  doc.setLineWidth(0.1);
  
  // Table Header
  doc.setFillColor('#E6E6E6');
  doc.rect(margin, y, 85, 8, 'F');
  doc.rect(margin + 85, y, 85, 8, 'F');
  doc.text(`Mínimo de Módulos (por MPPT)`, margin + 5, y + 5.5);
  doc.text(`Máximo de Módulos (por MPPT)`, margin + 90, y + 5.5);
  y += 8;

  // Table Content
  doc.rect(margin, y, 85, 12);
  doc.rect(margin + 85, y, 85, 12);
  doc.setFontSize(14);
  doc.text(`${result.minModules}`, margin + 42, y + 8, { align: "center" });
  doc.text(`${result.maxModules}`, margin + 127, y + 8, { align: "center" });
  doc.setFontSize(10);
  y += 15;

  // String Voltages
  if (result.minStringVoltage !== undefined && result.maxStringVoltage !== undefined) {
    doc.setFont("helvetica", "normal");
    doc.text(`Tensão da String (Mínima): ${result.minStringVoltage.toFixed(2)} V`, margin, y);
    doc.text(`Tensão da String (Máxima): ${result.maxStringVoltage.toFixed(2)} V`, margin + 85, y);
    y += 10;
  }

  if (inverter.numMppts) {
    doc.setFont("helvetica", "normal");
    doc.text(`Número de MPPTs (Entradas) do Inversor: ${inverter.numMppts}`, margin, y);
    y += 10;
  } else {
    y += 5;
  }

  // Recommended Sizing
  if (result.recommendedModules !== undefined) {
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Dimensionamento Recomendado:", margin, y);
    y += 8;
    
    doc.setDrawColor(220);
    doc.setFillColor('#FFFBEB'); // Amber-50
    doc.roundedRect(margin, y, pageWidth - (margin * 2), 25, 2, 2, 'FD');
    
    let recY = y + 8;
    doc.setFont("helvetica", "normal");
    doc.text(`Módulos Totais:`, margin + 5, recY);
    doc.setFont("helvetica", "bold");
    doc.text(`${result.recommendedModules}`, margin + 40, recY);

    doc.setFont("helvetica", "normal");
    doc.text(`Strings Sugeridas:`, margin + 85, recY);
    doc.setFont("helvetica", "bold");
    doc.text(`${result.recommendedStrings}`, margin + 125, recY);

    recY += 8;
    doc.setFont("helvetica", "normal");
    doc.text(`Potência Total:`, margin + 5, recY);
    doc.setFont("helvetica", "bold");
    doc.text(`${result.totalSystemPowerKw?.toFixed(2)} kWp`, margin + 40, recY);

    if (result.totalAreaM2 !== undefined) {
      doc.setFont("helvetica", "normal");
      doc.text(`Área Estimada:`, margin + 85, recY);
      doc.setFont("helvetica", "bold");
      doc.text(`${result.totalAreaM2.toFixed(1)} m²`, margin + 125, recY);
    }
    
    y += 35;
  }

  // --- Section 4: Diagrama Unifilar Simplificado ---
  if (diagramDataUrl) {
    // Check if we need a new page
    if (y > pageHeight - 100) {
      doc.addPage();
      y = margin;
    }
    sectionTitle("4. Diagrama Unifilar Simplificado");
    
    // Add the diagram image
    // The image is a PNG data URL
    try {
      const imgProps = doc.getImageProperties(diagramDataUrl);
      const pdfWidth = pageWidth - (margin * 2);
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      doc.addImage(diagramDataUrl, 'PNG', margin, y, pdfWidth, pdfHeight);
      y += pdfHeight + 10;
    } catch (e) {
      console.error("Error adding diagram to PDF:", e);
    }
  }

  // --- Section 5: Conclusão ---
  sectionTitle(diagramDataUrl ? "5. Conclusão e Parecer Técnico" : "4. Conclusão e Parecer Técnico");

  if (result.isCompatible) {
    doc.setFillColor('#DCFCE7'); // Green-100
    doc.setDrawColor(22, 163, 74); // Green-600
    doc.roundedRect(margin, y, pageWidth - (margin * 2), 25, 2, 2, 'FD');
    
    doc.setTextColor(21, 128, 61); // Green-700
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("✓ SISTEMA COMPATÍVEL", margin + 10, y + 10);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(50);
    doc.text("O arranjo proposto atende aos limites operacionais de tensão e corrente do inversor", margin + 10, y + 18);
    doc.text("nas condições de temperatura informadas.", margin + 10, y + 23);
    y += 35;
  } else {
    const errorCount = result.errors ? result.errors.length : 0;
    doc.setFillColor('#FEF2F2'); // Red-50
    doc.setDrawColor(220, 38, 38); // Red-600
    doc.roundedRect(margin, y, pageWidth - (margin * 2), 30 + (errorCount * 5), 2, 2, 'FD');
    
    doc.setTextColor(185, 28, 28); // Red-700
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("⚠ ERRO: INCOMPATIBILIDADE DETECTADA", margin + 10, y + 10);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(50);
    
    let warnY = y + 18;
    if (result.errors) {
      result.errors.forEach(e => {
        doc.text(`• ${e}`, margin + 10, warnY);
        warnY += 5;
      });
    }
    y += 30 + (errorCount * 5) + 5;
  }

  if (result.warnings && result.warnings.length > 0) {
    doc.setFillColor('#FEF3C7'); // Amber-100
    doc.setDrawColor(217, 119, 6); // Amber-600
    doc.roundedRect(margin, y, pageWidth - (margin * 2), 20 + (result.warnings.length * 5), 2, 2, 'FD');
    
    doc.setTextColor(180, 83, 9); // Amber-700
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("⚠ ATENÇÃO", margin + 10, y + 10);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(50);
    
    let warnY = y + 18;
    result.warnings.forEach(w => {
      doc.text(`• ${w}`, margin + 10, warnY);
      warnY += 5;
    });
    y += 20 + (result.warnings.length * 5) + 10;
  }

  // --- Signatures ---
  if (techName) {
    y += 10;
    // Check if we need a new page
    if (y > pageHeight - 40) {
      doc.addPage();
      y = margin;
    }
    
    doc.setDrawColor(0);
    doc.line(margin, y, margin + 80, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text(techName, margin, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("Responsável Técnico", margin, y + 10);
    if (companyName) {
      doc.text(companyName, margin, y + 15);
    }
  }

  // --- Footer ---
  const footerY = pageHeight - 20;
  doc.setDrawColor(200);
  doc.line(margin, footerY, pageWidth - margin, footerY);
  
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("Gerado por SolarString Pro - Ferramenta de Dimensionamento Fotovoltaico", margin, footerY + 5);
  doc.text("Suporte: mgssystemsolarclientes@gmail.com", pageWidth - margin, footerY + 5, { align: "right" });

  doc.save(`Laudo_Tecnico_${moduleName.replace(/\s+/g, '_')}.pdf`);
}
