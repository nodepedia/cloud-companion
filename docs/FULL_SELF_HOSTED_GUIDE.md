# Full Self-Hosted Deployment Guide

Panduan lengkap untuk deploy **Frontend + Backend (Edge Functions) + Database** di server sendiri.

---

## Arsitektur

```
┌─────────────────────────────────────────────────────────────┐
│                      YOUR SERVER                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Nginx     │───▶│  Frontend   │    │  Supabase   │     │
│  │  (Reverse   │    │  (Docker)   │    │  (Docker)   │     │
│  │   Proxy)    │───▶│             │    │             │     │
│  └─────────────┘    └─────────────┘    ├─────────────┤     │
│        │                               │ - Postgres  │     │
│        │            ┌─────────────┐    │ - Auth      │     │
│        └───────────▶│   Edge      │    │ - Storage   │     │
│                     │  Functions  │───▶│ - Realtime  │     │
│                     │   (Deno)    │    │ - Kong API  │     │
│                     └─────────────┘    └─────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

- Ubuntu 20.04+ atau Debian 11+
- Minimal 4GB RAM, 2 CPU cores
- Domain name (opsional tapi recommended)
- Docker & Docker Compose installed

---

## Step 1: Install Docker

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

---

## Step 2: Setup Supabase Self-Hosted

### 2.1 Clone Supabase Docker

```bash
cd /opt
sudo git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
```

### 2.2 Penjelasan Semua Keys & Secrets

Sebelum konfigurasi, pahami dulu setiap credential yang dibutuhkan:

| Key/Secret | Sumber | Penjelasan |
|------------|--------|------------|
| `JWT_SECRET` | 🔧 **Generate sendiri** | String random minimal 32 karakter. Digunakan untuk sign/verify JWT tokens. |
| `ANON_KEY` | 🔧 **Generate dari JWT_SECRET** | JWT token dengan role "anon". Digunakan frontend untuk akses API publik. |
| `SERVICE_ROLE_KEY` | 🔧 **Generate dari JWT_SECRET** | JWT token dengan role "service_role". Bypass RLS, hanya untuk backend/server. |
| `POSTGRES_PASSWORD` | 🔧 **Generate sendiri** | Password database PostgreSQL. Buat password yang kuat. |
| `DASHBOARD_USERNAME` | ✏️ **Tentukan sendiri** | Username untuk login ke Supabase Studio. Biasanya "admin". |
| `DASHBOARD_PASSWORD` | 🔧 **Generate sendiri** | Password untuk login ke Supabase Studio. |
| `SITE_URL` | ✏️ **Tentukan sendiri** | URL frontend aplikasi kamu (domain atau IP). |
| `API_EXTERNAL_URL` | ✏️ **Tentukan sendiri** | URL API Supabase (biasanya subdomain api.). |
| `DIGITALOCEAN_API_KEY` | 📥 **Dari DigitalOcean** | Ambil dari: DigitalOcean Dashboard → API → Generate New Token |

**Legenda:**
- 🔧 = Generate sendiri (random/script)
- ✏️ = Tentukan sendiri (sesuai kebutuhan)
- 📥 = Ambil dari service eksternal

---

### 2.3 Generate JWT Keys

Ada 2 cara untuk generate JWT keys:

#### Cara 1: Via Website (Recommended untuk pemula)

1. Buka: https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys
2. Masukkan JWT Secret (buat sendiri, minimal 32 karakter random)
3. Copy ANON_KEY dan SERVICE_ROLE_KEY yang di-generate

#### Cara 2: Via Command Line

```bash
# Install Node.js jika belum ada
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install jwt-cli
sudo npm install -g jwt-cli

# STEP 1: Generate JWT_SECRET (random 32+ karakter)
# Jalankan command ini untuk generate random string:
JWT_SECRET=$(openssl rand -base64 32)
echo "JWT_SECRET: $JWT_SECRET"
# ⚠️ SIMPAN INI! Jangan sampai hilang!

# STEP 2: Generate ANON_KEY dari JWT_SECRET
ANON_KEY=$(jwt encode --secret "$JWT_SECRET" '{"role":"anon","iss":"supabase","iat":1700000000,"exp":2000000000}')
echo "ANON_KEY: $ANON_KEY"

# STEP 3: Generate SERVICE_ROLE_KEY dari JWT_SECRET
SERVICE_ROLE_KEY=$(jwt encode --secret "$JWT_SECRET" '{"role":"service_role","iss":"supabase","iat":1700000000,"exp":2000000000}')
echo "SERVICE_ROLE_KEY: $SERVICE_ROLE_KEY"
```

**⚠️ PENTING:** 
- `JWT_SECRET` adalah "master key" - ANON_KEY dan SERVICE_ROLE_KEY di-generate DARI JWT_SECRET
- Jika JWT_SECRET berubah, semua token lama akan invalid
- Simpan ketiga key ini di tempat aman!

---

### 2.4 Generate Password Lainnya

```bash
# Generate POSTGRES_PASSWORD (password database)
POSTGRES_PASSWORD=$(openssl rand -base64 24)
echo "POSTGRES_PASSWORD: $POSTGRES_PASSWORD"

# Generate DASHBOARD_PASSWORD (password Supabase Studio)
DASHBOARD_PASSWORD=$(openssl rand -base64 16)
echo "DASHBOARD_PASSWORD: $DASHBOARD_PASSWORD"
```

**Atau buat manual:** Gunakan password manager untuk generate password yang kuat.

---

### 2.5 Configure Environment

```bash
cp .env.example .env
nano .env
```

Edit `.env` - **setiap baris ada penjelasan sumbernya:**

```env
############
# SECRETS - Semua di-generate sendiri
############

# 🔧 Generate: openssl rand -base64 24
# Password untuk database PostgreSQL
POSTGRES_PASSWORD=paste_hasil_generate_disini

# 🔧 Generate: openssl rand -base64 32 (minimal 32 karakter)
# Master key untuk sign JWT tokens
JWT_SECRET=paste_hasil_generate_disini

# 🔧 Generate dari JWT_SECRET (lihat Step 2.3)
# Token untuk frontend (akses API publik)
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...paste_lengkap

# 🔧 Generate dari JWT_SECRET (lihat Step 2.3)
# Token untuk backend (bypass RLS) - JANGAN expose ke frontend!
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...paste_lengkap

# ✏️ Tentukan sendiri - username untuk login Studio
DASHBOARD_USERNAME=admin

# 🔧 Generate: openssl rand -base64 16
# Password untuk login ke Supabase Studio
DASHBOARD_PASSWORD=paste_hasil_generate_disini

############
# DATABASE - Biarkan default
############
POSTGRES_HOST=db
POSTGRES_DB=postgres
POSTGRES_PORT=5432

############
# API URLs - Sesuaikan dengan domain/IP kamu
############

# ✏️ URL frontend aplikasi
# Contoh dengan domain: https://myapp.com
# Contoh dengan IP: http://138.197.222.11:3001
SITE_URL=http://YOUR_SERVER_IP:3001

# ✏️ URL API Supabase (Kong gateway)
# Contoh dengan domain: https://api.myapp.com
# Contoh dengan IP: http://138.197.222.11:8000
API_EXTERNAL_URL=http://YOUR_SERVER_IP:8000

############
# STUDIO - Pengaturan dashboard admin
############
STUDIO_DEFAULT_ORGANIZATION=My Organization
STUDIO_DEFAULT_PROJECT=My Project
STUDIO_PORT=3000

############
# KONG API GATEWAY - Biarkan default
############
KONG_HTTP_PORT=8000
KONG_HTTPS_PORT=8443

############
# OPTIONAL
############
TELEMETRY_ENABLED=false
```

---

### 2.6 Simpan Semua Credentials

Buat file untuk menyimpan semua credentials:

```bash
cat > /opt/credentials.txt << EOF
===========================================
SUPABASE SELF-HOSTED CREDENTIALS
Generated: $(date)
===========================================

DATABASE
---------
POSTGRES_PASSWORD: $POSTGRES_PASSWORD

JWT KEYS
--------
JWT_SECRET: $JWT_SECRET
ANON_KEY: $ANON_KEY
SERVICE_ROLE_KEY: $SERVICE_ROLE_KEY

DASHBOARD
---------
DASHBOARD_USERNAME: admin
DASHBOARD_PASSWORD: $DASHBOARD_PASSWORD
Studio URL: http://YOUR_SERVER_IP:3000

API
---
API URL: http://YOUR_SERVER_IP:8000
Frontend URL: http://YOUR_SERVER_IP:3001

===========================================
⚠️ SIMPAN FILE INI DI TEMPAT AMAN!
⚠️ JANGAN COMMIT KE GIT!
===========================================
EOF

# Set permission agar hanya owner yang bisa baca
chmod 600 /opt/credentials.txt

echo "Credentials saved to /opt/credentials.txt"
```

### 2.4 Start Supabase

```bash
# Pull images
docker compose pull

# Start services
docker compose up -d

# Check status (tunggu 2-3 menit)
docker compose ps
```

### 2.5 Verify Supabase

```bash
# Supabase Studio
curl http://localhost:3000

# Supabase API
curl http://localhost:8000/rest/v1/ \
  -H "apikey: YOUR_ANON_KEY"
```

---

## Step 3: Migrate Database dari Supabase Cloud

### 3.1 Export dari Supabase Cloud

```bash
# Install pg tools jika belum ada
sudo apt install postgresql-client -y

# Export schema dan data dari Supabase Cloud
pg_dump "postgresql://postgres.hmxhuemjueznudjigozo:YOUR_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres" \
  --schema=public \
  --no-owner \
  --no-privileges \
  -f /tmp/supabase_backup.sql

# Atau export hanya schema (tanpa data)
pg_dump "postgresql://postgres.hmxhuemjueznudjigozo:YOUR_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres" \
  --schema=public \
  --schema-only \
  --no-owner \
  -f /tmp/supabase_schema.sql
```

> **Note**: Password database bisa dilihat di Supabase Dashboard → Settings → Database

### 3.2 Import ke Self-Hosted

```bash
# Import ke self-hosted Supabase
docker exec -i supabase-db psql -U postgres -d postgres < /tmp/supabase_backup.sql
```

### 3.3 Recreate Functions & Triggers

Jalankan SQL berikut di Supabase Studio (`http://YOUR_IP:3000`):

```sql
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Create handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'username', NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Other functions...
-- (copy dari Supabase Cloud SQL Editor)
```

---

## Step 4: Deploy Edge Functions

### 4.1 Create Edge Functions Directory

```bash
mkdir -p /opt/edge-functions
cd /opt/edge-functions
```

### 4.2 Copy Edge Functions dari Repo

Copy file-file dari `supabase/functions/` ke server:

```bash
# Structure should be:
# /opt/edge-functions/
# ├── digitalocean/
# │   └── index.ts
# ├── auto-destroy-droplets/
# │   └── index.ts
# └── delete-user/
#     └── index.ts
```

### 4.3 Create Docker Compose untuk Edge Functions

```bash
cat > /opt/edge-functions/docker-compose.yml << 'EOF'
version: '3.8'

services:
  edge-functions:
    image: denoland/deno:latest
    restart: always
    ports:
      - "8001:8000"
    environment:
      - SUPABASE_URL=http://kong:8000
      - SUPABASE_ANON_KEY=${ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
      - DIGITALOCEAN_API_KEY=${DIGITALOCEAN_API_KEY}
    volumes:
      - ./:/app
    command: >
      run --allow-net --allow-env --allow-read 
      /app/serve.ts
    networks:
      - supabase_default

networks:
  supabase_default:
    external: true
EOF
```

### 4.4 Create Edge Function Server

```bash
cat > /opt/edge-functions/serve.ts << 'EOF'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  const url = new URL(req.url);
  const path = url.pathname;

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Route to appropriate function
    if (path.startsWith('/digitalocean')) {
      const mod = await import('./digitalocean/index.ts');
      return mod.default(req);
    }
    
    if (path.startsWith('/auto-destroy-droplets')) {
      const mod = await import('./auto-destroy-droplets/index.ts');
      return mod.default(req);
    }
    
    if (path.startsWith('/delete-user')) {
      const mod = await import('./delete-user/index.ts');
      return mod.default(req);
    }

    return new Response('Not Found', { status: 404 });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}, { port: 8000 });
EOF
```

### 4.5 Create .env untuk Edge Functions

```bash
cat > /opt/edge-functions/.env << 'EOF'
ANON_KEY=your-anon-key
SERVICE_ROLE_KEY=your-service-role-key
DIGITALOCEAN_API_KEY=your-digitalocean-api-key
EOF
```

### 4.6 Start Edge Functions

```bash
cd /opt/edge-functions
docker-compose up -d
```

---

## Step 5: Deploy Frontend

### 5.1 Clone Repository

```bash
mkdir -p /opt/frontend
cd /opt/frontend

# Clone dari GitHub (jika sudah connected)
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .

# Atau upload manual via SFTP
```

### 5.2 Update Supabase Client

Edit `src/integrations/supabase/client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Ganti dengan self-hosted Supabase URL
const SUPABASE_URL = "http://YOUR_SERVER_IP:8000";
const SUPABASE_PUBLISHABLE_KEY = "YOUR_SELF_HOSTED_ANON_KEY";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

### 5.3 Build Frontend

```bash
# Install dependencies
npm install

# Build
npm run build
```

### 5.4 Create Dockerfile

```bash
cat > /opt/frontend/Dockerfile << 'EOF'
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF
```

### 5.5 Create Nginx Config

```bash
cat > /opt/frontend/nginx.conf << 'EOF'
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Handle SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
EOF
```

### 5.6 Create Docker Compose

```bash
cat > /opt/frontend/docker-compose.yml << 'EOF'
version: '3.8'

services:
  frontend:
    build: .
    restart: always
    ports:
      - "3001:80"
EOF
```

### 5.7 Start Frontend

```bash
cd /opt/frontend
docker-compose up -d --build
```

---

## Step 6: Setup Nginx Reverse Proxy

### 6.1 Install Nginx

```bash
sudo apt install nginx -y
```

### 6.2 Create Site Config

```bash
sudo nano /etc/nginx/sites-available/app
```

```nginx
# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Supabase API
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

# Supabase Studio
server {
    listen 80;
    server_name studio.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}

# Edge Functions
server {
    listen 80;
    server_name functions.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
```

### 6.3 Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 7: Setup SSL (Optional but Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificates
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com -d studio.yourdomain.com -d functions.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

---

## Step 8: Management Scripts

### 8.1 Start All Services

```bash
cat > /opt/start-all.sh << 'EOF'
#!/bin/bash
echo "Starting Supabase..."
cd /opt/supabase/docker && docker-compose up -d

echo "Starting Edge Functions..."
cd /opt/edge-functions && docker-compose up -d

echo "Starting Frontend..."
cd /opt/frontend && docker-compose up -d

echo "All services started!"
docker ps
EOF
chmod +x /opt/start-all.sh
```

### 8.2 Stop All Services

```bash
cat > /opt/stop-all.sh << 'EOF'
#!/bin/bash
echo "Stopping all services..."
cd /opt/frontend && docker-compose down
cd /opt/edge-functions && docker-compose down
cd /opt/supabase/docker && docker-compose down
echo "All services stopped!"
EOF
chmod +x /opt/stop-all.sh
```

### 8.3 View Logs

```bash
cat > /opt/logs.sh << 'EOF'
#!/bin/bash
case $1 in
  supabase)
    cd /opt/supabase/docker && docker-compose logs -f
    ;;
  frontend)
    cd /opt/frontend && docker-compose logs -f
    ;;
  functions)
    cd /opt/edge-functions && docker-compose logs -f
    ;;
  *)
    echo "Usage: ./logs.sh [supabase|frontend|functions]"
    ;;
esac
EOF
chmod +x /opt/logs.sh
```

### 8.4 Backup Database

```bash
cat > /opt/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

docker exec supabase-db pg_dump -U postgres postgres > "$BACKUP_DIR/backup_$TIMESTAMP.sql"

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete

echo "Backup saved to: $BACKUP_DIR/backup_$TIMESTAMP.sql"
EOF
chmod +x /opt/backup-db.sh
```

---

## Port Summary

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3001 | http://yourdomain.com |
| Supabase API (Kong) | 8000 | http://api.yourdomain.com |
| Supabase Studio | 3000 | http://studio.yourdomain.com |
| Edge Functions | 8001 | http://functions.yourdomain.com |
| PostgreSQL | 5432 | Internal only |

---

## Troubleshooting

### Check Service Status
```bash
docker ps
```

### View Logs
```bash
# Supabase
cd /opt/supabase/docker && docker-compose logs -f

# Frontend
cd /opt/frontend && docker-compose logs -f
```

### Restart Services
```bash
cd /opt/supabase/docker && docker-compose restart
```

### Database Connection
```bash
docker exec -it supabase-db psql -U postgres -d postgres
```

---

## Update Workflow

Setelah edit code di Lovable:

1. **Pull latest code**
   ```bash
   cd /opt/frontend
   git pull origin main
   ```

2. **Rebuild & restart**
   ```bash
   npm install
   npm run build
   docker-compose up -d --build
   ```

3. **Update database** (jika ada migration)
   - Buka Supabase Studio: `http://studio.yourdomain.com`
   - Jalankan SQL migration secara manual

---

## Security Checklist

- [ ] Ganti semua default passwords
- [ ] Setup firewall (UFW)
- [ ] Enable SSL certificates
- [ ] Restrict Supabase Studio access (IP whitelist atau auth)
- [ ] Regular database backups
- [ ] Monitor disk usage
