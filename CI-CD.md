# CI/CD cho Spring Boot va React

Repo nay da duoc cau hinh san 2 GitHub Actions:

- `.github/workflows/deploy-spring-api.yml`
- `.github/workflows/deploy-react-web.yml`

Dong thoi moi project deu co file deploy rieng trong thu muc cua no:

- `sample-api/.ci/deploy.env`
- `sample-web/.ci/deploy.env`

Moi workflow se:

1. checkout code
2. doc file deploy config trong chinh project
3. dang nhap Docker Hub
4. build image
5. push image moi len Docker Hub
6. goi Deploy Manager tai `https://deploy.aihost.io.vn/deploy`

Deploy Manager se tu:

1. tra ngay `202 Accepted` voi `jobId`
2. dua deploy vao hang doi nen
3. `docker compose pull <serviceName>`
4. `docker compose up -d --no-deps <serviceName>`
5. health check
6. ghi audit log

## GitHub Secrets can tao

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`
- `DEPLOY_TOKEN`

## GitHub Variables tuy chon

- `DOCKER_IMAGE_NAMESPACE`

Neu khong dat bien nay, workflow se mac dinh dung `DOCKERHUB_USERNAME` lam namespace image.

Vi du:

```text
DOCKER_IMAGE_NAMESPACE=your-dockerhub-user
```

## Cau hinh server can khop

Trong `.env` tren server, can dat dung image:

```env
SPRING_API_IMAGE=your-dockerhub-user/sample-spring-api:latest
REACT_WEB_IMAGE=your-dockerhub-user/sample-react-web:latest
```

Neu server van de:

```env
SPRING_API_IMAGE=sample-spring-api:dev
REACT_WEB_IMAGE=sample-react-web:dev
```

thi workflow push thanh cong nhung server se khong pull dung image moi.

## ServiceName ma workflow goi

- Spring Boot: `spring-api`
- React: `react-web`

Hai ten nay da duoc khai bao trong `deploy-manager/config/apps.json`.

## Vi sao workflow van nam o root

GitHub Actions chi nhan workflow trong `.github/workflows` cua repo goc.

Vi vay:

- workflow kich hoat van nam o root
- config deploy cua tung app nam ngay trong thu muc project

Cach nay giu duoc 2 loi ich:

1. hien tai van chay tot trong monorepo
2. sau nay tach `sample-api` hoac `sample-web` thanh repo rieng rat de

## Cach dung

### Tu dong

- push code vao nhanh `main`
- neu thay doi trong `sample-api/**` thi workflow Spring Boot chay
- neu thay doi trong `sample-web/**` thi workflow React chay

### Thu cong

- vao tab `Actions`
- chon workflow can chay
- bam `Run workflow`

## Kiem tra deploy

API public:

```text
GET https://deploy.aihost.io.vn/deploy/healthz
GET https://deploy.aihost.io.vn/deploy/apps
GET https://deploy.aihost.io.vn/deploy/jobs/:jobId
POST https://deploy.aihost.io.vn/deploy
```

UI noi bo:

```text
http://IP-LAN-CUA-SERVER:18080/ui/
```

## Ghi chu quan trong

- Kieu CI/CD nay phu hop nhat khi server dung tag `latest`
- Workflow khong gui image hay command tuy y
- GitHub Actions chi gui `serviceName`
- Deploy Manager la noi duy nhat duoc quyen `pull/up`
