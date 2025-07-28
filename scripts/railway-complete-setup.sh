#!/bin/bash

# Complete Railway Setup for Nexus Monorepo
# This script handles the entire Railway deployment process

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
    
    # Check Railway CLI
    if ! command -v railway &> /dev/null; then
        echo -e "${RED}❌ Railway CLI not installed${NC}"
        echo "Install with: npm install -g @railway/cli"
        exit 1
    fi
    
    # Check login status
    if ! railway whoami &> /dev/null; then
        echo -e "${RED}❌ Not logged in to Railway${NC}"
        echo "Login with: railway login"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites met${NC}"
}

# Function to create database services
setup_databases() {
    echo -e "\n${BLUE}🗄️  Setting up database services...${NC}"
    
    echo -e "${YELLOW}Creating PostgreSQL service...${NC}"
    if railway add --database postgresql; then
        echo -e "${GREEN}✅ PostgreSQL created${NC}"
    else
        echo -e "${YELLOW}⚠️ PostgreSQL might already exist${NC}"
    fi
    
    echo -e "${YELLOW}Creating Redis service...${NC}"
    if railway add --database redis; then
        echo -e "${GREEN}✅ Redis created${NC}"
    else
        echo -e "${YELLOW}⚠️ Redis might already exist${NC}"
    fi
}

# Function to create application services
setup_app_services() {
    echo -e "\n${BLUE}🚀 Setting up application services...${NC}"
    
    local services=("backend" "frontend" "admin" "website")
    
    for service in "${services[@]}"; do
        echo -e "${YELLOW}Creating $service service...${NC}"
        if railway service create "$service"; then
            echo -e "${GREEN}✅ $service service created${NC}"
        else
            echo -e "${YELLOW}⚠️ $service service might already exist${NC}"
        fi
        sleep 2  # Avoid rate limiting
    done
}

# Function to deploy a service
deploy_service() {
    local service_name=$1
    local service_path=$2
    local max_retries=3
    local retry_count=0
    
    echo -e "\n${BLUE}📦 Deploying $service_name...${NC}"
    
    if [ ! -d "$service_path" ]; then
        echo -e "${RED}❌ Directory $service_path not found${NC}"
        return 1
    fi
    
    cd "$service_path"
    
    while [ $retry_count -lt $max_retries ]; do
        echo -e "${YELLOW}Deploying $service_name (attempt $((retry_count + 1))/$max_retries)...${NC}"
        
        if railway up --service "$service_name"; then
            echo -e "${GREEN}✅ $service_name deployed successfully!${NC}"
            cd - > /dev/null
            return 0
        else
            retry_count=$((retry_count + 1))
            if [ $retry_count -lt $max_retries ]; then
                echo -e "${YELLOW}⚠️ Deployment failed, retrying in 10 seconds...${NC}"
                sleep 10
            fi
        fi
    done
    
    echo -e "${RED}❌ Failed to deploy $service_name after $max_retries attempts${NC}"
    cd - > /dev/null
    return 1
}

# Function to deploy all services
deploy_all_services() {
    echo -e "\n${BLUE}🚀 Deploying all services...${NC}"
    
    local project_root=$(pwd)
    
    # Deploy in dependency order
    local services=(
        "backend:./backend"
        "frontend:./frontend"
        "admin:./admin"
        "website:./website"
    )
    
    for service_info in "${services[@]}"; do
        IFS=':' read -r service_name service_path <<< "$service_info"
        
        if deploy_service "$service_name" "$service_path"; then
            echo -e "${GREEN}✅ $service_name deployment completed${NC}"
        else
            echo -e "${YELLOW}⚠️ $service_name deployment failed, but continuing...${NC}"
        fi
        
        # Wait between deployments to avoid overwhelming Railway
        sleep 5
    done
}

# Function to display service status
show_service_status() {
    echo -e "\n${BLUE}📊 Service Status:${NC}"
    
    if railway service list; then
        echo -e "${GREEN}✅ Service list retrieved${NC}"
    else
        echo -e "${YELLOW}⚠️ Could not retrieve service list${NC}"
    fi
}

# Function to show next steps
show_next_steps() {
    echo -e "\n${GREEN}🎉 Railway setup completed!${NC}"
    echo -e "\n${BLUE}📋 Next Steps:${NC}"
    echo "1. Check your Railway dashboard to see all services"
    echo "2. Configure environment variables for each service:"
    echo "   - SECRET_KEY, FIRST_SUPERUSER, FIRST_SUPERUSER_PASSWORD"
    echo "   - OPENAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY"
    echo "   - Email settings (optional)"
    echo ""
    echo "3. Verify service communications:"
    echo "   - Backend should connect to PostgreSQL and Redis"
    echo "   - Frontend should connect to Backend API"
    echo ""
    echo "4. Test your deployment:"
    echo "   - railway open --service frontend"
    echo "   - railway open --service backend"
    echo ""
    echo "5. Monitor logs:"
    echo "   - railway logs --service backend"
    echo "   - railway logs --service frontend"
    
    echo -e "\n${BLUE}💡 Useful Commands:${NC}"
    echo "railway service list                 # List all services"
    echo "railway logs --service <name>        # View service logs"
    echo "railway open --service <name>        # Open service URL"
    echo "railway variables --service <name>   # Manage env variables"
    
    echo -e "\n${BLUE}📚 Documentation:${NC}"
    echo "See: docs/guides/railway-multi-service-deployment.md"
}

# Main execution
main() {
    echo -e "${BLUE}🚀 Complete Railway Setup for Nexus${NC}"
    echo -e "${BLUE}====================================${NC}"
    
    # Go to project root
    cd "$(dirname "$0")/.."
    
    # Show current status
    echo -e "\n${YELLOW}Current situation:${NC}"
    echo "• Root railway.toml removed to prevent monorepo deployment"
    echo "• .railwayignore configured to prevent auto-detection"
    echo "• Individual service configurations updated"
    echo "• Dockerfiles fixed for Railway deployment"
    
    # Confirm execution
    echo -e "\n${BLUE}This script will:${NC}"
    echo "1. Create PostgreSQL and Redis database services"
    echo "2. Create individual application services (backend, frontend, admin, website)"
    echo "3. Deploy each service from its respective directory"
    echo "4. Provide next steps for configuration"
    
    read -p "Proceed with complete Railway setup? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}⏹️ Setup cancelled${NC}"
        exit 0
    fi
    
    # Execute setup steps
    check_prerequisites
    setup_databases
    setup_app_services
    
    # Ask about deployment
    echo -e "\n${BLUE}🚀 Services created. Deploy now?${NC}"
    read -p "Deploy all services? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        deploy_all_services
    else
        echo -e "${YELLOW}📝 Services created but not deployed${NC}"
        echo "Deploy later with: ./scripts/deploy-railway.sh"
    fi
    
    show_service_status
    show_next_steps
}

# Handle script arguments
if [ "$1" = "--deploy-only" ]; then
    echo -e "${BLUE}🚀 Deploying existing services only...${NC}"
    cd "$(dirname "$0")/.."
    check_prerequisites
    deploy_all_services
    show_service_status
elif [ "$1" = "--services-only" ]; then
    echo -e "${BLUE}🏗️  Creating services only (no deployment)...${NC}"
    cd "$(dirname "$0")/.."
    check_prerequisites
    setup_databases
    setup_app_services
    show_service_status
else
    main
fi