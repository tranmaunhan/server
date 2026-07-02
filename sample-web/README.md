# Expense Web Starter

Frontend React nay dung runtime config, nghia la image build xong van co the doi:

- `VITE_APP_NAME`
- `VITE_API_BASE_URL`
- `VITE_GOOGLE_CLIENT_ID`

ma khong can sua source code.

Neu ban quan ly CI/CD bang GitHub, co the dat cac gia tri nay trong GitHub Variables/Secrets, sau do cap nhat `.env` tren server de container nhan lai khi restart/deploy.

## Luong dang nhap

1. Frontend tai Google Identity Services.
2. Nguoi dung dang nhap bang Google.
3. Frontend gui `credential` len `POST /api/auth/google`.
4. Backend verify token, luu user vao PostgreSQL va tra DTO nguoi dung.
5. Frontend goi `GET /api/users/me` bang Bearer token de khoi phuc phien.
