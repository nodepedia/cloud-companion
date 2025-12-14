# Panduan Lengkap Deploy dengan Coolify

## 📋 Daftar Isi
1. [Persiapan Server](#1-persiapan-server)
2. [Install Coolify](#2-install-coolify)
3. [Deploy Supabase Self-Hosted](#3-deploy-supabase-self-hosted)
4. [Deploy Frontend](#4-deploy-frontend)
5. [Konfigurasi Environment](#5-konfigurasi-environment)
6. [Setup Domain & SSL](#6-setup-domain--ssl)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Persiapan Server

### Minimum Requirements
- **OS**: Ubuntu 22.04 LTS (recommended)
- **RAM**: 4GB minimum (8GB recommended untuk Supabase)
- **Storage**: 40GB SSD
- **CPU**: 2 vCPU minimum

### Initial Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl git htop

# Setup firewall
sudo ufw allow 22      # SSH
sudo ufw allow 80      # HTTP
sudo ufw allow 443     # HTTPS
sudo ufw allow 8000    # Coolify Dashboard
sudo ufw enable
```

---

## 2. Install Coolify

### One-Command Installation

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

### Post-Installation
1. Akses dashboard: `http://YOUR_SERVER_IP:8000`
2. Buat akun admin pertama
3. Setup SSH key untuk deployment

### Verifikasi Installation

```bash
# Check Coolify status
docker ps | grep coolify

# Check logs jika ada masalah
docker logs coolify
```

---

## 3. Deploy Supabase via Coolify One-Click

### Langkah 1: Buka Coolify Dashboard
```
https://your-server-ip:8000
```

### Langkah 2: Tambah Project Baru
1. Klik **"Projects"** di sidebar
2. Klik **"+ Add"** untuk buat project baru
3. Beri nama project (misal: "My App")

### Langkah 3: Tambah Environment
1. Di dalam project, klik **"+ Add"** untuk tambah environment
2. Pilih **"Production"** atau nama lain

### Langkah 4: Deploy Supabase
1. Klik **"+ New"** di environment
2. Pilih **"Services"** → cari **"Supabase"**
3. Klik **"Supabase"** untuk deploy

### Langkah 5: Konfigurasi Supabase
Coolify akan otomatis generate secrets, tapi kamu perlu:

1. **Set Domain** (opsional tapi recommended):
   - Klik service Supabase
   - Masuk ke **"Domains"** tab
   - Set domain untuk:
     - **Kong (API)**: `api.yourdomain.com`
     - **Studio**: `studio.yourdomain.com`

2. **Catat Credentials**:
   Setelah deploy, buka **"Environment Variables"** tab dan catat:
   ```
   ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
   SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
   POSTGRES_PASSWORD=your-db-password
   JWT_SECRET=your-jwt-secret
   ```

3. **Start Service**:
   - Klik **"Deploy"** atau **"Start"**
   - Tunggu semua container running (biasanya 2-5 menit)

### Langkah 6: Verifikasi
```bash
# Cek semua container running
docker ps | grep supabase

# Akses Supabase Studio
https://studio.yourdomain.com
# atau
http://your-server-ip:3000
```

### Langkah 7: Dapatkan API URL
Setelah deploy, URL Supabase kamu adalah:
```
# API URL (untuk frontend)
https://api.yourdomain.com
# atau jika belum setup domain:
http://your-server-ip:8000

# Studio URL (untuk manage database)
https://studio.yourdomain.com
# atau
http://your-server-ip:3000
```

# Check status
docker compose ps
```

#### Step 6: Verify Supabase is Running

```bash
# Check all containers
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Test API
curl http://localhost:8000/rest/v1/ -H "apikey: YOUR_ANON_KEY"

# Check logs
docker compose logs -f kong
```

---

## 4. Deploy Frontend

### Step 1: Connect GitHub Repository

1. Di Coolify Dashboard → **Projects** → **New Project**
2. Pilih **New Resource** → **Public Repository** atau **GitHub**
3. Masukkan URL repository: `https://github.com/YOUR_USERNAME/YOUR_REPO`

### Step 2: Configure Build Settings

Di Coolify:
- **Build Pack**: Nixpacks (auto-detect) atau Static
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- **Install Command**: `npm install`

### Step 3: Add Environment Variables

Di Coolify → Resource → **Environment Variables**:

```env
VITE_SUPABASE_URL=https://api.your-domain.com
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Step 4: Create Dockerfile (Optional - untuk kontrol lebih)

Jika tidak menggunakan Nixpacks, buat `Dockerfile`:

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Step 5: Create nginx.conf

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

---

## 5. Konfigurasi Environment

### Update Frontend untuk Self-Hosted Supabase

Edit `src/integrations/supabase/client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Gunakan environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://api.your-domain.com";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "your_anon_key";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

### Environment Variables di Coolify

| Variable | Deskripsi | Contoh |
|----------|-----------|--------|
| `VITE_SUPABASE_URL` | URL Supabase API | `https://api.yourdomain.com` |
| `VITE_SUPABASE_ANON_KEY` | Anon Key | `eyJhbGciOiJI...` |

---

## 6. Setup Domain & SSL

### Konfigurasi DNS

Tambahkan DNS records:

| Type | Name | Value |
|------|------|-------|
| A | @ | YOUR_SERVER_IP |
| A | api | YOUR_SERVER_IP |
| A | studio | YOUR_SERVER_IP |

### Setup di Coolify

1. Resource → **Settings** → **Domain**
2. Masukkan domain: `yourdomain.com`
3. Enable **HTTPS** (Coolify auto-generate SSL via Let's Encrypt)

### Nginx Reverse Proxy (jika manual)

```nginx
# /etc/nginx/sites-available/supabase

# API (Kong)
server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Studio
server {
    listen 80;
    server_name studio.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Frontend
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

Enable site dan SSL:

```bash
sudo ln -s /etc/nginx/sites-available/supabase /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Install SSL
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com -d studio.yourdomain.com
```

---

## 7. Troubleshooting

### Common Issues

#### Container tidak start
```bash
# Check logs
docker compose logs -f [service_name]

# Restart specific service
docker compose restart [service_name]

# Restart all
docker compose down && docker compose up -d
```

#### Database connection error
```bash
# Check if postgres is running
docker exec -it supabase-db psql -U postgres -c "SELECT 1"

# Check connection from other container
docker exec -it supabase-kong ping db
```

#### CORS errors di frontend
Pastikan `SITE_URL` dan `API_EXTERNAL_URL` di `.env` sudah benar.

#### JWT errors
```bash
# Verify JWT secret matches
docker exec supabase-auth env | grep JWT
docker exec supabase-kong env | grep JWT

# Regenerate keys if needed
# Pastikan menggunakan JWT_SECRET yang sama untuk generate ANON_KEY dan SERVICE_ROLE_KEY
```

### Useful Commands

```bash
# View all logs
docker compose logs -f

# Check resource usage
docker stats

# Backup database
docker exec supabase-db pg_dump -U postgres > backup.sql

# Restore database
docker exec -i supabase-db psql -U postgres < backup.sql

# Update Supabase
cd /opt/supabase/docker
git pull
docker compose pull
docker compose up -d
```

---

## 📝 Checklist Deployment

- [ ] Server ready dengan minimum requirements
- [ ] Coolify terinstall dan accessible
- [ ] Supabase containers running
- [ ] JWT keys generated dengan benar
- [ ] Frontend deployed dan connected ke Supabase
- [ ] DNS configured
- [ ] SSL certificates installed
- [ ] Environment variables set
- [ ] Tested login/signup flow
- [ ] Database accessible dari frontend

---

## 🔗 Resources

- [Coolify Documentation](https://coolify.io/docs)
- [Supabase Self-Hosting Guide](https://supabase.com/docs/guides/self-hosting)
- [Supabase Docker Repository](https://github.com/supabase/supabase/tree/master/docker)
- [JWT.io - Decode/Encode JWT](https://jwt.io)

---

**Last Updated**: December 2024
