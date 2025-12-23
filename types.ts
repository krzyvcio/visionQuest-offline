
export interface FaceDetail {
  age: number;
  gender: string;
  genderProbability: number;
  emotion: string;
  emotionScore: number;
  position: 'left' | 'center' | 'right';
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ImageAnalysis {
  objects: string[];
  labels: string[];
  description: string;
  confidenceScore: number;
  dominantColors: string[];
  ageEstimate?: string; // Summary string (kept for backward compatibility)
  emotionEstimate?: string; // Summary string (kept for backward compatibility)
  faces?: FaceDetail[]; // New detailed array
  markedUpImageUrl?: string; // Image with drawn landmarks and boxes
  scenery?: string;
  ocrText?: string;
  exif?: {
    make?: string;
    model?: string;
    dateTime?: string;
    exposureTime?: string;
    fNumber?: string;
    iso?: number;
  };
  location?: {
    lat: number;
    lng: number;
  };
}

export interface ImageRecord {
  id: string;
  name: string;
  url: string;
  base64: string;
  mimeType: string;
  size: number;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  analysis?: ImageAnalysis;
  error?: string;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}