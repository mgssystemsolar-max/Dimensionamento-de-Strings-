import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

  // --- Helper: Add Page ---
  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 25) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  // --- Header ---
  if (companyLogo) {
    try {
      const match = companyLogo.match(/^data:image\/(png|jpeg|jpg);base64,/);
      const format = match ? match[1].toUpperCase() : 'PNG';
      doc.addImage(companyLogo, format, margin, y, 40, 20, '', 'FAST');
    } catch (e) {
      console.error("Error adding logo to PDF", e);
      doc.setFillColor('#F0F0F0');
      doc.rect(margin, y, 40, 20, 'F');
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text("LOGO", margin + 12, y + 12);
    }
  } else {
    doc.setFillColor('#F0F0F0');
    doc.rect(margin, y, 40, 20, 'F');
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("LOGO", margin + 12, y + 12);
  }

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
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, y, { align: "center" });
  y += 8;

  if (techName) {
    doc.text(`Responsável Técnico: ${techName}`, pageWidth / 2, y, { align: "center" });
    y += 8;
  }

  // --- Project Details ---
  if (projectDetails) {
    y += 2;
    doc.setTextColor(50);
    doc.setFont("helvetica", "bold");
    doc.text("Detalhes do Projeto:", margin, y);
    doc.setFont("helvetica", "normal");
    y += 6;
    
    const detailsLeft = [
      `Cliente: ${projectDetails.clientName || 'Não informado'}`,
      `Projeto: ${projectDetails.projectName || 'Não informado'}`,
      `Concessionária: ${projectDetails.concessionaria || 'Não informada'}`
    ];
    
    const addressParts = [
      projectDetails.street,
      projectDetails.neighborhood,
      projectDetails.city,
      projectDetails.state
    ].filter(Boolean);
    
    const dateTimeStr = [
      projectDetails.date ? `Data: ${projectDetails.date.split('-').reverse().join('/')}` : null,
      projectDetails.time ? `Hora: ${projectDetails.time}` : null
    ].filter(Boolean).join(' às ');

    const detailsRight = [];
    if (addressParts.length > 0) detailsRight.push(`Endereço: ${addressParts.join(', ')}`);
    if (dateTimeStr) detailsRight.push(dateTimeStr);

    doc.setFontSize(9);
    for (let i = 0; i < Math.max(detailsLeft.length, detailsRight.length); i++) {
      if (detailsLeft[i]) doc.text(detailsLeft[i], margin, y);
      if (detailsRight[i]) doc.text(detailsRight[i], pageWidth / 2, y);
      y += 5;
    }
    y += 2;
  }

  // --- Índice (Table of Contents) ---
  checkPageBreak(40);
  y += 5;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("Índice", margin, y);
  y += 6;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50);
  
  const tocItems = [
    "Resumo Executivo",
    "1. Especificações dos Equipamentos",
    "2. Condições Locais",
    "3. Análise Técnica e Limites",
    "4. Parecer Técnico Detalhado",
    diagramDataUrl ? "5. Diagrama Unifilar Simplificado" : null
  ].filter(Boolean) as string[];

  tocItems.forEach((item) => {
    doc.text(item, margin + 5, y);
    y += 6;
  });
  y += 10;

  // --- Resumo Executivo ---
  checkPageBreak(40);
  y += 5;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("Resumo Executivo", margin, y);
  y += 6;

  if (result.isCompatible) {
    doc.setFillColor('#DCFCE7'); // Green-100
    doc.setDrawColor(22, 163, 74); // Green-600
    doc.roundedRect(margin, y, pageWidth - (margin * 2), 22, 2, 2, 'FD');
    doc.setTextColor(21, 128, 61); // Green-700
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("✓ SISTEMA COMPATÍVEL", margin + 5, y + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Recomendação: ${result.recommendedModules} módulos divididos em ${result.recommendedStrings} string(s).`, margin + 5, y + 14);
    if (result.totalSystemPowerKw) {
      doc.text(`Potência Total: ${result.totalSystemPowerKw.toFixed(2)} kWp`, margin + 5, y + 19);
    }
  } else {
    doc.setFillColor('#FEF2F2'); // Red-50
    doc.setDrawColor(220, 38, 38); // Red-600
    doc.roundedRect(margin, y, pageWidth - (margin * 2), 22, 2, 2, 'FD');
    doc.setTextColor(185, 28, 28); // Red-700
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("⚠ SISTEMA INCOMPATÍVEL", margin + 5, y + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("O arranjo proposto excede os limites operacionais do inversor.", margin + 5, y + 14);
    doc.text("Consulte o Parecer Técnico Detalhado na próxima seção.", margin + 5, y + 19);
  }
  y += 30;

  // --- 1. Especificações dos Equipamentos ---
  checkPageBreak(50);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("1. Especificações dos Equipamentos", margin, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [['Equipamento', 'Parâmetro', 'Valor']],
    body: [
      ['Módulo Fotovoltaico', 'Modelo', module.model || moduleName],
      ['', 'Potência (Pmax)', `${module.power} W`],
      ['', 'Voc (STC)', `${module.voc} V`],
      ['', 'Isc (STC)', `${module.isc} A`],
      ['', 'Vmp (STC)', `${module.vmp} V`],
      ['', 'Coef. Temp. Voc', `${module.tempCoeffVoc} %/°C`],
      ['Inversor', 'Modelo', inverter.model || inverterName],
      ['', 'Tensão Máx. Entrada', `${inverter.maxInputVoltage} V`],
      ['', 'Faixa MPPT', `${inverter.minMpptVoltage} V - ${inverter.maxMpptVoltage} V`],
      ['', 'Corrente Máx. Entrada', `${inverter.maxInputCurrent} A`],
      ['', 'Número de MPPTs', `${inverter.numMppts || 1}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold' }, // Amber-500
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50, textColor: [50, 50, 50] },
      1: { fontStyle: 'bold', cellWidth: 60, textColor: [80, 80, 80] },
      2: { cellWidth: 'auto', textColor: [50, 50, 50] }
    },
    styles: { fontSize: 9, cellPadding: 3 },
    margin: { left: margin, right: margin }
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // --- 2. Condições Locais ---
  checkPageBreak(30);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("2. Condições Locais", margin, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [['Parâmetro', 'Valor']],
    body: [
      ['Temperatura Mínima Extrema', `${site.minTemp}°C`],
      ['Temperatura Máxima Extrema', `${site.maxTemp}°C`],
      ['Temperatura STC (Referência do Módulo)', `${module.tempSTC ?? 25}°C`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 110, textColor: [80, 80, 80] },
      1: { cellWidth: 'auto', textColor: [50, 50, 50] }
    },
    styles: { fontSize: 9, cellPadding: 3 },
    margin: { left: margin, right: margin }
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // --- 3. Análise Técnica e Limites ---
  checkPageBreak(60);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("3. Análise Técnica e Limites", margin, y);
  y += 4;

  const isVocError = result.vocMax > inverter.maxInputVoltage;
  const isVmpMinError = result.vmpMin < inverter.minMpptVoltage;
  const isVmpMaxError = result.vmpMax > inverter.maxMpptVoltage;
  const isIscError = module.isc > inverter.maxInputCurrent;

  autoTable(doc, {
    startY: y,
    head: [['Parâmetro Calculado', 'Valor', 'Limite do Inversor', 'Status']],
    body: [
      [
        `Tensão Voc Corrigida (@ ${site.minTemp}°C)`, 
        `${result.vocMax.toFixed(2)} V`, 
        `Máx: ${inverter.maxInputVoltage} V`, 
        isVocError ? 'EXCEDE LIMITE' : 'OK'
      ],
      [
        `Tensão Vmp Corrigida (@ ${site.maxTemp}°C)`, 
        `${result.vmpMin.toFixed(2)} V`, 
        `Mín MPPT: ${inverter.minMpptVoltage} V`, 
        isVmpMinError ? 'ABAIXO DO MPPT' : 'OK'
      ],
      [
        `Tensão Vmp Corrigida (@ ${site.minTemp}°C)`, 
        `${result.vmpMax.toFixed(2)} V`, 
        `Máx MPPT: ${inverter.maxMpptVoltage} V`, 
        isVmpMaxError ? 'ACIMA DO MPPT' : 'OK'
      ],
      [
        `Corrente de Curto-Circuito (Isc)`, 
        `${module.isc.toFixed(2)} A`, 
        `Máx: ${inverter.maxInputCurrent} A`, 
        isIscError ? 'EXCEDE LIMITE' : 'OK'
      ],
      [
        `Mínimo de Módulos em Série`, 
        `${result.minModules}`, 
        `-`, 
        `-`
      ],
      [
        `Máximo de Módulos em Série`, 
        `${result.maxModules}`, 
        `-`, 
        `-`
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 70, textColor: [80, 80, 80] },
      1: { cellWidth: 35, fontStyle: 'bold' },
      2: { cellWidth: 40, textColor: [100, 100, 100] },
      3: { cellWidth: 'auto', fontStyle: 'bold' }
    },
    styles: { fontSize: 9, cellPadding: 3 },
    margin: { left: margin, right: margin },
    didParseCell: function(data) {
      if (data.section === 'body' && data.column.index === 3) {
        if (data.cell.raw !== 'OK' && data.cell.raw !== '-') {
          data.cell.styles.textColor = [220, 38, 38]; // Red
        } else if (data.cell.raw === 'OK') {
          data.cell.styles.textColor = [21, 128, 61]; // Green
        }
      }
      if (data.section === 'body' && data.column.index === 1) {
        const rowIdx = data.row.index;
        if ((rowIdx === 0 && isVocError) || 
            (rowIdx === 1 && isVmpMinError) || 
            (rowIdx === 2 && isVmpMaxError) || 
            (rowIdx === 3 && isIscError)) {
          data.cell.styles.textColor = [220, 38, 38]; // Red
        }
      }
    }
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // --- 4. Parecer Técnico Detalhado ---
  checkPageBreak(40);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("4. Parecer Técnico Detalhado", margin, y);
  y += 6;

  if (!result.isCompatible && result.errors && result.errors.length > 0) {
    let blockHeight = 15;
    const errorLines: string[][] = [];
    result.errors.forEach(err => {
      const lines = doc.splitTextToSize(`• ${err}`, pageWidth - (margin * 2) - 10);
      errorLines.push(lines);
      blockHeight += lines.length * 5;
    });

    checkPageBreak(blockHeight + 10);

    doc.setFillColor('#FEF2F2'); // Red-50
    doc.setDrawColor(220, 38, 38); // Red-600
    doc.roundedRect(margin, y, pageWidth - (margin * 2), blockHeight, 2, 2, 'FD');
    
    y += 7;
    doc.setFontSize(10);
    doc.setTextColor(220, 38, 38); // Red
    doc.setFont("helvetica", "bold");
    doc.text("Erros Críticos Encontrados:", margin + 5, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    errorLines.forEach(lines => {
      doc.text(lines, margin + 5, y);
      y += lines.length * 5;
    });
    y += 5;
  }

  if (result.warnings && result.warnings.length > 0) {
    let blockHeight = 15;
    const warningLines: string[][] = [];
    result.warnings.forEach(warn => {
      const lines = doc.splitTextToSize(`• ${warn}`, pageWidth - (margin * 2) - 10);
      warningLines.push(lines);
      blockHeight += lines.length * 5;
    });

    checkPageBreak(blockHeight + 10);

    doc.setFillColor('#FFFBEB'); // Amber-50
    doc.setDrawColor(217, 119, 6); // Amber-600
    doc.roundedRect(margin, y, pageWidth - (margin * 2), blockHeight, 2, 2, 'FD');

    y += 7;
    doc.setFontSize(10);
    doc.setTextColor(217, 119, 6); // Amber
    doc.setFont("helvetica", "bold");
    doc.text("Avisos e Recomendações:", margin + 5, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    warningLines.forEach(lines => {
      doc.text(lines, margin + 5, y);
      y += lines.length * 5;
    });
    y += 5;
  }

  if (result.isCompatible && (!result.warnings || result.warnings.length === 0)) {
    doc.setFillColor('#DCFCE7'); // Green-100
    doc.setDrawColor(22, 163, 74); // Green-600
    doc.roundedRect(margin, y, pageWidth - (margin * 2), 20, 2, 2, 'FD');

    y += 7;
    doc.setFontSize(10);
    doc.setTextColor(21, 128, 61); // Green
    doc.setFont("helvetica", "bold");
    doc.text("Sistema Aprovado", margin + 5, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.text("Nenhuma ressalva técnica. O sistema está perfeitamente dimensionado dentro dos limites.", margin + 5, y);
    y += 10;
  }

  // --- 5. Diagrama Unifilar Simplificado ---
  if (diagramDataUrl) {
    checkPageBreak(100);
    y += 5;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("5. Diagrama Unifilar Simplificado", margin, y);
    y += 6;
    
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

  // --- Signatures ---
  if (techName) {
    checkPageBreak(40);
    y += 20;
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

  // --- Footer (Page Numbers) ---
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = pageHeight - 15;
    
    doc.setDrawColor(200);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
    
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.setFont("helvetica", "normal");
    doc.text("Gerado por SolarString Pro - Ferramenta de Dimensionamento Fotovoltaico", margin, footerY);
    
    const pageString = `Página ${i} de ${pageCount}`;
    doc.text(pageString, pageWidth - margin, footerY, { align: "right" });
  }

  doc.save(`Laudo_Tecnico_${moduleName.replace(/\s+/g, '_')}.pdf`);
}
