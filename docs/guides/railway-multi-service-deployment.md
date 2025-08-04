# Railway Multi-Service Deployment Guide

This guide explains how to deploy the Nexus application as separate services on Railway, which is the recommended approach for this monorepo structure.

## Overview

The Nexus application consists of multiple services:
- **Backend**: FastAPI Python application
- **Frontend**: Next.js React application  
- **Admin**: Nginx-served admin dashboard (placeholder)
- **Website**: Next.js documentation site
- **Database Services**: PostgreSQL and Redis (managed by Railway)

## Prerequisites

1. **Railway CLI**: Install the Railway CLI
   ```bash
   npm install -g @railway/cli
   ```

2. **Railway Account**: Log into your Railway account
   ```bash
   railway login
   ```

3. **Project Setup**: Link to your Railway project
   ```bash
   railway link [your-project-id]
   ```

## Deployment Methods

### Method 1: Automated Script (Recommended)

Use the provided deployment script:

```bash
# Deploy all services
./scripts/deploy-railway.sh

# Deploy a specific service
./scripts/deploy-railway.sh backend
./scripts/deploy-railway.sh frontend
./scripts/deploy-railway.sh admin
./scripts/deploy-railway.sh website
```

### Method 2: Manual Deployment

#### Step 1: Create Services

Create a service for each component:

```bash
# Create services
railway service create backend
railway service create frontend
railway service create admin
railway service create website
```

#### Step 2: Deploy Each Service

Deploy from each service directory:

```bash
# Deploy backend
cd backend
railway up --service backend

# Deploy frontend
cd ../frontend
railway up --service frontend

# Deploy admin
cd ../admin
railway up --service admin

# Deploy website
cd ../website
railway up --service website
```

## Service Configuration

### Backend Service

- **Technology**: FastAPI with uv package manager
- **Port**: 8000 (default FastAPI port)
- **Health Check**: `/api/v1/utils/health-check/`
- **Environment Variables**: Database, Redis, API keys

Key configuration in `backend/railway.toml`:
```toml
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/api/v1/utils/health-check/"
```

### Frontend Service

- **Technology**: Next.js with pnpm
- **Port**: 3000
- **Environment Variables**: API URL references

Key configuration in `frontend/railway.toml`:
```toml
[env]
VITE_API_URL = "https://${{ backend.RAILWAY_PUBLIC_DOMAIN }}"
```

### Admin Service

- **Technology**: Nginx (serving placeholder content)
- **Port**: 80
- **Status**: Placeholder implementation

### Website Service

- **Technology**: Next.js documentation site
- **Port**: 3000
- **Builder**: Nixpacks (not Docker)

## Database Services

Add managed database services to your Railway project:

1. **PostgreSQL**: Add a PostgreSQL service
   - Railway will automatically provide connection variables
   - Backend service references these via `${{ POSTGRES.* }}` variables

2. **Redis**: Add a Redis service
   - Used for caching and session management
   - Backend service references via `${{ REDIS.* }}` variables

## Environment Variables

### Required Environment Variables

Set these in your Railway project:

```bash
# Application secrets
SECRET_KEY=your-secret-key
FIRST_SUPERUSER=admin@example.com
FIRST_SUPERUSER_PASSWORD=your-password

# External API keys
OPENAI_API_KEY=your-openai-key
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-key

# Optional: Email configuration
SMTP_HOST=your-smtp-host
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
EMAILS_FROM_EMAIL=noreply@example.com
```

### Service-to-Service Communication

Railway automatically provides internal networking between services:
- Services reference each other using `${{ service-name.RAILWAY_PUBLIC_DOMAIN }}`
- Database connections use `${{ DATABASE.RAILWAY_PRIVATE_DOMAIN }}`

## Monitoring and Troubleshooting

### Check Service Status

```bash
# List all services
railway service list

# Check specific service status
railway status --service backend
```

### View Logs

```bash
# View logs for a service
railway logs --service backend
railway logs --service frontend

# Follow logs in real-time
railway logs --service backend --follow
```

### Common Issues

1. **Build Failures**
   - Check Dockerfile syntax
   - Verify all required files are included
   - Check for missing dependencies

2. **Service Communication**
   - Verify environment variable references
   - Check CORS configuration
   - Ensure services are deployed in correct order

3. **Database Connection**
   - Verify database service is running
   - Check connection string format
   - Verify database migrations are applied

## Deployment Order

Deploy services in this order to handle dependencies:

1. **Database Services** (PostgreSQL, Redis)
2. **Backend Service** (API server)
3. **Frontend Services** (depend on backend API)

## Scaling and Performance

### Resource Allocation

Configure appropriate resources for each service:
- **Backend**: Higher CPU/memory for API processing
- **Frontend**: Standard web server resources
- **Admin**: Minimal resources (placeholder)

### Monitoring

- Use Railway's built-in monitoring
- Set up health checks for critical services
- Monitor database performance and connections

## Security Considerations

1. **Environment Variables**: Store all secrets as environment variables
2. **CORS**: Configure proper CORS origins for production
3. **Database**: Use Railway's private networking for database connections
4. **SSL**: Railway provides automatic SSL certificates

## Next Steps

After successful deployment:
1. Configure custom domain names if needed
2. Set up monitoring and alerting
3. Configure backup strategies for databases
4. Set up CI/CD pipelines for automated deployments

## Support

For issues:
- Check Railway documentation: https://docs.railway.app/
- Review service logs for error details
- Verify environment variable configuration
- Test service connectivity