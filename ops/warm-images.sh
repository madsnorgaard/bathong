#!/usr/bin/env bash
# Warm the image cache: request the image variants a phone and a desktop
# would ask for on the main entry pages, so the first encode of each (about
# 2 seconds, X-Cache-Status MISS) is paid here and not by a visitor.
#
# For every page it reads the HTML, and for each <picture> works out which
# candidate of the AVIF srcset a browser picks at each viewport from its
# sizes attribute (media conditions, vw, vh, px and min() of those). That one
# URL is requested, never the whole srcset: encodes run inside the Nuxt
# process and are expensive.
#
# ops/deploy.sh runs this last. By hand, against any origin:
#   ops/warm-images.sh https://bathong.africa
#   ops/warm-images.sh --list https://bathong.africa   # print the choices, request no image
#
# Plain bash, curl and awk on purpose: nothing else is assumed on the server,
# and from inside the Nuxt container the public hostnames do not answer
# (hairpin, see nuxt.config.ts), so a script run there could not take the
# same path as a visitor. GET requests only.
#
# Exit status: 0 when every variant answered 200, 1 otherwise. The summary
# line is printed either way.
#
# No `set -e`: one page or image that fails must not stop the rest.
set -uo pipefail

# name:CSS width:CSS height:device pixel ratio. The height counts too: the
# essay reader sizes its frames in vh.
viewports="phone:390:844:2 desktop:1440:900:1"
# Index pages, always walked. /walks is here because no other page links to
# a single walk.
index_pages="/ /stories /albums /walks /photographers /archive"

concurrency="${WARM_CONCURRENCY:-2}"   # images at a time, 2 at most
timeout="${WARM_TIMEOUT:-60}"          # seconds per request
budget="${WARM_BUDGET:-600}"           # seconds for the whole run
reads_max="${WARM_READS:-80}"          # reads of a page that rotates its photographs
settle="${WARM_SETTLE:-20}"            # stop earlier after this many reads with nothing new
[ "${concurrency}" -ge 1 ] 2>/dev/null || concurrency=2
[ "${concurrency}" -le 2 ] || concurrency=2

list_only=0
if [ "${1:-}" = "--list" ]; then list_only=1; shift; fi

origin="${1:-}"
if [ -z "${origin}" ]; then
  cd "$(dirname "$0")/.."
  site="${SITE_DOMAIN:-$(grep -E '^SITE_DOMAIN=' .env 2>/dev/null | cut -d= -f2)}"
  [ -n "${site}" ] && origin="https://${site}"
fi
origin="${origin%/}"
if [ -z "${origin}" ]; then
  echo "usage: $0 [--list] <origin>   (for example https://bathong.africa)" >&2
  exit 2
fi
for tool in curl awk; do
  command -v "${tool}" >/dev/null || { echo "image warm-up: ${tool} not found, nothing warmed" >&2; exit 1; }
done

started="$(date +%s)"
deadline=$((started + budget))
work="$(mktemp -d)"
cleanup() {
  # shellcheck disable=SC2046
  kill $(jobs -p) 2>/dev/null
  rm -rf "${work}"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

# attr() and the record separator are shared by both awk programs: with "<"
# as the separator every record starts at a tag name.
awk_lib='
function attr(tag, name,    i, rest, j) {
  i = index(tag, " " name "=\"")
  if (!i) return ""
  rest = substr(tag, i + length(name) + 3)
  j = index(rest, "\"")
  return j ? substr(rest, 1, j - 1) : ""
}
function trim(s) { gsub(/^[ \t\r\n]+|[ \t\r\n]+$/, "", s); return s }
'

# links <file> <regex> [limit]: hrefs matching the regex, in page order.
links() {
  awk -v pattern="$2" -v limit="${3:-0}" "${awk_lib}"'
    BEGIN { RS = "<" }
    /^a[ \t\r\n]/ {
      href = attr(substr($0, 1, index($0, ">")), "href")
      sub(/[?#].*$/, "", href)
      if (href ~ pattern && !seen[href]++) {
        print href
        if (limit && ++found >= limit) exit
      }
    }
  ' "$1"
}

# choices <file>: one "viewport<TAB>url" line per image and viewport.
choices() {
  awk -v viewports="${viewports}" "${awk_lib}"'
    # One length in CSS px at this viewport: "60vw", "159.94vh" or "720px".
    # -1 for anything else.
    function length_px(len, vw, vh) {
      if (len ~ /^[0-9.]+vw$/) return (len + 0) * vw / 100
      if (len ~ /^[0-9.]+vh$/) return (len + 0) * vh / 100
      if (len ~ /^[0-9.]+px$/) return len + 0
      return -1
    }

    # The length a sizes attribute resolves to at this viewport, in CSS px.
    # Forms in use: "(max-width: 839px) 100vw, 33vw", fixed "720px", and from
    # the essay reader "min(100vw, 1440px, 159.94vh, 2000px)", alone or after
    # a condition. The list is cut at the commas outside brackets only, since
    # min() has commas of its own.
    function source_px(sizes, vw, vh,    n, part, i, c, depth, from, s, close_at, cond, len, limit, k, term, j, px, least) {
      n = 0
      depth = 0
      from = 1
      for (i = 1; i <= length(sizes) + 1; i++) {
        c = substr(sizes, i, 1)
        if (c == "(") depth++
        else if (c == ")") depth--
        if (c == "" || (c == "," && depth == 0)) {
          part[++n] = substr(sizes, from, i - from)
          from = i + 1
        }
      }
      for (i = 1; i <= n; i++) {
        s = trim(part[i])
        len = s
        if (substr(s, 1, 1) == "(") {
          close_at = index(s, ")")
          cond = substr(s, 2, close_at - 2)
          len = trim(substr(s, close_at + 1))
          limit = cond
          sub(/^[^:]*:[ \t]*/, "", limit)
          limit += 0
          if (cond ~ /^[ \t]*max-width[ \t]*:/) { if (vw > limit) continue }
          else if (cond ~ /^[ \t]*min-width[ \t]*:/) { if (vw < limit) continue }
          else continue
        }
        if (len ~ /^min\(.*\)$/) {
          # the least of its terms; one that cannot be read spoils the lot
          k = split(substr(len, 5, length(len) - 5), term, ",")
          least = -1
          for (j = 1; j <= k; j++) {
            px = length_px(trim(term[j]), vw, vh)
            if (px < 0) { least = -1; break }
            if (least < 0 || px < least) least = px
          }
        } else least = length_px(len, vw, vh)
        return (least < 0) ? vw : least
      }
      return vw   # no sizes, or nothing matched: 100vw, as the browser does
    }

    # Print the candidate of one srcset a browser takes at each viewport.
    function choose(srcset, sizes,    n, cand, field, k, m, i, j, v, t, vw, vh, dpr, px, swap, cur, nxt) {
      # The srcset comes out of an HTML attribute: undo the entities the
      # markup had to use, the named ones and the numeric apostrophe (a file
      # name with an apostrophe arrived as &#39; and answered 403), with
      # &amp; last so that an encoded ampersand is decoded exactly once.
      # This sits inside a single-quoted shell string: no apostrophes here.
      gsub(/&#39;/, "\047", srcset)
      gsub(/&quot;/, "\"", srcset)
      gsub(/&lt;/, "<", srcset)
      gsub(/&gt;/, ">", srcset)
      gsub(/&amp;/, "\\&", srcset)
      n = split(srcset, cand, /,[ \t\r\n]+/)
      m = 0
      for (i = 1; i <= n; i++) {
        k = split(trim(cand[i]), field, /[ \t\r\n]+/)
        if (k < 1 || field[1] !~ /^\/_ipx\//) continue
        m++
        url[m] = field[1]
        desc[m] = (k > 1) ? field[2] : "1x"
      }
      if (!m) return
      for (v = 1; v <= nv; v++) {
        split(vp[v], t, ":")
        vw = t[2] + 0
        vh = t[3] + 0
        dpr = t[4] + 0
        px = source_px(sizes, vw, vh)
        if (px <= 0) px = vw
        for (i = 1; i <= m; i++) {
          density[i] = (desc[i] ~ /w$/) ? (desc[i] + 0) / px : desc[i] + 0
          order[i] = i
        }
        for (i = 2; i <= m; i++)
          for (j = i; j > 1 && density[order[j - 1]] > density[order[j]]; j--) {
            swap = order[j]; order[j] = order[j - 1]; order[j - 1] = swap
          }
        # The rule Chrome uses: walk up the densities; at ratio 1 take the
        # first that is not below the screen, above 1 step up only past the
        # geometric mean of two neighbours (compared squared: busybox awk
        # has no sqrt).
        i = 1
        while (i < m) {
          nxt = density[order[i + 1]]
          if (nxt < dpr) { i++; continue }
          cur = density[order[i]]
          if ((dpr <= 1 && dpr > cur) || dpr * dpr >= cur * nxt) i++
          break
        }
        print t[1] "\t" url[order[i]]
      }
    }

    BEGIN { RS = "<"; nv = split(viewports, vp, " ") }
    {
      end = index($0, ">")
      if (!end) next
      tag = substr($0, 1, end)
    }
    tag ~ /^picture[ \t\r\n>]/ { inpic = 1; rank = 0; next }
    tag ~ /^\/picture[ \t\r\n>]/ { inpic = 0; next }
    # AVIF first, since that is what a modern browser takes; else the first source.
    inpic && tag ~ /^source[ \t\r\n]/ {
      r = (attr(tag, "type") == "image/avif") ? 2 : 1
      if (r > rank && attr(tag, "srcset") != "") {
        rank = r
        psrcset = attr(tag, "srcset")
        psizes = attr(tag, "sizes")
      }
      next
    }
    tag ~ /^img[ \t\r\n]/ {
      if (inpic && rank > 0) {
        choose(psrcset, psizes)
        rank = 0
      } else {
        s = attr(tag, "srcset")
        if (s == "") s = attr(tag, "src")
        choose(s, attr(tag, "sizes"))
      }
    }
  ' "$1"
}

# fetch <path> <file>: save the page HTML, fail unless it answered 200.
fetch() {
  local code
  code="$(curl -s -m "${timeout}" -o "$2" -w '%{http_code}' "${origin}$1" || true)"
  [ "${code}" = "200" ] && return 0
  echo "  ${1} -> ${code:-no answer}, skipped" >&2
  return 1
}

# walk <path>: read one page and add "page<TAB>viewport<TAB>url" lines for
# its images to ${chosen}. The HTML stays in ${work}/page.html for links.
#
# Every page is read twice. If the second read shows other photographs, the
# page rotates them per visit (the home page lead and feed do), and one read
# would warm one visit's worth. Such a page is read again until ${settle}
# reads in a row bring nothing new, ${reads_max} times at most.
pages_ok=0
walk() {
  local path="$1" one="${work}/one.txt" fresh="${work}/fresh.txt" reads=1 quiet=0 added line name viewport
  fetch "${path}" "${work}/page.html" || return 1
  pages_ok=$((pages_ok + 1))
  choices "${work}/page.html" > "${one}"
  while [ "${reads}" -lt "${reads_max}" ] && [ "$(date +%s)" -lt "${deadline}" ]; do
    fetch "${path}" "${work}/again.html" 2>/dev/null || break
    reads=$((reads + 1))
    choices "${work}/again.html" \
      | awk -v known="${one}" 'BEGIN { while ((getline line < known) > 0) seen[line] = 1 } !seen[$0]++' > "${fresh}"
    added="$(wc -l < "${fresh}" | tr -d ' ')"
    cat "${fresh}" >> "${one}"
    if [ "${added}" = "0" ]; then
      quiet=$((quiet + 1))
      # the same twice over: a page that does not rotate
      [ "${reads}" = "2" ] && break
      [ "${quiet}" -ge "${settle}" ] && break
    else
      quiet=0
    fi
  done
  awk -v page="${path}" '{ print page "\t" $0 }' "${one}" >> "${chosen}"
  line="  ${path}:"
  for viewport in ${viewports}; do
    name="${viewport%%:*}"
    line="${line} ${name} $(awk -F'\t' -v v="${name}" '$1 == v && !seen[$2]++ { n++ } END { print n + 0 }' "${one}")"
  done
  [ "${reads}" -gt 2 ] && line="${line} (rotates, read ${reads} times)"
  echo "${line}"
}

echo "== image warm-up ${origin}"

# Entry pages: the index pages, then every essay, the newest album and walk
# and every photographer, found from the links on the index pages (the first
# link is the newest, the lists are sorted that way).
chosen="${work}/chosen.txt"
found="${work}/found.txt"
: > "${chosen}"
: > "${found}"
for path in ${index_pages}; do
  walk "${path}" || continue
  case "${path}" in
    /albums | /walks) links "${work}/page.html" "^${path}/[^/]+\$" 1 >> "${found}" ;;
    /stories | /photographers) links "${work}/page.html" "^${path}/[^/]+\$" >> "${found}" ;;
  esac
done
while read -r path; do
  walk "${path}"
done < "${found}"

if [ "${list_only}" = "1" ]; then
  cat "${chosen}"
  exit 0
fi

# Each distinct URL once, in page order.
urls="${work}/urls.txt"
awk -F'\t' '!seen[$3]++ { print $3 }' "${chosen}" > "${urls}"
total="$(wc -l < "${urls}" | tr -d ' ')"
if [ "${pages_ok}" = "0" ] || [ "${total}" = "0" ]; then
  echo "image warm-up: no images found on ${origin} (${pages_ok} pages answered), nothing warmed"
  exit 1
fi

# warm <url>: one GET, one "status<TAB>url" line in the results.
results="${work}/results.txt"
: > "${results}"
warm() {
  local out code status
  if [ "$(date +%s)" -ge "${deadline}" ]; then
    printf 'SKIPPED\t%s\n' "$1" >> "${results}"
    return
  fi
  out="$(curl -s -m "${timeout}" -o /dev/null -D - -w 'code: %{http_code}\n' "${origin}$1" 2>/dev/null | tr -d '\r')"
  code="$(printf '%s\n' "${out}" | awk -F': *' '$1 == "code" { print $2 }')"
  status="$(printf '%s\n' "${out}" | awk -F': *' 'tolower($1) == "x-cache-status" { print toupper($2) }' | tail -n 1)"
  if [ "${code}" != "200" ]; then
    status="FAILED"
    echo "  failed (${code:-no answer}): $1" >&2
  fi
  printf '%s\t%s\n' "${status:-UNCACHED}" "$1" >> "${results}"
}

while read -r url; do
  warm "${url}" &
  while [ "$(jobs -rp | wc -l)" -ge "${concurrency}" ]; do wait -n 2>/dev/null || sleep 0.2; done
done < "${urls}"
wait

count() { awk -F'\t' -v s="$1" '$1 == s { n++ } END { print n + 0 }' "${results}"; }
failed="$(count FAILED)"
skipped="$(count SKIPPED)"
summary="image warm-up: $((total - skipped)) variants requested from ${pages_ok} pages: $(count MISS) MISS, $(count HIT) HIT, $(count STALE) STALE, ${failed} failed"
# Anything else nginx can say (UPDATING, EXPIRED), or no cache in front at all.
others="$(awk -F'\t' '$1 !~ /^(MISS|HIT|STALE|FAILED|SKIPPED)$/ { n[$1]++ } END { for (s in n) printf ", %d %s", n[s], s }' "${results}")"
summary="${summary}${others}"
[ "${skipped}" = "0" ] || summary="${summary}, ${skipped} not requested (${budget}s budget used up)"
echo "${summary} ($(($(date +%s) - started))s)"
[ "${failed}" = "0" ] && [ "${skipped}" = "0" ]
