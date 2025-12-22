import { useState, useEffect } from 'react';
import PredictionSliders from '../components/PredictionSliders';
import PredictionFeatureImportance from '../components/PredictionFeatureImportance';
import { getFeatureImportance, FeatureImportance as FeatureImportanceType } from '../utils/api';

export default function PredictionPage() {
  const [featureImportance, setFeatureImportance] = useState<Record<string, FeatureImportanceType> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFeatureImportance = async () => {
      try {
        setLoading(true);
        setError(null);
        const importance = await getFeatureImportance();
        setFeatureImportance(importance);
      } catch (err: any) {
        // Don't show error if model doesn't exist yet - it's expected
        if (err.response?.status !== 404) {
          setError(err.response?.data?.detail || err.message || 'Ошибка при загрузке важности признаков');
        }
      } finally {
        setLoading(false);
      }
    };

    loadFeatureImportance();
  }, []);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Предсказание дебита нефти</h1>
        <p className="text-gray-600">
          Используйте ползунки ниже для изменения входных параметров модели.
          Предсказание обновляется автоматически.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <PredictionSliders />
      </div>

      {/* Feature Importance Chart */}
      <div className="mt-6">
        {loading && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Важность признаков</h3>
            <div className="text-center text-gray-500 py-8">
              Загрузка данных о важности признаков...
            </div>
          </div>
        )}
        {error && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Важность признаков</h3>
            <div className="text-center text-red-500 py-8">
              {error}
            </div>
          </div>
        )}
        {!loading && !error && featureImportance && (
          <PredictionFeatureImportance featureImportance={featureImportance} />
        )}
        {!loading && !error && !featureImportance && (
          <PredictionFeatureImportance featureImportance={{}} />
        )}
      </div>
    </div>
  );
}



