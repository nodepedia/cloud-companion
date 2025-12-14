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

## 3. Deploy Supabase Self-Hosted

### Opsi A: Via Coolify One-Click (Recommended)

1. Di Coolify Dashboard → **Projects** → **New Project**
2. Pilih **New Resource** → **Docker Compose**
3. Gunakan Supabase Docker Compose dari repository resmi

### Opsi B: Manual Docker Compose

#### Step 1: Clone Supabase Repository

```bash
# Di server
cd /opt
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
```

#### Step 2: Generate Secrets

```bash
# Generate random secrets
JWT_SECRET=$(openssl rand -base64 32)
ANON_KEY=$(openssl rand -base64 32)
SERVICE_ROLE_KEY=$(openssl rand -base64 32)
POSTGRES_PASSWORD=$(openssl rand -base64 24)
DASHBOARD_PASSWORD=$(openssl rand -base64 16)

# Save to file for reference
cat > /opt/supabase-secrets.txt << EOF
JWT_SECRET=$JWT_SECRET
ANON_KEY=$ANON_KEY
SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
DASHBOARD_PASSWORD=$DASHBOARD_PASSWORD
EOF

echo "Secrets saved to /opt/supabase-secrets.txt"
```

#### Step 3: Generate Proper JWT Keys

```bash
# Install jwt-cli atau gunakan script ini
npm install -g jwt-cli

# Generate ANON_KEY
jwt encode \
  --secret "$JWT_SECRET" \
  '{"role":"anon","iss":"supabase","iat":1700000000,"exp":2000000000}'

# Generate SERVICE_ROLE_KEY  
jwt encode \
  --secret "$JWT_SECRET" \
  '{"role":"service_role","iss":"supabase","iat":1700000000,"exp":2000000000}'
```

**Atau gunakan website**: https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys

#### Step 4: Create .env File

```bash
cp .env.example .env
nano .env
```

Edit file `.env`:

```env
############
# Secrets
############
POSTGRES_PASSWORD=your_postgres_password_here
JWT_SECRET=your_jwt_secret_here
ANON_KEY=your_generated_anon_key_here
SERVICE_ROLE_KEY=your_generated_service_role_key_here

############
# Database
############
POSTGRES_HOST=db
POSTGRES_DB=postgres
POSTGRES_PORT=5432

############
# API
############
SITE_URL=https://your-domain.com
API_EXTERNAL_URL=https://api.your-domain.com

############
# Studio
############
STUDIO_DEFAULT_ORGANIZATION=My Organization
STUDIO_DEFAULT_PROJECT=My Project
STUDIO_PORT=3000
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=your_dashboard_password

############
# Kong
############
KONG_HTTP_PORT=8000
KONG_HTTPS_PORT=8443
```

#### Step 5: Start Supabase

```bash
# Pull images
docker compose pull

# Start services
docker compose up -d

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
