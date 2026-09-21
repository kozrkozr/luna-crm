#!/usr/bin/env bash
# Run the acceptance suites and compare each one against its known assertion
# count. A suite that suddenly reports fewer PASSes than its baseline has lost
# assertions — which a plain "0 failures" check would happily call green.
#
#   bash tests/acceptance/run-all.sh                 # everything
#   bash tests/acceptance/run-all.sh us009-db us005-media   # just these
#
# See README.md for the servers each suite needs.
cd "$(dirname "$0")" || exit 1

SUITES="us009-db:24 us009-app:30 us009-check:18 us014-check:16 us015-check:17 softdelete-fn:8 us003-check:12 us018-media:10 us005-media:8 us006-gateway:17 us007-check:27 us008-check:20 us023-check:16 us026-check:23 us024-check:18 us025-check:18 us010-check:23 us027-check:12 us022-check:17 us003-ui:7 us004-check:9 us004b-check:12 us005-check:15 us006-ui:9 us018-check:11 us019-check:9 us020-check:10 us021-check:9 us030-check:11 client-notes-check:15"

# With names on the command line, run only those — same baselines.
if [ "$#" -gt 0 ]; then
  selected=""
  for want in "$@"; do
    for pair in $SUITES; do
      [ "${pair%%:*}" = "${want%.mjs}" ] && selected="$selected $pair"
    done
  done
  if [ -z "$selected" ]; then echo "no such suite: $*"; exit 1; fi
  SUITES="$selected"
fi

total=0; fails=0; mismatch=0; bad=""; start=$(date +%s)
for pair in $SUITES; do
  t="${pair%%:*}"; w="${pair##*:}"
  out=$(node "$t.mjs" 2>&1); p=$(echo "$out"|grep -c '^PASS'); f=$(echo "$out"|grep -c '^FAIL')
  total=$((total+p)); fails=$((fails+f))
  if [ "$p" != "$w" ] || [ "$f" != "0" ]; then mismatch=$((mismatch+1)); bad="$bad $t(got:$p want:$w fail:$f)"; fi
done
echo "  $total assertions, $fails failing, $mismatch off-baseline, $(($(date +%s)-start))s$bad"
[ "$fails" = "0" ] && [ "$mismatch" = "0" ]
