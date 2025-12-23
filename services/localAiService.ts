import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as faceapi from '@vladmandic/face-api';
import { createWorker } from 'tesseract.js';
import exifr from 'exifr';
import { ImageAnalysis, FaceDetail } from "../types";
import { Language } from "../translations";

let objectModel: cocoSsd.ObjectDetection | null = null;
let sceneModel: mobilenet.MobileNet | null = null;
let modelsLoaded = false;

const MAX_ML_DIMENSION = 1024;

const categoryTranslations: Record<string, string> = {
  person: "osoba", dog: "pies", cat: "kot", car: "samochód", motorcycle: "motocykl",
  bus: "autobus", train: "pociąg", truck: "ciężarówka", boat: "łódź",
  "traffic light": "sygnalizacja świetlna", "fire hydrant": "hydrant",
  stop: "znak stop", "parking meter": "parkometr", bench: "ławka",
  bird: "ptak", horse: "koń", sheep: "owca", cow: "krowa", elephant: "słoń",
  bear: "niedźwiedź", zebra: "zebra", giraffe: "żyrafa", backpack: "plecak",
  umbrella: "parasol", handbag: "torebka", tie: "krawat", suitcase: "walizka",
  frisbee: "frisbee", skis: "narty", snowboard: "snowboard", "sports ball": "piłka sportowa",
  kite: "latawiec", "baseball bat": "kij baseballowy", "baseball glove": "rękawica",
  skateboard: "deskorolka", surfboard: "deska surfingowa", "tennis racket": "rakieta",
  bottle: "butelka", "wine glass": "kieliszek", cup: "kubek", fork: "widelec",
  knife: "nóż", spoon: "łyżka", bowl: "miska", banana: "banan", apple: "jabłko",
  sandwich: "kanapka", orange: "pomarańcza", broccoli: "brokuły", carrot: "marchewka",
  "hot dog": "hot dog", pizza: "pizza", donut: "pączek", cake: "ciasto",
  chair: "krzesło", couch: "kanapa", "potted plant": "roślina doniczkowa",
  bed: "łóżko", "dining table": "stół", toilet: "toaleta", tv: "telewizor",
  laptop: "laptop", mouse: "mysz", remote: "pilot", keyboard: "klawiatura",
  "cell phone": "telefon", microwave: "mikrofalówka", oven: "piekarnik",
  toaster: "toster", sink: "zlew", refrigerator: "lodówka", book: "książka",
  clock: "zegar", vase: "wazon", scissors: "nożyczki", "teddy bear": "pluszowy miś",
  "hair drier": "suszarka", toothbrush: "szczoteczka"
};

const sceneTranslations: Record<string, string> = {
  "seashore": "wybrzeże / plaża", "lakeside": "nad jeziorem", "mountain": "góry",
  "valley": "dolina", "forest": "las", "library": "biblioteka", "office": "biuro",
  "restaurant": "restauracja", "street": "ulica", "park": "park", "garden": "ogród",
  "living room": "salon", "kitchen": "kuchnia", "bedroom": "sypialnia",
  "classroom": "sala lekcyjna", "gym": "siłownia", "hospital": "szpital"
};

const emotionTranslations: Record<string, { pl: string, en: string }> = {
  neutral: { pl: "Neutralny", en: "Neutral" },
  happy: { pl: "Radość", en: "Happy" },
  sad: { pl: "Smutek", en: "Sad" },
  angry: { pl: "Gniew", en: "Angry" },
  fearful: { pl: "Strach", en: "Fearful" },
  disgusted: { pl: "Obrzydzenie", en: "Disgusted" },
  surprised: { pl: "Zaskoczenie", en: "Surprised" }
};

export const initModels = async () => {
  if (modelsLoaded) return;
  try {
    await tf.ready();
    const backend = tf.getBackend();
    if (backend !== 'webgl') {
      try {
        await tf.setBackend('webgl');
      } catch (e) {
        console.warn("WebGL not supported, falling back to CPU/WASM");
      }
    }
    
    objectModel = await cocoSsd.load();
    sceneModel = await mobilenet.load({ version: 2, alpha: 1.0 });
    
    const FACE_MODEL_URL = 'https://vladmandic.github.io/face-api/model/';
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(FACE_MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(FACE_MODEL_URL),
      faceapi.nets.ageGenderNet.loadFromUri(FACE_MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(FACE_MODEL_URL)
    ]);
    
    modelsLoaded = true;
  } catch (error) {
    console.error("Error initializing AI models:", error);
    throw error;
  }
};

const loadImage = async (url: string): Promise<HTMLImageElement> => {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;
  return new Promise((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = reject;
  });
};

const getResizedCanvas = (img: HTMLImageElement, maxDim: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  let width = img.width;
  let height = img.height;

  if (width > height) {
    if (width > maxDim) {
      height *= maxDim / width;
      width = maxDim;
    }
  } else {
    if (height > maxDim) {
      width *= maxDim / height;
      height = maxDim;
    }
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(img, 0, 0, width, height);
  }
  return canvas;
};

// Independent function to extract EXIF data using exifr
export const extractExifData = async (url: string): Promise<Partial<ImageAnalysis>> => {
  try {
    const output = await exifr.parse(url, {
      tiff: true,
      exif: true,
      gps: true
    });
    
    if (!output) return {};

    const { latitude, longitude, Make, Model, DateTimeOriginal, ISO, ExposureTime, FNumber } = output;
    
    return {
      exif: {
        make: Make,
        model: Model,
        dateTime: DateTimeOriginal instanceof Date ? DateTimeOriginal.toLocaleString() : String(DateTimeOriginal || ''),
        iso: ISO,
        exposureTime: typeof ExposureTime === 'number' 
          ? (ExposureTime < 1 ? `1/${Math.round(1/ExposureTime)}` : String(ExposureTime)) 
          : undefined,
        fNumber: FNumber ? `f/${FNumber}` : undefined
      },
      location: (typeof latitude === 'number' && typeof longitude === 'number') 
        ? { lat: latitude, lng: longitude } 
        : undefined
    };
  } catch (e) {
    console.warn("EXIF Extraction failed:", e);
    return {};
  }
};

// Main AI analysis function (Visual only, no EXIF)
export const analyzeImageLocal = async (url: string, lang: Language): Promise<ImageAnalysis> => {
  if (!modelsLoaded) await initModels();

  const img = await loadImage(url);
  const mlCanvas = getResizedCanvas(img, MAX_ML_DIMENSION);

  const performOCR = async () => {
    let worker = null;
    try {
      worker = await createWorker(lang === 'pl' ? 'pol' : 'eng');
      const { data: { text } } = await worker.recognize(mlCanvas);
      await worker.terminate();
      
      const lines = text.split('\n');
      const filteredLines = lines.map(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return null;
        const alphaNumOnly = trimmedLine.replace(/[^a-zA-Z0-9ąęćłńóśźżĄĘĆŁŃÓŚŹŻ]/g, '');
        if (alphaNumOnly.length >= 2 && (alphaNumOnly.length / trimmedLine.length) >= 0.3) {
          return trimmedLine;
        }
        return null;
      }).filter(Boolean);

      const cleanedText = filteredLines.join('\n').trim();
      return cleanedText.length >= 3 ? cleanedText : "";
    } catch (e) {
      console.warn("OCR failure", e);
      if (worker) try { await worker.terminate(); } catch (err) {}
      return "";
    }
  };

  const [detections, scenePredictions, faceDetections, ocrText] = await Promise.all([
    objectModel ? objectModel.detect(mlCanvas) : Promise.resolve([]),
    sceneModel ? sceneModel.classify(mlCanvas) : Promise.resolve([]),
    Promise.resolve(faceapi.detectAllFaces(mlCanvas).withFaceLandmarks().withAgeAndGender().withFaceExpressions()).catch(() => []),
    performOCR()
  ]);

  const objects = detections.map(d => categoryTranslations[d.class] || d.class);
  const topScene = scenePredictions[0]?.className.split(',')[0].toLowerCase() || "";
  const scenery = sceneTranslations[topScene] || topScene;

  // Process Faces
  const faces: FaceDetail[] = [];
  const imageWidth = mlCanvas.width;
  let markedUpImageUrl = "";
  
  if (Array.isArray(faceDetections) && faceDetections.length > 0) {
    // Generate marked up image with visual landmarks
    try {
      // We draw directly on the analysis canvas.
      // 1. Draw detections (Box)
      faceapi.draw.drawDetections(mlCanvas, faceDetections);
      // 2. Draw landmarks (68 points)
      faceapi.draw.drawFaceLandmarks(mlCanvas, faceDetections);
      // 3. Draw expressions (optional, but informative)
      // faceapi.draw.drawFaceExpressions(mlCanvas, faceDetections); // Can be cluttered, boxes/landmarks are usually enough
      
      markedUpImageUrl = mlCanvas.toDataURL("image/jpeg", 0.8);
    } catch (e) {
      console.warn("Failed to draw face landmarks", e);
    }

    faceDetections.forEach((fd: any) => {
      const box = fd.detection.box;
      const centerX = box.x + (box.width / 2);
      
      // Determine Position (Left / Center / Right)
      let position: 'left' | 'center' | 'right' = 'center';
      if (centerX < imageWidth * 0.33) position = 'left';
      else if (centerX > imageWidth * 0.66) position = 'right';

      // Determine Emotion
      let emotion = "neutral";
      let emotionScore = 0;
      if (fd.expressions) {
        const sortedEmotions = Object.entries(fd.expressions)
          .sort(([, a], [, b]) => (b as number) - (a as number));
        emotion = sortedEmotions[0][0];
        emotionScore = sortedEmotions[0][1] as number;
      }

      faces.push({
        age: Math.round(fd.age),
        gender: fd.gender,
        genderProbability: fd.genderProbability,
        emotion,
        emotionScore,
        position,
        box: {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height
        }
      });
    });
  }

  // Sort faces from Left to Right for logical reading order
  faces.sort((a, b) => a.box.x - b.box.x);

  // Generate Summaries
  let ageEstimate = "";
  let emotionEstimate = "";
  
  if (faces.length > 0) {
    // Legacy summary (takes average age and most prominent emotion of first face)
    const avgAge = faces.reduce((acc, curr) => acc + curr.age, 0) / faces.length;
    const firstFace = faces[0];
    const genderTrans = firstFace.gender === 'male' 
      ? (lang === 'pl' ? 'Mężczyzna' : 'Male') 
      : (lang === 'pl' ? 'Kobieta' : 'Female');
      
    ageEstimate = lang === 'pl' 
      ? `${faces.length > 1 ? `Wykryto ${faces.length} twarze. ` : ''}Osoba ok. ${Math.round(avgAge)} lat (${genderTrans})` 
      : `${faces.length > 1 ? `Detected ${faces.length} faces. ` : ''}Person approx. ${Math.round(avgAge)} years (${genderTrans})`;

    if (firstFace.emotionScore > 0.1) {
      const emTrans = emotionTranslations[firstFace.emotion] || { pl: firstFace.emotion, en: firstFace.emotion };
      emotionEstimate = lang === 'pl' 
        ? `${emTrans.pl} (${Math.round(firstFace.emotionScore * 100)}%)` 
        : `${emTrans.en} (${Math.round(firstFace.emotionScore * 100)}%)`;
    }
  }

  const colors = getDominantColors(mlCanvas);

  // Build Description including Multi-Face details
  let description = "";
  const sceneStr = lang === 'pl' ? `Sceneria: ${scenery}. ` : `Scene: ${scenery}. `;
  description += sceneStr;

  if (objects.length > 0) {
    const objStr = lang === 'pl' 
      ? `Wykryto: ${Array.from(new Set(objects)).join(', ')}. ` 
      : `Detected: ${Array.from(new Set(detections.map(d => d.class))).join(', ')}. `;
    description += objStr;
  }

  if (faces.length > 0) {
    const faceDescs = faces.map(f => {
      const g = f.gender === 'male' ? (lang === 'pl' ? 'Mężczyzna' : 'Man') : (lang === 'pl' ? 'Kobieta' : 'Woman');
      const p = f.position === 'left' 
        ? (lang === 'pl' ? 'po lewej' : 'on left') 
        : f.position === 'right' 
          ? (lang === 'pl' ? 'po prawej' : 'on right') 
          : (lang === 'pl' ? 'w środku' : 'center');
      const eTrans = emotionTranslations[f.emotion] || { pl: f.emotion, en: f.emotion };
      const e = lang === 'pl' ? eTrans.pl : eTrans.en;
      return `${g} (${p}, ${e})`;
    });
    
    description += lang === 'pl' ? `Twarze: ${faceDescs.join('; ')}.` : `Faces: ${faceDescs.join('; ')}.`;
  }

  return {
    objects,
    labels: Array.from(new Set([scenery, ...objects])).map(l => l.charAt(0).toUpperCase() + l.slice(1)),
    description,
    confidenceScore: scenePredictions[0]?.probability || 0.8,
    dominantColors: colors,
    ageEstimate,
    emotionEstimate,
    faces, // Include full array
    markedUpImageUrl,
    scenery: scenery.charAt(0).toUpperCase() + scenery.slice(1),
    ocrText: ocrText || undefined
  } as ImageAnalysis;
};

const getDominantColors = (canvas: HTMLCanvasElement): string[] => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return ['#000000'];
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const colors: Record<string, number> = {};
  for (let i = 0; i < imageData.length; i += 4000) {
    const r = imageData[i];
    const g = imageData[i + 1];
    const b = imageData[i + 2];
    const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    colors[hex] = (colors[hex] || 0) + 1;
  }
  return Object.entries(colors).sort((a, b) => b[1] - a[1]).slice(0, 3).map(c => c[0]);
};