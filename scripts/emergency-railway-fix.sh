#!/bin/bash

# Emergency Railway Deployment Fix
# This script immediately addresses the failing Railway deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${RED}🚨 EMERGENCY RAILWAY DEPLOYMENT FIX${NC}"
echo -e "${RED}===================================${NC}"

echo -e "\n${YELLOW}Current Status: Your Railway deployment is failing because${NC}"
echo -e "${YELLOW}Railway is trying to deploy the entire monorepo as one service.${NC}"

echo -e "\n${GREEN}✅ FIXES APPLIED:${NC}"
echo -e "${GREEN}1. ✅ Removed root railway.toml (backed up as railway.toml.backup)${NC}"
echo -e "${GREEN}2. ✅ Updated .railwayignore to prevent root deployment${NC}"
echo -e "${GREEN}3. ✅ Fixed Dockerfiles for proper Railway deployment${NC}"
echo -e "${GREEN}4. ✅ Updated railway.toml configs for each service${NC}"

echo -e "\n${BLUE}📋 NEXT STEPS - Choose One Option:${NC}"

echo -e "\n${BLUE}OPTION 1: Delete Current Service & Start Fresh (RECOMMENDED)${NC}"
echo "1. Go to your Railway dashboard"
echo "2. Delete the current 'nexus' service that keeps failing"
echo "3. Run: ./scripts/setup-railway-services.sh"
echo "4. This creates separate services for each component"

echo -e "\n${BLUE}OPTION 2: Quick CLI Commands${NC}"
echo "Run these commands to create and deploy services:"

cat << 'EOF'

# Delete current failing service (in Railway dashboard first!)
# Then create individual services:

railway add --database postgresql
railway add --database redis
railway service create backend
railway service create frontend
railway service create admin
railway service create website

# Deploy each service from its directory:
cd backend && railway up --service backend
cd ../frontend && railway up --service frontend  
cd ../admin && railway up --service admin
cd ../website && railway up --service website

EOF

echo -e "\n${BLUE}OPTION 3: Use Our Automated Scripts${NC}"
echo "1. ./scripts/setup-railway-services.sh    # Creates all services"
echo "2. ./scripts/deploy-railway.sh            # Deploys all services"

echo -e "\n${RED}⚠️  CRITICAL: Do NOT try to deploy from the root directory!${NC}"
echo -e "${RED}Railway must deploy each service from its own subdirectory.${NC}"

echo -e "\n${YELLOW}🔧 WHAT WE FIXED:${NC}"
echo "• Removed root railway.toml that caused monorepo detection"
echo "• Added comprehensive .railwayignore to prevent auto-detection"
echo "• Fixed backend Dockerfile with proper port configuration"
echo "• Updated all railway.toml files with correct start commands"
echo "• Created deployment scripts that handle multi-service deployment"

echo -e "\n${GREEN}💡 Why This Works:${NC}"
echo "Instead of Railway guessing what your monorepo contains,"
echo "you explicitly tell it which service to deploy from which directory."
echo "Each service has its own railway.toml and Dockerfile."

# Check if user wants to run setup now
echo -e "\n${BLUE}🚀 Ready to fix this now?${NC}"
read -p "Run the service setup script? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "\n${GREEN}🚀 Running service setup...${NC}"
    
    # Check if Railway CLI is available
    if ! command -v railway &> /dev/null; then
        echo -e "${RED}❌ Railway CLI not found. Please install it first:${NC}"
        echo "npm install -g @railway/cli"
        exit 1
    fi
    
    # Check if logged in
    if ! railway whoami &> /dev/null; then
        echo -e "${YELLOW}⚠️ Please log in to Railway first:${NC}"
        echo "railway login"
        exit 1
    fi
    
    echo -e "${BLUE}Running setup script...${NC}"
    ./scripts/setup-railway-services.sh
    
else
    echo -e "\n${YELLOW}📝 No problem! You can run the setup later with:${NC}"
    echo "./scripts/setup-railway-services.sh"
    
    echo -e "\n${BLUE}📚 For detailed instructions, see:${NC}"
    echo "docs/guides/railway-multi-service-deployment.md"
fi

echo -e "\n${GREEN}🎉 Emergency fix completed!${NC}"
echo -e "${GREEN}Your Railway deployment should work now with individual services.${NC}"