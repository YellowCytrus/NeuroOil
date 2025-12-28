import { useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrainingProgress, CorrelationData } from '../utils/api';
import CorrelationPlot from './CorrelationPlot';
import { formatNumber } from '../utils/formatNumber';
import { saveTrainingData, updateTrainingData } from '../utils/localStorage';

interface TrainingDashboardProps {
  progressHistory: TrainingProgress[];
}

export default function TrainingDashboard({ progressHistory }: TrainingDashboardProps) {
  // Save to localStorage whenever progressHistory updates
  useEffect(() => {
    if (progressHistory.length === 0) {
      return;
    }

    const currentProgress = progressHistory[progressHistory.length - 1];
    const isCompleted = currentProgress?.status === 'completed';

    // Update localStorage with latest data
    updateTrainingData({
      progressHistory: progressHistory,
      correlationData: currentProgress?.correlation_data as Record<string, any>,
      finalMetrics: currentProgress?.metrics
    });

    // If training is completed, ensure final save
    if (isCompleted && currentProgress?.metrics) {
      saveTrainingData({
        progressHistory: progressHistory,
        correlationData: currentProgress.correlation_data as Record<string, any>,
        finalMetrics: currentProgress.metrics,
        timestamp: Date.now()
      });
    }
  }, [progressHistory]);
  const lossData = progressHistory.map(p => ({
    epoch: p.epoch,
    'Train Loss': p.loss,
    'Validation Loss': p.val_loss,
  }));

  const maeData = progressHistory.map(p => ({
    epoch: p.epoch,
    'Train MAE': p.mae,
    'Validation MAE': p.val_mae,
  }));

  const currentProgress = progressHistory[progressHistory.length - 1];
  const isCompleted = currentProgress?.status === 'completed';
  const finalMetrics = currentProgress?.metrics;

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Текущая эпоха</div>
          <div className="text-2xl font-bold text-indigo-600">
            {currentProgress?.epoch || 0}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Train Loss</div>
          <div className="text-2xl font-bold text-blue-600">
            {currentProgress?.loss ? currentProgress.loss.toFixed(4) : '—'}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Val Loss</div>
          <div className="text-2xl font-bold text-purple-600">
            {currentProgress?.val_loss ? currentProgress.val_loss.toFixed(4) : '—'}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Статус</div>
          <div className="text-2xl font-bold text-green-600">
            {isCompleted ? '✓ Завершено' : currentProgress?.status === 'training' ? '🔄 Обучение' : '—'}
          </div>
        </div>
      </div>

      {/* Final Metrics */}
      {isCompleted && finalMetrics && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg shadow p-6 border border-green-200">
          <h3 className="text-lg font-semibold text-green-800 mb-4">Финальные метрики</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-green-600">R² Score</div>
              <div className="text-xl font-bold text-green-800">{finalMetrics.r2.toFixed(4)}</div>
            </div>
            <div>
              <div className="text-sm text-green-600">MAE</div>
              <div className="text-xl font-bold text-green-800">{finalMetrics.mae.toFixed(2)} т/сут</div>
            </div>
            <div>
              <div className="text-sm text-green-600">MSE</div>
              <div className="text-xl font-bold text-green-800">{finalMetrics.mse.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-green-600">RMSE</div>
              <div className="text-xl font-bold text-green-800">{finalMetrics.rmse.toFixed(2)} т/сут</div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Loss Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Loss (MSE)</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={lossData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="epoch" label={{ value: 'Эпоха', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fontSize: '12px', fontWeight: 'bold' } }} />
              <YAxis 
                tickFormatter={(value) => formatNumber(value)} 
                label={{ value: 'Loss (MSE)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: '12px', fontWeight: 'bold' } }}
              />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="Train Loss" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="Validation Loss" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* MAE Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">MAE</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={maeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="epoch" label={{ value: 'Эпоха', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fontSize: '12px', fontWeight: 'bold' } }} />
              <YAxis 
                tickFormatter={(value) => formatNumber(value, 'т/сут')} 
                label={{ value: 'MAE (т/сут)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: '12px', fontWeight: 'bold' } }}
              />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="Train MAE" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="Validation MAE" 
                stroke="#f59e0b" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Correlation Plot - Show as soon as data is available */}
      {currentProgress?.correlation_data && (
        <CorrelationPlot correlationData={
          'points' in currentProgress.correlation_data && 'correlation_coefficient' in currentProgress.correlation_data
            ? { 'Q_liquid': currentProgress.correlation_data as CorrelationData }
            : currentProgress.correlation_data as Record<string, CorrelationData>
        } />
      )}
    </div>
  );
}



