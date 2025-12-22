import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ErrorBar } from 'recharts';
import { FeatureImportance } from '../utils/api';
import { formatNumber } from '../utils/formatNumber';

interface PredictionFeatureImportanceProps {
  featureImportance: Record<string, FeatureImportance>;
}

const featureLabels: Record<string, string> = {
  'P_downhole': 'P_downhole (bara)',
  'Q_liquid': 'Q_liquid (м³/сут)',
  'H_pump': 'H_pump (м)',
  'WC_percent': 'WC_percent (%)',
  'GFR': 'GFR (м³/м³)',
  'choke_size': 'choke_size (%)'
};

export default function PredictionFeatureImportance({ featureImportance }: PredictionFeatureImportanceProps) {
  if (!featureImportance || Object.keys(featureImportance).length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Важность признаков</h3>
        <div className="text-center text-gray-500 py-8">
          Данные о важности признаков будут доступны после завершения обучения модели
        </div>
      </div>
    );
  }

  // Convert to array and sort by importance
  const dataArray = Object.entries(featureImportance)
    .map(([name, value]) => ({
      name: featureLabels[name] || name,
      importance: value.importance,
      std: value.std,
      absImportance: Math.abs(value.importance)
    }))
    .sort((a, b) => b.absImportance - a.absImportance);

  // Calculate total importance for normalization
  const totalImportance = dataArray.reduce((sum, item) => sum + item.absImportance, 0);
  
  // Add normalized importance (percentage) and keep original values
  const data = dataArray.map(item => ({
    ...item,
    normalizedImportance: totalImportance > 0 ? (item.absImportance / totalImportance) * 100 : 0
  }));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Важность признаков (SHAP Values)</h3>
      <p className="text-sm text-gray-600 mb-4">
        Показывает средний вклад каждого признака в прогноз модели. Значения в единицах целевой переменной (т/сут).
        Чем выше абсолютное значение, тем больше влияние признака на результат. Также показана относительная важность в процентах.
      </p>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            type="number" 
            label={{ value: 'Важность (т/сут)', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fontSize: '12px', fontWeight: 'bold' } }} 
            tickFormatter={(value) => formatNumber(value, 'т/сут')} 
          />
          <YAxis 
            type="category" 
            dataKey="name" 
            width={90}
            tick={{ fontSize: 12 }}
          />
          <Tooltip 
            formatter={(value: number, name: string, props: any) => {
              if (name === 'importance') {
                const percentage = props.payload.normalizedImportance.toFixed(1);
                return [
                  `${value.toFixed(2)} ± ${props.payload.std.toFixed(2)} т/сут (${percentage}%)`,
                  'Важность'
                ];
              }
              return [value, name];
            }}
          />
          <Legend />
          <Bar 
            dataKey="importance" 
            fill="#3b82f6"
            name="Важность признака"
          >
            {data.map((entry, index) => (
              <ErrorBar
                key={index}
                dataKey="std"
                width={4}
                strokeWidth={2}
                stroke="#8884d8"
                direction="x"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

