FROM ghcr.io/berriai/litellm:main-stable

# 检测 OS 类型并安装 PostgreSQL 客户端工具
RUN if grep -q Alpine /etc/os-release; then \
        # Alpine Linux
        apk add --no-cache postgresql-client curl bash; \
    else \
        # Debian/Ubuntu
        apt-get update && apt-get install -y postgresql-client curl && \
        apt-get clean && rm -rf /var/lib/apt/lists/*; \
    fi

WORKDIR /app

# 设置启动脚本
COPY ./startup.sh /startup.sh
RUN chmod +x /startup.sh

# 设置配置文件
COPY ./config.yaml /app/config.yaml

ENTRYPOINT ["/startup.sh"]
CMD ["--config", "/app/config.yaml"] 