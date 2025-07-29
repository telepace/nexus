#!/bin/bash

# Railway Monolith Deployment Script
# This script deploys the entire Nexus application as a single service using Docker

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Railway Monolith Deployment${NC}"
echo -e "${BLUE}================================${NC}"

# Check prerequisites
echo -e "\n${BLUE}🔍 Checking prerequisites...${NC}"

if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI not installed${NC}"
    echo "Install: npm install -g @railway/cli"
    exit 1
fi

if ! railway whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Railway${NC}"
    echo "Login: railway login"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites met${NC}"

# Go to project root
cd "$(dirname "$0")/.."

echo -e "\n${BLUE}📋 Deployment Strategy:${NC}"
echo "✅ Single Railway service containing all components"
echo "✅ Backend (FastAPI) running on port 8000"
echo "✅ Frontend (Next.js) running on port 3000"  
echo "✅ Admin (static files) served by nginx"
echo "✅ Nginx reverse proxy on port 80"
echo "✅ Managed by supervisord"
echo "✅ Built-in health checks"

echo -e "\n${YELLOW}📁 Files used for deployment:${NC}"
echo "• Dockerfile.railway - Multi-stage build with all services"
echo "• railway.toml - Railway configuration"
echo "• All service directories (backend/, frontend/, admin/)"

echo -e "\n${BLUE}🗄️ Database Setup:${NC}"
echo "You'll need to add database services separately:"
echo "1. railway add --database postgresql"
echo "2. railway add --database redis"

read -p "Create database services now? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "\n${YELLOW}Creating PostgreSQL...${NC}"
    railway add --database postgresql || echo -e "${YELLOW}PostgreSQL might already exist${NC}"
    
    echo -e "${YELLOW}Creating Redis...${NC}"
    railway add --database redis || echo -e "${YELLOW}Redis might already exist${NC}"
    
    echo -e "${GREEN}✅ Database services created${NC}"
fi

echo -e "\n${BLUE}🚀 Deploying application...${NC}"

# Check if service exists, create if not
if ! railway service list | grep -q "nexus-app"; then
    echo -e "${YELLOW}Creating nexus-app service...${NC}"
    railway service create nexus-app
fi

echo -e "${YELLOW}Deploying to Railway...${NC}"

if railway up --service nexus-app; then
    echo -e "\n${GREEN}🎉 Deployment successful!${NC}"
    
    echo -e "\n${BLUE}📊 Service Status:${NC}"
    railway service list
    
    echo -e "\n${BLUE}🔗 Next Steps:${NC}"
    echo "1. Set environment variables in Railway dashboard:"
    echo "   - SECRET_KEY"
    echo "   - FIRST_SUPERUSER" 
    echo "   - FIRST_SUPERUSER_PASSWORD"
    echo "   - OPENAI_API_KEY"
    echo "   - SUPABASE_URL"
    echo "   - SUPABASE_ANON_KEY"
    echo ""
    echo "2. Connect to databases:"
    echo "   - POSTGRES_* variables will be auto-configured"
    echo "   - REDIS_* variables will be auto-configured"
    echo ""
    echo "3. Access your application:"
    echo "   - railway open --service nexus-app"
    echo ""
    echo "4. Monitor logs:"
    echo "   - railway logs --service nexus-app"
    
else
    echo -e "\n${RED}❌ Deployment failed${NC}"
    echo "Check logs: railway logs --service nexus-app"
    exit 1
fi

echo -e "\n${GREEN}🎯 Deployment Complete!${NC}"
echo -e "${GREEN}Your entire application is now running in a single Railway service.${NC}"