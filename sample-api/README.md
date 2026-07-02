# Expense API Starter

Spring Boot backend nay duoc dat san theo dung flow:

- `entity`
- `repository`
- `service`
- `service/impl`
- `controller`
- `mapper`
- DTO tach rieng, controller khong tra truc tiep entity

Backend hien khong con dung Flyway. Schema duoc Hibernate quan ly thong qua `SPRING_JPA_HIBERNATE_DDL_AUTO` va mac dinh la `update`.

## Chuc nang da co

- Dang nhap Google bang ID Token
- Xac thuc token Google o backend
- Dong bo user vao PostgreSQL
- API lay user hien tai: `GET /api/users/me`
- Health check: `GET /api/health`

## Bien moi truong can co

- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `GOOGLE_ALLOWED_CLIENT_IDS`
- `APP_ALLOWED_ORIGINS`

Neu ban quan ly CI/CD bang GitHub, hay luu cac gia tri nay trong GitHub Secrets/Variables va dong bo xuong file `.env` tren server truoc khi deploy.

## Luu y

`GOOGLE_ALLOWED_CLIENT_IDS` co the la danh sach phan tach bang dau phay neu ban dung nhieu client ID cho local va production.
