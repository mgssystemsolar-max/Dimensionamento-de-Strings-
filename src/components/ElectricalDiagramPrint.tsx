import React from 'react';
import { ModuleSpecs, InverterSpecs, SizingResult } from '../utils/solar';

interface ElectricalDiagramPrintProps {
  module: ModuleSpecs;
  inverter: InverterSpecs;
  result: SizingResult;
  concessionaria: string;
  clientName: string;
  projectName: string;
  onClose: () => void;
}

export function ElectricalDiagramPrint({
  module,
  inverter,
  result,
  concessionaria,
  clientName,
  projectName,
  onClose
}: ElectricalDiagramPrintProps) {
  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('pt-BR');

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto print:overflow-visible print:bg-white">
      {/* Non-printable controls */}
      <div className="fixed top-4 right-4 flex gap-2 print:hidden z-50">
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 font-medium flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          Imprimir Diagrama
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg shadow hover:bg-slate-300 font-medium"
        >
          Fechar
        </button>
      </div>

      {/* Printable Area */}
      <div className="max-w-[1100px] mx-auto p-8 print:p-0 print:m-0 bg-white min-h-screen">
        
        {/* Header / Title Block */}
        <div className="border-4 border-slate-900 p-4 mb-8 flex flex-col">
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-wider">Diagrama Unifilar Fotovoltaico</h1>
              <h2 className="text-lg text-slate-600 font-medium mt-1">Concessionária: {concessionaria}</h2>
            </div>
            <div className="text-right">
              <div className="font-bold text-xl">PROJETO ELÉTRICO</div>
              <div className="text-sm text-slate-600 mt-1">Data: {currentDate}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-bold">Cliente:</span> {clientName || 'Não informado'}
            </div>
            <div>
              <span className="font-bold">Projeto:</span> {projectName || 'Sistema Fotovoltaico'}
            </div>
            <div>
              <span className="font-bold">Módulo:</span> {module.model || 'Genérico'} ({module.power}W)
            </div>
            <div>
              <span className="font-bold">Inversor:</span> {inverter.model || 'Genérico'}
            </div>
            <div>
              <span className="font-bold">Arranjo (String):</span> {result.minModules} a {result.maxModules} módulos por MPPT
            </div>
            <div>
              <span className="font-bold">Qtd. MPPTs:</span> {inverter.numMppts || 1}
            </div>
          </div>
        </div>

        {/* Diagram SVG */}
        <div className="w-full border-2 border-slate-900 p-8 flex justify-center items-center bg-white" style={{ minHeight: '600px' }}>
          <svg width="100%" height="100%" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid meet" className="font-sans">
            <defs>
              <marker id="arrow-end" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <path d="M0,0 L0,6 L9,3 z" fill="#0f172a" />
              </marker>
              <marker id="dot" markerWidth="8" markerHeight="8" refX="4" refY="4">
                <circle cx="4" cy="4" r="3" fill="#0f172a" />
              </marker>
            </defs>

            {/* --- PV Array --- */}
            <g transform="translate(50, 200)">
              {/* Solar Panels */}
              <rect x="0" y="0" width="80" height="120" fill="none" stroke="#0f172a" strokeWidth="2" />
              <line x1="0" y1="40" x2="80" y2="40" stroke="#0f172a" strokeWidth="1" />
              <line x1="0" y1="80" x2="80" y2="80" stroke="#0f172a" strokeWidth="1" />
              <line x1="40" y1="0" x2="40" y2="120" stroke="#0f172a" strokeWidth="1" />
              <text x="40" y="-15" textAnchor="middle" className="text-sm font-bold">Arranjo Fotovoltaico</text>
              <text x="40" y="-30" textAnchor="middle" className="text-xs">{result.minModules} - {result.maxModules} Módulos</text>
              <text x="40" y="140" textAnchor="middle" className="text-xs">{module.power}W / {module.voc}V Voc</text>
              
              {/* DC Lines */}
              <line x1="80" y1="30" x2="200" y2="30" stroke="#0f172a" strokeWidth="2" />
              <line x1="80" y1="90" x2="200" y2="90" stroke="#0f172a" strokeWidth="2" />
              <text x="140" y="20" textAnchor="middle" className="text-xs font-bold">+</text>
              <text x="140" y="80" textAnchor="middle" className="text-xs font-bold">-</text>
              <text x="140" y="110" textAnchor="middle" className="text-xs">Cabo Solar 4mm² / 6mm²</text>
            </g>

            {/* --- String Box DC --- */}
            <g transform="translate(250, 180)">
              <rect x="0" y="0" width="120" height="160" fill="none" stroke="#0f172a" strokeWidth="2" strokeDasharray="5,5" />
              <text x="60" y="-10" textAnchor="middle" className="text-sm font-bold">String Box CC</text>
              
              {/* DPS DC */}
              <rect x="20" y="20" width="30" height="40" fill="none" stroke="#0f172a" strokeWidth="2" />
              <line x1="20" y1="60" x2="50" y2="20" stroke="#0f172a" strokeWidth="2" />
              <text x="35" y="75" textAnchor="middle" className="text-[10px]">DPS CC</text>
              <text x="35" y="85" textAnchor="middle" className="text-[10px]">1000V</text>

              {/* Fusíveis / Disjuntor DC */}
              <rect x="70" y="20" width="30" height="40" fill="none" stroke="#0f172a" strokeWidth="2" />
              <line x1="70" y1="40" x2="100" y2="40" stroke="#0f172a" strokeWidth="2" />
              <text x="85" y="75" textAnchor="middle" className="text-[10px]">Chave/Fusível</text>
              <text x="85" y="85" textAnchor="middle" className="text-[10px]">CC</text>

              {/* Lines passing through */}
              <line x1="0" y1="50" x2="120" y2="50" stroke="#0f172a" strokeWidth="2" />
              <line x1="0" y1="110" x2="120" y2="110" stroke="#0f172a" strokeWidth="2" />
              
              {/* Ground connection */}
              <line x1="35" y1="60" x2="35" y2="140" stroke="#0f172a" strokeWidth="2" />
              <line x1="25" y1="140" x2="45" y2="140" stroke="#0f172a" strokeWidth="2" />
              <line x1="30" y1="145" x2="40" y2="145" stroke="#0f172a" strokeWidth="2" />
              <line x1="33" y1="150" x2="37" y2="150" stroke="#0f172a" strokeWidth="2" />
            </g>

            {/* --- Inverter --- */}
            <g transform="translate(450, 160)">
              <rect x="0" y="0" width="140" height="200" fill="none" stroke="#0f172a" strokeWidth="3" />
              <line x1="0" y1="200" x2="140" y2="0" stroke="#0f172a" strokeWidth="1" />
              <text x="35" y="40" textAnchor="middle" className="text-lg font-bold">CC</text>
              <text x="105" y="180" textAnchor="middle" className="text-lg font-bold">CA</text>
              <text x="70" y="-10" textAnchor="middle" className="text-sm font-bold">Inversor Interativo</text>
              <text x="70" y="220" textAnchor="middle" className="text-xs">{inverter.model || 'Inversor'}</text>
              <text x="70" y="235" textAnchor="middle" className="text-xs">MPPTs: {inverter.numMppts || 1}</text>
              
              {/* Input lines */}
              <line x1="-80" y1="70" x2="0" y2="70" stroke="#0f172a" strokeWidth="2" />
              <line x1="-80" y1="130" x2="0" y2="130" stroke="#0f172a" strokeWidth="2" />

              {/* Output lines AC */}
              <line x1="140" y1="100" x2="220" y2="100" stroke="#0f172a" strokeWidth="3" />
              <text x="180" y="90" textAnchor="middle" className="text-xs font-bold">F+N+T ou F+F+T</text>
            </g>

            {/* --- String Box AC / Quadro de Proteção --- */}
            <g transform="translate(670, 140)">
              <rect x="0" y="0" width="100" height="240" fill="none" stroke="#0f172a" strokeWidth="2" strokeDasharray="5,5" />
              <text x="50" y="-10" textAnchor="middle" className="text-sm font-bold">Quadro CA</text>
              
              {/* Disjuntor AC */}
              <rect x="35" y="40" width="30" height="40" fill="none" stroke="#0f172a" strokeWidth="2" />
              <path d="M35,60 Q50,40 65,60" fill="none" stroke="#0f172a" strokeWidth="2" />
              <text x="50" y="95" textAnchor="middle" className="text-[10px]">Disjuntor</text>
              <text x="50" y="105" textAnchor="middle" className="text-[10px]">Termomagnético</text>

              {/* DPS AC */}
              <rect x="35" y="140" width="30" height="40" fill="none" stroke="#0f172a" strokeWidth="2" />
              <line x1="35" y1="180" x2="65" y2="140" stroke="#0f172a" strokeWidth="2" />
              <text x="50" y="195" textAnchor="middle" className="text-[10px]">DPS CA</text>
              <text x="50" y="205" textAnchor="middle" className="text-[10px]">Classe II</text>

              {/* Lines */}
              <line x1="-80" y1="120" x2="0" y2="120" stroke="#0f172a" strokeWidth="3" />
              <line x1="0" y1="60" x2="35" y2="60" stroke="#0f172a" strokeWidth="3" />
              <line x1="65" y1="60" x2="100" y2="60" stroke="#0f172a" strokeWidth="3" />
              
              <line x1="50" y1="60" x2="50" y2="140" stroke="#0f172a" strokeWidth="2" markerStart="url(#dot)" />
              
              {/* Ground */}
              <line x1="50" y1="180" x2="50" y2="220" stroke="#0f172a" strokeWidth="2" />
              <line x1="40" y1="220" x2="60" y2="220" stroke="#0f172a" strokeWidth="2" />
              <line x1="45" y1="225" x2="55" y2="225" stroke="#0f172a" strokeWidth="2" />
              <line x1="48" y1="230" x2="52" y2="230" stroke="#0f172a" strokeWidth="2" />
            </g>

            {/* --- Meter & Grid --- */}
            <g transform="translate(850, 160)">
              {/* Meter */}
              <circle cx="0" cy="40" r="30" fill="none" stroke="#0f172a" strokeWidth="2" />
              <text x="0" y="45" textAnchor="middle" className="text-xl font-bold">kWh</text>
              <text x="0" y="85" textAnchor="middle" className="text-xs font-bold">Medidor</text>
              <text x="0" y="100" textAnchor="middle" className="text-xs font-bold">Bidirecional</text>

              {/* Lines */}
              <line x1="-80" y1="40" x2="-30" y2="40" stroke="#0f172a" strokeWidth="3" />
              <line x1="30" y1="40" x2="80" y2="40" stroke="#0f172a" strokeWidth="3" />
              
              {/* Grid */}
              <path d="M80,20 Q100,0 120,20 T160,20" fill="none" stroke="#0f172a" strokeWidth="3" />
              <path d="M80,40 Q100,20 120,40 T160,40" fill="none" stroke="#0f172a" strokeWidth="3" />
              <path d="M80,60 Q100,40 120,60 T160,60" fill="none" stroke="#0f172a" strokeWidth="3" />
              
              <text x="120" y="-10" textAnchor="middle" className="text-sm font-bold">Rede da Concessionária</text>
              <text x="120" y="90" textAnchor="middle" className="text-lg font-bold text-indigo-700">{concessionaria}</text>
            </g>

            {/* Notes */}
            <g transform="translate(50, 500)">
              <text x="0" y="0" className="text-xs font-bold">NOTAS:</text>
              <text x="0" y="15" className="text-xs">1. Este diagrama é um modelo simplificado unifilar para referência de projeto.</text>
              <text x="0" y="30" className="text-xs">2. O aterramento deve seguir a norma NBR 5410 e as exigências da concessionária {concessionaria}.</text>
              <text x="0" y="45" className="text-xs">3. Os cabos CC devem ser específicos para uso solar (resistentes a UV, 1kV ou 1.5kV).</text>
              <text x="0" y="60" className="text-xs">4. O dimensionamento exato dos disjuntores e cabos CA depende da potência do inversor e distância.</text>
            </g>
          </svg>
        </div>
        
        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-500 print:block">
          Gerado por SolarString Pro - Ferramenta de Dimensionamento Fotovoltaico
        </div>
      </div>
    </div>
  );
}
