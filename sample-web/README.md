# Sample Web

React app nay da duoc cau hinh de co the tach thanh repo rieng va deploy doc lap.

## File deploy local cho rieng project

- `.ci/deploy.env`
- `Dockerfile`
- `.dockerignore`

`deploy.env` dinh nghia:

- `SERVICE_NAME`
- `DOCKER_CONTEXT`
- `IMAGE_REPOSITORY`
- `IMAGE_TAG`
- `DEPLOY_URL`

Khi repo nay con nam trong monorepo, workflow goc se doc file nay de build/push/deploy rieng cho `sample-web`.

Neu sau nay tach thanh repo doc lap, ban co the giu nguyen file nay va doi workflow sang repo moi.
