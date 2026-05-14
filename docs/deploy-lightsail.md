# Lightsail Docker Deployment

This app is a static Vite build served from a small Nginx container.

## First Deploy

```bash
cd /opt/commsdock/apps/yealink-mac-scanner
git pull --ff-only
docker compose up -d --build
```

Check it locally on the server:

```bash
curl -I http://localhost:8080
docker compose ps
docker compose logs --tail=50
```

## Update Deploy

```bash
cd /opt/commsdock/apps/yealink-mac-scanner
git pull --ff-only
docker compose up -d --build
docker image prune -f
```

## Disk Checks

This Lightsail instance has a small root volume, so check disk usage after deployments:

```bash
df -h
docker system df
```

Use this cleanup when disk gets tight:

```bash
docker system prune -af
```
