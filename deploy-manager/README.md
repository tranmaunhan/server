# Deploy Manager

Deploy Manager duoc thiet ke theo nguyen tac **Build Once, Run Anywhere**:

- Build thanh **mot Docker image duy nhat**
- Push len **Docker Hub**
- Moi server production chi can:
  - `docker pull`
  - cap `.env`
  - mount `docker-compose.yml`, `nginx/`, `deploy-manager/config/`
  - `docker compose up -d`

## Muc tieu

- GitHub Actions chi goi API deploy bang **Bearer Token**
- Request deploy chi duoc gui:

```json
{
  "serviceName": "my-api"
}
```

- Client **khong duoc** gui image, tag, digest, command hay compose path
- Deploy Manager tu doc whitelist de biet:
  - service nao duoc phep deploy
  - map sang compose service nao
  - image metadata nao dang duoc quan ly
  - health check URL nao can doi

## Cac thao tac deploy duoc phep

Khi nhan deploy cho mot `serviceName`, service se:

1. `docker compose pull <composeService>`
2. `docker compose up -d <composeService>`
3. health check theo whitelist
4. ghi audit log JSONL

## Cau hinh bang env

Tat ca runtime config deu lay tu env:

- `DEPLOY_TOKEN`
- `DEPLOY_ADMIN_TOKEN`
- `DEPLOY_CONFIG`
- `ROUTES_CONFIG`
- `DEPLOY_AUDIT_LOG`
- `COMPOSE_PROJECT_DIR`
- `COMPOSE_FILE_PATH`
- `COMPOSE_ENV_FILE`
- `NGINX_GENERATED_CONFIG`
- `NGINX_CONTAINER_NAME`
- `NGINX_MANAGEMENT_ENABLED`
- `HEALTHCHECK_TIMEOUT_MS`
- `HEALTHCHECK_INTERVAL_MS`

## Schema whitelist app

`deploy-manager/config/apps.json`

```json
{
  "apps": [
    {
      "serviceName": "my-api",
      "displayName": "My API",
      "enabled": true,
      "composeService": "my-api",
      "image": "ghcr.io/company/my-api",
      "healthCheckUrl": "http://my-api:8080/healthz",
      "healthCheckMethod": "GET",
      "healthCheckExpectedStatus": 200,
      "healthCheckTimeoutMs": 60000,
      "healthCheckIntervalMs": 3000
    }
  ]
}
```

## Schema route nginx

`deploy-manager/config/routes.json`

```json
{
  "routes": [
    {
      "id": "api-public",
      "enabled": true,
      "hostname": "api.example.com",
      "pathPrefix": "/",
      "serviceName": "my-api",
      "targetPort": 8080
    }
  ]
}
```

## API

Deploy API:

- `POST /deploy`
- `GET /apps`
- `GET /healthz`

Admin API:

- `GET /admin/apps`
- `POST /admin/apps`
- `PUT /admin/apps/:serviceName`
- `PATCH /admin/apps/:serviceName`
- `DELETE /admin/apps/:serviceName`
- `GET /admin/routes`
- `POST /admin/routes`
- `PUT /admin/routes/:id`
- `PATCH /admin/routes/:id`
- `DELETE /admin/routes/:id`
- `GET /admin/nginx/preview`
- `POST /admin/nginx/apply`
- `GET /admin/deployments`
- `GET /ui/`

Tat ca API deploy dung:

```text
Authorization: Bearer <DEPLOY_TOKEN>
```

Tat ca admin API/UI dung:

```text
Authorization: Bearer <DEPLOY_ADMIN_TOKEN>
```

Neu `DEPLOY_ADMIN_TOKEN` bo trong, service se dung chung `DEPLOY_TOKEN`.

## Docker image

Dockerfile da dung **multi-stage build**.

Build local:

```bash
docker build -t your-dockerhub-user/deploy-manager:latest ./deploy-manager
```

Push Docker Hub:

```bash
docker push your-dockerhub-user/deploy-manager:latest
```

## Chay dev local

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

UI local:

```text
http://127.0.0.1:18080/ui/
```

## Chay production

Production compose **khong can build source code**. Chi can:

1. Upload `docker-compose.yml`, `.env`, `nginx/`, `deploy-manager/config/`
2. Dat `DEPLOY_MANAGER_IMAGE=your-dockerhub-user/deploy-manager:latest`
3. `docker compose pull`
4. `docker compose up -d`

## Bao mat

- UI/Admin khong nen expose public qua Cloudflare Tunnel
- Public nginx chi nen expose `POST /deploy`, `GET /deploy/apps`, `GET /deploy/healthz`
- Mount `docker.sock` la quyen rat manh, chi cap token cho he thong tin cay
- App dich va nginx phai cung network de proxy theo `composeService`
