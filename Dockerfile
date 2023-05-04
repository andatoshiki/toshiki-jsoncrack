# Builder
FROM node:16-buster as builder
WORKDIR /src
COPY . /src
# RUN npm config set registry https://registry.npm.taobao.org
RUN npm install --legacy-peer-deps
RUN npm run build

# App
FROM nginxinc/nginx-unprivileged
COPY --from=builder /src/out /app
COPY default.conf /etc/nginx/conf.d/default.conf
