import axios from 'axios';

// Use environment variable for API URL, fallback to same-origin /api
// В production без VITE_API_URL все запросы идут на /api (через nginx reverse proxy)
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface PredictionRequest {
  P_downhole: number;
  Q_liquid: number;
  H_pump: number;
  WC_percent: number;
  GFR: number;
  choke_size: number;
}

export interface PredictionResponse {
  prediction: number;
  unit: string;
}

export interface TrainingResponse {
  task_id: string;
  status: string;
  message: string;
}

export interface ModelInfo {
  feature_names: string[];
  target_name: string;
  architecture: {
    layers: Array<{
      type: string;
      units: number;
      activation: string;
    }>;
  };
  metrics?: {
    r2: number;
    mae: number;
    mse: number;
    rmse: number;
  };
  model_exists: boolean;
}

export interface TrainingProgress {
  epoch: number;
  loss: number;
  val_loss: number;
  mae: number;
  val_mae: number;
  status: string;
  metrics?: {
    r2: number;
    mae: number;
    mse: number;
    rmse: number;
  };
  error?: string;
}

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const startTraining = async (file?: File): Promise<TrainingResponse> => {
  const formData = new FormData();
  if (file) {
    formData.append('file', file);
  }
  
  const response = await api.post<TrainingResponse>('/train', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

export const getModelInfo = async (): Promise<ModelInfo> => {
  const response = await api.get<ModelInfo>('/model/info');
  return response.data;
};

export const makePrediction = async (request: PredictionRequest): Promise<PredictionResponse> => {
  const response = await api.post<PredictionResponse>('/predict', request);
  return response.data;
};

export const getDefaultDataset = async (): Promise<Blob> => {
  const response = await api.get('/default-dataset', {
    responseType: 'blob',
  });
  return response.data;
};

export const subscribeToTrainingProgress = (
  taskId: string,
  onProgress: (progress: TrainingProgress) => void,
  onError?: (error: Error) => void
): EventSource => {
  // Use full URL for SSE (EventSource doesn't work with Vite proxy)
  const baseURL = import.meta.env.DEV 
    ? 'http://localhost:8000/api' 
    : (import.meta.env.VITE_API_URL || API_BASE_URL);
  const eventSource = new EventSource(`${baseURL}/training/progress?task_id=${taskId}`);
  
  eventSource.addEventListener('progress', (event: MessageEvent) => {
    try {
      const progress: TrainingProgress = JSON.parse(event.data);
      onProgress(progress);
      
      if (progress.status === 'completed' || progress.status === 'error') {
        eventSource.close();
      }
    } catch (error) {
      console.error('Error parsing SSE data:', error);
      if (onError) {
        onError(error as Error);
      }
    }
  });
  
  eventSource.onmessage = (event) => {
    try {
      const progress: TrainingProgress = JSON.parse(event.data);
      onProgress(progress);
      
      if (progress.status === 'completed' || progress.status === 'error') {
        eventSource.close();
      }
    } catch (error) {
      console.error('Error parsing SSE message:', error);
      if (onError) {
        onError(error as Error);
      }
    }
  };
  
  eventSource.onerror = (error) => {
    console.error('SSE error:', error);
    if (onError) {
      onError(new Error('SSE connection error'));
    }
    // Don't close immediately - might be temporary network issue
    // eventSource.close();
  };
  
  return eventSource;
};

