import { useState, useEffect } from 'react';
import FileUpload from '../components/FileUpload';
import TrainingDashboard from '../components/TrainingDashboard';
import { useTrainingProgress } from '../hooks/useTrainingProgress';
import { startTraining, TrainingProgress, extractErrorMessage } from '../utils/api';
import { loadTrainingData } from '../utils/localStorage';

export default function TrainingPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [progressHistory, setProgressHistory] = useState<TrainingProgress[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { progress, error: progressError } = useTrainingProgress(taskId);

  // Load saved data from localStorage on mount
  useEffect(() => {
    const savedData = loadTrainingData();
    if (savedData && savedData.progressHistory.length > 0) {
      // If there's a completed training, restore all data
      const lastProgress = savedData.progressHistory[savedData.progressHistory.length - 1];
      if (lastProgress?.status === 'completed') {
        // Merge saved data into progress history
        const updatedHistory = savedData.progressHistory.map((p, index) => {
          if (index === savedData.progressHistory.length - 1) {
            return {
              ...p,
              correlation_data: (savedData.correlationData || p.correlation_data) as TrainingProgress['correlation_data'],
              metrics: savedData.finalMetrics || p.metrics
            };
          }
          // Also restore correlation_data for initial progress update if available
          if (p.epoch === 0 && savedData.correlationData) {
            return {
              ...p,
              correlation_data: savedData.correlationData as TrainingProgress['correlation_data']
            };
          }
          return p;
        });
        setProgressHistory(updatedHistory);
      } else {
        // Restore progress history as is
        setProgressHistory(savedData.progressHistory);
      }
    }
  }, []);

  useEffect(() => {
    if (progress) {
      setProgressHistory(prev => {
        const existing = prev.find(p => p.epoch === progress.epoch);
        if (existing) {
          return prev.map(p => p.epoch === progress.epoch ? progress : p);
        }
        return [...prev, progress];
      });

      if (progress.status === 'completed' || progress.status === 'error') {
        setIsTraining(false);
      }
    }
  }, [progress]);

  useEffect(() => {
    if (progressError) {
      setError(progressError.message);
      setIsTraining(false);
    }
  }, [progressError]);

  const handleStartTraining = async () => {
    try {
      setError(null);
      setIsTraining(true);
      setProgressHistory([]);
      setTaskId(null); // Reset task ID
      // Clear localStorage when starting new training (optional - comment out if you want to keep old data)
      // clearTrainingData();
      
      console.log('Starting training...', selectedFile ? `with file: ${selectedFile.name}` : 'with default dataset');
      const response = await startTraining(selectedFile || undefined);
      console.log('Training started, task_id:', response.task_id);
      setTaskId(response.task_id);
    } catch (err: any) {
      console.error('Error starting training:', err);
      const errorMessage = extractErrorMessage(err, 'Ошибка при запуске обучения');
      setError(errorMessage);
      setIsTraining(false);
      setTaskId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Обучение модели</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Загрузить датасет (CSV)
            </label>
            <FileUpload
              onFileSelect={setSelectedFile}
              defaultFileName="Volve production data.csv"
            />
          </div>

          <button
            onClick={handleStartTraining}
            disabled={isTraining}
            className={`
              w-full py-3 px-4 rounded-lg font-semibold text-white
              transition-colors duration-200
              ${isTraining
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'
              }
            `}
          >
            {isTraining ? '🔄 Обучение...' : '🚀 Начать обучение'}
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm font-semibold">Ошибка: {error}</p>
              {progressError && (
                <p className="text-red-600 text-xs mt-2">
                  Детали: {progressError.message}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {(isTraining || progressHistory.length > 0) && (
        <TrainingDashboard progressHistory={progressHistory} />
      )}

      {!isTraining && progressHistory.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <p className="text-blue-800">
            Загрузите CSV файл или используйте файл по умолчанию, затем нажмите "Начать обучение"
          </p>
        </div>
      )}
    </div>
  );
}

