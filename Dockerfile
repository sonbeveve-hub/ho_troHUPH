# syntax=docker/dockerfile:1

# --- Giai đoạn build: cài đặt qua npm workspaces (chỉ có 1 package-lock.json ở gốc repo,
# không có lockfile riêng cho client/ hay server/, nên PHẢI "npm ci" từ gốc, không phải
# "npm ci --prefix client") rồi build client bằng đúng script gốc "npm run build --workspace client". ---
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
COPY client/package.json ./client/package.json
RUN npm ci
COPY server ./server
COPY client ./client
RUN npm run build --workspace client
# Gỡ hết devDependencies (vite, tailwind, concurrently...) khỏi node_modules trước khi mang
# sang image chạy thật — client đã build xong thành file tĩnh, không cần nguồn nữa.
RUN npm prune --omit=dev

# --- Giai đoạn runtime ---
# Debian (không phải Alpine/musl) để better-sqlite3 và bcrypt (native module) dùng đúng
# prebuilt binary linux-x64-glibc, khỏi phải cài build-essential/python3 để tự biên dịch.
FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server ./server
COPY --from=build /app/client/dist ./client/dist

# server/data (app.db + uploads) được mount làm volume ở docker-compose.yml, không copy vào image.
EXPOSE 4000
CMD ["node", "server/src/index.js"]
