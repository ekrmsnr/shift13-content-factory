#!/bin/zsh
set -e
cd "${0:A:h}"

echo "SHIFT_13 sistem kontrolü yapılıyor…"
npm run check

if curl -fsS http://127.0.0.1:4313/api/health >/dev/null 2>&1; then
  echo "Fabrika zaten çalışıyor; ekran açılıyor."
  open http://127.0.0.1:4313/
  exit 0
fi

npm start &
shift13_pid=$!
trap 'kill "$shift13_pid" 2>/dev/null || true' EXIT INT TERM

for attempt in {1..40}; do
  if curl -fsS http://127.0.0.1:4313/api/health >/dev/null 2>&1; then
    open http://127.0.0.1:4313/
    echo "Fabrika açık. Durdurmak için bu pencereyi kapatabilirsin."
    wait "$shift13_pid"
    exit $?
  fi
  sleep 0.25
done

echo "Fabrika açılamadı. Yukarıdaki hata mesajını kontrol et."
kill "$shift13_pid" 2>/dev/null || true
exit 1
