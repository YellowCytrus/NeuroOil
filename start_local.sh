#!/usr/bin/env bash
set -euo pipefail

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Порт для бэкенда и фронтенда
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

# Директории проекта
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# PID файлы для отслеживания процессов
BACKEND_PID_FILE="/tmp/neurooil_backend.pid"
FRONTEND_PID_FILE="/tmp/neurooil_frontend.pid"

# Функция для вывода сообщений
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Функция очистки при выходе
cleanup() {
    info "Остановка серверов..."
    
    if [ -f "$BACKEND_PID_FILE" ]; then
        BACKEND_PID=$(cat "$BACKEND_PID_FILE")
        if kill -0 "$BACKEND_PID" 2>/dev/null; then
            kill "$BACKEND_PID" 2>/dev/null || true
            info "Бэкенд остановлен (PID: $BACKEND_PID)"
        fi
        rm -f "$BACKEND_PID_FILE"
    fi
    
    if [ -f "$FRONTEND_PID_FILE" ]; then
        FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
        if kill -0 "$FRONTEND_PID" 2>/dev/null; then
            kill "$FRONTEND_PID" 2>/dev/null || true
            info "Фронтенд остановлен (PID: $FRONTEND_PID)"
        fi
        rm -f "$FRONTEND_PID_FILE"
    fi
    
    # Убиваем все дочерние процессы
    pkill -P $$ 2>/dev/null || true
    
    exit 0
}

# Устанавливаем обработчик сигналов
trap cleanup SIGINT SIGTERM EXIT

# Проверка наличия Python
check_python() {
    if ! command -v python3 &> /dev/null; then
        error "Python 3 не найден! Установите Python 3.11 или новее."
        exit 1
    fi
    
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    info "Найден Python: $PYTHON_VERSION"
}

# Проверка наличия Node.js
check_node() {
    if ! command -v node &> /dev/null; then
        error "Node.js не найден! Установите Node.js LTS версию."
        exit 1
    fi
    
    NODE_VERSION=$(node --version)
    info "Найден Node.js: $NODE_VERSION"
    
    if ! command -v npm &> /dev/null; then
        error "npm не найден!"
        exit 1
    fi
    
    NPM_VERSION=$(npm --version)
    info "Найден npm: $NPM_VERSION"
}

# Проверка наличия uv
check_uv() {
    if ! command -v uv &> /dev/null; then
        error "uv не найден! Установите uv:"
        error "  curl -LsSf https://astral.sh/uv/install.sh | sh"
        error "  или: pip install uv"
        exit 1
    fi
    
    UV_VERSION=$(uv --version)
    info "Найден uv: $UV_VERSION"
}

# Настройка бэкенда
setup_backend() {
    info "Настройка бэкенда через uv..."
    
    cd "$BACKEND_DIR"
    
    # Установка зависимостей через uv
    if [ ! -f ".uv_deps_installed" ] || [ "requirements.txt" -nt ".uv_deps_installed" ]; then
        info "Установка Python зависимостей через uv (это может занять несколько минут)..."
        uv pip install -r requirements.txt
        touch .uv_deps_installed
        success "Зависимости установлены"
    else
        info "Зависимости уже установлены"
    fi
    
    cd "$SCRIPT_DIR"
}

# Настройка фронтенда
setup_frontend() {
    info "Настройка фронтенда..."
    
    cd "$FRONTEND_DIR"
    
    # Установка зависимостей если их нет
    if [ ! -d "node_modules" ]; then
        info "Установка npm зависимостей (это может занять несколько минут)..."
        npm install --silent
        success "Зависимости установлены"
    else
        info "Зависимости уже установлены"
    fi
    
    cd "$SCRIPT_DIR"
}

# Проверка занятости портов
check_ports() {
    if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        warning "Порт $BACKEND_PORT уже занят!"
        info "Попробуйте остановить процесс или измените BACKEND_PORT"
        exit 1
    fi
    
    if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        warning "Порт $FRONTEND_PORT уже занят!"
        info "Попробуйте остановить процесс или измените FRONTEND_PORT"
        exit 1
    fi
}

# Запуск бэкенда
start_backend() {
    info "Запуск бэкенда через uv на порту $BACKEND_PORT..."
    
    cd "$BACKEND_DIR"
    
    # Запуск через uv в фоне и сохранение PID
    uv run uvicorn app.main:app --reload --host 0.0.0.0 --port "$BACKEND_PORT" > /tmp/neurooil_backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > "$BACKEND_PID_FILE"
    
    # Ждем пока сервер запустится
    info "Ожидание запуска бэкенда..."
    for i in {1..30}; do
        if curl -s http://localhost:$BACKEND_PORT/docs > /dev/null 2>&1; then
            success "Бэкенд запущен через uv (PID: $BACKEND_PID)"
            return 0
        fi
        sleep 1
    done
    
    error "Бэкенд не запустился за 30 секунд. Проверьте логи: /tmp/neurooil_backend.log"
    exit 1
}

# Запуск фронтенда
start_frontend() {
    info "Запуск фронтенда на порту $FRONTEND_PORT..."
    
    cd "$FRONTEND_DIR"
    
    # Запуск в фоне и сохранение PID
    # Используем PORT переменную окружения для Vite
    PORT="$FRONTEND_PORT" HOST="0.0.0.0" npm run dev > /tmp/neurooil_frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > "$FRONTEND_PID_FILE"
    
    # Ждем пока сервер запустится
    info "Ожидание запуска фронтенда..."
    sleep 5
    
    # Проверяем что процесс еще работает
    if kill -0 "$FRONTEND_PID" 2>/dev/null; then
        # Проверяем доступность порта
        for i in {1..20}; do
            if curl -s http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
                success "Фронтенд запущен (PID: $FRONTEND_PID)"
                return 0
            fi
            sleep 1
        done
        warning "Фронтенд запущен, но порт еще не отвечает (может потребоваться больше времени)"
    else
        error "Фронтенд не запустился. Проверьте логи: /tmp/neurooil_frontend.log"
        exit 1
    fi
}

# Основная функция
main() {
    echo "=========================================="
    echo "  NeuroOil - Локальный запуск"
    echo "=========================================="
    echo ""
    
    # Проверки
    check_python
    check_uv
    check_node
    check_ports
    
    echo ""
    info "Настройка окружения..."
    
    # Настройка компонентов
    setup_backend
    setup_frontend
    
    echo ""
    info "Запуск серверов..."
    
    # Запуск серверов
    start_backend
    start_frontend
    
    echo ""
    echo "=========================================="
    success "Приложение запущено!"
    echo "=========================================="
    echo ""
    echo "  🌐 Frontend:  http://localhost:$FRONTEND_PORT"
    echo "  🔧 Backend:   http://localhost:$BACKEND_PORT"
    echo "  📚 API Docs:  http://localhost:$BACKEND_PORT/docs"
    echo ""
    echo "  Логи бэкенда:  /tmp/neurooil_backend.log"
    echo "  Логи фронтенда: /tmp/neurooil_frontend.log"
    echo ""
    echo "  Для остановки нажмите Ctrl+C"
    echo "=========================================="
    echo ""
    
    # Открываем браузер (опционально)
    if command -v xdg-open &> /dev/null; then
        sleep 2
        xdg-open "http://localhost:$FRONTEND_PORT" 2>/dev/null || true
    elif command -v open &> /dev/null; then
        sleep 2
        open "http://localhost:$FRONTEND_PORT" 2>/dev/null || true
    fi
    
    # Ждем завершения
    wait
}

# Запуск
main

