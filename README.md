# nexus

<div align="center">

![nexus](https://images.shields.io/badge/QuickForge-AI-blue)
![FastAPI](https://images.shields.io/badge/FastAPI-0.104.0-green)
![TypeScript](https://images.shields.io/badge/TypeScript-5.2.2-blue)
![License](https://images.shields.io/badge/license-MIT-brightgreen)
![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/telepace/nexus?utm_source=oss&utm_medium=github&utm_campaign=telepace%2Fnexus&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)

</div>

<p align="center">
    <a href="./README.md"><b>English</b></a> •
    <a href="./README_zh-CN.md"><b>中文</b></a>
</p>

A production-ready fullstack template combining FastAPI (Python) and TypeScript for rapid AI prototype development. Designed for freelancers and AI entrepreneurs who need to quickly build and deploy professional applications with modern development practices.

## 🚀 Features

- **FastAPI Backend**: High-performance Python API with automatic OpenAPI documentation
- **TypeScript Frontend**: Type-safe frontend with modern React setup
- **AI-Ready**: Pre-configured integrations for common AI services and tooling
- **Developer Experience**: Optimized for use with Cursor and other AI-powered development tools
- **Production Quality**: Complete with testing frameworks, CI/CD pipelines, and deployment options
- **Docker Integration**: Containerized development and deployment workflows
- **Authentication System**: JWT authentication with secure password hashing
- **Email Integration**: Password recovery and notification system
- **Dark Mode Support**: Modern UI with light/dark theme switching
- **Database Migrations**: Automatic schema management with Alembic
- **Browser Extension**: Plasmo-powered browser extension for quick access and enhanced functionality

## 📋 Tech Stack

### Backend
- FastAPI for high-performance API endpoints
- SQLModel for SQL database interactions (ORM)
- Pydantic for data validation
- PostgreSQL as the SQL database
- Alembic for database migrations
- Pytest for testing
- Poetry for dependency management

### Frontend
- TypeScript for type safety
- React with hooks for UI components
- Chakra UI for responsive, accessible components
- Vite for fast builds
- Automatically generated API client
- Jest and React Testing Library for testing
- Playwright for End-to-End testing
- pnpm for package management

### Browser Extension
- Plasmo framework for browser extension development
- React with TypeScript for UI components
- Chrome storage API for data persistence
- Content scripts for webpage integration

### DevOps & Tools
- GitHub Actions for CI/CD
- Docker and Docker Compose
- Pre-commit hooks for code quality
- ESLint and Prettier for code formatting
- Cursor-optimized project structure
- Swagger UI for API documentation
- Traefik as reverse proxy / load balancer

## 🛠️ Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- Docker and Docker Compose (optional but recommended)
- Git

### Quick Setup

```bash
# Clone the repository
git clone https://github.com/telepace/nexus.git
cd nexus

# Setup using the automatic script
./setup.sh

# Or manually:

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install poetry
poetry install

# Frontend setup
cd ../frontend
pnpm install

# Start development servers
docker-compose up  # Starts everything
```

### Browser Extension Development

To work on the browser extension:

```bash
# Setup extension dependencies
cd extension
npm install

# Start extension development server
npm run dev
# Or using make command from project root
make extension-dev
```

The development server will package the extension and provide instructions for loading it into your browser.

To build the extension for production:

```bash
# Build extension
cd extension
npm run build
# Or using make command from project root
make extension-build
```

For packaging the extension for distribution:

```bash
# Package extension as zip file
cd extension
npm run package
# Or using make command from project root
make extension-package
```

### Configuration

Create a `.env` file in the root directory based on the provided `.env.example`. Important values to update:

```bash
# Generate secure secret keys with:
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Required security settings
SECRET_KEY=your-generated-secret-key
FIRST_SUPERUSER=admin@example.com
FIRST_SUPERUSER_PASSWORD=your-secure-password
POSTGRES_PASSWORD=your-db-password

# Optional email settings
SMTP_HOST=
SMTP_USER=
SMTP_PASSWORD=
EMAILS_FROM_EMAIL=info@example.com

# OpenAI API settings
OPENAI_BASE_URL=https://api.openai.com/v1
```

## 🧪 Testing

```bash
# Run backend tests
cd backend
pytest

# Run frontend tests
cd frontend
pnpm test

# Run end-to-end tests
cd e2e
pnpm test
```

## 📦 Project Structure

```
nexus/
├── .github/                # GitHub workflows and templates
├── backend/                # FastAPI application
│   ├── app/                # API code
│   │   ├── api/            # API endpoints
│   │   ├── core/           # Configuration
│   │   ├── db/             # Database models and config
│   │   ├── services/       # Business logic
│   │   └── utils/          # Utility functions
│   ├── tests/              # Backend tests
│   ├── alembic/            # Database migrations
│   ├── poetry.lock         # Locked dependencies
│   └── pyproject.toml      # Python project config
├── frontend/               # TypeScript React application
│   ├── src/                # Application code
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service integrations
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utility functions
│   ├── tests/              # Frontend tests
│   ├── package.json        # npm package config
│   └── vite.config.ts      # Vite configuration
├── extension/              # Browser extension (Plasmo)
│   ├── src/                # Extension source code
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Extension pages
│   │   └── utils/          # Utility functions
│   ├── assets/             # Extension assets
│   ├── package.json        # Extension dependencies
│   └── tsconfig.json       # TypeScript configuration
├── e2e/                    # End-to-end tests with Playwright
├── docker/                 # Docker configuration
│   ├── backend/            # Backend Dockerfile
│   └── frontend/           # Frontend Dockerfile
├── docs/                   # Documentation
├── scripts/                # Utility scripts
├── docker-compose.yml      # Docker Compose configuration
├── docker-compose.prod.yml # Production Docker Compose
└── README.md               # This file
```

## 🚢 Deployment

### Docker Deployment

```bash
# Build and run in production mode
docker-compose -f docker-compose.prod.yml up -d
```

The deployment includes:
- Automatic HTTPS certificate management via Traefik
- Production-optimized Docker images
- Database backup configuration

See the [deployment documentation](./docs/deployment.md) for detailed instructions on deploying to various platforms.

## 📚 Documentation

### Building Documentation Locally

You can build and run the documentation website locally using Docker:

```bash
# Build and run documentation
docker-compose -f docker-compose.docs.yml up --build
```

The documentation will be available at http://localhost:8000.

### Documentation Deployment

The documentation is automatically built and deployed when changes are pushed to the main branch. The GitHub Actions workflow handles:

1. Building a Docker image for the documentation
2. Pushing the image to Docker Hub and GitHub Container Registry
3. Deploying the documentation to GitHub Pages

You can find the deployed documentation at: https://docs.your-domain.com

### Contributing to Documentation

Documentation source files are located in the `website/content` directory. To add or update documentation:

1. Create or modify markdown files in the appropriate directory
2. Test your changes locally using the Docker setup
3. Push your changes to a feature branch and create a pull request
4. Once merged, the documentation will be automatically deployed

## 🔄 Development Workflow

### Using with Cursor

This template is optimized for use with Cursor:

1. Open the project in Cursor
2. Use AI code completion to navigate and modify code
3. Leverage custom Cursor commands in the `.cursor/` directory
4. Enjoy enhanced productivity with AI-powered development

### AI Integration Development

nexus makes it simple to integrate various AI services:

- Pre-configured connectors for popular AI APIs
- Example implementations for common AI patterns
- Structured components for AI-powered features
- Helper utilities for handling AI-specific data flows

### Development Best Practices

- Use feature branches for new features
- Write tests for all new code
- Run the pre-commit hooks before committing
- Follow the contribution guidelines

## 📚 Documentation

- [Backend API documentation](http://localhost:8000/docs) - Available when the backend is running
- [Frontend component documentation](http://localhost:8000/docs) - Available when the frontend is running
- [Project architecture](./docs/architecture.md)
- [Development guides](./docs/development.md)

## 📱 UI Preview

### Dashboard Login
![Login Screen](./docs/images/login.png)

### Main Dashboard
![Dashboard](./docs/images/dashboard.png)

### Dark Mode Support
![Dark Mode](./docs/images/dark-mode.png)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Contributing

Contributions are welcome! Please see our [contributing guidelines](CONTRIBUTING.md) for details.

## 🔄 Updating from Template

If you want to get updates from the template in the future:

```bash
# Add the template as a remote
git remote add template https://github.com/telepace/nexus.git

# Pull changes (without auto-merge)
git pull --no-commit template main

# Review changes and commit
git merge --continue
```

## 🙏 Acknowledgments

- FastAPI team for the amazing framework
- TypeScript team for type safety
- All open-source contributors whose work makes this possible

---

Built with ❤️ for AI entrepreneurs and freelancers. Happy coding!

## Development

See the [development guide](development.md) for instructions on setting up the development environment.

### Code Quality Tools

- **Linting**: We use various linters to maintain code quality
- **Spell Checking**: We use [typos](https://github.com/crate-ci/typos) for spell checking. The configuration is in `_typos.toml`

## Database Configuration Options

nexus supports two database deployment options:

1. **Direct PostgreSQL Deployment (Default)**: A PostgreSQL database is deployed alongside your application.
2. **Supabase Cloud Service**: Connect to a Supabase PostgreSQL database instance.

### Configuring Your Database

The system automatically detects which database to use based on environment variables:

- If `SUPABASE_URL` is set in your environment variables, the system will use Supabase
- If `SUPABASE_URL` is not set, the system will use direct PostgreSQL deployment

### Manual Configuration

You can configure the database by setting the appropriate environment variables:

#### For PostgreSQL Direct Deployment:

In your `.env` file, ensure these settings:

```
POSTGRES_SERVER=db
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=app
```

#### For Supabase:

In your `.env` file, set:

```
SUPABASE_URL=postgresql://postgres:your-password@db.abcdefghijkl.supabase.co:5432/postgres
```

## Development Workflows

This project provides optimized scripts and Makefile targets for common development tasks.

### Backend Development

- `make backend-install` - Install backend dependencies
- `make backend-run` - Run backend locally with hot reload
- `make backend-format` - Format backend code with ruff
- `make backend-lint` - Run linters (mypy, ruff) on backend code
- `make backend-test` - Run all backend tests with coverage
- `make backend-test-specific` - Run a specific backend test
- `make backend-coverage-report` - Open the HTML coverage report
- `make backend-prestart` - Run backend prestart initialization
- `make backend-migration` - Create a new database migration
- `make backend-migrate` - Run database migrations
- `make backend-downgrade` - Downgrade database to previous migration
- `make backend-shell` - Start a Python shell with app context
- `make backend-db-shell` - Connect to database with psql

### Frontend Development

- `make frontend-install` - Install frontend dependencies
- `make frontend` - Run frontend development server
- `make frontend-build` - Build frontend for production
- `make frontend-test` - Run frontend tests
- `make frontend-lint` - Run linters on frontend code

### Docker Workflows

- `make docker-build-all` - Build all Docker images
- `make docker-push-all` - Build and push all Docker images
- `make docker-deploy` - Deploy to Docker Swarm
- `make docker-test` - Run tests in Docker
- `make docker-test-local` - Run tests in local Docker environment

### Other Utilities

- `make generate-client` - Generate OpenAPI client for frontend
- `make format` - Format code in all components
- `make lint` - Run linters on all components
- `make clean` - Clean build artifacts

# Nexus 浏览器扩展重构计划

## 目标
- 优化扩展架构，减少冗余代码
- 重新设计UI，提高用户体验
- 将设置整合到options.html中
- 简化侧边栏功能，提高性能和可维护性
- 参考Sider等优秀扩展的设计模式

## 现状分析
目前扩展存在以下问题：
1. 多个重复或未使用的文件和模块
2. 侧边栏实现混合了原生DOM操作和React，不够统一
3. 设置功能分散在多个位置
4. UI组件结构复杂，维护困难
5. 缺乏统一的状态管理

## 架构重构计划

### 1. 核心架构优化
- **采用模块化设计**：清晰区分UI层、业务逻辑层和基础设施层
- **统一状态管理**：使用React Context或Redux管理全局状态
- **API抽象**：将所有浏览器API调用封装到单独的服务层

### 2. 组件结构调整
- **UI组件库精简**：保留必要的UI组件，移除未使用组件
- **功能组件化**：将每个主要功能（摘要、搜索等）封装为独立组件
- **采用React Hooks**：重构类组件为函数组件，使用hooks管理状态

### 3. 页面重组
- **侧边栏（SidePanel）**：专注于内容交互和AI对话功能
- **弹出窗口（Popup）**：提供快速访问和简要信息
- **选项页面（Options）**：集中所有设置管理功能

## 功能优化计划

### 1. 侧边栏优化
- 重新设计侧边栏UI，更简洁现代
- 实现类似Sider的AI对话界面
- 增强上下文感知能力，更好地理解当前页面内容
- 添加对话历史记录功能

### 2. 设置功能整合
- 将所有设置集中到options.html
- 按类别组织设置选项（一般设置、AI设置、剪藏设置等）
- 增加设置搜索功能
- 实现设置同步功能

### 3. 增强功能
- 实现多AI模型支持（类似Sider）
- 添加更丰富的上下文操作（翻译、解释、总结等）
- 改进内容提取算法，更准确识别页面主要内容
- 添加键盘快捷方式

## 技术实现计划

### 第一阶段：架构整理与基础重构
1. 清理未使用的代码和文件
2. 创建新的核心架构（服务层、状态管理）
3. 重构基础UI组件库

### 第二阶段：功能组件重构
1. 重构侧边栏核心组件
2. 重构弹出窗口UI
3. 重新设计Options页面

### 第三阶段：功能优化与扩展
1. 实现新的AI对话界面
2. 增强设置功能
3. 添加新功能

### 第四阶段：测试与性能优化
1. 全面测试各项功能
2. 性能优化
3. 兼容性测试

## 具体实施计划
每个阶段详细的任务清单和实现时间表将根据开发资源和优先级另行制定。

## 重构进度

### 已完成
1. 设计规划：制定了全面的重构计划
2. 侧边栏重构：
   - 重新设计了侧边栏组件，使用React Hooks和函数组件
   - 实现了类似Sider的对话界面
   - 增加了对话历史管理
   - 添加了暗色模式切换
3. 选项页面重构：
   - 设计了全新的选项页面布局，采用侧边导航样式
   - 将所有设置集中归类，包括一般设置、AI设置、剪藏设置和键盘快捷键等
   - 实现了多AI模型支持和API密钥配置
   - 添加了快捷提示管理功能

### 未完成
1. Popup页面重构
2. 背景服务优化
3. 内容脚本优化
4. 状态管理统一
5. API服务层抽象
6. Manifest.json更新

## 下一步计划
1. 更新manifest.json，添加必要的权限和配置
2. 重构Popup页面，实现快速访问功能
3. 创建服务层，统一API调用
4. 实现状态管理系统，使用React Context或Redux
5. 优化页面内容提取算法
6. 增强AI功能，添加更多模型支持

## ⚠️ OpenAI API 版本说明

- 默认的 `OPENAI_BASE_URL` 配置为 `https://api.openai.com/v1`，即使用 OpenAI API v1 版本（当前支持 GPT-4.1）。
- 如需升级 OpenAI API 版本，请相应修改 `.env` 或 `docker-compose.yml` 中的 `OPENAI_BASE_URL` 变量，例如：`https://api.openai.com/v2`。
- 请参考 OpenAI 官方文档，确保新版本兼容。