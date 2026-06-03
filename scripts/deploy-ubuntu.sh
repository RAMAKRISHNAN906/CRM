#!/usr/bin/env bash
set -euo pipefail

# Ubuntu deploy script for NexusCRM
# Target path: http://154.61.69.158/crm/
#
# Edit these values before running:
APP_DIR="${APP_DIR:-/opt/nexuscrm}"
REPO_URL="${REPO_URL:-}"
SERVER_NAME="${SERVER_NAME:-154.61.69.158}"
APP_PATH="${APP_PATH:-/crm}"
API_PATH="${API_PATH:-/crm/api/v1}"
BACKEND_PORT="${BACKEND_PORT:-5000}"
CLIENT_URL="${CLIENT_URL:-http://154.61.69.158/crm}"
DATABASE_URL="${DATABASE_URL:-}"
JWT_ACCESS_SECRET="${JWT_ACCESS_SECRET:-}"
JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-}"
SMTP_HOST="${SMTP_HOST:-}"
SMTP_PORT="${SMTP_PORT:-587}"
SMTP_USER="${SMTP_USER:-}"
SMTP_PASS="${SMTP_PASS:-}"
SMTP_FROM="${SMTP_FROM:-}"

if [[ -z "${REPO_URL}" ]]; then
  echo "Set REPO_URL before running this script."
  exit 1
fi

if [[ -z "${DATABASE_URL}" || -z "${JWT_ACCESS_SECRET}" || -z "${JWT_REFRESH_SECRET}" ]]; then
  echo "Set DATABASE_URL, JWT_ACCESS_SECRET, and JWT_REFRESH_SECRET before running this script."
  exit 1
fi

sudo apt update
sudo apt install -y nginx postgresql postgresql-contrib git

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Install Node.js 20+ first, then rerun this script."
  exit 1
fi

sudo mkdir -p "${APP_DIR}"
sudo chown -R "${USER}:${USER}" "${APP_DIR}"

if [[ ! -d "${APP_DIR}/.git" ]]; then
  git clone "${REPO_URL}" "${APP_DIR}"
else
  git -C "${APP_DIR}" pull --ff-only
fi

cd "${APP_DIR}"

mkdir -p backend frontend

cat > backend/.env <<EOF
NODE_ENV=production
PORT=${BACKEND_PORT}
CLIENT_URL=${CLIENT_URL}

DATABASE_URL="${DATABASE_URL}"

JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

SMTP_HOST=${SMTP_HOST}
SMTP_PORT=${SMTP_PORT}
SMTP_USER=${SMTP_USER}
SMTP_PASS=${SMTP_PASS}
SMTP_FROM=${SMTP_FROM}
EOF

cat > frontend/.env.production <<EOF
VITE_BASE=${APP_PATH}/
VITE_API_URL=${API_PATH}
EOF

cd backend
npm ci
npm run prisma:generate
npx prisma migrate deploy
npm run build

sudo tee /etc/systemd/system/nexuscrm-backend.service >/dev/null <<EOF
[Unit]
Description=NexusCRM Backend
After=network.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}/backend
EnvironmentFile=${APP_DIR}/backend/.env
ExecStart=/usr/bin/node ${APP_DIR}/backend/dist/server.js
Restart=always
RestartSec=5
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now nexuscrm-backend

cd "${APP_DIR}/frontend"
npm ci
npm run build

sudo tee /etc/nginx/sites-available/nexuscrm >/dev/null <<EOF
server {
    listen 80;
    server_name ${SERVER_NAME};

    location = ${APP_PATH} {
        return 301 ${APP_PATH}/;
    }

    location ${API_PATH}/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT}/api/v1/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location ${APP_PATH}/ {
        alias ${APP_DIR}/frontend/dist/;
        try_files \$uri \$uri/ ${APP_PATH}/index.html;
    }

    location /health {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/nexuscrm /etc/nginx/sites-enabled/nexuscrm
sudo nginx -t
sudo systemctl reload nginx

echo "Deployment complete."
echo "Frontend: http://${SERVER_NAME}${APP_PATH}/"
echo "API:      http://${SERVER_NAME}${API_PATH}/"
