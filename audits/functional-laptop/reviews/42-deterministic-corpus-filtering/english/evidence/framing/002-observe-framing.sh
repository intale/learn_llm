#!/usr/bin/env bash
# Run-bound body-free observations, not a corpus-framing/filter implementation.
set -euo pipefail
[[ $# == 1 && -f $1 && ! -L $1 ]] || exit 2
framing_input=$1
stat --format='bytes=%s' -- "$framing_input"
sha256sum -- "$framing_input" | awk '{print "sha256_before=" $1}'
printf 'lf_count='
wc -l < "$framing_input"
LC_ALL=C awk '
BEGIN { marker="<|endoftext|>" }
{ n=length($0); if(n>longest)longest=n; if($0=="")empty++;
  if(n>0 && substr($0,n,1)=="\r")crlf++;
  if($0==marker)exact++; if($0==marker "\r")crlfmarker++;
  finalkind=($0==marker?"exact-separator":$0==marker "\r"?"crlf-separator":"other"); }
END { printf "awk_records=%.0f\nempty_lf_records=%.0f\ncrlf_records=%.0f\nexact_whole_line_separators=%.0f\ncrlf_whole_line_separators=%.0f\nmax_record_bytes_excluding_lf=%.0f\nfinal_record_kind=%s\n",NR,empty,crlf,exact,crlfmarker,longest,(NR?finalkind:"no-record"); }
' "$framing_input"
if framing_markers=$(LC_ALL=C grep --binary-files=text -o -F -- '<|endoftext|>' "$framing_input" | wc -l); then :; else framing_status=$?; [[ $framing_status == 1 ]] || exit "$framing_status"; fi
printf 'marker_occurrences_anywhere=%s\n' "$framing_markers"
printf 'final_byte_decimal='
tail -c 1 -- "$framing_input" | od -An -t u1
sha256sum -- "$framing_input" | awk '{print "sha256_after=" $1}'
