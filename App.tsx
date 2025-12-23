import React, { useState, useRef, useEffect } from 'react';
import Uploader from './components/Uploader';
import ImageCard from './components/ImageCard';
import AnalysisSidebar from './components/AnalysisSidebar';
import { ImageRecord } from './types';
import { initModels, analyzeImageLocal, extractExifData } from './services/localAiService';
import { translations, Language } from './translations';

const App: React.FC = () => {
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [lang, setLang] = useState<Language>('pl');
  
  const fileStore = useRef<Map<string, File>>(new Map());
  const t = translations[lang];
  const selectedImage = images.find(img => img.id === selectedImageId) || null;

  useEffect(() => {
    const loadAi = async () => {
      try {
        await initModels();
        setIsModelLoading(false);
      } catch (e) {
        console.error("Failed to load local AI models", e);
      }
    };
    loadAi();
  }, []);

  const analyzeSingleRecord = async (recordId: string, url: string) => {
    try {
      setImages(prev => prev.map(img => 
        img.id === recordId ? { ...img, status: 'analyzing', error: undefined } : img
      ));

      // 1. Run Visual AI Analysis (TFJS, OCR) first
      const analysis = await analyzeImageLocal(url, lang);

      // 2. Update status to completed immediately with visual results
      setImages(prev => prev.map(img => 
        img.id === recordId ? { 
          ...img, 
          status: 'completed', 
          analysis 
        } : img
      ));

      // 3. Run EXIF extraction asynchronously in the background
      // This will update the UI (and show map) when ready, without blocking the main results
      extractExifData(url).then(exifData => {
        if (exifData.exif || exifData.location) {
          setImages(prev => prev.map(img => {
            if (img.id !== recordId || !img.analysis) return img;
            return {
              ...img,
              analysis: {
                ...img.analysis,
                ...exifData
              }
            };
          }));
        }
      }).catch(err => console.warn("Background EXIF extraction failed", err));
      
    } catch (error: any) {
      setImages(prev => prev.map(img => 
        img.id === recordId ? { 
          ...img, 
          status: 'error', 
          error: error.message || t.unknownError 
        } : img
      ));
    }
  };

  const processFiles = async (files: File[]) => {
    if (isModelLoading) return;
    setIsProcessing(true);
    
    const newRecords: ImageRecord[] = files.map(file => {
      const id = Math.random().toString(36).substr(2, 9);
      const url = URL.createObjectURL(file);
      fileStore.current.set(id, file);
      return {
        id,
        name: file.name,
        url,
        base64: '', 
        mimeType: file.type,
        size: file.size,
        status: 'pending'
      };
    });

    setImages(prev => [...newRecords, ...prev]);

    for (const record of newRecords) {
      await analyzeSingleRecord(record.id, record.url);
    }
    
    setIsProcessing(false);
  };

  const handleRetry = async (id: string) => {
    const record = images.find(i => i.id === id);
    if (!record) return;
    setIsProcessing(true);
    await analyzeSingleRecord(id, record.url);
    setIsProcessing(false);
  };

  const handleRetryAllFailed = async () => {
    const failedImages = images.filter(img => img.status === 'error');
    if (failedImages.length === 0) return;

    setIsProcessing(true);
    for (const img of failedImages) {
      await analyzeSingleRecord(img.id, img.url);
    }
    setIsProcessing(false);
  };

  const handleFileSelection = (files: File[]) => {
    const validFiles = files.filter(f => f.type.startsWith('image/'));
    if (validFiles.length > 0) {
      processFiles(validFiles);
    }
  };

  const clearAll = () => {
    if (window.confirm(lang === 'pl' ? 'Czy na pewno wyczyścić wszystkie analizy?' : 'Clear all analyzed images?')) {
      images.forEach(img => URL.revokeObjectURL(img.url));
      fileStore.current.clear();
      setImages([]);
      setSelectedImageId(null);
    }
  };

  const hasFailedItems = images.some(img => img.status === 'error');

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 ${isModelLoading ? 'bg-amber-500 animate-pulse' : 'bg-green-600'} rounded-lg flex items-center justify-center transition-colors`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">{t.title}</h1>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                {isModelLoading ? t.loadingModels : t.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center bg-slate-100 rounded-full p-1 border border-slate-200 shadow-inner">
              <button 
                onClick={() => setLang('pl')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${lang === 'pl' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                PL
              </button>
              <button 
                onClick={() => setLang('en')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${lang === 'en' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                EN
              </button>
            </div>

            {images.length > 0 && (
              <button 
                onClick={clearAll}
                className="text-xs font-bold text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors"
              >
                {t.clearResults}
              </button>
            )}
            <div className="h-8 w-[1px] bg-slate-200" />
            <span className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${isModelLoading ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-700'}`}>
              {isModelLoading ? 'Loading AI...' : 'TFJS Active'}
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-12">
            <section>
              <Uploader 
                onFilesSelected={handleFileSelection} 
                isLoading={isProcessing || isModelLoading} 
                lang={lang} 
              />
            </section>

            {images.length > 0 && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">{t.folderContents}</h2>
                    <p className="text-slate-500 text-sm">
                      {t.recognizedStats.replace('{count}', images.filter(i => i.status === 'completed').length.toString()).replace('{total}', images.length.toString())}
                    </p>
                  </div>
                  {hasFailedItems && (
                    <button 
                      onClick={handleRetryAllFailed}
                      disabled={isProcessing}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold border border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 ${isProcessing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {t.retryAllFailed}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {images.map((img) => (
                    <ImageCard 
                      key={img.id} 
                      record={img} 
                      isSelected={selectedImageId === img.id}
                      onClick={() => setSelectedImageId(img.id)}
                      lang={lang}
                    />
                  ))}
                </div>
              </section>
            )}

            {images.length === 0 && !isProcessing && !isModelLoading && (
              <section className="flex flex-col items-center justify-center py-24 text-slate-300">
                <div className="mb-6 opacity-20">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-medium">{t.noImages}</h3>
                <p className="max-w-xs text-center mt-2">{t.emptyStateDesc}</p>
              </section>
            )}
          </div>
        </div>

        <footer className="bg-white border-t border-slate-200 p-4 text-center">
          <p className="text-xs text-slate-400">{t.footerInfo}</p>
        </footer>
      </main>

      <aside 
        className={`fixed inset-y-0 right-0 z-30 w-full sm:w-96 transition-transform duration-300 transform 
          ${selectedImageId ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <AnalysisSidebar 
          record={selectedImage} 
          onClose={() => setSelectedImageId(null)} 
          onRetry={handleRetry}
          lang={lang}
        />
      </aside>
      
      {selectedImageId && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-20 sm:hidden"
          onClick={() => setSelectedImageId(null)}
        />
      )}
    </div>
  );
};

export default App;