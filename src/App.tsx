import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Sun, Zap, Thermometer, AlertTriangle, CheckCircle, Info, Settings, Upload, FileText, History, Download, Trash2, Camera, Search, Database, X, LogOut, User, ImageIcon, RefreshCw, CheckCircle2, Shield, BookOpen, HelpCircle } from 'lucide-react';
import { InputGroup } from './components/InputGroup';
import { Diagram } from './components/Diagram';
import { calculateStringSizing, ModuleSpecs, InverterSpecs, SiteConditions, SizingResult } from './utils/solar';
import { MODULE_PRESETS, ModulePreset, INVERTER_PRESETS, InverterPreset } from './utils/presets';
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
  inverterName?: string;
  result: SizingResult;
  module?: ModuleSpecs;
  inverter?: InverterSpecs;
  site?: SiteConditions;
  projectDetails?: { 
    clientName: string, 
    projectName: string, 
    concessionaria: string,
    date: string,
    time: string,
    street: string,
    neighborhood: string,
    city: string,
    state: string
  };
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const [module, setModule] = useState<ModuleSpecs>({
    power: 550,
    voc: 49.6,
    vmp: 41.7,
    isc: 14.0,
    imp: 13.2,
    tempCoeffVoc: -0.27,
    tempCoeffVmp: -0.34,
    tempSTC: 25,
    width: 1134,
    length: 2278,
    area: (1134 * 2278) / 1000000,
  });

  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [moduleDiscrepancies, setModuleDiscrepancies] = useState<string[]>([]);
  const [compareMessage, setCompareMessage] = useState<{type: 'success'|'warning'|'error', text: string} | null>(null);

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
    concessionaria: "Enel Ceará",
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().split(' ')[0].substring(0, 5),
    street: "",
    neighborhood: "",
    city: "",
    state: ""
  });

  const [showDiagramModal, setShowDiagramModal] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'sizing' | 'settings' | 'admin' | 'help'>('sizing');
  const [companyLogo, setCompanyLogo] = useState<string | undefined>(localStorage.getItem('companyLogo') || undefined);

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
              inverterName: data.inverterName,
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

  const findInverterPreset = (data: Partial<InverterSpecs> & { model?: string, manufacturer?: string }) => {
    if (!data.model && !data.manufacturer) return null;
    return INVERTER_PRESETS.find(p => {
      if (data.model && (p.name.toLowerCase().includes(data.model.toLowerCase()) || data.model.toLowerCase().includes(p.name.toLowerCase()))) {
        return true;
      }
      if (data.manufacturer && data.maxInputVoltage && p.manufacturer.toLowerCase().includes(data.manufacturer.toLowerCase()) && p.maxInputVoltage === data.maxInputVoltage) {
        return true;
      }
      return false;
    });
  };

  const findModulePreset = (data: Partial<ModuleSpecs> & { model?: string, manufacturer?: string }) => {
    if (!data.model && !data.manufacturer) return null;
    return MODULE_PRESETS.find(p => {
      if (data.model && (p.name.toLowerCase().includes(data.model.toLowerCase()) || data.model.toLowerCase().includes(p.name.toLowerCase()))) {
        return true;
      }
      if (data.manufacturer && data.power && p.manufacturer.toLowerCase().includes(data.manufacturer.toLowerCase()) && p.power === data.power) {
        return true;
      }
      return false;
    });
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
           const matchedPreset = findInverterPreset(data);
           if (matchedPreset) {
             handleInverterPresetSelect(matchedPreset);
             // Optionally show a success message that it was auto-detected
           } else {
             setInverter(prev => ({ ...prev, ...data }));
             setSelectedInverterPreset("Inversor Importado (Drive)");
           }
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
           const matchedPreset = findModulePreset(data);
           if (matchedPreset) {
             handlePresetSelect(matchedPreset);
           } else {
             setModule(prev => {
               const newData = { ...prev, ...data };
               if (newData.width && newData.length) {
                 newData.area = (newData.width * newData.length) / 1000000;
               }
               return newData;
             });
             setSelectedPreset("Módulo Importado (Drive)");
           }
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

  const [selectedInverterPreset, setSelectedInverterPreset] = useState<string>("");
  const [inverterSearchTerm, setInverterSearchTerm] = useState("");
  const [isInverterSearchOpen, setIsInverterSearchOpen] = useState(false);

  const filteredInverterPresets = useMemo(() => {
    if (!inverterSearchTerm) return INVERTER_PRESETS;
    return INVERTER_PRESETS.filter(p => 
      p.name.toLowerCase().includes(inverterSearchTerm.toLowerCase()) ||
      p.manufacturer.toLowerCase().includes(inverterSearchTerm.toLowerCase())
    );
  }, [inverterSearchTerm]);

  const handleInverterPresetSelect = (preset: InverterPreset) => {
    setSelectedInverterPreset(preset.name);
    setInverter({
      model: preset.name,
      maxInputVoltage: preset.maxInputVoltage,
      minMpptVoltage: preset.minMpptVoltage,
      maxMpptVoltage: preset.maxMpptVoltage,
      maxInputCurrent: preset.maxInputCurrent,
      numMppts: preset.numMppts,
    });
    setIsInverterSearchOpen(false);
    setInverterSearchTerm("");
  };

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
      tempSTC: preset.tempSTC || 25,
      width: preset.width || 1134,
      length: preset.length || 2278,
      area: preset.area || ((preset.width || 1134) * (preset.length || 2278) / 1000000),
    });
    setIsSearchOpen(false);
    setSearchTerm("");
    setModuleDiscrepancies([]);
    setCompareMessage(null);
  };

  const compareModuleData = () => {
    // Find preset by selected name or current model name
    const preset = MODULE_PRESETS.find(p => p.name === selectedPreset || p.name === module.model);
    if (!preset) {
      setCompareMessage({ type: 'error', text: "Nenhum preset selecionado ou encontrado para comparação." });
      setModuleDiscrepancies([]);
      return;
    }

    const discrepancies: string[] = [];
    const threshold = 0.05; // 5%

    const checkDiscrepancy = (field: keyof ModuleSpecs, presetValue: number) => {
      const currentValue = module[field] as number;
      if (currentValue === undefined || presetValue === undefined) return;
      
      const diff = Math.abs(currentValue - presetValue);
      const percentDiff = diff / Math.abs(presetValue);
      
      if (percentDiff > threshold) {
        discrepancies.push(`module.${field}`);
      }
    };

    checkDiscrepancy('power', preset.power);
    checkDiscrepancy('voc', preset.voc);
    checkDiscrepancy('vmp', preset.vmp);
    checkDiscrepancy('isc', preset.isc);
    checkDiscrepancy('imp', preset.imp);
    checkDiscrepancy('tempCoeffVoc', preset.tempCoeffVoc);
    checkDiscrepancy('tempCoeffVmp', preset.tempCoeffVmp);

    setModuleDiscrepancies(discrepancies);
    if (discrepancies.length > 0) {
      setCompareMessage({ type: 'warning', text: `Atenção: ${discrepancies.length} campo(s) com mais de 5% de diferença do preset original.` });
    } else {
      setCompareMessage({ type: 'success', text: "Os dados estão consistentes com o preset original." });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsOcrLoading(true);
      setOcrError(null);
      try {
        const data = await extractInverterData(e.target.files[0]);
        const matchedPreset = findInverterPreset(data);
        if (matchedPreset) {
          handleInverterPresetSelect(matchedPreset);
        } else {
          setInverter(prev => ({
            ...prev,
            ...data
          }));
          setSelectedInverterPreset("Inversor OCR (Lido)");
        }
      } catch (err) {
        setOcrError("Falha ao ler o arquivo. Tente novamente com um arquivo mais nítido.");
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
        const matchedPreset = findModulePreset(data);
        if (matchedPreset) {
          handlePresetSelect(matchedPreset);
        } else {
          setModule(prev => {
            const newData = { ...prev, ...data };
            if (newData.width && newData.length) {
              newData.area = (newData.width * newData.length) / 1000000;
            }
            return newData;
          });
          setSelectedPreset("Módulo OCR (Lido)");
          setModuleDiscrepancies([]);
          setCompareMessage(null);
        }
      } catch (err) {
        setModuleOcrError("Falha ao ler o arquivo. Tente novamente com um arquivo mais nítido.");
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
      inverterName: selectedInverterPreset || "Inversor Personalizado",
      result: result,
      module: module,
      inverter: inverter,
      site: site,
      projectDetails: projectDetails
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
        inverterName: newItem.inverterName,
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

  const handleExportPDF = async () => {
    if (result) {
      let diagramDataUrl: string | undefined;
      const svgElement = document.querySelector('.diagram-svg') as SVGSVGElement;
      
      if (svgElement) {
        try {
          // Serialize SVG to string
          const serializer = new XMLSerializer();
          const svgString = serializer.serializeToString(svgElement);
          
          // Create a canvas to draw the SVG
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Set canvas dimensions based on SVG viewBox or bounding box
          const viewBox = svgElement.getAttribute('viewBox')?.split(' ');
          const width = viewBox ? parseFloat(viewBox[2]) : 850;
          const height = viewBox ? parseFloat(viewBox[3]) : 320;
          
          canvas.width = width * 2; // High resolution
          canvas.height = height * 2;
          
          if (ctx) {
            ctx.scale(2, 2); // Scale for high resolution
            
            // Create an image from the SVG string
            const img = new Image();
            const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
            
            await new Promise((resolve, reject) => {
              img.onload = () => {
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, width, height);
                diagramDataUrl = canvas.toDataURL('image/png');
                resolve(null);
              };
              img.onerror = reject;
              img.src = url;
            });
          }
        } catch (error) {
          console.error("Failed to generate diagram image:", error);
        }
      }

      generatePDF(
        result, 
        module, 
        inverter, 
        site, 
        module.model || selectedPreset || "Módulo Personalizado", 
        inverter.model || selectedInverterPreset || "Inversor Personalizado", 
        techName, 
        companyName, 
        projectDetails, 
        companyLogo,
        diagramDataUrl
      );
      setShowPdfModal(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const base64 = event.target.result as string;
          setCompanyLogo(base64);
          localStorage.setItem('companyLogo', base64);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const getFieldStatus = (field: string): 'default' | 'error' | 'warning' => {
    if (result?.errorFields?.includes(field)) return 'error';
    if (result?.warningFields?.includes(field)) return 'warning';
    if (moduleDiscrepancies.includes(field)) return 'warning';
    return 'default';
  };

  const handleLogin = (email: string, adminFlag: boolean = false) => {
    setUserEmail(email);
    setIsAdmin(adminFlag);
    setIsLoggedIn(true);
    // If user provides email here, we can use it as hint for Google Auth later
    setGoogleEmail(email);
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const renderContent = () => {
    if (currentView === 'admin' && isAdmin) {
      return (
        <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Painel do Administrador</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
              <Shield className="text-amber-600" size={32} />
              <div>
                <h3 className="font-semibold text-amber-900">Área Restrita</h3>
                <p className="text-sm text-amber-700">Você está logado como administrador. Aqui você pode configurar parâmetros globais do sistema.</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium text-slate-900">Configurações do Sistema</h4>
              <p className="text-sm text-slate-500">Em breve: Gerenciamento de presets de módulos e inversores, controle de usuários e logs de acesso.</p>
              
              {/* Placeholder for future admin settings */}
              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
                <p className="text-sm text-slate-600 text-center py-8">Nenhuma configuração pendente.</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (currentView === 'help') {
      return (
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Manual do Usuário & Suporte</h2>
          
          <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
            <RefreshCw className="text-blue-500 mt-0.5 flex-shrink-0" size={18} />
            <div>
              <h4 className="text-sm font-semibold text-blue-900">Atualização Automática</h4>
              <p className="text-sm text-blue-700 mt-1">Este manual, bem como o banco de dados de equipamentos, são atualizados automaticamente toda vez que houver necessidade, garantindo que você tenha sempre as informações mais recentes.</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* O que o app faz */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Info className="text-indigo-500" size={20} /> Funcionalidades e Capacidades do Sistema
              </h3>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>
                  O <strong>MG Systems - Dimensionamento Fotovoltaico</strong> é uma ferramenta de engenharia avançada projetada para garantir a segurança e a eficiência de sistemas de energia solar. Ele realiza a validação técnica completa entre os arranjos de módulos (strings) e o inversor escolhido.
                </p>
                <ul className="list-disc pl-5 space-y-3">
                  <li>
                    <strong className="text-slate-800">Cálculo Termodinâmico de Tensão:</strong> Utiliza os coeficientes de temperatura (Voc e Vmp) do módulo para calcular a tensão exata da string na temperatura mais fria (onde a tensão sobe e pode queimar o inversor) e na mais quente (onde a tensão cai e pode desarmar o MPPT).
                  </li>
                  <li>
                    <strong className="text-slate-800">Validação de 4 Parâmetros Críticos:</strong>
                    <ul className="list-circle pl-5 mt-2 space-y-1 text-sm text-slate-600">
                      <li><em>Tensão Máxima de Entrada:</em> Garante que o Voc no frio extremo não ultrapasse o limite de queima do inversor.</li>
                      <li><em>Tensão Mínima do MPPT:</em> Garante que o Vmp no calor extremo seja suficiente para manter o inversor ligado.</li>
                      <li><em>Tensão Máxima do MPPT:</em> Verifica se o Vmp no frio extremo está dentro da faixa ideal de trabalho do inversor.</li>
                      <li><em>Corrente Máxima (Isc):</em> Valida se a corrente de curto-circuito da string é suportada pela entrada do inversor.</li>
                    </ul>
                  </li>
                  <li>
                    <strong className="text-slate-800">Geração de Relatório Profissional (PDF):</strong> Compila todos os dados do cliente, cálculos técnicos, status de aprovação e gera um memorial de cálculo em PDF, personalizável com a logo da sua empresa nas configurações.
                  </li>
                  <li>
                    <strong className="text-slate-800">Diagrama Unifilar Automático:</strong> Desenha dinamicamente um diagrama unifilar simplificado mostrando a conexão dos módulos, proteções CC/CA, inversor e rede elétrica.
                  </li>
                  <li>
                    <strong className="text-slate-800">Banco de Dados Integrado:</strong> Conta com uma biblioteca atualizável de inversores (Growatt, Deye, Huawei, Fronius, etc.) e módulos (Canadian, Jinko, Trina, etc.) para preenchimento rápido, além de permitir entrada manual de dados.
                  </li>
                  <li>
                    <strong className="text-slate-800">Gestão de Projetos:</strong> Salva automaticamente o histórico de dimensionamentos no seu navegador (Dashboard) para consultas e edições futuras.
                  </li>
                </ul>
              </div>
            </div>

            {/* Como usar */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <BookOpen className="text-amber-500" size={20} /> Como utilizar passo a passo
              </h3>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">1</div>
                  <div>
                    <h4 className="font-medium text-slate-900"><span className="text-indigo-600 font-bold mr-1">01</span> Detalhes do Projeto</h4>
                    <p className="text-sm text-slate-600 mt-1">Preencha os dados do cliente, local da instalação, data e concessionária. Estas informações são essenciais para a identificação do projeto e sairão no cabeçalho do relatório final.</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">2</div>
                  <div>
                    <h4 className="font-medium text-slate-900"><span className="text-indigo-600 font-bold mr-1">02</span> Inversor</h4>
                    <p className="text-sm text-slate-600 mt-1">Selecione um inversor no banco de dados ou insira os dados manualmente (Tensão Máxima, Tensão MPPT, Corrente Máxima e Número de MPPTs). Este campo define os limites de operação que o sistema fotovoltaico deve respeitar.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">4</div>
                  <div>
                    <h4 className="font-medium text-slate-900"><span className="text-indigo-600 font-bold mr-1">04</span> Módulo Fotovoltaico</h4>
                    <p className="text-sm text-slate-600 mt-1">Escolha o módulo solar e defina a quantidade de placas por string. O sistema calculará automaticamente a tensão e corrente totais com base nas características do módulo e nas temperaturas locais.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">5</div>
                  <div>
                    <h4 className="font-medium text-slate-900"><span className="text-indigo-600 font-bold mr-1">05</span> Resultado e Diagrama Unifilar Simplificado</h4>
                    <p className="text-sm text-slate-600 mt-1">Verifique a análise técnica do dimensionamento. Se todos os parâmetros estiverem verdes, o sistema está aprovado. Aqui também é gerado automaticamente o diagrama unifilar simplificado mostrando a topologia da instalação.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">6</div>
                  <div>
                    <h4 className="font-medium text-slate-900"><span className="text-indigo-600 font-bold mr-1">06</span> Histórico</h4>
                    <p className="text-sm text-slate-600 mt-1">Acompanhe e recarregue os dimensionamentos salvos anteriormente. Permite que você continue um trabalho de onde parou ou revise projetos passados com apenas um clique.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">7</div>
                  <div>
                    <h4 className="font-medium text-slate-900"><span className="text-indigo-600 font-bold mr-1">07</span> Gerar Relatório</h4>
                    <p className="text-sm text-slate-600 mt-1">Com o dimensionamento aprovado, clique neste botão para exportar um memorial de cálculo em PDF profissional, pronto para ser entregue ao cliente ou à concessionária de energia.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">8</div>
                  <div>
                    <h4 className="font-medium text-slate-900"><span className="text-indigo-600 font-bold mr-1">08</span> Dashboard de Projetos</h4>
                    <p className="text-sm text-slate-600 mt-1">Uma visão geral de todos os seus projetos salvos. Acesse esta tela pelo menu lateral para gerenciar, visualizar estatísticas e organizar seus dimensionamentos de forma centralizada.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">9</div>
                  <div>
                    <h4 className="font-medium text-slate-900"><span className="text-indigo-600 font-bold mr-1">09</span> Configurações</h4>
                    <p className="text-sm text-slate-600 mt-1">Personalize o aplicativo com os dados da sua empresa. Adicione o nome, CNPJ, telefone, e-mail e a logomarca que aparecerão no cabeçalho dos relatórios em PDF gerados.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Suporte */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <HelpCircle className="text-emerald-500" size={20} /> Precisa de Ajuda? (Suporte)
              </h3>
              <p className="text-slate-600 mb-4">
                Caso tenha dúvidas sobre o dimensionamento, encontre algum erro ou precise adicionar novos equipamentos ao banco de dados, entre em contato com nosso suporte técnico:
              </p>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col sm:flex-row gap-6 flex-wrap">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Responsável</p>
                  <p className="text-sm font-medium text-slate-900">Márcio G. da Silva</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">WhatsApp</p>
                  <p className="text-sm font-medium text-slate-900">+55 (88) 98836-0143</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email</p>
                  <p className="text-sm font-medium text-slate-900">mgssystemsolar@gmail.com</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Horário</p>
                  <p className="text-sm font-medium text-slate-900">Seg a Sex, 08:00 às 18:00</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (currentView === 'settings') {
      return (
        <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6"><span className="text-indigo-600 font-bold mr-1">09</span> Configurações</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Nome da Empresa</label>
              <input 
                type="text" 
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ex: SolarTech Energia"
                className="w-full max-w-md rounded-lg border border-slate-300 px-4 py-2 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Logo da Empresa (Aparecerá nos Relatórios)</label>
              <div className="flex items-start gap-6">
                {companyLogo ? (
                  <div className="relative w-32 h-32 border-2 border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex-shrink-0 flex items-center justify-center">
                    <img src={companyLogo} alt="Logo" className="max-w-full max-h-full object-contain p-2" />
                    <button 
                      onClick={() => { setCompanyLogo(undefined); localStorage.removeItem('companyLogo'); }}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-lg hover:bg-red-600 shadow-sm"
                      title="Remover Logo"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-32 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs text-slate-400 font-medium">Sem Logo</span>
                  </div>
                )}
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                  <Upload size={16} />
                  <span>Fazer Upload</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleLogoUpload} 
                    className="hidden" 
                  />
                </label>
              </div>
              <p className="text-xs text-slate-500 mt-2">Recomendado: Imagem PNG ou JPG com fundo transparente. Tamanho máximo 2MB.</p>
            </div>
          </div>
        </div>
      );
    }

    if (currentView === 'dashboard') {
      const totalProjects = history.length;
      const compatibleProjects = history.filter(h => h.result.isCompatible).length;
      const incompatibleProjects = totalProjects - compatibleProjects;

      return (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900"><span className="text-indigo-600 font-bold mr-1">08</span> Dashboard de Projetos</h2>
              <p className="text-slate-500 mt-1">Visão geral dos seus dimensionamentos recentes.</p>
            </div>
            <button 
              onClick={() => setCurrentView('sizing')}
              className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Sun size={18} /> Novo Dimensionamento
            </button>
          </div>

          {history.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="bg-indigo-50 p-4 rounded-xl text-indigo-600">
                  <FileText size={24} />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-500">Total de Projetos</div>
                  <div className="text-2xl font-bold text-slate-900">{totalProjects}</div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="bg-emerald-50 p-4 rounded-xl text-emerald-600">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-500">Compatíveis</div>
                  <div className="text-2xl font-bold text-slate-900">{compatibleProjects}</div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="bg-amber-50 p-4 rounded-xl text-amber-600">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-500">Com Alertas</div>
                  <div className="text-2xl font-bold text-slate-900">{incompatibleProjects}</div>
                </div>
              </div>
            </div>
          )}

          {history.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText size={24} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum projeto ainda</h3>
              <p className="text-slate-500 mb-6">Comece a dimensionar sistemas para ver o histórico aqui.</p>
              <button 
                onClick={() => setCurrentView('sizing')}
                className="text-amber-600 font-medium hover:text-amber-700"
              >
                Criar primeiro projeto &rarr;
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Histórico Recente</h3>
                <button onClick={clearHistory} className="text-sm text-red-500 hover:text-red-600 font-medium flex items-center gap-1">
                  <Trash2 size={14} /> Limpar
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {history.map((item) => (
                  <div key={item.id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold text-slate-900">{item.moduleName}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${item.result.isCompatible ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {item.result.isCompatible ? "Compatível" : "Atenção"}
                        </span>
                      </div>
                      <div className="text-sm text-slate-500 flex items-center gap-4">
                        <span>Inv: {item.inverterName || 'N/A'}</span>
                        <span>•</span>
                        <span>{item.date}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="text-slate-500 text-xs">Mínimo</div>
                        <div className="font-bold text-slate-900">{item.result.minModules}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-slate-500 text-xs">Máximo</div>
                        <div className="font-bold text-slate-900">{item.result.maxModules}</div>
                      </div>
                      <button 
                        onClick={() => {
                          if (item.module) setModule(item.module);
                          if (item.inverter) setInverter(item.inverter);
                          if (item.site) setSite(item.site);
                          if (item.projectDetails) setProjectDetails(item.projectDetails);
                          setSelectedPreset(item.moduleName);
                          setSelectedInverterPreset(item.inverterName || "");
                          setModuleDiscrepancies([]);
                          setCompareMessage(null);
                          setCurrentView('sizing');
                        }}
                        className="ml-4 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg font-medium transition-colors"
                        title="Carregar Projeto"
                      >
                        Carregar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Dimensionamento de String</h2>
          <button 
            onClick={() => setShowPdfModal(true)}
            className="flex items-center gap-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 transition-colors px-4 py-2 rounded-lg shadow-sm"
            disabled={!result}
            title="Gerar Relatório PDF"
          >
            <FileText size={18} /> <span><span className="text-amber-100 font-bold mr-1">07</span> Gerar Relatório</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* INPUT SECTION */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* PROJECT DETAILS SECTION */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
            >
              <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-4 flex items-center gap-3">
                <FileText className="text-indigo-500" size={18} />
                <h2 className="font-semibold text-slate-900"><span className="text-indigo-600 font-bold mr-1">01</span> Detalhes do Projeto</h2>
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
                
                {/* New precise location and time fields */}
                <div className="sm:col-span-2 pt-4 border-t border-slate-100 mt-2">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Localização e Data do Entendimento</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Data</label>
                      <input 
                        type="date" 
                        value={projectDetails.date} 
                        onChange={(e) => setProjectDetails({...projectDetails, date: e.target.value})}
                        className="w-full mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:border-amber-500 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Hora</label>
                      <input 
                        type="time" 
                        value={projectDetails.time} 
                        onChange={(e) => setProjectDetails({...projectDetails, time: e.target.value})}
                        className="w-full mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:border-amber-500 focus:ring-amber-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Rua / Endereço</label>
                      <input 
                        type="text" 
                        value={projectDetails.street} 
                        onChange={(e) => setProjectDetails({...projectDetails, street: e.target.value})}
                        placeholder="Ex: Rua das Flores, 123"
                        className="w-full mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:border-amber-500 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Bairro</label>
                      <input 
                        type="text" 
                        value={projectDetails.neighborhood} 
                        onChange={(e) => setProjectDetails({...projectDetails, neighborhood: e.target.value})}
                        placeholder="Ex: Centro"
                        className="w-full mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:border-amber-500 focus:ring-amber-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Município</label>
                        <input 
                          type="text" 
                          value={projectDetails.city} 
                          onChange={(e) => setProjectDetails({...projectDetails, city: e.target.value})}
                          placeholder="Ex: Fortaleza"
                          className="w-full mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:border-amber-500 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Estado</label>
                        <input 
                          type="text" 
                          value={projectDetails.state} 
                          onChange={(e) => setProjectDetails({...projectDetails, state: e.target.value})}
                          placeholder="Ex: CE"
                          maxLength={2}
                          className="w-full mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:border-amber-500 focus:ring-amber-500 uppercase"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Inverter Specs & OCR */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="text-indigo-500" size={18} />
                  <h2 className="font-semibold text-slate-900"><span className="text-indigo-600 font-bold mr-1">02</span> Inversor</h2>
                </div>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer flex items-center gap-2 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full transition-colors border border-indigo-100">
                    <Camera size={14} />
                    {isOcrLoading ? "Processando..." : "Ler Datasheet"}
                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} disabled={isOcrLoading} />
                  </label>
                  <button 
                    onClick={() => setShowDriveModal('inverter')}
                    className="flex items-center gap-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors border border-blue-100"
                  >
                    <Database size={14} /> Drive
                  </button>

                  <div className="relative">
                    <button 
                      onClick={() => setIsInverterSearchOpen(!isInverterSearchOpen)}
                      className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-full transition-colors border border-slate-200 whitespace-nowrap"
                    >
                      <Database size={14} />
                      {selectedInverterPreset ? "Alterar" : "Buscar"}
                    </button>

                    {isInverterSearchOpen && (
                      <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                        <div className="p-2 border-b border-slate-100 bg-slate-50">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
                            <input 
                              type="text" 
                              placeholder="Buscar modelo, fabricante..." 
                              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                              value={inverterSearchTerm}
                              onChange={(e) => setInverterSearchTerm(e.target.value)}
                              autoFocus
                            />
                          </div>
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                          {filteredInverterPresets.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-500">Nenhum inversor encontrado</div>
                          ) : (
                            filteredInverterPresets.map(p => (
                              <button
                                key={p.name}
                                onClick={() => handleInverterPresetSelect(p)}
                                className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition-colors border-b border-slate-50 last:border-0"
                              >
                                <div className="font-medium text-sm text-slate-900">{p.name}</div>
                                <div className="text-xs text-slate-500 flex gap-2 mt-0.5">
                                  <span>{p.maxInputVoltage}V Max</span>
                                  <span>{p.maxInputCurrent}A Max</span>
                                  <span>{p.numMppts} MPPTs</span>
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
                    value={selectedInverterPreset || inverter.model || ""} 
                    onChange={(e) => {
                      setSelectedInverterPreset(e.target.value);
                      setInverter({...inverter, model: e.target.value});
                    }}
                    placeholder="Ex: Huawei SUN2000-100KTL"
                    className="w-full mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:border-amber-500 focus:ring-amber-500"
                  />
                </div>
                <InputGroup 
                  label="Tensão Máxima Entrada" 
                  value={inverter.maxInputVoltage} 
                  onChange={(v) => setInverter({...inverter, maxInputVoltage: v})} 
                  unit="V" 
                  min={1}
                  max={5000}
                  status={getFieldStatus('inverter.maxInputVoltage')}
                />
                <div className="flex flex-col justify-center">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tensão Máx. Exibição</label>
                  <input 
                    type="text" 
                    value={`${inverter.maxInputVoltage} V`} 
                    readOnly
                    className="w-full mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 shadow-sm focus:outline-none cursor-not-allowed"
                  />
                </div>
                <InputGroup 
                  label="Corrente Máxima Entrada" 
                  value={inverter.maxInputCurrent} 
                  onChange={(v) => setInverter({...inverter, maxInputCurrent: v})} 
                  unit="A" 
                  min={0.1}
                  max={500}
                  status={getFieldStatus('inverter.maxInputCurrent')}
                />
                <InputGroup 
                  label="MPPT Mínimo" 
                  value={inverter.minMpptVoltage} 
                  onChange={(v) => setInverter({...inverter, minMpptVoltage: v})} 
                  unit="V" 
                  min={1}
                  max={inverter.maxMpptVoltage - 1}
                  status={getFieldStatus('inverter.minMpptVoltage')}
                />
                <InputGroup 
                  label="MPPT Máximo" 
                  value={inverter.maxMpptVoltage} 
                  onChange={(v) => setInverter({...inverter, maxMpptVoltage: v})} 
                  unit="V" 
                  min={inverter.minMpptVoltage + 1}
                  max={inverter.maxInputVoltage}
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
                    max={20}
                    status={getFieldStatus('inverter.numMppts')}
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
                <h2 className="font-semibold text-slate-900"><span className="text-indigo-600 font-bold mr-1">03</span> Condições Locais</h2>
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
                <InputGroup 
                  label="Temperatura STC do Módulo" 
                  value={module.tempSTC ?? 25} 
                  onChange={(v) => setModule({...module, tempSTC: v})} 
                  unit="°C" 
                  status={getFieldStatus('module.tempSTC')}
                />
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 mt-2">
                  <InputGroup 
                    label="Potência Desejada (Opcional)" 
                    value={site.desiredPowerKw || 0} 
                    onChange={(v) => setSite({...site, desiredPowerKw: v})} 
                    unit="kWp" 
                    step={0.1}
                    min={0}
                    status={getFieldStatus('site.desiredPowerKw')}
                  />
                  <InputGroup 
                    label="Área Disponível (Opcional)" 
                    value={site.availableSpaceM2 || 0} 
                    onChange={(v) => setSite({...site, availableSpaceM2: v})} 
                    unit="m²" 
                    step={1}
                    min={0}
                    status={getFieldStatus('site.availableSpaceM2')}
                  />
                </div>
              </div>
            </motion.section>

            {/* Module Specs with Database Search */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-visible relative z-20"
            >
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Zap className="text-amber-500" size={18} />
                  <h2 className="font-semibold text-slate-900"><span className="text-indigo-600 font-bold mr-1">04</span> Módulo Fotovoltaico</h2>
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
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={selectedPreset || module.model || ""} 
                      onChange={(e) => {
                        setSelectedPreset(e.target.value);
                        setModule({...module, model: e.target.value});
                        setModuleDiscrepancies([]);
                        setCompareMessage(null);
                      }}
                      placeholder="Ex: Canadian Solar CS7N-660MS"
                      className="w-full mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:border-amber-500 focus:ring-amber-500"
                    />
                    <button
                      onClick={compareModuleData}
                      className="mt-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-2"
                      title="Comparar com Preset Original"
                    >
                      <RefreshCw size={14} />
                      <span className="hidden sm:inline">Comparar</span>
                    </button>
                  </div>
                  {compareMessage && (
                    <div className={`mt-2 text-xs flex items-center gap-1 ${
                      compareMessage.type === 'success' ? 'text-emerald-600' : 
                      compareMessage.type === 'warning' ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {compareMessage.type === 'success' ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                      {compareMessage.text}
                    </div>
                  )}
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
                  min={module.vmp ? module.vmp + 0.1 : 0.1}
                  status={getFieldStatus('module.voc')}
                />
                <InputGroup 
                  label="Vmp (STC)" 
                  value={module.vmp} 
                  onChange={(v) => setModule({...module, vmp: v})} 
                  unit="V" 
                  min={0.1}
                  max={module.voc ? Math.max(0.1, module.voc - 0.1) : undefined}
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
                  <InputGroup 
                    label="Largura do Módulo" 
                    value={module.width || 0} 
                    onChange={(v) => {
                      const newArea = v && module.length ? (v * module.length) / 1000000 : 0;
                      setModule({...module, width: v, area: newArea});
                    }} 
                    unit="mm" 
                    step={1}
                    min={0}
                    status={getFieldStatus('module.width')}
                  />
                  <InputGroup 
                    label="Comprimento do Módulo" 
                    value={module.length || 0} 
                    onChange={(v) => {
                      const newArea = module.width && v ? (module.width * v) / 1000000 : 0;
                      setModule({...module, length: v, area: newArea});
                    }} 
                    unit="mm" 
                    step={1}
                    min={0}
                    status={getFieldStatus('module.length')}
                  />
                  <div className="flex flex-col justify-center sm:col-span-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Área Calculada</label>
                    <input 
                      type="text" 
                      value={module.area ? `${module.area.toFixed(2)} m²` : "0.00 m²"} 
                      readOnly
                      className="w-full mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 shadow-sm focus:outline-none cursor-not-allowed"
                    />
                  </div>
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
                  <h2 className="font-semibold text-lg"><span className="text-indigo-600 font-bold mr-1">05</span> Resultado e Diagrama Unifilar Simplificado</h2>
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
                      moduleName={module.model || selectedPreset || "Módulo Personalizado"}
                      modulePower={module.power}
                      inverterName={inverter.model || selectedInverterPreset || "Inversor Personalizado"}
                      minStringVoltage={result.minStringVoltage}
                      maxStringVoltage={result.maxStringVoltage}
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

                  {/* Strings per MPPT Input */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-slate-900 flex items-center gap-2">
                        <Zap size={14} className="text-amber-500" /> Arranjo Desejado
                      </h3>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-600 font-medium">Strings/MPPT:</label>
                        <input 
                          type="number" 
                          min="1" 
                          step="1"
                          value={site.desiredStringsPerMppt === undefined ? 1 : site.desiredStringsPerMppt}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                              // Temporarily set to 0 or undefined to allow clearing the input
                              setSite({...site, desiredStringsPerMppt: 0});
                            } else {
                              const parsed = parseInt(val);
                              if (!isNaN(parsed)) {
                                setSite({...site, desiredStringsPerMppt: parsed});
                              }
                            }
                          }}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value);
                            if (isNaN(val) || val < 1) {
                              setSite({...site, desiredStringsPerMppt: 1});
                            }
                          }}
                          className="w-16 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Recommended Sizing */}
                  {result?.recommendedModules !== undefined && (
                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                          <div className="text-amber-700 text-xs mb-1">Módulos Totais</div>
                          <div className="font-bold text-amber-900 text-lg">{result.recommendedModules}</div>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                          <div className="text-amber-700 text-xs mb-1">Strings Totais</div>
                          <div className="font-bold text-amber-900 text-lg">{result.recommendedStrings}</div>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                          <div className="text-amber-700 text-xs mb-1">Strings/MPPT Sugeridas</div>
                          <div className="font-bold text-amber-900 text-lg">{result.recommendedStringsPerMppt}</div>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                          <div className="text-slate-600 text-xs mb-1">Potência Total</div>
                          <div className="font-bold text-slate-900 text-lg">{result.totalSystemPowerKw?.toFixed(2)} kWp</div>
                        </div>
                        {result.totalAreaM2 !== undefined && (
                          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 col-span-2">
                            <div className="text-slate-600 text-xs mb-1">Área Estimada</div>
                            <div className="font-bold text-slate-900 text-lg">{result.totalAreaM2.toFixed(1)} m²</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Voltage Details */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <h3 className="text-sm font-medium text-slate-900 flex items-center gap-2">
                      <Info size={14} className="text-slate-400" /> Detalhes de Tensão
                    </h3>
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50">
                        <span className="text-slate-600">Tensão Voc Corrigida para Temperatura Mínima (@ {site.minTemp}°C)</span>
                        <span className="font-mono font-medium text-slate-900">
                          {result?.vocMax.toFixed(1)} V
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50">
                        <span className="text-slate-600">Tensão Vmp Corrigida para Temperatura Máxima (@ {site.maxTemp}°C)</span>
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

                  {/* Errors */}
                  {result?.errors && result.errors.length > 0 && (
                    <div className="bg-red-50 border-red-100 border rounded-xl p-4 space-y-2">
                      <h3 className="text-sm font-semibold text-red-800 flex items-center gap-2">
                        <AlertTriangle size={16} /> Erros Críticos
                      </h3>
                      <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                        {result.errors.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Warnings */}
                  {result?.warnings && result.warnings.length > 0 && (
                    <div className="bg-amber-50 border-amber-100 border rounded-xl p-4 space-y-2">
                      <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                        <AlertTriangle size={16} /> Atenção
                      </h3>
                      <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
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
                      <h2 className="font-semibold text-slate-900"><span className="text-indigo-600 font-bold mr-1">06</span> Histórico</h2>
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
                        <div className="text-xs text-slate-500 mb-1">
                          Inv: {item.inverterName || 'N/A'}
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
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-amber-100 selection:text-amber-900 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
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

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
          <div className="p-4">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-3">Menu Principal</div>
            <nav className="space-y-1">
              <button 
                onClick={() => setCurrentView('dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentView === 'dashboard' ? 'bg-amber-50 text-amber-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <History size={18} /> <span className="font-bold mr-1 opacity-70">08</span> Dashboard
              </button>
              <button 
                onClick={() => setCurrentView('sizing')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentView === 'sizing' ? 'bg-amber-50 text-amber-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <Zap size={18} /> Dimensionamento
              </button>
              <button 
                onClick={() => setCurrentView('help')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentView === 'help' ? 'bg-amber-50 text-amber-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <BookOpen size={18} /> Manual e Suporte
              </button>
              <button 
                onClick={() => setCurrentView('settings')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentView === 'settings' ? 'bg-amber-50 text-amber-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <Settings size={18} /> <span className="font-bold mr-1 opacity-70">09</span> Configurações
              </button>
              {isAdmin && (
                <button 
                  onClick={() => setCurrentView('admin')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mt-4 ${currentView === 'admin' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                >
                  <Shield size={18} /> Painel Admin
                </button>
              )}
            </nav>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
          {renderContent()}
        </div>
      </div>

      {/* Modals */}
      {showPdfModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Configurar Relatório PDF</h3>
              <button onClick={() => setShowPdfModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Cliente / Projeto</label>
                <input
                  type="text"
                  value={projectDetails.clientName}
                  onChange={(e) => setProjectDetails({...projectDetails, clientName: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all outline-none"
                  placeholder="Ex: João da Silva - Residência"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Responsável Técnico (Opcional)</label>
                <input
                  type="text"
                  value={techName}
                  onChange={(e) => setTechName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all outline-none"
                  placeholder="Ex: Eng. Carlos Souza"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Empresa (Opcional)</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all outline-none"
                  placeholder="Ex: SolarTech Energia"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Logo da Empresa (Opcional)</label>
                <div className="flex items-center gap-4">
                  {companyLogo ? (
                    <div className="relative w-16 h-16 rounded-lg border border-slate-200 overflow-hidden bg-white flex items-center justify-center">
                      <img src={companyLogo} alt="Logo da Empresa" className="max-w-full max-h-full object-contain" />
                      <button
                        onClick={() => {
                          setCompanyLogo(null);
                          localStorage.removeItem('companyLogo');
                        }}
                        className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl-lg hover:bg-red-600 transition-colors"
                        title="Remover Logo"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400">
                      <ImageIcon size={24} />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload-modal"
                    />
                    <label
                      htmlFor="logo-upload-modal"
                      className="cursor-pointer inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors w-full"
                    >
                      <Upload size={16} className="mr-2" />
                      {companyLogo ? 'Trocar Logo' : 'Fazer Upload'}
                    </label>
                    <p className="text-xs text-slate-500 mt-1">Recomendado: PNG ou JPG, máx 1MB.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button
                onClick={() => setShowPdfModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleExportPDF}
                className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors shadow-sm flex items-center gap-2"
              >
                <Download size={16} />
                Gerar PDF
              </button>
            </div>
          </motion.div>
        </div>
      )}

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

      {/* Drive Modal */}
      {showDriveModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Database size={20} className="text-blue-500" />
                Selecionar do Google Drive
              </h3>
              <button onClick={() => setShowDriveModal(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto bg-slate-50">
              {!driveToken ? (
                <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-slate-200">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                    <Database size={32} className="text-blue-600" />
                  </div>
                  <h4 className="text-lg font-medium text-slate-900 mb-2">Conectar ao Google Drive</h4>
                  <p className="text-sm text-slate-500 max-w-md mb-6">
                    Conecte sua conta do Google para selecionar datasheets de inversores e módulos diretamente do seu Drive.
                  </p>
                  <button
                    onClick={handleDriveAuth}
                    className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Conectar Conta Google
                  </button>
                </div>
              ) : isDriveLoading ? (
                <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-slate-200">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-sm text-slate-500">
                    {(isOcrLoading || isModuleOcrLoading) ? "Processando OCR do documento..." : "Carregando arquivos..."}
                  </p>
                </div>
              ) : driveFiles.length === 0 ? (
                <div className="text-center py-16 text-slate-500 bg-white rounded-xl border border-slate-200">
                  Nenhum arquivo PDF ou imagem encontrado no seu Drive.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {driveFiles.map(file => (
                    <button
                      key={file.id}
                      onClick={() => handleDriveFileSelect(file.id)}
                      className="flex flex-col items-center p-4 bg-white border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all text-left group shadow-sm"
                    >
                      {file.thumbnailLink ? (
                        <img src={file.thumbnailLink} alt={file.name} className="w-full h-24 object-cover rounded-lg mb-3 border border-slate-100" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-24 bg-slate-50 rounded-lg mb-3 flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors border border-slate-100">
                          <FileText size={32} />
                        </div>
                      )}
                      <span className="text-xs font-medium text-slate-700 line-clamp-2 w-full text-center group-hover:text-blue-700">
                        {file.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
