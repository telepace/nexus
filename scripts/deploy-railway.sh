#!/bin/bash

# Railway Multi-Service Deployment Script
# This script helps deploy each service individually to Railway

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Railway Multi-Service Deployment Script${NC}"
echo -e "${BLUE}==========================================${NC}"

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI is not installed. Please install it first:${NC}"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Check if user is logged in
if ! railway whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️ You are not logged in to Railway. Please log in first:${NC}"
    echo "railway login"
    exit 1
fi

# Function to deploy a service
deploy_service() {
    local service_name=$1
    local service_path=$2
    
    echo -e "\n${BLUE}📦 Deploying $service_name service...${NC}"
    
    if [ ! -d "$service_path" ]; then
        echo -e "${RED}❌ Service directory $service_path does not exist${NC}"
        return 1
    fi
    
    cd "$service_path"
    
    # Check if railway.toml exists
    if [ ! -f "railway.toml" ]; then
        echo -e "${RED}❌ railway.toml not found in $service_path${NC}"
        cd - > /dev/null
        return 1
    fi
    
    # Check if Dockerfile exists (for services that use Docker)
    if grep -q 'builder = "dockerfile"' railway.toml; then
        if [ ! -f "Dockerfile" ]; then
            echo -e "${RED}❌ Dockerfile not found in $service_path but railway.toml specifies dockerfile builder${NC}"
            cd - > /dev/null
            return 1
        fi
    fi
    
    echo -e "${YELLOW}🔄 Deploying $service_name...${NC}"
    
    # Deploy the service
    if railway up --service "$service_name"; then
        echo -e "${GREEN}✅ $service_name deployed successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to deploy $service_name${NC}"
        cd - > /dev/null
        return 1
    fi
    
    cd - > /dev/null
    return 0
}

# Function to create services if they don't exist
create_service_if_not_exists() {
    local service_name=$1
    
    echo -e "${YELLOW}🔍 Checking if service '$service_name' exists...${NC}"
    
    # Check if service exists (this will succeed if service exists)
    if railway service list | grep -q "$service_name"; then
        echo -e "${GREEN}✅ Service '$service_name' already exists${NC}"
    else
        echo -e "${YELLOW}🆕 Creating service '$service_name'...${NC}"
        if railway service create "$service_name"; then
            echo -e "${GREEN}✅ Service '$service_name' created successfully!${NC}"
        else
            echo -e "${RED}❌ Failed to create service '$service_name'${NC}"
            return 1
        fi
    fi
}

# Main deployment function
main() {
    echo -e "${BLUE}Starting deployment process...${NC}"
    
    # Go to project root
    cd "$(dirname "$0")/.."
    
    # Services to deploy (in order of dependency)
    # Backend first, then frontend services that depend on it
    
    echo -e "\n${BLUE}📋 Services to deploy:${NC}"
    echo "1. Backend (FastAPI)"
    echo "2. Frontend (Next.js)"
    echo "3. Admin (Nginx placeholder)"
    echo "4. Website (Next.js docs)"
    
    read -p "Do you want to proceed with deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}⏹️ Deployment cancelled${NC}"
        exit 0
    fi
    
    # Deploy backend first
    echo -e "\n${BLUE}=== Deploying Backend Service ===${NC}"
    create_service_if_not_exists "backend"
    if ! deploy_service "backend" "./backend"; then
        echo -e "${RED}❌ Backend deployment failed. Stopping deployment.${NC}"
        exit 1
    fi
    
    # Deploy frontend
    echo -e "\n${BLUE}=== Deploying Frontend Service ===${NC}"
    create_service_if_not_exists "frontend"
    if ! deploy_service "frontend" "./frontend"; then
        echo -e "${YELLOW}⚠️ Frontend deployment failed, but continuing...${NC}"
    fi
    
    # Deploy admin
    echo -e "\n${BLUE}=== Deploying Admin Service ===${NC}"
    create_service_if_not_exists "admin"
    if ! deploy_service "admin" "./admin"; then
        echo -e "${YELLOW}⚠️ Admin deployment failed, but continuing...${NC}"
    fi
    
    # Deploy website
    echo -e "\n${BLUE}=== Deploying Website Service ===${NC}"
    create_service_if_not_exists "website"
    if ! deploy_service "website" "./website"; then
        echo -e "${YELLOW}⚠️ Website deployment failed, but continuing...${NC}"
    fi
    
    echo -e "\n${GREEN}🎉 Deployment process completed!${NC}"
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Check service status: railway service list"
    echo "2. View logs: railway logs --service <service-name>"
    echo "3. Configure environment variables if needed"
    echo "4. Set up database services (PostgreSQL, Redis) if not already done"
}

# Check if specific service deployment is requested
if [ $# -eq 1 ]; then
    service_name=$1
    case $service_name in
        "backend")
            create_service_if_not_exists "backend"
            deploy_service "backend" "./backend"
            ;;
        "frontend")
            create_service_if_not_exists "frontend"
            deploy_service "frontend" "./frontend"
            ;;
        "admin")
            create_service_if_not_exists "admin"
            deploy_service "admin" "./admin"
            ;;
        "website")
            create_service_if_not_exists "website"
            deploy_service "website" "./website"
            ;;
        *)
            echo -e "${RED}❌ Unknown service: $service_name${NC}"
            echo "Available services: backend, frontend, admin, website"
            exit 1
            ;;
    esac
else
    main
fi