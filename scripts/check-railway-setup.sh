#!/bin/bash

# Railway Setup Checker
# This script helps diagnose Railway deployment issues

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${RED}🔍 Railway Setup Diagnostic${NC}"
echo -e "${RED}=========================${NC}"

# Check current working directory
echo -e "\n${BLUE}📍 Current Directory:${NC}"
pwd

# Check if we're in project root
if [ -f "CLAUDE.md" ] && [ -d "backend" ] && [ -d "frontend" ]; then
    echo -e "${GREEN}✅ You are in the project root${NC}"
else
    echo -e "${RED}❌ You are not in the project root${NC}"
    exit 1
fi

# Check Railway CLI
echo -e "\n${BLUE}🚂 Railway CLI Status:${NC}"
if command -v railway &> /dev/null; then
    echo -e "${GREEN}✅ Railway CLI installed: $(railway --version)${NC}"
else
    echo -e "${RED}❌ Railway CLI not installed${NC}"
    echo "Install with: npm install -g @railway/cli"
    exit 1
fi

# Check login status
echo -e "\n${BLUE}🔐 Railway Login Status:${NC}"
if railway whoami &> /dev/null; then
    echo -e "${GREEN}✅ Logged in as: $(railway whoami)${NC}"
else
    echo -e "${RED}❌ Not logged in to Railway${NC}"
    echo "Login with: railway login"
    exit 1
fi

# Check project linking
echo -e "\n${BLUE}🔗 Railway Project Status:${NC}"
if [ -d ".railway" ]; then
    echo -e "${GREEN}✅ Project is linked to Railway${NC}"
    if railway status &> /dev/null; then
        echo -e "${GREEN}✅ Can access Railway project${NC}"
    else
        echo -e "${YELLOW}⚠️ Project linked but cannot access${NC}"
    fi
else
    echo -e "${RED}❌ Project not linked to Railway${NC}"
    echo "Link with: railway link [project-id]"
fi

# Check services
echo -e "\n${BLUE}📋 Railway Services:${NC}"
if railway service list &> /dev/null; then
    echo -e "${GREEN}✅ Services found:${NC}"
    railway service list
else
    echo -e "${YELLOW}⚠️ Cannot list services or no services exist${NC}"
fi

# Check for common deployment issues
echo -e "\n${BLUE}🔧 Common Issues Check:${NC}"

# Check if root railway.toml exists
if [ -f "railway.toml" ]; then
    echo -e "${RED}❌ Root railway.toml exists - this causes monorepo deployment issues${NC}"
    echo "   Fix: mv railway.toml railway.toml.backup"
else
    echo -e "${GREEN}✅ No root railway.toml (good)${NC}"
fi

# Check .railwayignore
if [ -f ".railwayignore" ]; then
    echo -e "${GREEN}✅ .railwayignore exists${NC}"
else
    echo -e "${YELLOW}⚠️ No .railwayignore file${NC}"
fi

# Check nixpacks.toml
if [ -f "nixpacks.toml" ]; then
    echo -e "${GREEN}✅ nixpacks.toml exists to prevent root deployment${NC}"
else
    echo -e "${YELLOW}⚠️ No nixpacks.toml file${NC}"
fi

# Check service directories
echo -e "\n${BLUE}📁 Service Directory Check:${NC}"
for service in backend frontend admin website; do
    if [ -d "$service" ]; then
        echo -e "${GREEN}✅ $service/ directory exists${NC}"
        if [ -f "$service/railway.toml" ]; then
            echo -e "${GREEN}  ✅ $service/railway.toml exists${NC}"
        else
            echo -e "${RED}  ❌ $service/railway.toml missing${NC}"
        fi
        if [ -f "$service/Dockerfile" ]; then
            echo -e "${GREEN}  ✅ $service/Dockerfile exists${NC}"
        else
            echo -e "${YELLOW}  ⚠️ $service/Dockerfile missing${NC}"
        fi
    else
        echo -e "${RED}❌ $service/ directory missing${NC}"
    fi
done

echo -e "\n${BLUE}💡 Deployment Instructions:${NC}"
echo "1. Make sure you have individual services created in Railway:"
echo "   railway service create backend"
echo "   railway service create frontend"
echo "   railway service create admin"
echo "   railway service create website"
echo ""
echo "2. Deploy each service from its own directory:"
echo "   cd backend && railway up --service backend"
echo "   cd ../frontend && railway up --service frontend"
echo "   cd ../admin && railway up --service admin"
echo "   cd ../website && railway up --service website"
echo ""
echo "3. NEVER deploy from the root directory!"

echo -e "\n${RED}🚨 Current Problem Diagnosis:${NC}"
echo "If you're still seeing 'Nixpacks build failed' errors,"
echo "it means Railway is still trying to deploy from the root directory."
echo ""
echo "Solutions:"
echo "1. Delete the failing service in Railway dashboard"
echo "2. Create individual services for each component"
echo "3. Deploy from service directories, not root"