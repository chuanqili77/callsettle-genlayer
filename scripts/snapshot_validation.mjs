// Timezone-aware validation for Open-Meteo's timezone-local snapshot clock.
// The endpoint URL is read from latest-final chain state; the verifier
// never applies its own machine timezone and never expires old snapshots.
function parseLocalApiTime(value) {
  if (typeof value !== 'string') return null;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const [, ys, mos, ds, hs, mis, ss = '0'] = m;
  const year = Number(ys), month = Number(mos), day = Number(ds);
  const hour = Number(hs), minute = Number(mis), second = Number(ss);
  if (year < 1970 || year > 9999 || month < 1 || month > 12
      || hour > 23 || minute > 59 || second > 59) return null;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day < 1 || day > monthDays[month - 1]) return null;
  return {year, month, day, hour, minute, second};
}

function zonedParts(epochMs, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  });
  return Object.fromEntries(fmt.formatToParts(new Date(epochMs))
    .filter((p) => p.type !== 'literal')
    .map((p) => [p.type, Number(p.value)]));
}

function partsToUtcMs(p) {
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

function sameLocalTime(a, b) {
  return a.year === b.year && a.month === b.month && a.day === b.day
    && a.hour === b.hour && a.minute === b.minute && a.second === b.second;
}

// Return every possible UTC instant for a timezone-local wall clock.
// DST fall-back can produce two instants; a spring-forward gap produces none.
export function utcCandidatesForLocalTime(value, timeZone) {
  const p = parseLocalApiTime(value);
  if (!p || typeof timeZone !== 'string' || !timeZone) return [];
  const nominal = partsToUtcMs(p);
  try {
    const offsets = new Set();
    for (const delta of [-86400000, 0, 86400000]) {
      const probe = nominal + delta;
      const shown = zonedParts(probe, timeZone);
      offsets.add(partsToUtcMs(shown) - probe);
    }
    const candidates = [];
    for (const offset of offsets) {
      const candidate = nominal - offset;
      if (sameLocalTime(zonedParts(candidate, timeZone), p)) {
        candidates.push(candidate);
      }
    }
    return [...new Set(candidates)].sort((a, b) => a - b);
  } catch {
    return [];
  }
}

function bandOf(temp) {
  if (temp < 0) return 'LT0';
  if (temp < 10) return '0_10';
  if (temp < 20) return '10_20';
  if (temp < 30) return '20_30';
  return 'GT30';
}

export function snapshotGood(call, chainEndpoint) {
  if (!chainEndpoint || typeof chainEndpoint.url !== 'string') return false;
  const snapshot = call?.snapshot;
  if (call?.verdict !== 'RESPONSE_VALID') {
    return ['RESPONSE_INVALID', 'UNREACHABLE', ''].includes(call?.verdict)
      && (snapshot === null || snapshot === undefined);
  }
  if (!snapshot || typeof snapshot !== 'object' || !chainEndpoint
      || typeof chainEndpoint.url !== 'string') return false;
  const temperature = snapshot.temperature_2m;
  const wind = snapshot.wind_speed_10m;
  if (typeof temperature !== 'number' || !Number.isFinite(temperature)
      || temperature < -60 || temperature > 60) return false;
  if (wind !== null && wind !== undefined
      && (typeof wind !== 'number' || !Number.isFinite(wind) || wind < 0)) return false;
  if (bandOf(temperature) !== call.temperature_band) return false;
  let timeZone;
  try {
    timeZone = new URL(chainEndpoint.url).searchParams.get('timezone');
  } catch {
    return false;
  }
  return utcCandidatesForLocalTime(snapshot.time, timeZone).length > 0;
}
