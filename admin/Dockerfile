# Simple Dockerfile for admin service placeholder
FROM nginx:alpine

WORKDIR /usr/share/nginx/html

# Create a basic index.html for admin dashboard placeholder
RUN echo '<!DOCTYPE html>' > index.html && \
    echo '<html lang="en">' >> index.html && \
    echo '<head>' >> index.html && \
    echo '    <meta charset="UTF-8">' >> index.html && \
    echo '    <meta name="viewport" content="width=device-width, initial-scale=1.0">' >> index.html && \
    echo '    <title>Admin Dashboard</title>' >> index.html && \
    echo '    <style>' >> index.html && \
    echo '        body {' >> index.html && \
    echo '            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;' >> index.html && \
    echo '            display: flex;' >> index.html && \
    echo '            justify-content: center;' >> index.html && \
    echo '            align-items: center;' >> index.html && \
    echo '            height: 100vh;' >> index.html && \
    echo '            margin: 0;' >> index.html && \
    echo '            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);' >> index.html && \
    echo '            color: white;' >> index.html && \
    echo '        }' >> index.html && \
    echo '        .container {' >> index.html && \
    echo '            text-align: center;' >> index.html && \
    echo '            padding: 2rem;' >> index.html && \
    echo '            background: rgba(255, 255, 255, 0.1);' >> index.html && \
    echo '            border-radius: 10px;' >> index.html && \
    echo '            backdrop-filter: blur(10px);' >> index.html && \
    echo '        }' >> index.html && \
    echo '        h1 { margin-bottom: 1rem; }' >> index.html && \
    echo '        p { opacity: 0.8; }' >> index.html && \
    echo '    </style>' >> index.html && \
    echo '</head>' >> index.html && \
    echo '<body>' >> index.html && \
    echo '    <div class="container">' >> index.html && \
    echo '        <h1>🚧 Admin Dashboard</h1>' >> index.html && \
    echo '        <p>Coming Soon...</p>' >> index.html && \
    echo '        <p>This service is under development.</p>' >> index.html && \
    echo '    </div>' >> index.html && \
    echo '</body>' >> index.html && \
    echo '</html>' >> index.html

# Create nginx config to serve on port 5173
RUN echo 'server {' > /etc/nginx/conf.d/default.conf && \
    echo '    listen 5173;' >> /etc/nginx/conf.d/default.conf && \
    echo '    server_name localhost;' >> /etc/nginx/conf.d/default.conf && \
    echo '    root /usr/share/nginx/html;' >> /etc/nginx/conf.d/default.conf && \
    echo '    index index.html;' >> /etc/nginx/conf.d/default.conf && \
    echo '    ' >> /etc/nginx/conf.d/default.conf && \
    echo '    location / {' >> /etc/nginx/conf.d/default.conf && \
    echo '        try_files $uri $uri/ /index.html;' >> /etc/nginx/conf.d/default.conf && \
    echo '    }' >> /etc/nginx/conf.d/default.conf && \
    echo '    ' >> /etc/nginx/conf.d/default.conf && \
    echo '    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {' >> /etc/nginx/conf.d/default.conf && \
    echo '        add_header Access-Control-Allow-Origin *;' >> /etc/nginx/conf.d/default.conf && \
    echo '        expires 1y;' >> /etc/nginx/conf.d/default.conf && \
    echo '        add_header Cache-Control "public, immutable";' >> /etc/nginx/conf.d/default.conf && \
    echo '    }' >> /etc/nginx/conf.d/default.conf && \
    echo '}' >> /etc/nginx/conf.d/default.conf

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf.dpkg-dist 2>/dev/null || true

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"] 