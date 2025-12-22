#!/usr/bin/env bash
set -euo pipefail

### ==== НАСТРОЙКИ ==== ###
# Пользователь, от имени которого будет работать приложение (обычно твой ssh-пользователь)
APP_USER="${APP_USER:-$USER}"

# Домашняя директория пользователя
APP_HOME="${APP_HOME:-/home/$APP_USER}"

# Директория, куда клонируем репозиторий
APP_DIR="${APP_DIR:-$APP_HOME/NeuroOil}"

# URL репозитория
REPO_URL="${REPO_URL:-https://github.com/YellowCytrus/NeuroOil.git}"

# Домен или IP сервера (используется в nginx-конфиге)
DOMAIN_OR_IP="${DOMAIN_OR_IP:-your-domain-or-ip}"

# Порт, на котором будет слушать FastAPI
BACKEND_PORT="${BACKEND_PORT:-8000}"

### ===================== ###

echo "==> Обновление индекса пакетов"
sudo apt update

echo "==> Установка базовых пакетов (git, python, nginx)"
sudo DEBIAN_FRONTEND=noninteractive apt install -y \
  git python3 python3-venv python3-pip \
  nginx

# Node.js и npm ставим только если их нет,
# чтобы не ломать уже существующую установку/версию
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "==> Node.js / npm не найдены, устанавливаю из репозитория Ubuntu"
  sudo DEBIAN_FRONTEND=noninteractive apt install -y nodejs npm
else
  echo "==> Node.js и npm уже установлены, пропускаю их установку"
  node -v || true
  npm -v || true
fi

echo "==> Создание пользователя и директорий (если нужно)"
if ! id "$APP_USER" >/dev/null 2>&1; then
  echo "Пользователь $APP_USER не найден, создаю..."
  sudo adduser --disabled-password --gecos "" "$APP_USER"
fi

sudo mkdir -p "$APP_HOME"
sudo chown -R "$APP_USER:$APP_USER" "$APP_HOME"

echo "==> Клонирование репозитория в $APP_DIR"
if [ ! -d "$APP_DIR/.git" ]; then
  sudo -u "$APP_USER" git clone "$REPO_URL" "$APP_DIR"
else
  echo "Репозиторий уже существует, обновляю..."
  sudo -u "$APP_USER" git -C "$APP_DIR" pull --ff-only
fi

### БЭКЕНД (FastAPI) ###

echo "==> Настройка backend (FastAPI)"
BACKEND_DIR="$APP_DIR/backend"

# venv
if [ ! -d "$BACKEND_DIR/.venv" ]; then
  echo "Создаю виртуальное окружение..."
  sudo -u "$APP_USER" python3 -m venv "$BACKEND_DIR/.venv"
fi

echo "==> Установка python-зависимостей"
sudo -u "$APP_USER" bash -lc "source '$BACKEND_DIR/.venv/bin/activate' && pip install --upgrade pip && pip install -r '$BACKEND_DIR/requirements.txt'"

### ФРОНТЕНД (Vite/React) ###

echo "==> Сборка frontend"
FRONTEND_DIR="$APP_DIR/frontend"
sudo -u "$APP_USER" bash -lc "
  cd '$FRONTEND_DIR' && \
  rm -rf dist node_modules/.vite && \
  npm install && \
  npm run build
"

# Папка со статикой
FRONTEND_DIST="$FRONTEND_DIR/dist"

### SYSTEMD-СЕРВИС ДЛЯ BACKEND ###

echo "==> Создание systemd-сервиса neurooil-backend.service"

SERVICE_FILE="/etc/systemd/system/neurooil-backend.service"

sudo bash -c "cat > '$SERVICE_FILE' <<EOF
[Unit]
Description=NeuroOil FastAPI backend
After=network.target

[Service]
User=$APP_USER
WorkingDirectory=$BACKEND_DIR
Environment=\"PATH=$BACKEND_DIR/.venv/bin\"
ExecStart=$BACKEND_DIR/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port $BACKEND_PORT
Restart=always

[Install]
WantedBy=multi-user.target
EOF
"

echo "==> Перезапуск systemd и запуск сервиса"
sudo systemctl daemon-reload
sudo systemctl enable --now neurooil-backend.service

echo "==> Проверка статуса backend-сервиса:"
sudo systemctl status neurooil-backend.service --no-pager || true

### NGINX КОНФИГ ###

NGINX_SITE="/etc/nginx/sites-available/neurooil"

echo "==> Создание nginx-конфига $NGINX_SITE"

# Создаем временный файл с правильным экранированием
TMP_NGINX=$(mktemp)
cat > "$TMP_NGINX" <<EOF
server {
    listen 80;
    server_name $DOMAIN_OR_IP;

    root $FRONTEND_DIST;
    index index.html;

    # SPA-роутинг
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Проксирование API на FastAPI
    location /api/ {
        proxy_pass http://127.0.0.1:$BACKEND_PORT/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

sudo mv "$TMP_NGINX" "$NGINX_SITE"
sudo chmod 644 "$NGINX_SITE"

echo "==> Активация сайта в nginx"
sudo ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/neurooil

# Стандартный default-сайт можно отключить при желании
if [ -f /etc/nginx/sites-enabled/default ]; then
  sudo rm /etc/nginx/sites-enabled/default
fi

echo "==> Проверка конфига nginx"
sudo nginx -t

echo "==> Перезапуск nginx"
sudo systemctl restart nginx

### UFW (если используется) ###

if command -v ufw >/dev/null 2>&1; then
  echo "==> Настройка UFW (файрволл) — открываю HTTP(80)"
  sudo ufw allow 'Nginx Full' || true
fi

echo "=========================================="
echo "Готово!"
echo "Backend слушает на 127.0.0.1:$BACKEND_PORT (через systemd-сервис neurooil-backend)"
echo "Фронтенд отдаётся nginx из $FRONTEND_DIST"
echo "Открой в браузере: http://$DOMAIN_OR_IP/"
echo "Если домен ещё не привязан — используй IP сервера."
echo "=========================================="