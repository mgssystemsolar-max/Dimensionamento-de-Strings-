import React from 'react';

interface DiagramProps {
  minModules: number;
  maxModules: number;
  inverterMaxVoltage: number;
  inverterMpptMin: number;
  inverterMpptMax: number;
  moduleName?: string;
  modulePower?: number;
  inverterName?: string;
  minStringVoltage?: number;
  maxStringVoltage?: number;
}

export function Diagram({ minModules, maxModules, inverterMaxVoltage, inverterMpptMin, inverterMpptMax, moduleName, modulePower, inverterName, minStringVoltage, maxStringVoltage }: DiagramProps) {
  return (
    <div className="bg-white rounded-xl p-2 sm:p-6 border border-slate-200 flex flex-col items-center justify-center gap-4 relative overflow-hidden w-full">
      <div className="w-full flex justify-between items-center mb-2">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Diagrama Unifilar Simplificado</h3>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">NÃO ESCALADO</span>
      </div>
      
      <div className="w-full overflow-x-auto pb-4 flex justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 320" className="diagram-svg w-full h-auto max-w-[1000px] min-w-[600px]" style={{ maxHeight: '400px' }}>
          <style>
            {`
              .text-\\[10px\\] { font-size: 10px; }
              .text-\\[11px\\] { font-size: 11px; }
              .text-\\[8px\\] { font-size: 8px; }
              .text-\\[9px\\] { font-size: 9px; }
              .text-\\[14px\\] { font-size: 14px; }
              .font-mono { font-family: monospace; }
              .font-bold { font-weight: bold; }
              .font-medium { font-weight: 500; }
              .fill-green-700 { fill: #15803d; }
              .fill-slate-800 { fill: #1e293b; }
              .fill-slate-700 { fill: #334155; }
              .fill-slate-600 { fill: #475569; }
              .fill-slate-500 { fill: #64748b; }
              .fill-slate-400 { fill: #94a3b8; }
              .fill-red-600 { fill: #dc2626; }
              .shadow-sm { filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.05)); }
            `}
          </style>
          {/* Background Grid for technical feel */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f8fafc" strokeWidth="1"/>
            </pattern>
            <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L9,3 z" fill="#1e293b" />
            </marker>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" rx="8" />

          {/* Grounding Bar (BEP) */}
          <g transform="translate(0, 260)">
            <line x1="60" y1="0" x2="780" y2="0" stroke="#22c55e" strokeWidth="2" strokeDasharray="6 4"/>
            <text x="425" y="18" textAnchor="middle" className="text-[10px] font-mono fill-green-700 font-bold">Barramento de Equipotencialização (BEP) / Aterramento</text>
            
            {/* Grounding Rod Symbol */}
            <line x1="750" y1="0" x2="750" y2="25" stroke="#22c55e" strokeWidth="2"/>
            <line x1="740" y1="25" x2="760" y2="25" stroke="#22c55e" strokeWidth="2"/>
            <line x1="745" y1="30" x2="755" y2="30" stroke="#22c55e" strokeWidth="2"/>
            <line x1="748" y1="35" x2="752" y2="35" stroke="#22c55e" strokeWidth="2"/>
          </g>

          {/* 1. PV Array */}
          <g transform="translate(20, 80)">
            {/* Panel 1 */}
            <rect x="0" y="0" width="30" height="50" fill="#f0f9ff" stroke="#0284c7" strokeWidth="1.5" rx="1"/>
            <line x1="0" y1="16" x2="30" y2="16" stroke="#0284c7" strokeWidth="0.5" opacity="0.5"/>
            <line x1="0" y1="33" x2="30" y2="33" stroke="#0284c7" strokeWidth="0.5" opacity="0.5"/>
            <line x1="15" y1="0" x2="15" y2="50" stroke="#0284c7" strokeWidth="0.5" opacity="0.5"/>
            
            {/* Panel 2 */}
            <rect x="40" y="0" width="30" height="50" fill="#f0f9ff" stroke="#0284c7" strokeWidth="1.5" rx="1"/>
            <line x1="40" y1="16" x2="70" y2="16" stroke="#0284c7" strokeWidth="0.5" opacity="0.5"/>
            <line x1="40" y1="33" x2="70" y2="33" stroke="#0284c7" strokeWidth="0.5" opacity="0.5"/>
            <line x1="55" y1="0" x2="55" y2="50" stroke="#0284c7" strokeWidth="0.5" opacity="0.5"/>
            
            {/* Dots */}
            <circle cx="85" cy="25" r="1.5" fill="#0284c7"/>
            <circle cx="95" cy="25" r="1.5" fill="#0284c7"/>
            <circle cx="105" cy="25" r="1.5" fill="#0284c7"/>
            
            {/* Panel N */}
            <rect x="120" y="0" width="30" height="50" fill="#f0f9ff" stroke="#0284c7" strokeWidth="1.5" rx="1"/>
            <line x1="120" y1="16" x2="150" y2="16" stroke="#0284c7" strokeWidth="0.5" opacity="0.5"/>
            <line x1="120" y1="33" x2="150" y2="33" stroke="#0284c7" strokeWidth="0.5" opacity="0.5"/>
            <line x1="135" y1="0" x2="135" y2="50" stroke="#0284c7" strokeWidth="0.5" opacity="0.5"/>
            
            {/* Series connection */}
            <path d="M30,10 L40,10 M70,10 L80,10 M110,10 L120,10" stroke="#ef4444" strokeWidth="1.5"/>
            <path d="M30,40 L40,40 M70,40 L80,40 M110,40 L120,40" stroke="#0f172a" strokeWidth="1.5"/>
            
            {/* Grounding PV */}
            <path d="M15,50 L15,65 L135,65 L135,50" stroke="#22c55e" strokeWidth="1.5" fill="none" strokeDasharray="2 2"/>
            <line x1="75" y1="65" x2="75" y2="180" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4 4"/>
            <circle cx="75" cy="180" r="2" fill="#22c55e"/>
            
            <text x="75" y="-15" textAnchor="middle" className="text-[11px] font-mono fill-slate-800 font-bold">Arranjo Fotovoltaico</text>
            {moduleName && (
              <text x="75" y="-3" textAnchor="middle" className="text-[8px] font-mono fill-slate-500">{moduleName.length > 25 ? moduleName.substring(0, 25) + '...' : moduleName}</text>
            )}
            {modulePower && (
              <text x="75" y="6" textAnchor="middle" className="text-[8px] font-mono fill-slate-500">{modulePower}W</text>
            )}
            <text x="75" y="85" textAnchor="middle" className="text-[10px] font-mono fill-slate-600 font-medium">{minModules} a {maxModules} Módulos em Série</text>
            {minStringVoltage && maxStringVoltage && (
              <text x="75" y="95" textAnchor="middle" className="text-[8px] font-mono fill-slate-500">{minStringVoltage}V - {maxStringVoltage}V</text>
            )}
          </g>

          {/* Wiring PV to String Box */}
          <path d="M170,90 L220,90" stroke="#ef4444" strokeWidth="2"/>
          <text x="195" y="85" textAnchor="middle" className="text-[8px] font-mono fill-red-600">+</text>
          <path d="M170,120 L220,120" stroke="#0f172a" strokeWidth="2"/>
          <text x="195" y="115" textAnchor="middle" className="text-[8px] font-mono fill-slate-800">-</text>

          {/* 2. String Box DC */}
          <g transform="translate(220, 50)">
            <rect x="0" y="0" width="110" height="110" fill="#ffffff" stroke="#64748b" strokeWidth="1.5" strokeDasharray="6 3" rx="4"/>
            <text x="55" y="-8" textAnchor="middle" className="text-[11px] font-mono fill-slate-800 font-bold">Quadro DC</text>
            
            {/* Positive Line */}
            <path d="M0,40 L110,40" stroke="#ef4444" strokeWidth="2"/>
            {/* Negative Line */}
            <path d="M0,70 L110,70" stroke="#0f172a" strokeWidth="2"/>
            
            {/* DPS DC */}
            <rect x="25" y="45" width="14" height="20" fill="#f8fafc" stroke="#1e293b" strokeWidth="1.2"/>
            <line x1="25" y1="65" x2="39" y2="45" stroke="#1e293b" strokeWidth="1"/>
            <path d="M32,40 L32,45 M32,65 L32,70" stroke="#1e293b" strokeWidth="1.5"/>
            <text x="32" y="85" textAnchor="middle" className="text-[8px] font-mono fill-slate-600 font-bold">DPS</text>
            
            {/* Chave Seccionadora DC */}
            <circle cx="75" cy="40" r="2" fill="#1e293b"/>
            <circle cx="90" cy="40" r="2" fill="#1e293b"/>
            <line x1="75" y1="40" x2="87" y2="32" stroke="#1e293b" strokeWidth="1.5"/>
            
            <circle cx="75" cy="70" r="2" fill="#1e293b"/>
            <circle cx="90" cy="70" r="2" fill="#1e293b"/>
            <line x1="75" y1="70" x2="87" y2="62" stroke="#1e293b" strokeWidth="1.5"/>
            
            <line x1="81" y1="36" x2="81" y2="66" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 2"/>
            <text x="82.5" y="85" textAnchor="middle" className="text-[8px] font-mono fill-slate-600 font-bold">Chave DC</text>

            {/* Grounding String Box */}
            <path d="M32,70 L32,100" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="2 2"/>
            <circle cx="32" cy="100" r="2" fill="#22c55e"/>
            <line x1="32" y1="100" x2="32" y2="210" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4 4"/>
            <circle cx="32" cy="210" r="2" fill="#22c55e"/>
          </g>

          {/* Wiring String Box to Inverter */}
          <path d="M330,90 L380,90" stroke="#ef4444" strokeWidth="2"/>
          <path d="M330,120 L380,120" stroke="#0f172a" strokeWidth="2"/>

          {/* 3. Inverter */}
          <g transform="translate(380, 40)">
            <rect x="0" y="0" width="120" height="130" rx="6" fill="#ffffff" stroke="#334155" strokeWidth="2" className="shadow-sm"/>
            <text x="60" y="-8" textAnchor="middle" className="text-[11px] font-mono fill-slate-800 font-bold">Inversor Solar</text>
            {inverterName && (
              <text x="60" y="145" textAnchor="middle" className="text-[8px] font-mono fill-slate-500">{inverterName.length > 25 ? inverterName.substring(0, 25) + '...' : inverterName}</text>
            )}
            
            {/* DC/AC Symbol */}
            <line x1="0" y1="130" x2="120" y2="0" stroke="#cbd5e1" strokeWidth="1"/>
            <text x="25" y="35" textAnchor="middle" className="text-[14px] font-bold fill-slate-400">DC</text>
            <text x="95" y="105" textAnchor="middle" className="text-[14px] font-bold fill-slate-400">AC</text>
            
            <path d="M15,45 L35,45 M15,50 L35,50" stroke="#64748b" strokeWidth="1.5"/>
            <path d="M85,115 Q95,105 105,115 T115,115" stroke="#64748b" strokeWidth="1.5" fill="none"/>
            
            {/* MPPT Info */}
            <rect x="10" y="70" width="55" height="45" rx="3" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1"/>
            <text x="37.5" y="85" textAnchor="middle" className="text-[9px] font-mono fill-slate-700 font-bold">MPPT</text>
            <text x="37.5" y="97" textAnchor="middle" className="text-[8px] font-mono fill-slate-600">{inverterMpptMin}-{inverterMpptMax}V</text>
            <text x="37.5" y="108" textAnchor="middle" className="text-[8px] font-mono fill-slate-600">Máx: {inverterMaxVoltage}V</text>
            
            {/* Grounding Inverter */}
            <circle cx="60" cy="130" r="2" fill="#22c55e"/>
            <line x1="60" y1="130" x2="60" y2="220" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4 4"/>
            <circle cx="60" cy="220" r="2" fill="#22c55e"/>
          </g>

          {/* Wiring Inverter to QGBT */}
          <path d="M500,105 L570,105" stroke="#1e293b" strokeWidth="2.5"/>
          <line x1="530" y1="98" x2="540" y2="112" stroke="#1e293b" strokeWidth="1.5"/>
          <line x1="535" y1="98" x2="545" y2="112" stroke="#1e293b" strokeWidth="1.5"/>
          <line x1="540" y1="98" x2="550" y2="112" stroke="#1e293b" strokeWidth="1.5"/>
          <text x="535" y="90" textAnchor="middle" className="text-[9px] font-mono fill-slate-700 font-bold">Cabo AC</text>

          {/* 4. QGBT (Quadro AC) */}
          <g transform="translate(570, 50)">
            <rect x="0" y="0" width="100" height="110" fill="#ffffff" stroke="#64748b" strokeWidth="1.5" strokeDasharray="6 3" rx="4"/>
            <text x="50" y="-8" textAnchor="middle" className="text-[11px] font-mono fill-slate-800 font-bold">Quadro AC</text>
            
            <path d="M0,55 L100,55" stroke="#1e293b" strokeWidth="2.5"/>
            
            {/* Disjuntor AC */}
            <rect x="20" y="45" width="20" height="20" fill="#f8fafc" stroke="#1e293b" strokeWidth="1.5"/>
            <path d="M25,55 L35,55 M30,50 L30,60" stroke="#1e293b" strokeWidth="1.5"/>
            <text x="30" y="80" textAnchor="middle" className="text-[8px] font-mono fill-slate-600 font-bold">Disjuntor</text>
            
            {/* DPS AC */}
            <rect x="65" y="55" width="14" height="20" fill="#f8fafc" stroke="#1e293b" strokeWidth="1.2"/>
            <line x1="65" y1="75" x2="79" y2="55" stroke="#1e293b" strokeWidth="1"/>
            <path d="M72,55 L72,55" stroke="#1e293b" strokeWidth="1.5"/>
            <text x="72" y="88" textAnchor="middle" className="text-[8px] font-mono fill-slate-600 font-bold">DPS AC</text>

            {/* Grounding QGBT */}
            <path d="M72,75 L72,100" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="2 2"/>
            <circle cx="72" cy="100" r="2" fill="#22c55e"/>
            <line x1="72" y1="100" x2="72" y2="210" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4 4"/>
            <circle cx="72" cy="210" r="2" fill="#22c55e"/>
          </g>

          {/* Wiring QGBT to Meter */}
          <path d="M670,105 L730,105" stroke="#1e293b" strokeWidth="2.5"/>
          <line x1="695" y1="98" x2="705" y2="112" stroke="#1e293b" strokeWidth="1.5"/>
          <line x1="700" y1="98" x2="710" y2="112" stroke="#1e293b" strokeWidth="1.5"/>
          <line x1="705" y1="98" x2="715" y2="112" stroke="#1e293b" strokeWidth="1.5"/>

          {/* 5. Grid / Meter */}
          <g transform="translate(730, 80)">
            <rect x="0" y="0" width="45" height="50" rx="4" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5"/>
            <circle cx="22.5" cy="25" r="14" fill="#f8fafc" stroke="#1e293b" strokeWidth="1.5"/>
            <text x="22.5" y="28" textAnchor="middle" className="text-[10px] font-bold fill-slate-800">kWh</text>
            <path d="M45,25 L65,25" stroke="#1e293b" strokeWidth="2.5"/>
            
            {/* Utility Pole / Grid Symbol */}
            <line x1="65" y1="-10" x2="65" y2="60" stroke="#1e293b" strokeWidth="2.5"/>
            <line x1="50" y1="0" x2="80" y2="0" stroke="#1e293b" strokeWidth="2"/>
            <line x1="55" y1="15" x2="75" y2="15" stroke="#1e293b" strokeWidth="2"/>
            <text x="65" y="-20" textAnchor="middle" className="text-[11px] font-mono fill-slate-800 font-bold">Rede Elétrica</text>
          </g>

        </svg>
      </div>
    </div>
  );
}
