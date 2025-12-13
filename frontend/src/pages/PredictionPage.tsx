import PredictionSliders from '../components/PredictionSliders';

export default function PredictionPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Предсказание дебита нефти</h1>
        <p className="text-gray-600">
          Используйте ползунки ниже для изменения входных параметров модели.
          Предсказание обновляется автоматически.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PredictionSliders />
      </div>
    </div>
  );
}



