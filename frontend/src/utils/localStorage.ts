import { TrainingProgress, CorrelationData } from './api';

const STORAGE_KEY = 'oil_production_training_data';

export interface SavedTrainingData {
  progressHistory: TrainingProgress[];
  correlationData?: Record<string, CorrelationData>;
  finalMetrics?: {
    r2: number;
    mae: number;
    mse: number;
    rmse: number;
  };
  timestamp: number;
}

export function saveTrainingData(data: SavedTrainingData): void {
  try {
    const dataToSave = {
      ...data,
      timestamp: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  } catch (error) {
    console.error('Error saving training data to localStorage:', error);
  }
}

export function loadTrainingData(): SavedTrainingData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }
    const data = JSON.parse(stored) as SavedTrainingData;
    return data;
  } catch (error) {
    console.error('Error loading training data from localStorage:', error);
    return null;
  }
}

export function clearTrainingData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing training data from localStorage:', error);
  }
}

export function updateTrainingData(updates: Partial<SavedTrainingData>): void {
  const existing = loadTrainingData();
  if (existing) {
    saveTrainingData({
      ...existing,
      ...updates,
      timestamp: Date.now()
    });
  } else {
    // Create new entry if none exists
    saveTrainingData({
      progressHistory: [],
      ...updates,
      timestamp: Date.now()
    });
  }
}

