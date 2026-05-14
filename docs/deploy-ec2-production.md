# EC2 Production Deployment Guide

This guide documents the first production-style deployment of the Yealink MAC Scanner to an AWS EC2 Ubuntu 24.04 server.

The final shape is:

```text
Mobile browser
  -> https://macscanner.telcoconcepts.com.au
  -> EC2 security group ports 80/443
  -> Caddy reverse proxy on Ubuntu
  -> Docker web app on 127.0.0.1:8080
  -> Docker email API on 127.0.0.1:8081
  -> Nginx serving the built Vite app
  -> AWS SES sending batch emails
```

## 1. Create The EC2 Instance

Create a small Ubuntu server in AWS EC2.

Recommended starting settings:

- AMI: Ubuntu Server 24.04 LTS
- Instance size: a small general-purpose instance is fine for this static app
- Storage: 8 GB works for learning, but monitor disk usage
- Key pair: create or select an SSH key pair and download the `.pem`
- Elastic IP: allocate one and associate it with the instance

Record:

```text
Elastic IP: your-server-ip
Subdomain: macscanner.telcoconcepts.com.au
```

## 2. Configure EC2 Security Group

Start with these inbound rules:

```text
SSH    TCP 22   your public IP if possible
HTTP   TCP 80   0.0.0.0/0
HTTPS  TCP 443  0.0.0.0/0
```

Temporary test rule during early Docker testing:

```text
Custom TCP 8080  0.0.0.0/0
```

Remove public `8080` after HTTPS is confirmed working through Caddy.

## 3. Point DNS To The Server

Create an A record:

```text
Type: A
Name: macscanner
Value: your Elastic IP
TTL: 300 or Auto
```

Expected result:

```text
macscanner.telcoconcepts.com.au -> your Elastic IP
```

## 4. Connect With SSH From Windows

From PowerShell:

```powershell
ssh -i "C:\path\to\your-key.pem" ubuntu@your-server-ip
```

If SSH rejects the key because permissions are too open, lock the key down:

```powershell
icacls "C:\path\to\your-key.pem" /inheritance:r
icacls "C:\path\to\your-key.pem" /remove "BUILTIN\Users"
icacls "C:\path\to\your-key.pem" /grant:r "YOUR-WINDOWS-USER:R"
```

Then reconnect.

## 5. Initial Ubuntu Setup

Run on the server:

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg git ufw unzip htop
```

Confirm Ubuntu:

```bash
lsb_release -a
```

Set timezone:

```bash
sudo timedatectl set-timezone Australia/Sydney
timedatectl
```

Enable the host firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Expected UFW status:

```text
OpenSSH ALLOW
80/tcp  ALLOW
443/tcp ALLOW
```

## 6. Install Docker

Check disk first:

```bash
df -h
```

Install Docker from Docker's Ubuntu repository:

```bash
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

```bash
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Allow the `ubuntu` user to run Docker:

```bash
sudo usermod -aG docker ubuntu
exit
```

SSH back in, then verify:

```bash
docker --version
docker compose version
docker run hello-world
df -h
```

## 7. Clone The App Repo

Create the app directory:

```bash
sudo mkdir -p /opt/commsdock/apps
sudo chown -R ubuntu:ubuntu /opt/commsdock
```

Clone the repo:

```bash
cd /opt/commsdock/apps
git clone https://github.com/CommsDock/yealink-mac-scanner.git
cd yealink-mac-scanner
```

Confirm:

```bash
ls -la
git log --oneline -3
```

## 8. Build And Run With Docker Compose

From the repo directory:

```bash
cd /opt/commsdock/apps/yealink-mac-scanner
printf "SES_REGION=ap-southeast-2\nSES_FROM_EMAIL=macscanner@telcoconcepts.com.au\nALLOWED_RECIPIENT_DOMAINS=telcoconcepts.com.au\n" > .env
docker compose up -d --build
```

Check the container:

```bash
docker compose ps
curl -I http://localhost:8080
curl -I http://localhost:8081/health
df -h
```

Expected:

```text
HTTP/1.1 200 OK
```

Temporary browser test while port `8080` is open:

```text
http://your-server-ip:8080
```

Camera access will not work properly here because this is plain HTTP. The real app URL must use HTTPS.

## 9. Install Caddy For HTTPS

Caddy is the reverse proxy. It receives public HTTPS traffic and forwards web requests to `127.0.0.1:8080`, and email API requests to `127.0.0.1:8081`.

Install Caddy:

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
```

```bash
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
```

```bash
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
```

```bash
sudo apt update
sudo apt install -y caddy
```

Verify:

```bash
caddy version
sudo systemctl status caddy --no-pager
```

## 10. Configure Caddy

Confirm DNS resolves from the server:

```bash
getent hosts macscanner.telcoconcepts.com.au
```

Edit the Caddyfile:

```bash
sudo nano /etc/caddy/Caddyfile
```

Use:

```caddyfile
macscanner.telcoconcepts.com.au {
	handle /api/* {
		reverse_proxy 127.0.0.1:8081
	}

	handle {
		reverse_proxy 127.0.0.1:8080
	}
}
```

Validate and reload:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo systemctl status caddy --no-pager
```

Test HTTPS:

```bash
curl -I https://macscanner.telcoconcepts.com.au
```

Expected:

```text
HTTP/2 200
```

or:

```text
HTTP/1.1 200 OK
```

Then test from mobile:

```text
https://macscanner.telcoconcepts.com.au
```

The camera scanner should now be available because the site is served over HTTPS.

## 11. Lock Down Port 8080

After HTTPS works, remove the temporary EC2 Security Group rule:

```text
Custom TCP 8080  0.0.0.0/0
```

Keep:

```text
SSH    TCP 22
HTTP   TCP 80
HTTPS  TCP 443
```

The Docker app can continue listening on host port `8080`; it just does not need to be public.

## 12. Normal Update Deploy

When new commits are pushed:

```bash
cd /opt/commsdock/apps/yealink-mac-scanner
git pull --ff-only
docker compose up -d --build
docker image prune -f
```

Health checks:

```bash
docker compose ps
curl -I https://macscanner.telcoconcepts.com.au
curl -I http://localhost:8081/health
df -h
```

## 13. Useful Operations Commands

View running containers:

```bash
docker ps
docker compose ps
```

View app logs:

```bash
cd /opt/commsdock/apps/yealink-mac-scanner
docker compose logs --tail=100
```

Restart the app:

```bash
docker compose restart
```

Stop the app:

```bash
docker compose down
```

Start the app again:

```bash
docker compose up -d
```

Check disk:

```bash
df -h
docker system df
```

Clean Docker cache when disk gets tight:

```bash
docker system prune -af
```

## 14. What Each Layer Does

```text
EC2
  The Ubuntu virtual machine.

Elastic IP
  Stable public IP address attached to the EC2 instance.

Security Group
  AWS-level firewall before traffic reaches Ubuntu.

UFW
  Ubuntu-level firewall on the server.

Docker
  Runs the app in a repeatable container.

Docker Compose
  Defines and starts the app service.

Nginx container
  Serves the static Vite production build.

Email API container
  Receives `/api/email-captures` requests and sends the captured list through AWS SES.

Caddy
  Handles public HTTPS and forwards requests to the web app or email API.

AWS SES
  Sends emails from `macscanner@telcoconcepts.com.au`.
```

## 15. Email Sending With AWS SES

The email feature uses the AWS SES API from the server-side email API container. Do not put SMTP credentials or AWS keys in the browser app.

AWS setup:

- SES region: `ap-southeast-2`
- Verified sender domain: `telcoconcepts.com.au`
- From address: `macscanner@telcoconcepts.com.au`
- EC2 IAM role permission: `ses:SendEmail` and `ses:SendRawEmail`

Sandbox note:

```text
While SES is in sandbox, recipients must also be verified identities.
After production access is approved, normal colleague recipient addresses can receive emails.
```

Server config lives in `/opt/commsdock/apps/yealink-mac-scanner/.env`:

```bash
SES_REGION=ap-southeast-2
SES_FROM_EMAIL=macscanner@telcoconcepts.com.au
ALLOWED_RECIPIENT_DOMAINS=telcoconcepts.com.au
```

The recipient-domain allowlist prevents the public email endpoint from becoming an open relay. Add comma-separated domains only when there is a real business need:

```bash
ALLOWED_RECIPIENT_DOMAINS=telcoconcepts.com.au,example-partner.com
```

After changing `.env`, restart:

```bash
docker compose up -d
```

## 16. Current Production URL

```text
https://macscanner.telcoconcepts.com.au
```
