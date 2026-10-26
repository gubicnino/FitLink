#!/usr/bin/env bash
# Med stresnim testom vsake 2 s zapiše porabo CPU in pomnilnika kontejnerjev
# backend in mongodb v results/docker-stats.csv. Ustavi s Ctrl+C.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p results
OUT=results/docker-stats.csv
echo "time,container,cpu_percent,mem_usage,mem_percent" > "$OUT"
echo "Zapisujem v $OUT (Ctrl+C za konec)"
while true; do
  docker stats --no-stream --format '{{.Name}},{{.CPUPerc}},{{.MemUsage}},{{.MemPerc}}' \
    fitlink-backend-1 fitlink-mongodb-1 | sed "s/^/$(date +%H:%M:%S),/" >> "$OUT"
  sleep 2
done
