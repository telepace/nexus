#!/bin/bash

# Quick Fix for Railway Deployment Issues
# This script helps fix the common monorepo deployment problem

set -e

echo "🔧 Railway Deployment Fix Script"
echo "================================"

echo ""
echo "❌ PROBLEM IDENTIFIED:"
echo "Railway is trying to deploy your entire monorepo as a single service."
echo "This fails because Nixpacks can't determine what type of app to build"
echo "when there are multiple services (backend/, frontend/, admin/, etc.) in the root."

echo ""
echo "✅ SOLUTION:"
echo "You need to create separate Railway services for each component:"
echo ""
echo "1. Backend Service  (FastAPI Python app)"
echo "2. Frontend Service (Next.js React app)"
echo "3. Admin Service    (Nginx placeholder)"
echo "4. Website Service  (Next.js docs)"
echo "5. Database Services (PostgreSQL + Redis)"

echo ""
echo "🚀 QUICK FIX STEPS:"
echo ""
echo "Step 1: Clean up the current failing service"
echo "   → Go to Railway dashboard"
echo "   → Delete the 'nexus' service that keeps failing"
echo ""
echo "Step 2: Create individual services"
echo "   → Run: ./scripts/setup-railway-services.sh"
echo "   → This will create all needed services"
echo ""
echo "Step 3: Deploy each service separately"
echo "   → Run: ./scripts/deploy-railway.sh"
echo "   → Or deploy individually from each directory"

echo ""
echo "🔧 MANUAL ALTERNATIVE:"
echo ""
echo "If you prefer manual setup:"
echo ""
echo "# Create services"
echo "railway add --database postgresql"
echo "railway add --database redis"
echo "railway service create backend"
echo "railway service create frontend"
echo "railway service create admin"
echo "railway service create website"
echo ""
echo "# Deploy each service"
echo "cd backend && railway up --service backend"
echo "cd ../frontend && railway up --service frontend"
echo "cd ../admin && railway up --service admin"
echo "cd ../website && railway up --service website"

echo ""
echo "💡 WHY THIS HAPPENS:"
echo "Your project structure is correct for a monorepo, but Railway's"
echo "auto-detection expects single-service repositories. The solution"
echo "is to explicitly tell Railway which service to deploy from which directory."

echo ""
echo "📚 For detailed instructions, see:"
echo "docs/guides/railway-multi-service-deployment.md"

echo ""
read -p "Do you want to run the setup script now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Running setup script..."
    ./scripts/setup-railway-services.sh
else
    echo "📝 Setup script not run. You can run it later with:"
    echo "./scripts/setup-railway-services.sh"
fi