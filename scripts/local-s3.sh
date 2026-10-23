#!/usr/bin/env bash
# EP-07 — a local S3 store for development and the acceptance suites, so that
# nothing local ever touches Backblaze B2 (or costs anything).
#
#   bash scripts/local-s3.sh start    # run it, wait until it answers, make the bucket
#   bash scripts/local-s3.sh stop     # remove it, files and all
#   bash scripts/local-s3.sh status
#
# SeaweedFS, not MinIO: MinIO no longer publishes Docker images (2026-10-23,
# both Docker Hub and quay.io refused the pull). Same S3 API for what we use —
# multipart, presigned URLs, path-style addressing.
#
# Credentials are fixed and fake (scripts/local-s3/s3.json); the functions read
# them from supabase/functions/local-s3.env:
#
#   npx supabase functions serve --env-file supabase/functions/local-s3.env
set -euo pipefail

NAME=luna-s3
IMAGE=chrislusf/seaweedfs:3.80
PORT=8333
BUCKET=luna-files-local
HERE="$(cd "$(dirname "$0")" && pwd)"

ready() { [ "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/" || true)" != "000" ]; }

case "${1:-}" in
  start)
    if ! docker ps --format '{{.Names}}' | grep -qx "$NAME"; then
      docker rm -f "$NAME" >/dev/null 2>&1 || true
      docker run -d --name "$NAME" -p "$PORT:$PORT" \
        -v "$HERE/local-s3/s3.json:/etc/seaweedfs/s3.json:ro" \
        "$IMAGE" server -s3 -s3.config=/etc/seaweedfs/s3.json -s3.port="$PORT" >/dev/null
    fi
    for _ in $(seq 1 60); do ready && break; sleep 1; done
    ready || { echo "local S3 did not answer on :$PORT — docker logs $NAME"; exit 1; }
    # Make the bucket the local functions use; "already exists" is fine.
    deno eval --node-modules-dir=none "
      import { AwsClient } from 'npm:aws4fetch@1.0.20'
      const aws = new AwsClient({ accessKeyId: 'luna-local-key', secretAccessKey: 'luna-local-secret', service: 's3', region: 'us-east-1' })
      const res = await aws.fetch('http://127.0.0.1:$PORT/$BUCKET', { method: 'PUT' })
      await res.body?.cancel()
    "
    echo "local S3 on http://127.0.0.1:$PORT, bucket $BUCKET"
    ;;
  stop)
    docker rm -f "$NAME" >/dev/null 2>&1 || true
    echo "local S3 removed"
    ;;
  status)
    if ready; then echo "local S3 answers on :$PORT"; else echo "local S3 is not running"; fi
    ;;
  *)
    echo "usage: bash scripts/local-s3.sh start|stop|status"
    exit 1
    ;;
esac
