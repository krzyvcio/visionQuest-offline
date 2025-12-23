import React, { useEffect, useRef, useState } from 'react';
import { ImageRecord, FaceDetail } from '../types';
import { translations, Language } from '../translations';
import L from 'leaflet';

interface AnalysisSidebarProps {
  record: ImageRecord | null;
  onClose: () => void;
  onRetry: (id: string) => void;
  lang: Language;
}

const emotionTranslations: Record<string, { pl: string, en: string }> = {
  neutral: { pl: "Neutralny", en: "Neutral" },
  happy: { pl: "Radość", en: "Happy" },
  sad: { pl: "Smutek", en: "Sad" },
  angry: { pl: "Gniew", en: "Angry" },
  fearful: { pl: "Strach", en: "Fearful" },
  disgusted: { pl: "Obrzydzenie", en: "Disgusted" },
  surprised: { pl: "Zaskoczenie", en: "Surprised" }
};

const AnalysisSidebar: React.FC<AnalysisSidebarProps> = ({ record, onClose, onRetry, lang }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [showMarkup, setShowMarkup] = useState(false);

  // Reset visual toggle when record changes
  useEffect(() => {
    setShowMarkup(false);
  }, [record?.id]);

  useEffect(() => {
    if (record?.analysis?.location && mapContainerRef.current) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      
      try {
        const { lat, lng } = record.analysis.location;
        
        mapInstanceRef.current = L.map(mapContainerRef.current).setView([lat, lng], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(mapInstanceRef.current);
        
        L.marker([lat, lng]).addTo(mapInstanceRef.current);
      } catch (e) {
        console.error("Leaflet initialization error:", e);
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {}
        mapInstanceRef.current = null;
      }
    };
  }, [record]);

  if (!record) return null;
  const t = translations[lang];

  const renderFaceCard = (face: FaceDetail, index: number) => {
    const gender = face.gender === 'male' 
      ? (lang === 'pl' ? 'Mężczyzna' : 'Male') 
      : (lang === 'pl' ? 'Kobieta' : 'Female');
    
    const posKey = face.position === 'left' ? 'positionLeft' : face.position === 'right' ? 'positionRight' : 'positionCenter';
    const position = t[posKey as keyof typeof t];
    
    const emTrans = emotionTranslations[face.emotion] || { pl: face.emotion, en: face.emotion };
    const emotion = lang === 'pl' ? emTrans.pl : emTrans.en;

    return (
      <div key={index} className="bg-white/80 rounded-lg p-3 border border-indigo-100 shadow-sm flex flex-col gap-1 mb-2 last:mb-0">
        <div className="flex justify-between items-center border-b border-indigo-50 pb-1 mb-1">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">{position}</span>
          <span className="text-[10px] font-mono text-slate-400">#{index + 1}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-bold text-slate-700 text-sm">{gender}, {face.age} {lang === 'pl' ? 'lat' : 'yo'}</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-pink-100 text-pink-700">
             {emotion} ({Math.round(face.emotionScore * 100)}%)
          </span>
        </div>
      </div>
    );
  };

  const hasMarkup = !!record.analysis?.markedUpImageUrl;
  const displayUrl = (hasMarkup && showMarkup) ? record.analysis?.markedUpImageUrl : record.url;

  return (
    <div className="h-full bg-white border-l border-slate-200 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
        <h2 className="font-bold text-slate-800 truncate pr-4">{t.recognitionResults}</h2>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6 relative">
          <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50">
            <img 
              src={displayUrl} 
              alt={record.name} 
              className="w-full object-contain max-h-64 transition-opacity duration-300" 
            />
          </div>
          
          {hasMarkup && (
            <button
              onClick={() => setShowMarkup(!showMarkup)}
              className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-sm transition-colors flex items-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.9-1.35a1 1 0 00-1.66-1.11l-1.2 1.8a1 1 0 00.83 1.56h1.34A3.976 3.976 0 0018 11V5a4 4 0 00-4-4H5a4 4 0 00-4 4v8a3.976 3.976 0 003.05 3.86l.65-1.07A2 2 0 013 13V5zm7 7a1 1 0 110-2 1 1 0 010 2zm1-4a1 1 0 10-2 0 1 1 0 002 0z" clipRule="evenodd" />
              </svg>
              {showMarkup ? t.hideVisualAnalysis : t.showVisualAnalysis}
            </button>
          )}
        </div>

        {record.status === 'analyzing' ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-4">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="font-medium animate-pulse">{t.aiScanning}...</p>
          </div>
        ) : record.status === 'error' ? (
          <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
            <p className="font-bold mb-1">{t.analysisFailed}</p>
            <p className="mb-4">{record.error || t.unknownError}</p>
            <button 
              onClick={() => onRetry(record.id)}
              className="w-full py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700"
            >
              {t.retry}
            </button>
          </div>
        ) : record.analysis ? (
          <div className="space-y-6">
            
            {record.analysis.scenery && (
              <section className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 shadow-sm">
                <h3 className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider mb-1">{t.scenery}</h3>
                <span className="text-base font-black text-emerald-700">{record.analysis.scenery}</span>
              </section>
            )}

            {record.analysis.location && (
              <section className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-200 bg-white">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t.location}</h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">
                    {record.analysis.location.lat.toFixed(6)}, {record.analysis.location.lng.toFixed(6)}
                  </p>
                </div>
                <div ref={mapContainerRef} className="h-48 w-full z-0" />
              </section>
            )}

            {record.analysis.exif && (record.analysis.exif.make || record.analysis.exif.model) && (
              <section className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">{t.exifData}</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div className="col-span-2">
                    <p className="text-[9px] text-slate-400 uppercase tracking-tighter">{t.exifDevice}</p>
                    <p className="text-xs font-bold text-slate-700 truncate">
                      {record.analysis.exif.make} {record.analysis.exif.model}
                    </p>
                  </div>
                  {record.analysis.exif.dateTime && (
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase tracking-tighter">{t.exifDate}</p>
                      <p className="text-xs font-bold text-slate-700">{record.analysis.exif.dateTime}</p>
                    </div>
                  )}
                  {record.analysis.exif.iso && (
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase tracking-tighter">{t.exifIso}</p>
                      <p className="text-xs font-bold text-slate-700">{record.analysis.exif.iso}</p>
                    </div>
                  )}
                  {record.analysis.exif.fNumber && (
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase tracking-tighter">{t.exifAperture}</p>
                      <p className="text-xs font-bold text-slate-700">{record.analysis.exif.fNumber}</p>
                    </div>
                  )}
                  {record.analysis.exif.exposureTime && (
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase tracking-tighter">{t.exifExposure}</p>
                      <p className="text-xs font-bold text-slate-700">{record.analysis.exif.exposureTime} s</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {record.analysis.faces && record.analysis.faces.length > 0 ? (
              <section className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider">{t.faceRecognition}</h3>
                  <span className="text-[10px] font-bold bg-indigo-200 text-indigo-800 px-1.5 rounded">{record.analysis.faces.length}</span>
                </div>
                
                <div className="space-y-2">
                  {record.analysis.faces.map((face, idx) => renderFaceCard(face, idx))}
                </div>
              </section>
            ) : (record.analysis.ageEstimate || record.analysis.emotionEstimate) && (
              // Fallback for backward compatibility or singular legacy data
              <section className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 shadow-sm space-y-3">
                <h3 className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider mb-1">{t.faceRecognition}</h3>
                {record.analysis.ageEstimate && (
                  <div>
                     <p className="text-[9px] text-indigo-400 uppercase tracking-tighter">{t.estimatedAge}</p>
                     <span className="text-base font-black text-indigo-700">{record.analysis.ageEstimate}</span>
                  </div>
                )}
                {record.analysis.emotionEstimate && (
                  <div>
                    <p className="text-[9px] text-indigo-400 uppercase tracking-tighter">{t.emotionsDetected}</p>
                    <span className="text-base font-black text-pink-600">{record.analysis.emotionEstimate}</span>
                  </div>
                )}
              </section>
            )}

            {record.analysis.ocrText && (
              <section className="bg-amber-50 border border-amber-100 rounded-xl p-4 shadow-sm">
                <h3 className="text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-2">{t.detectedText}</h3>
                <div className="max-h-32 overflow-y-auto bg-white/50 p-2 rounded border border-amber-200/50">
                  <p className="text-xs font-mono text-slate-700 whitespace-pre-wrap">{record.analysis.ocrText}</p>
                </div>
              </section>
            )}

            <section>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t.description}</h3>
              <p className="text-slate-700 leading-relaxed text-sm bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                "{record.analysis.description}"
              </p>
            </section>

            <section>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t.objects}</h3>
              <div className="flex flex-wrap gap-2">
                {(record.analysis.objects || []).map((obj, idx) => (
                  <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-[10px] font-medium border border-slate-200">
                    {obj}
                  </span>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50">
        <button 
          onClick={() => window.open(record.url, '_blank')}
          className="w-full py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 shadow-sm"
        >
          {t.viewFull}
        </button>
      </div>
    </div>
  );
};

export default AnalysisSidebar;