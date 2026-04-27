#!/bin/sh

set -eu

CERT_DIR=".cert"
KEY_FILE="$CERT_DIR/dev-key.pem"
CERT_FILE="$CERT_DIR/dev-cert.pem"
CONFIG_FILE="$CERT_DIR/openssl.cnf"

mkdir -p "$CERT_DIR"

HOSTNAME_VALUE="$(hostname | tr -d '\n')"
LOCAL_IP=""

DEFAULT_INTERFACE=""

if command -v route >/dev/null 2>&1; then
  DEFAULT_INTERFACE="$(route get default 2>/dev/null | awk '/interface:/{print $2; exit}')"
fi

for candidate in "$DEFAULT_INTERFACE" en0 en1; do
  if [ -z "$candidate" ]; then
    continue
  fi

  if command -v ipconfig >/dev/null 2>&1; then
    detected_ip="$(ipconfig getifaddr "$candidate" 2>/dev/null || true)"
    if [ -n "$detected_ip" ]; then
      LOCAL_IP="$detected_ip"
      break
    fi
  fi

  detected_ip="$(ifconfig "$candidate" 2>/dev/null | awk '/inet /{print $2; exit}' || true)"
  if [ -n "$detected_ip" ]; then
    LOCAL_IP="$detected_ip"
    break
  fi
done

cat > "$CONFIG_FILE" <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
x509_extensions = v3_req
distinguished_name = req_distinguished_name

[req_distinguished_name]
C = US
ST = Local
L = Local
O = Vibe
OU = Development
CN = localhost

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = $HOSTNAME_VALUE
IP.1 = 127.0.0.1
EOF

if [ -n "$LOCAL_IP" ]; then
  cat >> "$CONFIG_FILE" <<EOF
IP.2 = $LOCAL_IP
EOF
fi

openssl req \
  -x509 \
  -nodes \
  -days 365 \
  -newkey rsa:2048 \
  -keyout "$KEY_FILE" \
  -out "$CERT_FILE" \
  -config "$CONFIG_FILE" >/dev/null 2>&1

echo "Created local HTTPS certificate at $CERT_FILE"
echo "Created local HTTPS key at $KEY_FILE"
if [ -n "$LOCAL_IP" ]; then
  echo "Included LAN IP $LOCAL_IP in certificate SANs"
fi
