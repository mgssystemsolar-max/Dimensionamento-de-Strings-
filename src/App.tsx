import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Sun, Zap, Thermometer, AlertTriangle, CheckCircle, Info, Settings, Upload, FileText, History, Download, Trash2, Camera, Search, Database, X, LogOut, User } from 'lucide-react';
import { InputGroup } from './components/InputGroup';
import { Diagram } from './components/Diagram';
import { calculateStringSizing, ModuleSpecs, InverterSpecs, SiteConditions, SizingResult } from './utils/solar';
import { MODULE_PRESETS, ModulePreset } from './utils/presets';
import { extractInverterData, extractModuleData } from './utils/ocr';
import { generatePDF } from './utils/pdf';
import { initiateGoogleAuth, searchDriveFiles, downloadDriveFile, DriveFile } from './utils/drive';
import { LoginScreen } from './components/LoginScreen';
import { ElectricalDiagramPrint } from './components/ElectricalDiagramPrint';
import { auth, db } from './firebase';

interface HistoryItem {
  id: string;
  date: string;
  moduleName: string;
  result: SizingResult;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const [module, setModule] = useState<ModuleSpecs>({
    power: 550,
    voc: 49.6,
    vmp: 41.7,
    isc: 14.0,
    imp: 13.2,
    tempCoeffVoc: -0.27,
    tempCoeffVmp: -0.35,
  });

  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [inverter, setInverter] = useState<InverterSpecs>({
    maxInputVoltage: 1000,
    minMpptVoltage: 200,
    maxMpptVoltage: 850,
    maxInputCurrent: 15,
  });

  const [site, setSite] = useState<SiteConditions>({
    minTemp: -10,
    maxTemp: 40,
  });

  const [projectDetails, setProjectDetails] = useState({
    clientName: "",
    projectName: "",
    concessionaria: "Enel Ceará"
  });

  const [showDiagramModal, setShowDiagramModal] = useState(false);

  // Optimize: Use useMemo instead of useEffect+useState for derived result
  // This prevents double renders on every input change
  const result = useMemo(() => {
    return calculateStringSizing(module, inverter, site);
  }, [module, inverter, site]);

  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [isModuleOcrLoading, setIsModuleOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [moduleOcrError, setModuleOcrError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Drive State
  const [googleEmail, setGoogleEmail] = useState("");
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [showDriveModal, setShowDriveModal] = useState<'inverter' | 'module' | null>(null);

  // Load history on mount
  useEffect(() => {
    const loadHistory = async () => {
      if (auth.currentUser) {
        try {
          const { collection, query, getDocs, orderBy, limit } = await import('firebase/firestore');
          const q = query(
            collection(db, `users/${auth.currentUser.uid}/history`),
            limit(20)
          );
          const querySnapshot = await getDocs(q);
          const firestoreHistory: HistoryItem[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            firestoreHistory.push({
              id: doc.id,
              date: data.date,
              moduleName: data.moduleName,
              result: data.result
            });
          });
          if (firestoreHistory.length > 0) {
            setHistory(firestoreHistory);
            return;
          }
        } catch (error) {
          console.error("Error loading history from Firestore", error);
        }
      }

      // Fallback to local storage
      const saved = localStorage.getItem('solarHistory');
      if (saved) {
        try {
          setHistory(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse history", e);
        }
      }
    };

    loadHistory();

    // Listen for auth messages
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        setDriveToken(event.data.accessToken);
        // Automatically fetch files after auth
        fetchDriveFiles(event.data.accessToken);
      } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
        alert('Erro na autenticação do Google: ' + event.data.error);
      }
    };
    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, [isLoggedIn]);

  const fetchDriveFiles = async (token: string) => {
    setIsDriveLoading(true);
    try {
      const files = await searchDriveFiles(token);
      setDriveFiles(files);
    } catch (error) {
      console.error(error);
      alert("Erro ao buscar arquivos no Drive.");
    } finally {
      setIsDriveLoading(false);
    }
  };

  const handleDriveAuth = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      alert("Configure o VITE_GOOGLE_CLIENT_ID no arquivo .env");
      return;
    }
    initiateGoogleAuth(clientId, googleEmail);
  };

  const handleDriveFileSelect = async (fileId: string) => {
    if (!driveToken || !showDriveModal) return;
    
    setIsDriveLoading(true);
    try {
      const blob = await downloadDriveFile(driveToken, fileId);
      const file = new File([blob], "drive-file", { type: blob.type });
      
      if (showDriveModal === 'inverter') {
         setIsOcrLoading(true);
         setOcrError(null);
         try {
           const data = await extractInverterData(file);
           setInverter(prev => ({ ...prev, ...data }));
         } catch (err) {
           setOcrError("Falha ao processar arquivo do Drive.");
         } finally {
           setIsOcrLoading(false);
         }
      } else {
         setIsModuleOcrLoading(true);
         setModuleOcrError(null);
         try {
           const data = await extractModuleData(file);
           setModule(prev => ({ ...prev, ...data }));
           setSelectedPreset("Módulo Importado (Drive)");
         } catch (err) {
           setModuleOcrError("Falha ao processar arquivo do Drive.");
         } finally {
           setIsModuleOcrLoading(false);
         }
      }
      setShowDriveModal(null);
    } catch (error) {
      console.error(error);
      alert("Erro ao baixar arquivo do Drive.");
    } finally {
      setIsDriveLoading(false);
    }
  };

  // Save history when result changes (debounced or manual save? Let's do manual save or auto-add to list logic)
  // Actually, let's add a "Save Calculation" button or just auto-save valid results?
  // User request implies a history list. Let's add a manual "Save" button to keep it clean.

  const filteredPresets = useMemo(() => {
    if (!searchTerm) return MODULE_PRESETS;
    return MODULE_PRESETS.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.manufacturer.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const handlePresetSelect = (preset: ModulePreset) => {
    setSelectedPreset(preset.name);
    setModule({
      model: preset.name,
      power: preset.power,
      voc: preset.voc,
      vmp: preset.vmp,
      isc: preset.isc,
      imp: preset.imp,
      tempCoeffVoc: preset.tempCoeffVoc,
      tempCoeffVmp: preset.tempCoeffVmp,
    });
    setIsSearchOpen(false);
    setSearchTerm("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsOcrLoading(true);
      setOcrError(null);
      try {
        const data = await extractInverterData(e.target.files[0]);
        setInverter(prev => ({
          ...prev,
          ...data
        }));
      } catch (err) {
        setOcrError("Falha ao ler imagem. Tente novamente com uma imagem mais clara.");
        console.error(err);
      } finally {
        setIsOcrLoading(false);
      }
    }
  };

  const handleModuleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsModuleOcrLoading(true);
      setModuleOcrError(null);
      try {
        const data = await extractModuleData(e.target.files[0]);
        setModule(prev => ({
          ...prev,
          ...data
        }));
        setSelectedPreset("Módulo OCR (Lido)");
      } catch (err) {
        setModuleOcrError("Falha ao ler imagem. Tente novamente com uma imagem mais clara.");
        console.error(err);
      } finally {
        setIsModuleOcrLoading(false);
      }
    }
  };

  const saveToHistory = async () => {
    if (!result || !auth.currentUser) return;
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(),
      moduleName: selectedPreset || "Módulo Personalizado",
      result: result
    };
    
    // Save locally for immediate feedback
    const newHistory = [newItem, ...history].slice(0, 20); // Keep last 20
    setHistory(newHistory);
    localStorage.setItem('solarHistory', JSON.stringify(newHistory));

    // Save to Firestore
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const docRef = doc(db, `users/${auth.currentUser.uid}/history/${newItem.id}`);
      await setDoc(docRef, {
        userId: auth.currentUser.uid,
        date: newItem.date,
        moduleName: newItem.moduleName,
        result: newItem.result
      });
    } catch (error) {
      console.error("Error saving to Firestore", error);
    }
  };

  const clearHistory = async () => {
    setHistory([]);
    localStorage.removeItem('solarHistory');
    // Note: We don't delete from Firestore here to keep it simple, 
    // but we could if needed.
  };

  const [showPdfModal, setShowPdfModal] = useState(false);
  const [techName, setTechName] = useState("");
  const [companyName, setCompanyName] = useState("");

  const handleExportPDF = () => {
    if (result) {
      generatePDF(result, module, inverter, site, selectedPreset || "Módulo Personalizado", techName, companyName, projectDetails);
      setShowPdfModal(false);
    }
  };

  const getFieldStatus = (field: string): 'default' | 'error' | 'warning' => {
    if (result?.errorFields?.includes(field)) return 'error';
    if (result?.warningFields?.includes(field)) return 'warning';
    return 'default';
  };

  const handleLogin = (email: string) => {
    setUserEmail(email);
    setIsLoggedIn(true);
    // If user provides email here, we can use it as hint for Google Auth later
    setGoogleEmail(email);
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-amber-100 selection:text-amber-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-amber-500 p-2 rounded-lg text-white shadow-amber-200 shadow-md">
              <Sun size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">
                SolarString<span className="text-amber-600">Pro</span>
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Professional Tool</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden md:flex flex-col items-end mr-2">
               <span className="text-xs font-medium text-slate-900 flex items-center gap-1">
                 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                 Conectado
               </span>
               <span className="text-[10px] text-slate-500 truncate max-w-[150px]">{userEmail}</span>
             </div>
             
             <button 
               onClick={() => setShowPdfModal(true)}
               className="hidden sm:flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg"
               disabled={!result}
               title="Gerar Relatório PDF"
             >
               <FileText size={18} /> <span className="hidden lg:inline">Relatório PDF</span>
             </button>

             <button
               onClick={() => setIsLoggedIn(false)}
               className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg"
               title="Sair / Desconectar"
             >
               <LogOut size={18} />
               <span className="hidden sm:inline">Sair</span>
             </button>
          </div>
        </div>
      </header>

      {/* PDF Config Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <FileText size={18} className="text-slate-500" /> 
                Dados do Relatório
              </h3>
              <button 
                onClick={() => setShowPdfModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Responsável Técnico</label>
                <input 
                  type="text" 
                  value={techName}
                  onChange={(e) => setTechName(e.target.value)}
                  placeholder="Nome do Engenheiro/Técnico"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Empresa</label>
                <input 
                  type="text" 
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Nome da Empresa Integradora"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>
              <button 
                onClick={handleExportPDF}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                Gerar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drive Selection Modal */}
      {showDriveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Database size={18} className="text-blue-500" /> 
                Importar do Google Drive
              </h3>
              <button 
                onClick={() => setShowDriveModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {!driveToken ? (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">
                    Conecte sua conta Google para acessar seus datasheets (PDF ou Imagens).
                  </p>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-700">Email (opcional, para facilitar login)</label>
                    <input 
                      type="email" 
                      value={googleEmail}
                      onChange={(e) => setGoogleEmail(e.target.value)}
                      placeholder="exemplo@gmail.com"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <button 
                    onClick={handleDriveAuth}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    Conectar Google Drive
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-medium text-slate-900">Arquivos Recentes</h4>
                    <button onClick={() => fetchDriveFiles(driveToken)} className="text-xs text-blue-600 hover:underline">Atualizar</button>
                  </div>
                  
                  {isDriveLoading ? (
                    <div className="text-center py-8 text-slate-500 text-sm">Carregando arquivos...</div>
                  ) : driveFiles.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-sm">Nenhum PDF ou imagem encontrado.</div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-lg">
                      {driveFiles.map(file => (
                        <button
                          key={file.id}
                          onClick={() => handleDriveFileSelect(file.id)}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center gap-3"
                        >
                          {file.thumbnailLink ? (
                            <img src={file.thumbnailLink} alt="" className="w-8 h-8 object-cover rounded" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-slate-400">
                              <FileText size={16} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-900 truncate">{file.name}</div>
                            <div className="text-xs text-slate-500 truncate">ID: {file.id}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* INPUT SECTION */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Inverter Specs & OCR */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="text-indigo-500" size={18} />
                  <h2 className="font-semibold text-slate-900">Inversor</h2>
                </div>
                <label className="cursor-pointer flex items-center gap-2 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full transition-colors border border-indigo-100">
                  <Camera size={14} />
                  {isOcrLoading ? "Processando..." : "Ler Datasheet (OCR)"}
                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} disabled={isOcrLoading} />
                </label>
                <button 
                  onClick={() => setShowDriveModal('inverter')}
                  className="flex items-center gap-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors border border-blue-100 ml-2"
                >
                  <Database size={14} /> Drive
                </button>
              </div>
              
              {ocrError && (
                <div className="px-6 py-2 bg-red-50 text-red-600 text-xs border-b border-red-100 flex items-center gap-2">
                  <AlertTriangle size={12} /> {ocrError}
                </div>
              )}

              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Modelo do Inversor</label>
                  <input 
                    type="text" 
                    value={inverter.model || ""} 
                    onChange={(e) => setInverter({...inverter, model: e.target.value})}
                    placeholder="Ex: Huawei SUN2000-100KTL"
                    className="w-full mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:border-amber-500 focus:ring-amber-500"
                  />
                </div>
                <InputGroup 
                  label="Tensão Máxima Entrada" 
                  value={inverter.maxInputVoltage} 
                  onChange={(v) => setInverter({...inverter, maxInputVoltage: v})} 
                  unit="V" 
                  status={getFieldStatus('inverter.maxInputVoltage')}
                />
                <InputGroup 
                  label="Corrente Máxima Entrada" 
                  value={inverter.maxInputCurrent} 
                  onChange={(v) => setInverter({...inverter, maxInputCurrent: v})} 
                  unit="A" 
                  status={getFieldStatus('inverter.maxInputCurrent')}
                />
                <InputGroup 
                  label="MPPT Mínimo" 
                  value={inverter.minMpptVoltage} 
                  onChange={(v) => setInverter({...inverter, minMpptVoltage: v})} 
                  unit="V" 
                  status={getFieldStatus('inverter.minMpptVoltage')}
                />
                <InputGroup 
                  label="MPPT Máximo" 
                  value={inverter.maxMpptVoltage} 
                  onChange={(v) => setInverter({...inverter, maxMpptVoltage: v})} 
                  unit="V" 
                  status={getFieldStatus('inverter.maxMpptVoltage')}
                />
                <div className="sm:col-span-2">
                  <InputGroup 
                    label="Número de MPPTs (Entradas)" 
                    value={inverter.numMppts || 1} 
                    onChange={(v) => setInverter({...inverter, numMppts: v})} 
                    unit="un" 
                    step={1}
                    min={1}
                  />
                </div>
              </div>
            </motion.section>

            {/* Module Specs with Database Search */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-visible relative z-20"
            >
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Zap className="text-amber-500" size={18} />
                  <h2 className="font-semibold text-slate-900">Módulo Fotovoltaico</h2>
                </div>
                
                <div className="flex items-center gap-2">
                   <button 
                     onClick={() => setShowDriveModal('module')}
                     className="flex items-center gap-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors border border-blue-100 mr-2"
                   >
                     <Database size={14} /> Drive
                   </button>
                   <label className="cursor-pointer flex items-center gap-2 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-full transition-colors border border-amber-100 whitespace-nowrap">
                      <Camera size={14} />
                      {isModuleOcrLoading ? "Lendo..." : "Ler Datasheet"}
                      <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleModuleFileUpload} disabled={isModuleOcrLoading} />
                   </label>

                   <div className="relative">
                     <button 
                       onClick={() => setIsSearchOpen(!isSearchOpen)}
                       className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-full transition-colors border border-slate-200 whitespace-nowrap"
                     >
                       <Database size={14} />
                       {selectedPreset ? "Alterar" : "Buscar"}
                     </button>

                     {isSearchOpen && (
                       <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                         <div className="p-2 border-b border-slate-100 bg-slate-50">
                           <div className="relative">
                             <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
                             <input 
                               type="text" 
                               placeholder="Buscar modelo, fabricante..." 
                               className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
                               value={searchTerm}
                               onChange={(e) => setSearchTerm(e.target.value)}
                               autoFocus
                             />
                           </div>
                         </div>
                         <div className="max-h-60 overflow-y-auto">
                           {filteredPresets.length === 0 ? (
                             <div className="p-4 text-center text-xs text-slate-500">Nenhum módulo encontrado</div>
                           ) : (
                             filteredPresets.map(p => (
                               <button
                                 key={p.name}
                                 onClick={() => handlePresetSelect(p)}
                                 className="w-full text-left px-4 py-2.5 hover:bg-amber-50 transition-colors border-b border-slate-50 last:border-0"
                               >
                                 <div className="font-medium text-sm text-slate-900">{p.name}</div>
                                 <div className="text-xs text-slate-500 flex gap-2 mt-0.5">
                                   <span>{p.power}W</span>
                                   <span>Voc: {p.voc}V</span>
                                   <span>Imp: {p.imp}A</span>
                                 </div>
                               </button>
                             ))
                           )}
                         </div>
                       </div>
                     )}
                  </div>
                </div>
              </div>

              {moduleOcrError && (
                <div className="px-6 py-2 bg-red-50 text-red-600 text-xs border-b border-red-100 flex items-center gap-2">
                  <AlertTriangle size={12} /> {moduleOcrError}
                </div>
              )}
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Modelo do Módulo</label>
                  <input 
                    type="text" 
                    value={selectedPreset || module.model || ""} 
                    onChange={(e) => {
                      setSelectedPreset(e.target.value);
                      setModule({...module, model: e.target.value});
                    }}
                    placeholder="Ex: Canadian Solar CS7N-660MS"
                    className="w-full mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:border-amber-500 focus:ring-amber-500"
                  />
                </div>
                <InputGroup 
                  label="Potência (Pmax)" 
                  value={module.power} 
                  onChange={(v) => setModule({...module, power: v})} 
                  unit="W" 
                  status={getFieldStatus('module.power')}
                />
                <InputGroup 
                  label="Voc (STC)" 
                  value={module.voc} 
                  onChange={(v) => setModule({...module, voc: v})} 
                  unit="V" 
                  status={getFieldStatus('module.voc')}
                />
                <InputGroup 
                  label="Vmp (STC)" 
                  value={module.vmp} 
                  onChange={(v) => setModule({...module, vmp: v})} 
                  unit="V" 
                  status={getFieldStatus('module.vmp')}
                />
                <InputGroup 
                  label="Isc (STC)" 
                  value={module.isc} 
                  onChange={(v) => setModule({...module, isc: v})} 
                  unit="A" 
                  status={getFieldStatus('module.isc')}
                />
                <InputGroup 
                  label="Imp (STC)" 
                  value={module.imp} 
                  onChange={(v) => setModule({...module, imp: v})} 
                  unit="A" 
                  status={getFieldStatus('module.imp')}
                />
                <div className="sm:col-span-2 grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 mt-2">
                  <InputGroup 
                    label="Coef. Temp. Voc" 
                    value={module.tempCoeffVoc} 
                    onChange={(v) => setModule({...module, tempCoeffVoc: v})} 
                    unit="%/°C" 
                    step={0.01}
                    status={getFieldStatus('module.tempCoeffVoc')}
                  />
                  <InputGroup 
                    label="Coef. Temp. Vmp" 
                    value={module.tempCoeffVmp} 
                    onChange={(v) => setModule({...module, tempCoeffVmp: v})} 
                    unit="%/°C" 
                    step={0.01}
                    status={getFieldStatus('module.tempCoeffVmp')}
                  />
                </div>
              </div>
            </motion.section>

            {/* Site Conditions */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Thermometer className="text-rose-500" size={18} />
                <h2 className="font-semibold text-slate-900">Condições Locais</h2>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputGroup 
                  label="Temperatura Mínima" 
                  value={site.minTemp} 
                  onChange={(v) => setSite({...site, minTemp: v})} 
                  unit="°C" 
                  status={getFieldStatus('site.minTemp')}
                />
                <InputGroup 
                  label="Temperatura Máxima" 
                  value={site.maxTemp} 
                  onChange={(v) => setSite({...site, maxTemp: v})} 
                  unit="°C" 
                  status={getFieldStatus('site.maxTemp')}
                />
              </div>
            </motion.section>

            {/* PROJECT DETAILS SECTION */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
            >
              <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-4 flex items-center gap-3">
                <FileText className="text-indigo-500" size={18} />
                <h2 className="font-semibold text-slate-900">Detalhes do Projeto</h2>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Cliente</label>
                  <input 
                    type="text" 
                    value={projectDetails.clientName} 
                    onChange={(e) => setProjectDetails({...projectDetails, clientName: e.target.value})}
                    placeholder="Nome do Cliente"
                    className="w-full mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:border-amber-500 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Projeto</label>
                  <input 
                    type="text" 
                    value={projectDetails.projectName} 
                    onChange={(e) => setProjectDetails({...projectDetails, projectName: e.target.value})}
                    placeholder="Nome do Projeto"
                    className="w-full mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:border-amber-500 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Concessionária</label>
                  <select 
                    value={projectDetails.concessionaria}
                    onChange={(e) => setProjectDetails({...projectDetails, concessionaria: e.target.value})}
                    className="w-full mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:border-amber-500 focus:ring-amber-500 bg-white"
                  >
                    <option value="Enel Ceará">Enel Ceará</option>
                    <option value="Enel São Paulo">Enel São Paulo</option>
                    <option value="Enel Rio de Janeiro">Enel Rio de Janeiro</option>
                    <option value="Cemig">Cemig</option>
                    <option value="CPFL">CPFL</option>
                    <option value="Copel">Copel</option>
                    <option value="Equatorial">Equatorial</option>
                    <option value="Neoenergia">Neoenergia</option>
                    <option value="Light">Light</option>
                    <option value="Energisa">Energisa</option>
                    <option value="Outra">Outra</option>
                  </select>
                </div>
              </div>
            </motion.section>
          </div>

          {/* RESULTS SECTION */}
          <div className="lg:col-span-5 space-y-6">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="sticky top-24 space-y-6"
            >
              {/* Main Result Card */}
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                  <h2 className="font-semibold text-lg">Resultado</h2>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={saveToHistory}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-300 hover:text-white"
                      title="Salvar no Histórico"
                    >
                      <Download size={18} />
                    </button>
                    {result?.isCompatible ? (
                      <CheckCircle className="text-emerald-400" />
                    ) : (
                      <AlertTriangle className="text-amber-400" />
                    )}
                  </div>
                </div>
                
                <div className="p-6 space-y-6">
                  {/* Diagram */}
                  {result && (
                    <Diagram 
                      minModules={result.minModules} 
                      maxModules={result.maxModules} 
                      inverterMaxVoltage={inverter.maxInputVoltage}
                      inverterMpptMin={inverter.minMpptVoltage}
                      inverterMpptMax={inverter.maxMpptVoltage}
                    />
                  )}

                  {/* Min/Max Modules */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                      <div className="text-sm text-slate-500 mb-1">Mínimo</div>
                      <div className="text-3xl font-bold text-slate-900">{result?.minModules}</div>
                      <div className="text-xs text-slate-400 mt-1">módulos por MPPT</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                      <div className="text-sm text-slate-500 mb-1">Máximo</div>
                      <div className="text-3xl font-bold text-slate-900">{result?.maxModules}</div>
                      <div className="text-xs text-slate-400 mt-1">módulos por MPPT</div>
                    </div>
                  </div>

                  {/* Voltage Details */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <h3 className="text-sm font-medium text-slate-900 flex items-center gap-2">
                      <Info size={14} className="text-slate-400" /> Detalhes de Tensão
                    </h3>
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50">
                        <span className="text-slate-600">Voc Máx (@ {site.minTemp}°C)</span>
                        <span className="font-mono font-medium text-slate-900">
                          {result?.vocMax.toFixed(1)} V
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50">
                        <span className="text-slate-600">Vmp Mín (@ {site.maxTemp}°C)</span>
                        <span className="font-mono font-medium text-slate-900">
                          {result?.vmpMin.toFixed(1)} V
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="pt-4 border-t border-slate-100">
                    <button 
                      onClick={() => setShowDiagramModal(true)}
                      disabled={!result || result.errorFields.length > 0}
                      className="w-full flex items-center justify-center gap-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed px-4 py-3 rounded-xl transition-colors shadow-sm"
                    >
                      <FileText size={18} /> Gerar Diagrama Unifilar
                    </button>
                  </div>

                  {/* Warnings */}
                  {result?.warnings && result.warnings.length > 0 && (
                    <div className={`${result.errorFields.length > 0 ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'} border rounded-xl p-4 space-y-2`}>
                      <h3 className={`text-sm font-semibold ${result.errorFields.length > 0 ? 'text-red-800' : 'text-amber-800'} flex items-center gap-2`}>
                        <AlertTriangle size={16} /> {result.errorFields.length > 0 ? 'Erros Críticos' : 'Atenção'}
                      </h3>
                      <ul className={`text-sm ${result.errorFields.length > 0 ? 'text-red-700' : 'text-amber-700'} space-y-1 list-disc list-inside`}>
                        {result.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* History Section */}
              {history.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className="text-slate-500" size={18} />
                      <h2 className="font-semibold text-slate-900">Histórico</h2>
                    </div>
                    <button onClick={clearHistory} className="text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                    {history.map((item) => (
                      <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-sm text-slate-900">{item.moduleName}</span>
                          <span className="text-xs text-slate-400">{item.date}</span>
                        </div>
                        <div className="text-xs text-slate-600 flex gap-3">
                          <span>Min: <b>{item.result.minModules}</b></span>
                          <span>Max: <b>{item.result.maxModules}</b></span>
                          <span className={item.result.isCompatible ? "text-emerald-600" : "text-amber-600"}>
                            {item.result.isCompatible ? "Compatível" : "Atenção"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </main>

      {showDiagramModal && result && (
        <ElectricalDiagramPrint
          module={module}
          inverter={inverter}
          result={result}
          concessionaria={projectDetails.concessionaria}
          clientName={projectDetails.clientName}
          projectName={projectDetails.projectName}
          onClose={() => setShowDiagramModal(false)}
        />
      )}
    </div>
  );
}
