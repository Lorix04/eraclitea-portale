#!/bin/bash
# scripts/server-status.sh
# Genera metriche server in JSON — eseguito ogni minuto da cron host
# Output: storage/server-status.json
# Crontab: * * * * * /root/eraclitea-portale/scripts/server-status.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT="${SCRIPT_DIR}/../storage/server-status.json"
TEMP="${OUTPUT}.tmp"

safe() { eval "$1" 2>/dev/null || echo "$2"; }

# CPU
LOAD=$(awk '{print $1}' /proc/loadavg)
LOAD5=$(awk '{print $2}' /proc/loadavg)
LOAD15=$(awk '{print $3}' /proc/loadavg)
CORES=$(nproc 2>/dev/null || echo 1)

# RAM
read -r MEM_TOTAL MEM_USED MEM_FREE <<< "$(free -m | awk 'NR==2{print $2,$3,$4}')"

# Disco
read -r DISK_TOTAL DISK_USED DISK_FREE DISK_PCT <<< "$(df -h / | awk 'NR==2{print $2,$3,$4,$5}')"

# Uptime
UPTIME=$(safe "uptime -p" "N/A")
KERNEL=$(uname -r)

# Docker
docker_field() { safe "docker inspect --format='$2' $1" "$3"; }
D_APP_ST=$(docker_field portale-app '{{.State.Status}}' unknown)
D_DB_ST=$(docker_field portale-db '{{.State.Status}}' unknown)
D_APP_START=$(docker_field portale-app '{{.State.StartedAt}}' "")
D_DB_START=$(docker_field portale-db '{{.State.StartedAt}}' "")
D_APP_HP=$(docker_field portale-app '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' none)
D_DB_HP=$(docker_field portale-db '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' none)

# SSL
SSL_RAW=$(safe "openssl x509 -enddate -noout -in /etc/letsencrypt/live/sapienta.it/fullchain.pem" "notAfter=unknown")
SSL_EXP=$(echo "$SSL_RAW" | cut -d= -f2)
if [ "$SSL_EXP" != "unknown" ]; then
  SSL_EPOCH=$(date -d "$SSL_EXP" +%s 2>/dev/null || echo 0)
  SSL_DAYS=$(( (SSL_EPOCH - $(date +%s)) / 86400 ))
else
  SSL_DAYS=-1
fi
SSL_RENEW=$(safe "stat -c '%Y' /etc/letsencrypt/live/sapienta.it/fullchain.pem | xargs -I{} date -d @{} -u +%Y-%m-%dT%H:%M:%SZ" "unknown")

# Fail2ban
F2B_SSH=$(safe "fail2ban-client status sshd" "")
F2B_NGX=$(safe "fail2ban-client status nginx-http-auth" "")
f2b_val() { echo "$1" | grep "$2" | awk '{print $NF}'; }
SSHD_CUR=$(f2b_val "$F2B_SSH" "Currently banned"); SSHD_CUR=${SSHD_CUR:-0}
SSHD_TOT=$(f2b_val "$F2B_SSH" "Total banned"); SSHD_TOT=${SSHD_TOT:-0}
NGX_CUR=$(f2b_val "$F2B_NGX" "Currently banned"); NGX_CUR=${NGX_CUR:-0}
NGX_TOT=$(f2b_val "$F2B_NGX" "Total banned"); NGX_TOT=${NGX_TOT:-0}

# SSH
SSH_FAIL=$(safe "grep -c 'Failed' /var/log/auth.log" "0")

# Top attackers
TOP_IPS=$(safe "grep 'Failed' /var/log/auth.log | grep -oP 'from \K[\d.]+' | sort | uniq -c | sort -rn | head -10 | awk '{printf \"{\\\"ip\\\":\\\"%s\\\",\\\"count\\\":%d},\",\$2,\$1}'" "")
TOP_IPS="[${TOP_IPS%,}]"

# Last failed SSH
LAST_F=$(safe "grep 'Failed' /var/log/auth.log | tail -10 | awk '{printf \"{\\\"time\\\":\\\"%s %s %s\\\",\\\"ip\\\":\\\"%s\\\"},\",\$1,\$2,\$3,\$(NF-3)}'" "")
LAST_F="[${LAST_F%,}]"

# Backups
BK_LIST=$(safe "ls -lh /root/backups/*.sql.gz 2>/dev/null | tail -7 | awk '{printf \"{\\\"file\\\":\\\"%s\\\",\\\"size\\\":\\\"%s\\\",\\\"date\\\":\\\"%s %s %s\\\"},\",\$9,\$5,\$6,\$7,\$8}'" "")
BK_LIST="[${BK_LIST%,}]"
BK_CNT=$(safe "ls /root/backups/*.sql.gz 2>/dev/null | wc -l" "0")
BK_LAST=$(safe "ls -lt /root/backups/*.sql.gz 2>/dev/null | head -1 | awk '{print \$6,\$7,\$8}'" "mai")
BK_SIZE=$(safe "ls -lh /root/backups/*.sql.gz 2>/dev/null | head -1 | awk '{print \$5}'" "0")

# Cron jobs
CRON_ER=$(safe "grep 'email-retry' /var/log/syslog 2>/dev/null | tail -1 | awk '{print \$1,\$2,\$3}'" "mai")
CRON_IC=$(safe "grep 'integrity-check' /var/log/syslog 2>/dev/null | tail -1 | awk '{print \$1,\$2,\$3}'" "mai")
CRON_CV=$(safe "grep 'cv-dpr445' /var/log/syslog 2>/dev/null | tail -1 | awk '{print \$1,\$2,\$3}'" "mai")
CRON_BK=$(safe "grep 'pg_dump' /var/log/syslog 2>/dev/null | tail -1 | awk '{print \$1,\$2,\$3}'" "mai")

# Storage
ST_DIR="${SCRIPT_DIR}/../storage"
ST_TOT=$(safe "du -sh $ST_DIR | awk '{print \$1}'" "N/A")
ST_DET=$(safe "du -sh $ST_DIR/*/ 2>/dev/null | awk '{printf \"{\\\"dir\\\":\\\"%s\\\",\\\"size\\\":\\\"%s\\\"},\",\$2,\$1}'" "")
ST_DET="[${ST_DET%,}]"

# Misc
NGX_VER=$(safe "nginx -v 2>&1 | awk -F/ '{print \$2}'" "unknown")
UFW=$(safe "ufw status | head -1 | awk '{print \$2}'" "unknown")
RESP=$(safe "curl -s -o /dev/null -w '%{time_total}' --connect-timeout 5 https://sapienta.it" "N/A")

# Generate JSON
cat > "$TEMP" << ENDJSON
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "uptime": "$UPTIME",
  "kernel": "$KERNEL",
  "cpu": {"load1":$LOAD,"load5":$LOAD5,"load15":$LOAD15,"cores":$CORES},
  "memory": {"total_mb":${MEM_TOTAL:-0},"used_mb":${MEM_USED:-0},"free_mb":${MEM_FREE:-0}},
  "disk": {"total":"$DISK_TOTAL","used":"$DISK_USED","free":"$DISK_FREE","percent":"$DISK_PCT"},
  "docker": {
    "app":{"status":"$D_APP_ST","health":"$D_APP_HP","started_at":"$D_APP_START"},
    "db":{"status":"$D_DB_ST","health":"$D_DB_HP","started_at":"$D_DB_START"}
  },
  "ssl": {"expiry":"$SSL_EXP","days_left":$SSL_DAYS,"last_renewal":"$SSL_RENEW"},
  "fail2ban": {
    "sshd":{"currently_banned":$SSHD_CUR,"total_banned":$SSHD_TOT},
    "nginx":{"currently_banned":$NGX_CUR,"total_banned":$NGX_TOT}
  },
  "ssh": {"failed_24h":$SSH_FAIL,"top_attackers":$TOP_IPS,"last_failed":$LAST_F},
  "backups": {"count":$BK_CNT,"latest_date":"$BK_LAST","latest_size":"$BK_SIZE","list":$BK_LIST},
  "cron": {"email_retry":"$CRON_ER","integrity_check":"$CRON_IC","cv_dpr445_reminder":"$CRON_CV","backup":"$CRON_BK"},
  "storage": {"total":"$ST_TOT","detail":$ST_DET},
  "nginx_version": "$NGX_VER",
  "firewall": "$UFW",
  "response_time": "$RESP"
}
ENDJSON

mv "$TEMP" "$OUTPUT"
chmod 644 "$OUTPUT"
