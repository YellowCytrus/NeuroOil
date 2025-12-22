import { useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import { CorrelationData } from '../utils/api';
import { formatNumber } from '../utils/formatNumber';

interface CorrelationPlotProps {
  correlationData: Record<string, CorrelationData>;
}

const featureLabels: Record<string, string> = {
  'P_downhole': 'Давление на забое (bara)',
  'Q_liquid': 'Дебит жидкости (м³/сут)',
  'H_pump': 'Напор насоса (м)',
  'WC_percent': 'Обводненность (%)',
  'GFR': 'Газовый фактор (м³/м³)',
  'T_downhole': 'Забойная температура (°C)',
  'P_annulus': 'Давление в затрубном пространстве (бар)',
  'P_wellhead': 'Устьевое давление (бар)',
  'T_wellhead': 'Устьевая температура (°C)',
  'dp_choke': 'Перепад давления на штуцере (бар)'
};

const featureUnits: Record<string, string> = {
  'P_downhole': 'bara',
  'Q_liquid': 'м³/сут',
  'H_pump': 'м',
  'WC_percent': '%',
  'GFR': 'м³/м³',
  'T_downhole': '°C',
  'P_annulus': 'бар',
  'P_wellhead': 'бар',
  'T_wellhead': '°C',
  'dp_choke': 'бар'
};

export default function CorrelationPlot({ correlationData }: CorrelationPlotProps) {
  // Handle legacy format (single correlation) or new format (multiple correlations)
  const isLegacyFormat = correlationData && 'points' in correlationData && 'correlation_coefficient' in correlationData;
  
  const correlations: Record<string, CorrelationData> = isLegacyFormat
    ? { 'Q_liquid': correlationData as CorrelationData }
    : (correlationData || {});

  const featureNames = Object.keys(correlations);
  const [selectedFeature, setSelectedFeature] = useState<string>(featureNames[0] || '');

  if (!correlations || featureNames.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Зависимость параметров от debit_oil</h3>
        <div className="text-center text-gray-500 py-8">
          Данные загружаются...
        </div>
      </div>
    );
  }

  const currentData = correlations[selectedFeature];
  if (!currentData || !currentData.points || currentData.points.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Зависимость параметров от debit_oil</h3>
        <div className="text-center text-gray-500 py-8">
          Данные загружаются...
        </div>
      </div>
    );
  }

  const { points, correlation_coefficient } = currentData;

  // Calculate linear regression for trend line
  const n = points.length;
  const featureValues = points.map(p => p[selectedFeature] as number);
  const debitOilValues = points.map(p => p.debit_oil);
  
  const sumX = featureValues.reduce((sum, x) => sum + x, 0);
  const sumY = debitOilValues.reduce((sum, y) => sum + y, 0);
  const sumXY = featureValues.reduce((sum, x, i) => sum + x * debitOilValues[i], 0);
  const sumX2 = featureValues.reduce((sum, x) => sum + x * x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  const minX = Math.min(...featureValues);
  const maxX = Math.max(...featureValues);
  // Create more points for smoother trend line
  const trendLinePoints = [];
  const numPoints = 50;
  for (let i = 0; i <= numPoints; i++) {
    const x = minX + (maxX - minX) * (i / numPoints);
    trendLinePoints.push({
      [selectedFeature]: x,
      debit_oil: slope * x + intercept
    });
  }

  // Determine correlation strength
  const absCorr = Math.abs(correlation_coefficient);
  let correlationStrength = '';
  let correlationColor = '';
  if (absCorr >= 0.9) {
    correlationStrength = 'Очень сильная';
    correlationColor = 'text-green-600';
  } else if (absCorr >= 0.7) {
    correlationStrength = 'Сильная';
    correlationColor = 'text-green-500';
  } else if (absCorr >= 0.5) {
    correlationStrength = 'Умеренная';
    correlationColor = 'text-yellow-600';
  } else if (absCorr >= 0.3) {
    correlationStrength = 'Слабая';
    correlationColor = 'text-orange-500';
  } else {
    correlationStrength = 'Очень слабая';
    correlationColor = 'text-red-500';
  }

  const featureLabel = featureLabels[selectedFeature] || selectedFeature;
  const featureUnit = featureUnits[selectedFeature] || '';

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Зависимость параметров от debit_oil</h3>
      
      {/* Tabs */}
      {featureNames.length > 1 && (
        <div className="mb-4 border-b border-gray-200">
          <nav className="-mb-px flex space-x-2 overflow-x-auto">
            {featureNames.map((feature) => {
              const isActive = feature === selectedFeature;
              const featureData = correlations[feature];
              const corr = featureData?.correlation_coefficient || 0;
              const absCorr = Math.abs(corr);
              
              // Color based on correlation strength
              let tabColor = 'text-gray-500 border-gray-300';
              if (absCorr >= 0.7) {
                tabColor = isActive ? 'text-green-600 border-green-500' : 'text-green-500 border-gray-300';
              } else if (absCorr >= 0.5) {
                tabColor = isActive ? 'text-yellow-600 border-yellow-500' : 'text-yellow-500 border-gray-300';
              } else if (absCorr >= 0.3) {
                tabColor = isActive ? 'text-orange-600 border-orange-500' : 'text-orange-500 border-gray-300';
              } else {
                tabColor = isActive ? 'text-red-600 border-red-500' : 'text-red-500 border-gray-300';
              }
              
              return (
                <button
                  key={feature}
                  onClick={() => setSelectedFeature(feature)}
                  className={`
                    px-4 py-2 text-sm font-medium border-b-2 transition-colors
                    ${isActive 
                      ? `${tabColor} border-b-2` 
                      : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {featureLabels[feature] || feature}
                  <span className={`ml-2 text-xs ${isActive ? 'font-bold' : ''}`}>
                    ({corr.toFixed(3)})
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Correlation Info */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-gray-600">Коэффициент корреляции ({featureLabel}): </span>
            <span className={`text-lg font-bold ${correlationColor}`}>
              {correlation_coefficient.toFixed(4)}
            </span>
          </div>
          <div className={`text-sm font-semibold ${correlationColor}`}>
            {correlationStrength}
          </div>
        </div>
        {correlation_coefficient > 0.7 && (
          <p className="text-xs text-gray-600 mt-2">
            ✓ Наблюдается прямая зависимость между debit_oil (т/сут) и {featureLabel}
          </p>
        )}
        {correlation_coefficient <= 0.7 && correlation_coefficient > 0.3 && (
          <p className="text-xs text-gray-600 mt-2">
            ⚠ Умеренная зависимость между debit_oil (т/сут) и {featureLabel}
          </p>
        )}
        {correlation_coefficient <= 0.3 && (
          <p className="text-xs text-gray-600 mt-2">
            ✗ Прямая зависимость между debit_oil (т/сут) и {featureLabel} слабая или отсутствует
          </p>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            type="number" 
            dataKey={selectedFeature} 
            name={selectedFeature}
            label={{ 
              value: `${featureLabel}`, 
              position: 'insideBottom', 
              offset: -5, 
              style: { textAnchor: 'middle', fontSize: '12px', fontWeight: 'bold' } 
            }}
            domain={['dataMin', 'dataMax']}
            tickFormatter={(value) => formatNumber(value, featureUnit)}
          />
          <YAxis 
            type="number" 
            dataKey="debit_oil" 
            name="debit_oil"
            label={{ 
              value: 'debit_oil (т/сут)', 
              angle: -90, 
              position: 'insideLeft', 
              style: { textAnchor: 'middle', fontSize: '12px', fontWeight: 'bold' } 
            }}
            domain={['dataMin', 'dataMax']}
            tickFormatter={(value) => formatNumber(value, 'т/сут')}
          />
          <Tooltip 
            cursor={{ strokeDasharray: '3 3' }}
            formatter={(value: number, name: string) => {
              if (name === selectedFeature) {
                return [`${value.toFixed(2)} ${featureUnit}`, featureLabel];
              }
              if (name === 'debit_oil') {
                return [`${value.toFixed(2)} т/сут`, 'debit_oil'];
              }
              return [value, name];
            }}
          />
          <Scatter 
            name="Данные" 
            data={points} 
            fill="#3b82f6"
            opacity={0.6}
          />
          <Line 
            type="linear"
            dataKey="debit_oil"
            data={trendLinePoints}
            stroke="#ef4444"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            legendType="line"
            name="Линия тренда"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
