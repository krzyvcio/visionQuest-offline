
import React from 'react';
import { ImageRecord } from '../types';
import { translations, Language } from '../translations';

interface ImageCardProps {
  record: ImageRecord;
  isSelected: boolean;
  onClick: () => void;
  lang: Language;
}

const ImageCard: React.FC<ImageCardProps> = ({ record, isSelected, onClick, lang }) => {
  const t = translations[lang];
  const getStatusColor = () => {
    switch (record.status) {
      case 'analyzing': return 'bg-yellow-400';
      case 'completed': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-slate-300';
    }
  };

  return (
    <div 
      onClick={onClick}
      className={`relative group cursor-pointer rounded-xl overflow-hidden bg-white shadow-sm transition-all border-2
        ${isSelected ? 'border-blue-500 ring-2 ring-blue-200 scale-[1.02]' : 'border-transparent hover:border-slate-200'}`}
    >
      <div className="aspect-square relative overflow-hidden">
        <img 
          src={record.url} 
          alt={record.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className={`absolute top-2 right-2 w-3 h-3 rounded-full border-2 border-white shadow-sm ${getStatusColor()}`} />
        
        {record.status === 'analyzing' && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold text-blue-700 uppercase tracking-tighter">{t.aiScanning}</span>
            </div>
          </div>
        )}
      </div>
      
      <div className="p-3">
        <p className="text-sm font-medium text-slate-700 truncate">{record.name}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-slate-400">{(record.size / 1024).toFixed(1)} KB</span>
          {record.analysis && record.analysis.labels && record.analysis.labels.length > 0 && (
            <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-bold truncate max-w-[60%]">
              {record.analysis.labels[0]}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageCard;
