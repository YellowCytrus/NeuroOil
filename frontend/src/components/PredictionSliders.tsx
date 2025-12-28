import { useState, useEffect, useCallback, useMemo } from 'react';
import { makePrediction, PredictionRequest, PredictionResponse, extractErrorMessage, CorrelationData } from '../utils/api';
import { loadTrainingData } from '../utils/localStorage';

interface FeatureConfig {
  name: string;
  key: keyof PredictionRequest;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

const featureConfigs: FeatureConfig[] = [
  {
    name: 'P_downhole',
    key: 'P_downhole',
    label: 'Давление на забое',
    unit: 'bara',
    min: 0,
    max: 500,
    step: 1,
    defaultValue: 250,
  },
  {
    name: 'Q_liquid',
    key: 'Q_liquid',
    label: 'Дебит жидкости',
    unit: 'Sm³/сут',
    min: 0,
    max: 5000,
    step: 10,
    defaultValue: 2000,
  },
  {
    name: 'H_pump',
    key: 'H_pump',
    label: 'Напор насоса',
    unit: 'м',
    min: 0,
    max: 3000,
    step: 10,
    defaultValue: 1500,
  },
  {
    name: 'WC_percent',
    key: 'WC_percent',
    label: 'Обводненность',
    unit: '%',
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 50,
  },
  {
    name: 'GFR',
    key: 'GFR',
    label: 'Газовый фактор',
    unit: 'м³/м³',
    min: 0,
    max: 1000,
    step: 5,
    defaultValue: 200,
  },
  {
    name: 'T_downhole',
    key: 'T_downhole',
    label: 'Забойная температура',
    unit: '°C',
    min: 0,
    max: 200,
    step: 1,
    defaultValue: 97,
  },
  {
    name: 'P_annulus',
    key: 'P_annulus',
    label: 'Давление в затрубном пространстве',
    unit: 'бар',
    min: 0,
    max: 100,
    step: 0.5,
    defaultValue: 10,
  },
  {
    name: 'P_wellhead',
    key: 'P_wellhead',
    label: 'Устьевое давление',
    unit: 'бар',
    min: 0,
    max: 100,
    step: 0.5,
    defaultValue: 20,
  },
  {
    name: 'T_wellhead',
    key: 'T_wellhead',
    label: 'Устьевая температура',
    unit: '°C',
    min: 0,
    max: 100,
    step: 0.5,
    defaultValue: 10,
  },
  {
    name: 'dp_choke',
    key: 'dp_choke',
    label: 'Перепад давления на штуцере',
    unit: 'бар',
    min: 0,
    max: 50,
    step: 0.5,
    defaultValue: 15,
  },
];

export default function PredictionSliders() {
  // Load correlation data from localStorage to sort sliders
  const correlationData = useMemo(() => {
    const trainingData = loadTrainingData();
    if (trainingData?.correlationData) {
      // Handle both formats: Record<string, CorrelationData> or legacy single CorrelationData
      const data = trainingData.correlationData;
      // Check if it's legacy format (single CorrelationData object)
      // Legacy format has 'points' and 'correlation_coefficient' at top level
      // New format has feature names as keys (like 'P_downhole', 'Q_liquid', etc.)
      const featureNames = ['P_downhole', 'Q_liquid', 'H_pump', 'WC_percent', 'GFR'];
      const hasFeatureKeys = featureNames.some(name => name in data);
      
      if ('points' in data && 'correlation_coefficient' in data && !hasFeatureKeys) {
        // Legacy format - single correlation
        return { 'Q_liquid': data as unknown as CorrelationData };
      }
      // New format - Record<string, CorrelationData>
      return data as Record<string, CorrelationData>;
    }
    return null;
  }, []);

  // Sort feature configs by absolute correlation coefficient (descending)
  const sortedFeatureConfigs = useMemo(() => {
    if (!correlationData) {
      return featureConfigs; // Return original order if no correlation data
    }

    return [...featureConfigs].sort((a, b) => {
      const corrA = correlationData[a.name]?.correlation_coefficient || 0;
      const corrB = correlationData[b.name]?.correlation_coefficient || 0;
      const absCorrA = Math.abs(corrA);
      const absCorrB = Math.abs(corrB);
      return absCorrB - absCorrA; // Sort descending (larger to smaller)
    });
  }, [correlationData]);

  const [values, setValues] = useState<PredictionRequest>(() => {
    const initial: any = {};
    featureConfigs.forEach(config => {
      initial[config.key] = config.defaultValue;
    });
    return initial as PredictionRequest;
  });

  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updatePrediction = useCallback(async (newValues: PredictionRequest) => {
    setLoading(true);
    setError(null);
    try {
      const result = await makePrediction(newValues);
      setPrediction(result);
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Ошибка при предсказании'));
      setPrediction(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updatePrediction(values);
    }, 300); // Debounce 300ms

    return () => clearTimeout(timeoutId);
  }, [values, updatePrediction]);

  const handleSliderChange = (key: keyof PredictionRequest, value: number) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  return (
    <>
      {/* Sliders - Left Column (2/3 width) */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Параметры для предсказания</h2>
          
          <div className="space-y-4 sm:space-y-6">
            {sortedFeatureConfigs.map((config) => (
              <div key={config.name} className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-gray-700">
                    {config.label}
                  </label>
                  <span className="text-sm text-gray-500 font-semibold">
                    {values[config.key].toFixed(config.step < 1 ? 1 : 0)} {config.unit}
                  </span>
                </div>
                <input
                  type="range"
                  min={config.min}
                  max={config.max}
                  step={config.step}
                  value={values[config.key]}
                  onChange={(e) => handleSliderChange(config.key, parseFloat(e.target.value))}
                  className="w-full h-3 sm:h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 touch-manipulation"
                  style={{ minHeight: '44px' }}
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{config.min} {config.unit}</span>
                  <span>{config.max} {config.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Prediction Result - Right Column (1/3 width), Sticky on desktop only */}
      <div className="lg:col-span-1">
        <div className="lg:sticky lg:top-6">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg shadow-lg p-4 sm:p-6 lg:p-8 border-2 border-indigo-200">
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-4">Результат предсказания</h3>
            
            {loading && (
              <div className="text-center py-6 sm:py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <p className="mt-2 text-sm sm:text-base text-gray-600">Вычисление...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 sm:p-4 shadow-sm">
                <p className="text-red-800 text-sm font-medium">{error}</p>
              </div>
            )}

            {prediction && !loading && !error && (
              <div className="text-center">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-indigo-600 mb-2">
                  {prediction.prediction <= 0 ? '~0' : prediction.prediction.toFixed(2)}
                </div>
                <div className="text-lg sm:text-xl text-gray-600">
                  {prediction.unit}
                </div>
                <div className="mt-4 text-xs sm:text-sm text-gray-500">
                  Предсказанный дебит нефти
                </div>
                {prediction.prediction <= 0 && (
                  <div className="mt-2 text-xs text-amber-600">
                    (скорректировано: исходное значение было некорректным)
                  </div>
                )}
              </div>
            )}

            {!prediction && !loading && !error && (
              <div className="text-center py-6 sm:py-8 text-gray-400 text-sm sm:text-base">
                Измените параметры для получения предсказания
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}



