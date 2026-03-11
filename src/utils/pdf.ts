import jsPDF from 'jspdf';
import { SizingResult, ModuleSpecs, InverterSpecs, SiteConditions } from './solar';

export function generatePDF(
  result: SizingResult,
  module: ModuleSpecs,
  inverter: InverterSpecs,
  site: SiteConditions,
  moduleName: string = "Custom Module",
  techName: string = "",
  companyName: string = "",
  projectDetails?: { clientName: string, projectName: string, concessionaria: string }
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = margin;

  // --- Header ---
  // Logo Placeholder (Gray Box)
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y, 40, 20, 'F');
  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.text("LOGO", margin + 12, y + 12);

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
    y += 10;
  }

  y += 5;

  // --- Section 1: Parâmetros do Projeto ---
  const sectionTitle = (title: string) => {
    doc.setFillColor(245, 158, 11); // Amber-500
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
  row("Modelo:", inverter.model || "Não especificado");
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
  doc.setFillColor(250);
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
  doc.setFillColor(230);
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

  if (inverter.numMppts) {
    doc.setFont("helvetica", "normal");
    doc.text(`Número de MPPTs (Entradas) do Inversor: ${inverter.numMppts}`, margin, y);
    y += 10;
  } else {
    y += 5;
  }

  // --- Section 4: Conclusão ---
  sectionTitle("4. Conclusão e Parecer Técnico");

  if (result.isCompatible) {
    doc.setFillColor(220, 252, 231); // Green-100
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
    doc.setFillColor(254, 242, 242); // Red-50
    doc.setDrawColor(220, 38, 38); // Red-600
    doc.roundedRect(margin, y, pageWidth - (margin * 2), 30 + (result.warnings.length * 5), 2, 2, 'FD');
    
    doc.setTextColor(185, 28, 28); // Red-700
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("⚠ ATENÇÃO: INCOMPATIBILIDADE DETECTADA", margin + 10, y + 10);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(50);
    
    let warnY = y + 18;
    result.warnings.forEach(w => {
      doc.text(`• ${w}`, margin + 10, warnY);
      warnY += 5;
    });
    y += 30 + (result.warnings.length * 5) + 10;
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
