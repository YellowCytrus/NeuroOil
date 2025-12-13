#!/bin/bash
# Скрипт для быстрого запуска проекта
# Запускает backend и frontend одновременно

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Получаем директорию проекта
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# Определяем пути к директориям
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# Функция для вывода сообщений
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Функция очистки при выходе
cleanup() {
    info "Остановка серверов..."
    
    # Убиваем все дочерние процессы
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    # Убиваем все процессы uvicorn и vite
    pkill -f "uvicorn app.main:app" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    
    success "Серверы остановлены"
    exit 0
}

# Устанавливаем обработчик выхода
trap cleanup EXIT INT TERM

# Проверка зависимостей backend
info "Проверка зависимостей backend..."

if [ ! -d "$BACKEND_DIR" ]; then
    error "Директория backend не найдена!"
    exit 1
fi

# Функция запуска backend
start_backend() {
    cd "$BACKEND_DIR"
    if command -v uv &> /dev/null; then
        uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    elif [ -f "$PROJECT_DIR/.venv/bin/python" ]; then
        source "$PROJECT_DIR/.venv/bin/activate"
        python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    elif [ -f "$BACKEND_DIR/.venv/bin/python" ]; then
        source .venv/bin/activate
        python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    else
        python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    fi
}

# Функция запуска frontend
start_frontend() {
    cd "$FRONTEND_DIR"
    npm run dev
}

# Определяем способ запуска backend
if command -v uv &> /dev/null; then
    info "Найден uv, будет использован для запуска backend"
elif [ -f "$PROJECT_DIR/.venv/bin/python" ]; then
    info "Найдено виртуальное окружение .venv"
elif [ -f "$BACKEND_DIR/.venv/bin/python" ]; then
    info "Найдено локальное виртуальное окружение backend/.venv"
else
    warning "Не найдено ни uv, ни виртуальное окружение"
    warning "Попытка запуска с системным Python..."
fi

# Проверка зависимостей frontend
info "Проверка зависимостей frontend..."

if [ ! -d "$FRONTEND_DIR" ]; then
    error "Директория frontend не найдена!"
    exit 1
fi

# Проверяем наличие node_modules
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    warning "node_modules не найдены. Запускаю npm install..."
    cd "$FRONTEND_DIR"
    npm install
    cd "$PROJECT_DIR"
fi

# Запуск backend
info "Запуск backend сервера (порт 8000)..."
start_backend > /tmp/neuro_oil_backend.log 2>&1 &
BACKEND_PID=$!

# Ждем немного и проверяем, что backend запустился
sleep 3
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    error "Backend не запустился! Проверьте логи:"
    cat /tmp/neuro_oil_backend.log
    exit 1
fi

success "Backend запущен (PID: $BACKEND_PID)"

# Запуск frontend
info "Запуск frontend сервера (порт 3000)..."
start_frontend > /tmp/neuro_oil_frontend.log 2>&1 &
FRONTEND_PID=$!

# Ждем немного и проверяем, что frontend запустился
sleep 3
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    error "Frontend не запустился! Проверьте логи:"
    cat /tmp/neuro_oil_frontend.log
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

success "Frontend запущен (PID: $FRONTEND_PID)"

# Выводим информацию
echo ""
echo "=========================================="
success "Проект успешно запущен!"
echo "=========================================="
echo ""
info "Backend API:  http://localhost:8000"
info "Frontend UI:  http://localhost:3000"
info "API Docs:     http://localhost:8000/docs"
echo ""
info "Backend PID:  $BACKEND_PID"
info "Frontend PID: $FRONTEND_PID"
echo ""
info "Логи backend:  /tmp/neuro_oil_backend.log"
info "Логи frontend: /tmp/neuro_oil_frontend.log"
echo ""
warning "Для остановки нажмите Ctrl+C"
echo "=========================================="
echo ""

# Показываем последние строки логов
info "Последние строки логов backend:"
tail -n 5 /tmp/neuro_oil_backend.log || true
echo ""
info "Последние строки логов frontend:"
tail -n 5 /tmp/neuro_oil_frontend.log || true
echo ""

# Ожидание
wait

