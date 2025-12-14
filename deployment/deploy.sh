#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "\n${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Jangan jalankan script ini sebagai root. Gunakan user biasa dengan akses sudo."
    exit 1
fi

print_header "🚀 DROPLET MANAGER - DEPLOYMENT SCRIPT"
echo "Script ini akan menginstall dan mengkonfigurasi:"
echo "  - Docker & Docker Compose"
echo "  - Self-hosted Supabase"
echo "  - Frontend Application"
echo "  - Nginx Reverse Proxy dengan SSL"
echo ""

# Gather all required information
print_header "📝 KONFIGURASI - Masukkan informasi yang diperlukan"

# Domain configuration
read -p "Domain utama (contoh: example.com): " DOMAIN
read -p "Subdomain untuk API (default: api): " API_SUBDOMAIN
API_SUBDOMAIN=${API_SUBDOMAIN:-api}

# Database configuration
read -sp "PostgreSQL Password (min 16 karakter): " POSTGRES_PASSWORD
echo ""
if [ ${#POSTGRES_PASSWORD} -lt 16 ]; then
    print_error "Password harus minimal 16 karakter!"
    exit 1
fi

# JWT configuration
read -sp "JWT Secret (min 32 karakter, untuk generate: openssl rand -base64 32): " JWT_SECRET
echo ""
if [ ${#JWT_SECRET} -lt 32 ]; then
    print_error "JWT Secret harus minimal 32 karakter!"
    exit 1
fi

# Dashboard configuration
read -p "Supabase Dashboard Username (default: admin): " DASHBOARD_USERNAME
DASHBOARD_USERNAME=${DASHBOARD_USERNAME:-admin}
read -sp "Supabase Dashboard Password: " DASHBOARD_PASSWORD
echo ""

# DigitalOcean API Key
read -sp "DigitalOcean API Key: " DIGITALOCEAN_API_KEY
echo ""

# Email for SSL
read -p "Email untuk SSL Certificate (Let's Encrypt): " SSL_EMAIL

# Git repository (optional)
read -p "Git Repository URL untuk frontend (kosongkan jika upload manual): " GIT_REPO

# Supabase Cloud backup (optional)
read -p "Apakah ingin restore database dari Supabase Cloud? (y/n): " RESTORE_DB
if [ "$RESTORE_DB" = "y" ]; then
    read -p "Supabase Cloud Database URL (postgresql://...): " SUPABASE_CLOUD_URL
fi

# Confirmation
print_header "📋 KONFIRMASI KONFIGURASI"
echo "Domain: $DOMAIN"
echo "API Subdomain: $API_SUBDOMAIN.$DOMAIN"
echo "Dashboard Username: $DASHBOARD_USERNAME"
echo "SSL Email: $SSL_EMAIL"
echo "Git Repository: ${GIT_REPO:-Manual upload}"
echo "Restore Database: $RESTORE_DB"
echo ""
read -p "Lanjutkan dengan konfigurasi ini? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
    print_error "Deployment dibatalkan."
    exit 1
fi

# Generate API Keys
print_header "🔑 GENERATING API KEYS"

# Generate ANON_KEY
ANON_KEY=$(echo -n '{"role":"anon","iss":"supabase","iat":'$(date +%s)',"exp":'$(($(date +%s) + 315360000))'}' | openssl base64 -A | tr '+/' '-_' | tr -d '=')
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.$(echo -n '{"role":"anon","iss":"supabase","iat":'$(date +%s)',"exp":'$(($(date +%s) + 315360000))'}' | openssl base64 -A | tr '+/' '-_' | tr -d '=').$(echo -n "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.$(echo -n '{"role":"anon","iss":"supabase","iat":'$(date +%s)',"exp":'$(($(date +%s) + 315360000))'}' | openssl base64 -A | tr '+/' '-_' | tr -d '=')$JWT_SECRET" | openssl dgst -sha256 -hmac "$JWT_SECRET" -binary | openssl base64 -A | tr '+/' '-_' | tr -d '=')"

# Generate SERVICE_ROLE_KEY
SERVICE_ROLE_KEY=$(echo -n '{"role":"service_role","iss":"supabase","iat":'$(date +%s)',"exp":'$(($(date +%s) + 315360000))'}' | openssl base64 -A | tr '+/' '-_' | tr -d '=')
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.$(echo -n '{"role":"service_role","iss":"supabase","iat":'$(date +%s)',"exp":'$(($(date +%s) + 315360000))'}' | openssl base64 -A | tr '+/' '-_' | tr -d '=').$(echo -n "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.$(echo -n '{"role":"service_role","iss":"supabase","iat":'$(date +%s)',"exp":'$(($(date +%s) + 315360000))'}' | openssl base64 -A | tr '+/' '-_' | tr -d '=')$JWT_SECRET" | openssl dgst -sha256 -hmac "$JWT_SECRET" -binary | openssl base64 -A | tr '+/' '-_' | tr -d '=')"

print_success "API Keys generated"

# Step 1: Update system and install dependencies
print_header "📦 STEP 1: Installing Dependencies"

sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx certbot python3-certbot-nginx

# Install Docker
if ! command -v docker &> /dev/null; then
    print_warning "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    print_success "Docker installed"
else
    print_success "Docker already installed"
fi

# Install Docker Compose
if ! docker compose version &> /dev/null; then
    sudo apt install -y docker-compose-plugin
    print_success "Docker Compose installed"
else
    print_success "Docker Compose already installed"
fi

# Step 2: Setup Supabase
print_header "🗄️ STEP 2: Setting up Self-hosted Supabase"

sudo mkdir -p /opt/supabase
cd /opt/supabase

if [ ! -d "supabase" ]; then
    sudo git clone --depth 1 https://github.com/supabase/supabase
fi

cd supabase/docker

# Create .env file
sudo tee .env > /dev/null << EOF
############
# Secrets
############
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
JWT_SECRET=$JWT_SECRET
ANON_KEY=$ANON_KEY
SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
DASHBOARD_USERNAME=$DASHBOARD_USERNAME
DASHBOARD_PASSWORD=$DASHBOARD_PASSWORD

############
# Database
############
POSTGRES_HOST=db
POSTGRES_DB=postgres
POSTGRES_PORT=5432

############
# API Proxy
############
KONG_HTTP_PORT=8000
KONG_HTTPS_PORT=8443

############
# API
############
PGRST_DB_SCHEMAS=public,storage,graphql_public

############
# Auth
############
SITE_URL=https://$DOMAIN
ADDITIONAL_REDIRECT_URLS=
JWT_EXPIRY=3600
DISABLE_SIGNUP=false
API_EXTERNAL_URL=https://$API_SUBDOMAIN.$DOMAIN

############
# Studio
############
STUDIO_DEFAULT_ORGANIZATION=Default Organization
STUDIO_DEFAULT_PROJECT=Default Project
STUDIO_PORT=3000
SUPABASE_PUBLIC_URL=https://$API_SUBDOMAIN.$DOMAIN

############
# Functions
############
FUNCTIONS_VERIFY_JWT=false

############
# Logs
############
LOGFLARE_LOGGER_BACKEND_API_KEY=your-super-secret-and-long-logflare-key

############
# Storage
############
STORAGE_BACKEND=file
FILE_SIZE_LIMIT=52428800
EOF

print_success "Supabase .env created"

# Start Supabase
sudo docker compose pull
sudo docker compose up -d
print_success "Supabase started"

# Step 3: Restore database if requested
if [ "$RESTORE_DB" = "y" ] && [ -n "$SUPABASE_CLOUD_URL" ]; then
    print_header "💾 STEP 3: Restoring Database"
    
    # Wait for database to be ready
    sleep 10
    
    # Install PostgreSQL client
    sudo apt install -y postgresql-client
    
    # Dump from cloud
    print_warning "Dumping database from Supabase Cloud..."
    pg_dump "$SUPABASE_CLOUD_URL" > /tmp/backup.sql
    
    # Restore to local
    print_warning "Restoring to local database..."
    PGPASSWORD=$POSTGRES_PASSWORD psql -h localhost -p 5432 -U postgres -d postgres < /tmp/backup.sql
    
    rm /tmp/backup.sql
    print_success "Database restored"
else
    print_warning "Skipping database restore"
fi

# Step 4: Setup Frontend
print_header "🎨 STEP 4: Setting up Frontend"

sudo mkdir -p /opt/droplet-app
cd /opt/droplet-app

if [ -n "$GIT_REPO" ]; then
    sudo git clone "$GIT_REPO" .
else
    print_warning "Silakan upload kode frontend ke /opt/droplet-app"
    print_warning "Kemudian jalankan: cd /opt/droplet-app && sudo docker compose up -d --build"
fi

# Create Dockerfile
sudo tee Dockerfile > /dev/null << 'EOF'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
EOF

# Create nginx.conf for container
sudo tee nginx.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
EOF

# Create docker-compose.yml
sudo tee docker-compose.yml > /dev/null << EOF
version: '3.8'
services:
  frontend:
    build:
      context: .
      args:
        VITE_SUPABASE_URL: https://$API_SUBDOMAIN.$DOMAIN
        VITE_SUPABASE_PUBLISHABLE_KEY: $ANON_KEY
    ports:
      - "3001:80"
    restart: unless-stopped
EOF

print_success "Frontend configuration created"

# Step 5: Setup Edge Functions
print_header "⚡ STEP 5: Setting up Edge Functions"

sudo mkdir -p /opt/edge-functions/functions
cd /opt/edge-functions

# Copy edge functions (user needs to do this manually or from git)
sudo tee docker-compose.yml > /dev/null << EOF
version: '3.8'
services:
  digitalocean:
    image: denoland/deno:1.40.0
    volumes:
      - ./functions:/app
    working_dir: /app
    command: ["run", "--allow-net", "--allow-env", "--allow-read", "serve.ts"]
    environment:
      - DIGITALOCEAN_API_KEY=$DIGITALOCEAN_API_KEY
      - SUPABASE_URL=https://$API_SUBDOMAIN.$DOMAIN
      - SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
      - SUPABASE_ANON_KEY=$ANON_KEY
    ports:
      - "8001:8000"
    restart: unless-stopped
    
  auto-destroy:
    image: denoland/deno:1.40.0
    volumes:
      - ./functions:/app
    working_dir: /app
    command: ["run", "--allow-net", "--allow-env", "--allow-read", "auto-destroy.ts"]
    environment:
      - DIGITALOCEAN_API_KEY=$DIGITALOCEAN_API_KEY
      - SUPABASE_URL=https://$API_SUBDOMAIN.$DOMAIN
      - SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
    restart: unless-stopped
EOF

# Create serve.ts wrapper
sudo tee functions/serve.ts > /dev/null << 'EOF'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Import your function handler
import handler from "./digitalocean/index.ts";

serve(handler, { port: 8000 });
console.log("Edge function server running on port 8000");
EOF

# Create auto-destroy.ts wrapper
sudo tee functions/auto-destroy.ts > /dev/null << 'EOF'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Import your function handler
import handler from "./auto-destroy-droplets/index.ts";

// Run every hour
setInterval(async () => {
    try {
        await handler(new Request("http://localhost"));
        console.log("Auto-destroy check completed");
    } catch (e) {
        console.error("Auto-destroy error:", e);
    }
}, 60 * 60 * 1000);

serve(handler, { port: 8000 });
console.log("Auto-destroy function running");
EOF

print_success "Edge functions configuration created"

# Step 6: Setup Nginx Reverse Proxy
print_header "🌐 STEP 6: Setting up Nginx Reverse Proxy"

sudo tee /etc/nginx/sites-available/droplet-app > /dev/null << EOF
# Frontend
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}

# Supabase API
server {
    listen 80;
    server_name $API_SUBDOMAIN.$DOMAIN;
    
    client_max_body_size 50M;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

# Edge Functions
server {
    listen 80;
    server_name functions.$DOMAIN;
    
    location / {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

# Supabase Studio Dashboard
server {
    listen 80;
    server_name studio.$DOMAIN;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/droplet-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
print_success "Nginx configured"

# Step 7: Setup SSL
print_header "🔒 STEP 7: Setting up SSL Certificates"

sudo certbot --nginx --non-interactive --agree-tos --email $SSL_EMAIL \
    -d $DOMAIN \
    -d www.$DOMAIN \
    -d $API_SUBDOMAIN.$DOMAIN \
    -d functions.$DOMAIN \
    -d studio.$DOMAIN

print_success "SSL certificates installed"

# Step 8: Create management scripts
print_header "📜 STEP 8: Creating Management Scripts"

sudo mkdir -p /opt/scripts

# Start all services
sudo tee /opt/scripts/start-all.sh > /dev/null << 'EOF'
#!/bin/bash
cd /opt/supabase/supabase/docker && docker compose up -d
cd /opt/droplet-app && docker compose up -d
cd /opt/edge-functions && docker compose up -d
echo "All services started"
EOF

# Stop all services
sudo tee /opt/scripts/stop-all.sh > /dev/null << 'EOF'
#!/bin/bash
cd /opt/edge-functions && docker compose down
cd /opt/droplet-app && docker compose down
cd /opt/supabase/supabase/docker && docker compose down
echo "All services stopped"
EOF

# Restart all services
sudo tee /opt/scripts/restart-all.sh > /dev/null << 'EOF'
#!/bin/bash
/opt/scripts/stop-all.sh
/opt/scripts/start-all.sh
EOF

# View logs
sudo tee /opt/scripts/logs.sh > /dev/null << 'EOF'
#!/bin/bash
case $1 in
    supabase)
        cd /opt/supabase/supabase/docker && docker compose logs -f
        ;;
    frontend)
        cd /opt/droplet-app && docker compose logs -f
        ;;
    functions)
        cd /opt/edge-functions && docker compose logs -f
        ;;
    *)
        echo "Usage: logs.sh [supabase|frontend|functions]"
        ;;
esac
EOF

# Backup database
sudo tee /opt/scripts/backup-db.sh > /dev/null << EOF
#!/bin/bash
BACKUP_DIR="/opt/backups"
mkdir -p \$BACKUP_DIR
TIMESTAMP=\$(date +%Y%m%d_%H%M%S)
PGPASSWORD=$POSTGRES_PASSWORD pg_dump -h localhost -p 5432 -U postgres -d postgres > \$BACKUP_DIR/backup_\$TIMESTAMP.sql
echo "Backup created: \$BACKUP_DIR/backup_\$TIMESTAMP.sql"

# Keep only last 7 backups
ls -t \$BACKUP_DIR/*.sql | tail -n +8 | xargs -r rm
EOF

sudo chmod +x /opt/scripts/*.sh
print_success "Management scripts created"

# Save configuration for reference
sudo tee /opt/config.txt > /dev/null << EOF
============================================
DROPLET MANAGER CONFIGURATION
============================================

Domain: $DOMAIN
API URL: https://$API_SUBDOMAIN.$DOMAIN
Functions URL: https://functions.$DOMAIN
Studio URL: https://studio.$DOMAIN

Supabase Dashboard:
  Username: $DASHBOARD_USERNAME
  Password: [saved in /opt/supabase/supabase/docker/.env]

API Keys:
  ANON_KEY: $ANON_KEY
  SERVICE_ROLE_KEY: [saved in /opt/supabase/supabase/docker/.env]

Management Commands:
  Start all: /opt/scripts/start-all.sh
  Stop all: /opt/scripts/stop-all.sh
  Restart all: /opt/scripts/restart-all.sh
  View logs: /opt/scripts/logs.sh [supabase|frontend|functions]
  Backup DB: /opt/scripts/backup-db.sh

Directories:
  Supabase: /opt/supabase/supabase/docker
  Frontend: /opt/droplet-app
  Edge Functions: /opt/edge-functions

============================================
EOF

sudo chmod 600 /opt/config.txt

# Final summary
print_header "✅ DEPLOYMENT COMPLETE!"

echo -e "${GREEN}Aplikasi berhasil di-deploy!${NC}\n"
echo "URLs:"
echo "  - Frontend: https://$DOMAIN"
echo "  - API: https://$API_SUBDOMAIN.$DOMAIN"
echo "  - Edge Functions: https://functions.$DOMAIN"
echo "  - Supabase Studio: https://studio.$DOMAIN"
echo ""
echo "Langkah selanjutnya:"
echo "  1. Arahkan DNS domain ke IP server ini"
echo "  2. Upload kode frontend ke /opt/droplet-app (jika belum)"
echo "  3. Upload edge functions ke /opt/edge-functions/functions"
echo "  4. Jalankan: cd /opt/droplet-app && sudo docker compose up -d --build"
echo "  5. Jalankan: cd /opt/edge-functions && sudo docker compose up -d"
echo ""
echo "Konfigurasi tersimpan di: /opt/config.txt"
echo ""
print_warning "PENTING: Simpan ANON_KEY berikut untuk update client:"
echo "$ANON_KEY"
echo ""
print_success "Selesai! 🎉"
