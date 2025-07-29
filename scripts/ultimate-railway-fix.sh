#!/bin/bash

# Ultimate Railway Fix - Completely solve the monorepo deployment issue
# This script will definitively fix your Railway deployment problems

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${RED}🔥 ULTIMATE RAILWAY FIX${NC}"
echo -e "${RED}=====================${NC}"

echo -e "\n${YELLOW}PROBLEM IDENTIFIED:${NC}"
echo "Railway is still trying to deploy from the root directory."
echo "This will ALWAYS fail with 'Nixpacks build failed' error."

echo -e "\n${RED}❌ WHAT'S HAPPENING:${NC}"
echo "• Railway sees your root directory with multiple services"
echo "• Nixpacks can't determine what type of app to build"
echo "• You need SEPARATE services for each component"

echo -e "\n${GREEN}✅ ULTIMATE SOLUTION:${NC}"

# Step 1: Ensure we're in the right place
cd "$(dirname "$0")/.."

echo -e "\n${BLUE}Step 1: Checking current setup...${NC}"
if [ -f "CLAUDE.md" ] && [ -d "backend" ]; then
    echo -e "${GREEN}✅ In correct project directory${NC}"
else
    echo -e "${RED}❌ Not in project root${NC}"
    exit 1
fi

# Step 2: Check Railway CLI
echo -e "\n${BLUE}Step 2: Checking Railway CLI...${NC}"
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI not installed${NC}"
    echo "Install: npm install -g @railway/cli"
    exit 1
fi

if ! railway whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Railway${NC}"
    echo "Please run: railway login"
    exit 1
fi

echo -e "${GREEN}✅ Railway CLI ready${NC}"

# Step 3: Show the exact commands needed
echo -e "\n${RED}🚨 CRITICAL INSTRUCTIONS:${NC}"
echo -e "${RED}You MUST follow these exact steps:${NC}"

echo -e "\n${BLUE}1. Delete the current failing service:${NC}"
echo "   • Go to your Railway dashboard"
echo "   • Find the service that keeps failing with 'Nixpacks build failed'"
echo "   • DELETE that service completely"

echo -e "\n${BLUE}2. Create individual services (run these commands):${NC}"
cat << 'EOF'
railway add --database postgresql
railway add --database redis
railway service create backend
railway service create frontend
railway service create admin
railway service create website
EOF

echo -e "\n${BLUE}3. Deploy each service from its directory (CRITICAL):${NC}"
cat << 'EOF'
# Deploy backend
cd backend
railway up --service backend
cd ..

# Deploy frontend  
cd frontend
railway up --service frontend
cd ..

# Deploy admin
cd admin
railway up --service admin
cd ..

# Deploy website
cd website
railway up --service website
cd ..
EOF

echo -e "\n${RED}⚠️  NEVER RUN 'railway up' FROM THE ROOT DIRECTORY!${NC}"

# Step 4: Automated service creation
echo -e "\n${BLUE}4. Would you like me to create the services now?${NC}"
read -p "Create Railway services automatically? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "\n${GREEN}🚀 Creating Railway services...${NC}"
    
    # Create database services
    echo -e "${YELLOW}Creating PostgreSQL...${NC}"
    railway add --database postgresql || echo -e "${YELLOW}PostgreSQL might already exist${NC}"
    
    echo -e "${YELLOW}Creating Redis...${NC}"  
    railway add --database redis || echo -e "${YELLOW}Redis might already exist${NC}"
    
    # Create application services
    services=("backend" "frontend" "admin" "website")
    for service in "${services[@]}"; do
        echo -e "${YELLOW}Creating $service service...${NC}"
        railway service create "$service" || echo -e "${YELLOW}$service might already exist${NC}"
        sleep 2
    done
    
    echo -e "\n${GREEN}✅ Services created!${NC}"
    
    # Ask about deployment
    echo -e "\n${BLUE}5. Deploy services now?${NC}"
    read -p "Deploy all services? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "\n${GREEN}🚀 Deploying services...${NC}"
        
        # Deploy each service
        services_paths=("backend:backend" "frontend:frontend" "admin:admin" "website:website")
        
        for service_path in "${services_paths[@]}"; do
            IFS=':' read -r service dir <<< "$service_path"
            
            echo -e "\n${BLUE}Deploying $service from $dir/...${NC}"
            cd "$dir"
            
            if railway up --service "$service"; then
                echo -e "${GREEN}✅ $service deployed successfully!${NC}"
            else
                echo -e "${YELLOW}⚠️ $service deployment failed, but continuing...${NC}"
            fi
            
            cd ..
            sleep 5
        done
        
        echo -e "\n${GREEN}🎉 All deployments attempted!${NC}"
    fi
fi

echo -e "\n${BLUE}📋 Final Status Check:${NC}"
railway service list 2>/dev/null || echo -e "${YELLOW}Could not list services${NC}"

echo -e "\n${GREEN}🎯 SUCCESS CRITERIA:${NC}"
echo "✅ You should see multiple services in Railway dashboard"  
echo "✅ Each service should deploy from its own directory"
echo "✅ No more 'Nixpacks build failed' errors"
echo "✅ Services should be accessible via their Railway URLs"

echo -e "\n${BLUE}🔍 If you still see issues:${NC}"
echo "1. Check Railway dashboard - delete any failing services"
echo "2. Make sure each service directory has railway.toml and Dockerfile"
echo "3. Always deploy from service directories, never from root"
echo "4. Use: railway logs --service <name> to check deployment logs"

echo -e "\n${RED}🚨 REMEMBER: NEVER DEPLOY FROM ROOT DIRECTORY!${NC}"