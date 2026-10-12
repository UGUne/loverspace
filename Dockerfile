# 恋人空间 · 后端生产镜像
# 直接运行现有的 server.js（含 /api/* 同步接口 + 照片上传 + 静态托管）
# 适用于：Railway / Render / 任意支持 Docker 的平台 / 自有 VPS
FROM node:20-alpine

WORKDIR /app

# 只装运行时依赖（express）。@vercel/* 仅 Vercel 路线用得到，这里不装，镜像更轻。
COPY package.json ./
RUN npm install --omit=dev express@^4 || npm install express@^4

# 复制应用代码与静态资源
COPY server.js ./
COPY index.html ./
COPY stickers ./stickers
COPY icons ./icons
COPY manifest.json ./

# 运行时数据目录（务必挂载持久卷到 /app/data，否则重启即清空）
RUN mkdir -p /app/data/uploads
VOLUME ["/app/data"]

ENV PORT=3000
ENV NODE_ENV=production
EXPOSE 3000

# 启动前若 data 被卷覆盖为空，server.js 会自动重建空的 rooms
CMD ["node", "server.js"]
