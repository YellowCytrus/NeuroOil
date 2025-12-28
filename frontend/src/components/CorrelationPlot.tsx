import { useState, useRef, useEffect } from 'react';
import { Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts';
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
    ? { 'Q_liquid': correlationData as unknown as CorrelationData }
    : (correlationData || {});

  // Sort features by absolute correlation coefficient (descending)
  const featureNames = Object.keys(correlations).sort((a, b) => {
    const corrA = Math.abs(correlations[a]?.correlation_coefficient || 0);
    const corrB = Math.abs(correlations[b]?.correlation_coefficient || 0);
    return corrB - corrA; // Sort descending (larger to smaller)
  });
  
  const [selectedFeature, setSelectedFeature] = useState<string>(featureNames[0] || '');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll position
  const checkScrollPosition = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    checkScrollPosition();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollPosition);
      window.addEventListener('resize', checkScrollPosition);
      return () => {
        container.removeEventListener('scroll', checkScrollPosition);
        window.removeEventListener('resize', checkScrollPosition);
      };
    }
  }, [featureNames]);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

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

  // Determine correlation strength (yellow/moderate centered at 0.3)
  const absCorr = Math.abs(correlation_coefficient);
  let correlationStrength = '';
  let correlationColor = '';
  if (absCorr >= 0.7) {
    correlationStrength = 'Очень сильная';
    correlationColor = 'text-green-600';
  } else if (absCorr >= 0.5) {
    correlationStrength = 'Сильная';
    correlationColor = 'text-green-500';
  } else if (absCorr >= 0.3) {
    correlationStrength = 'Умеренная';
    correlationColor = 'text-yellow-600';
  } else if (absCorr >= 0.25) {
    correlationStrength = 'Слабая';
    correlationColor = 'text-orange-500';
  } else {
    correlationStrength = 'Очень слабая';
    correlationColor = 'text-red-500';
  }

  const featureLabel = featureLabels[selectedFeature] || selectedFeature;
  const featureUnit = featureUnits[selectedFeature] || '';

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border-2 border-gray-100">
      <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Зависимость параметров от debit_oil</h3>
      
      {/* Tabs */}
      {featureNames.length > 1 && (
        <div className="mb-4 border-b-2 border-gray-200">
          <div className="relative">
            {/* Left Arrow */}
            {canScrollLeft && (
              <button
                onClick={scrollLeft}
                className="absolute left-0 top-0 bottom-0 z-10 bg-white/90 hover:bg-white border-r border-gray-200 px-2 flex items-center justify-center shadow-md transition-all duration-200"
                aria-label="Прокрутить влево"
              >
                <svg className="w-5 h-5 text-gray-700 hover:text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            
            {/* Right Arrow */}
            {canScrollRight && (
              <button
                onClick={scrollRight}
                className="absolute right-0 top-0 bottom-0 z-10 bg-white/90 hover:bg-white border-l border-gray-200 px-2 flex items-center justify-center shadow-md transition-all duration-200"
                aria-label="Прокрутить вправо"
              >
                <svg className="w-5 h-5 text-gray-700 hover:text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            <nav 
              ref={scrollContainerRef}
              className="-mb-px flex space-x-2 overflow-x-auto pb-2 scrollbar-visible"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#6366f1 #e5e7eb'
              }}
            >
            {featureNames.map((feature) => {
              const isActive = feature === selectedFeature;
              const featureData = correlations[feature];
              const corr = featureData?.correlation_coefficient || 0;
              const absCorr = Math.abs(corr);
              
              // Color based on correlation strength (yellow/moderate centered at 0.3)
              let tabColor = 'text-gray-500 border-gray-300 bg-gray-50';
              let activeTabColor = 'text-gray-700 border-gray-500 bg-white shadow-md';
              if (absCorr >= 0.7) {
                tabColor = isActive ? 'text-green-700 border-green-500 bg-green-50 shadow-md' : 'text-green-600 border-gray-300 bg-white hover:bg-green-50';
                activeTabColor = 'text-green-700 border-green-500 bg-green-50 shadow-md';
              } else if (absCorr >= 0.5) {
                tabColor = isActive ? 'text-green-600 border-green-400 bg-green-50 shadow-md' : 'text-green-500 border-gray-300 bg-white hover:bg-green-50';
                activeTabColor = 'text-green-600 border-green-400 bg-green-50 shadow-md';
              } else if (absCorr >= 0.3) {
                tabColor = isActive ? 'text-yellow-700 border-yellow-500 bg-yellow-50 shadow-md' : 'text-yellow-600 border-gray-300 bg-white hover:bg-yellow-50';
                activeTabColor = 'text-yellow-700 border-yellow-500 bg-yellow-50 shadow-md';
              } else if (absCorr >= 0.25) {
                tabColor = isActive ? 'text-orange-700 border-orange-500 bg-orange-50 shadow-md' : 'text-orange-600 border-gray-300 bg-white hover:bg-orange-50';
                activeTabColor = 'text-orange-700 border-orange-500 bg-orange-50 shadow-md';
              } else {
                tabColor = isActive ? 'text-red-700 border-red-500 bg-red-50 shadow-md' : 'text-red-600 border-gray-300 bg-white hover:bg-red-50';
                activeTabColor = 'text-red-700 border-red-500 bg-red-50 shadow-md';
              }
              
              return (
                <button
                  key={feature}
                  onClick={() => setSelectedFeature(feature)}
                  className={`
                    px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-2 rounded-t-lg transition-all duration-200 whitespace-nowrap
                    ${isActive 
                      ? `${activeTabColor} border-b-2` 
                      : `${tabColor} border-transparent hover:border-gray-300 active:bg-gray-100`
                    }
                  `}
                >
                  <span className="hidden sm:inline">{featureLabels[feature] || feature}</span>
                  <span className="sm:hidden">{featureLabels[feature]?.split(' ')[0] || feature}</span>
                  <span className={`ml-1 sm:ml-2 text-xs font-bold ${isActive ? '' : 'opacity-75'}`}>
                    ({corr.toFixed(3)})
                  </span>
                  {absCorr < 0.25 && (
                    <span className="ml-1 sm:ml-2 text-xs" title="Можно убрать из модели">
                      🗑️
                    </span>
                  )}
                </button>
              );
            })}
            </nav>
          </div>
        </div>
      )}

      {/* Correlation Info */}
      <div className="mb-4 p-3 sm:p-4 bg-blue-50 rounded-lg border-2 border-blue-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <span className="text-xs sm:text-sm text-gray-600">Коэффициент корреляции ({featureLabel}): </span>
            <span className={`text-base sm:text-lg font-bold ${correlationColor}`}>
              {correlation_coefficient.toFixed(4)}
            </span>
          </div>
          <div className={`text-xs sm:text-sm font-semibold ${correlationColor}`}>
            {correlationStrength}
          </div>
        </div>
        {absCorr >= 0.5 && (
          <p className="text-xs text-gray-600 mt-2">
            ✓ Наблюдается прямая зависимость между debit_oil (т/сут) и {featureLabel}
          </p>
        )}
        {absCorr >= 0.3 && absCorr < 0.5 && (
          <p className="text-xs text-gray-600 mt-2">
            ⚠ Умеренная зависимость между debit_oil (т/сут) и {featureLabel}
          </p>
        )}
        {absCorr >= 0.25 && absCorr < 0.3 && (
          <p className="text-xs text-gray-600 mt-2">
            ✗ Прямая зависимость между debit_oil (т/сут) и {featureLabel} слабая или отсутствует
          </p>
        )}
        {absCorr < 0.25 && (
          <p className="text-xs text-red-600 font-semibold mt-2">
            ✗ Прямая зависимость между debit_oil (т/сут) и {featureLabel} очень слабая. Этот параметр можно убрать из модели.
          </p>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
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
