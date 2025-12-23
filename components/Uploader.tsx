
import React, { useRef } from 'react';
import { translations, Language } from '../translations';

interface UploaderProps {
  onFilesSelected: (files: File[]) => void;
  isLoading: boolean;
  lang: Language;
}

const Uploader: React.FC<UploaderProps> = ({ onFilesSelected, isLoading, lang }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[lang];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFilesSelected(Array.from(e.target.files));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative group border-2 border-dashed rounded-2xl p-8 transition-all duration-300 text-center
        ${isLoading ? 'bg-slate-100 border-slate-300' : 'bg-white border-blue-200 hover:border-blue-400 hover:bg-blue-50/30'}`}
    >
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleChange}
        ref={fileInputRef}
        className="hidden"
        disabled={isLoading}
      />
      
      <div className="flex flex-col items-center gap-4">
        <div className={`p-4 rounded-full transition-colors ${isLoading ? 'bg-slate-200' : 'bg-blue-100 group-hover:bg-blue-200'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-10 w-10 ${isLoading ? 'text-slate-400' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        
        <div>
          <h3 className="text-xl font-semibold text-slate-800">
            {isLoading ? t.processing : t.uploadTitle}
          </h3>
          <p className="text-slate-500 mt-1 max-w-sm">
            {t.uploadDesc}
          </p>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className={`mt-4 px-6 py-2.5 rounded-lg font-medium transition-all
            ${isLoading 
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg active:scale-95'
            }`}
        >
          {isLoading ? t.processing : t.browseFiles}
        </button>
      </div>
    </div>
  );
};

export default Uploader;
