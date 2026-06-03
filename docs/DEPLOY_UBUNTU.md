# Ubuntu Deployment

This repo is set up to run as:

- Frontend: static Vite build from `frontend/dist`
- Backend: Node/Express app from `backend/dist/server.js`
- App path: `/crm/`
- API path: `/crm/api/v1`

If you prefer a one-shot version, use [`scripts/deploy-ubuntu.sh`](/c:/Users/ramak/Music/CRM/scripts/deploy-ubuntu.sh).

## Recommended Layout

- App directory: `/opt/nexuscrm`
- Backend port: `5000`
- Public site: `https://your-domain.com`

## 1) Install Dependencies

```bash
sudo apt update
sudo apt install -y git nginx postgresql postgresql-contrib

# Install Node.js 20+ however you prefer, for example via NodeSource or nvm.
```

## 2) Clone The Repo

```bash
sudo mkdir -p /opt/nexuscrm
sudo chown -R $USER:$USER /opt/nexuscrm
git clone <your-repo-url> /opt/nexuscrm
cd /opt/nexuscrm
```

## 3) Backend Environment

Create `/opt/nexuscrm/backend/.env`:

```env
NODE_ENV=production
PORT=5000
CLIENT_URL=http://154.61.69.158/crm

DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/crm_db?schema=public"

JWT_ACCESS_SECRET=replace-with-a-long-random-secret
JWT_REFRESH_SECRET=replace-with-a-long-random-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 4) Build Backend

```bash
cd /opt/nexuscrm/backend
npm ci
npx prisma generate
npm run build
```

If you need database tables and seed data:

```bash
npx prisma migrate deploy
npm run prisma:seed
```

## 5) Build Frontend

The frontend is already configured to use same-origin API routing with `/crm/api/v1`.

Create `/opt/nexuscrm/frontend/.env.production`:

```env
VITE_BASE=/crm/
VITE_API_URL=/crm/api/v1
```

```bash
cd /opt/nexuscrm/frontend
npm ci
npm run build
```

## 6) Run The Backend With systemd

Create `/etc/systemd/system/nexuscrm-backend.service`:

```ini
[Unit]
Description=NexusCRM Backend
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/nexuscrm/backend
EnvironmentFile=/opt/nexuscrm/backend/.env
ExecStart=/usr/bin/node /opt/nexuscrm/backend/dist/server.js
Restart=always
RestartSec=5
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
```

Then enable it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now nexuscrm-backend
sudo systemctl status nexuscrm-backend
```

## 7) Nginx Reverse Proxy

Create an Nginx site config such as `/etc/nginx/sites-available/nexuscrm`:

```nginx
server {
    listen 80;
    server_name 154.61.69.158;

    location = /crm {
        return 301 /crm/;
    }

    location /crm/api/v1/ {
        proxy_pass http://127.0.0.1:5000/api/v1/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /crm/ {
        alias /opt/nexuscrm/frontend/dist/;
        try_files $uri $uri/ /crm/index.html;
    }

    location /health {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/nexuscrm /etc/nginx/sites-enabled/nexuscrm
sudo nginx -t
sudo systemctl reload nginx
```

## 8) HTTPS

If you want TLS, run Certbot after the site is working over HTTP:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Notes

- The frontend defaults to `/crm/api/v1` in production, so it works cleanly behind the same path.
- If you want a separate API subdomain, set `VITE_API_URL` during frontend build and tighten CORS in the backend.
- Keep `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` unique and long.
