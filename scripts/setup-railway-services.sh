#!/bin/bash

# Railway Service Setup Script
# This script creates individual services for the Nexus monorepo

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏗️  Railway Service Setup Script${NC}"
echo -e "${BLUE}================================${NC}"

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

echo -e "${BLUE}📋 This script will create the following services:${NC}"
echo "1. PostgreSQL database"
echo "2. Redis cache"
echo "3. Backend API service"
echo "4. Frontend web service"
echo "5. Admin dashboard service"
echo "6. Website documentation service"

read -p "Do you want to proceed? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⏹️ Setup cancelled${NC}"
    exit 0
fi

# Function to create a service
create_service() {
    local service_name=$1
    local service_type=$2
    
    echo -e "\n${BLUE}🔨 Creating $service_name service...${NC}"
    
    if [ "$service_type" = "database" ]; then
        # For database services, use railway add
        if [ "$service_name" = "postgres" ]; then
            railway add --database postgresql
        elif [ "$service_name" = "redis" ]; then
            railway add --database redis
        fi
    else
        # For application services, create empty service
        railway service create "$service_name"
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $service_name service created successfully!${NC}"
    else
        echo -e "${YELLOW}⚠️ $service_name service might already exist or creation failed${NC}"
    fi
}

# Function to deploy a service
deploy_service() {
    local service_name=$1
    local service_path=$2
    
    echo -e "\n${BLUE}🚀 Deploying $service_name from $service_path...${NC}"
    
    if [ ! -d "$service_path" ]; then
        echo -e "${RED}❌ Service directory $service_path does not exist${NC}"
        return 1
    fi
    
    cd "$service_path"
    
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

# Main setup function
main() {
    echo -e "\n${BLUE}🚀 Starting service creation...${NC}"
    
    # Go to project root
    cd "$(dirname "$0")/.."
    
    # Create database services first
    echo -e "\n${BLUE}=== Creating Database Services ===${NC}"
    create_service "postgres" "database"
    create_service "redis" "database"
    
    # Create application services
    echo -e "\n${BLUE}=== Creating Application Services ===${NC}"
    create_service "backend" "app"
    create_service "frontend" "app"
    create_service "admin" "app"
    create_service "website" "app"
    
    echo -e "\n${GREEN}🎉 Service creation completed!${NC}"
    
    # Ask if user wants to deploy immediately
    echo -e "\n${BLUE}📦 Do you want to deploy the services now?${NC}"
    read -p "Deploy services? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "\n${BLUE}=== Deploying Services ===${NC}"
        
        # Deploy in dependency order
        deploy_service "backend" "./backend"
        sleep 5  # Wait a bit between deployments
        
        deploy_service "frontend" "./frontend"
        sleep 5
        
        deploy_service "admin" "./admin"
        sleep 5
        
        deploy_service "website" "./website"
        
        echo -e "\n${GREEN}🎉 All services deployed!${NC}"
    else
        echo -e "\n${YELLOW}📝 Services created but not deployed. To deploy later, run:${NC}"
        echo "./scripts/deploy-railway.sh"
    fi
    
    echo -e "\n${BLUE}📋 Next steps:${NC}"
    echo "1. Check your Railway dashboard to see all services"
    echo "2. Configure environment variables for each service"
    echo "3. Verify that services are communicating properly"
    echo "4. Set up custom domains if needed"
    
    echo -e "\n${BLUE}💡 Useful commands:${NC}"
    echo "railway service list                  # List all services"
    echo "railway logs --service backend        # View service logs"
    echo "railway open --service frontend       # Open service in browser"
}

# Run main function
main