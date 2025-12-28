import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import TrainingPage from './pages/TrainingPage';
import PredictionPage from './pages/PredictionPage';

function NavLink({ to, children, onClick }: { to: string; children: React.ReactNode; onClick?: () => void }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`
        inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
        shadow-sm
        ${isActive
          ? 'bg-indigo-600 text-white shadow-md border-2 border-indigo-700'
          : 'bg-white text-gray-700 border-2 border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 hover:shadow-md active:bg-indigo-100'
        }
      `}
    >
      {children}
    </Link>
  );
}

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <nav className="bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center flex-1">
                <div className="flex-shrink-0 flex items-center">
                  <h1 className="text-xl sm:text-2xl font-bold text-indigo-600">
                    🛢️ Нейросеть предсказания дебита нефти
                  </h1>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-3">
                  <NavLink to="/">Обучение</NavLink>
                  <NavLink to="/predict">Предсказание</NavLink>
                </div>
              </div>
              
              {/* Mobile menu button */}
              <div className="sm:hidden flex items-center">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 bg-white border-2 border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 shadow-sm active:bg-indigo-100 transition-all duration-200"
                  aria-expanded="false"
                >
                  <span className="sr-only">Открыть главное меню</span>
                  {!mobileMenuOpen ? (
                    <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  ) : (
                    <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="sm:hidden border-t border-gray-200 bg-white shadow-lg">
              <div className="px-2 pt-2 pb-3 space-y-1">
                <NavLink to="/" onClick={() => setMobileMenuOpen(false)}>Обучение</NavLink>
                <NavLink to="/predict" onClick={() => setMobileMenuOpen(false)}>Предсказание</NavLink>
              </div>
            </div>
          )}
        </nav>

        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<TrainingPage />} />
            <Route path="/predict" element={<PredictionPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

