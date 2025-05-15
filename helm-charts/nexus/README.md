# Nexus Helm Chart

## Security Configuration

The `values.local.yaml` file requires several sensitive environment variables to be set before deployment. 
These are configured using environment variables to avoid hardcoding credentials in configuration files.

### Required Environment Variables

Before deploying, make sure to set the following environment variables:

```bash
# Database credentials
export POSTGRES_PASSWORD=your_secure_postgres_password

# Application secret key (used for JWT tokens and secure operations)
export SECRET_KEY=your_secure_random_string

# Admin user default password
export ADMIN_PASSWORD=your_secure_admin_password
```

### Deployment with Environment Variables

When deploying using helm, the environment variables will be automatically substituted:

```bash
helm install qforge-dev ./nexus -f nexus/values.local.yaml
```

### Security Best Practices

1. **Never commit actual secrets to version control**
2. **Use a password manager or secure vault** to generate and store strong passwords
3. Consider using a secrets management solution like HashiCorp Vault, AWS Secrets Manager, or Kubernetes Secrets for production deployments
4. For CI/CD pipelines, use the secret management features of your CI/CD platform
5. Rotate secrets regularly, especially in production environments

### Testing

For testing environments, you can use placeholder values, but make sure these are not used in production:

```bash
export POSTGRES_PASSWORD=dev_password_only_for_testing
export SECRET_KEY=dev_secret_key_only_for_testing
export ADMIN_PASSWORD=dev_admin_password_only_for_testing
``` 