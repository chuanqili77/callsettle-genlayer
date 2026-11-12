import assert from 'node:assert/strict';
import {snapshotGood, utcCandidatesForLocalTime} from '../scripts/snapshot_validation.mjs';

const berlin = {
  endpoint_id: 1,
  url: 'https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m%2Cwind_speed_10m&timezone=Europe%2FBerlin',
};
const chicago = {
  endpoint_id: 2,
  url: 'https://api.open-meteo.com/v1/forecast?latitude=41.88&longitude=-87.63&current=temperature_2m&timezone=America%2FChicago',
};
const valid = {
  verdict: 'RESPONSE_VALID',
  temperature_band: '0_10',
  snapshot: {temperature_2m: 6.1, time: '2026-11-12T15:45', wind_speed_10m: 9.4},
};

assert.equal(snapshotGood(valid, berlin), true, 'chain endpoint timezone validates a local snapshot');
assert.equal(snapshotGood(valid, chicago), true, 'same wall clock is independently valid in Chicago');
assert.equal(snapshotGood({...valid, snapshot: {...valid.snapshot, time: '2001-01-01T12:30'}}, berlin), true,
  'old historical snapshots do not expire');
assert.equal(snapshotGood({...valid, snapshot: {...valid.snapshot, time: '2025-02-29T12:30'}}, berlin), false,
  'invalid calendar date rejected');
assert.equal(snapshotGood({...valid, snapshot: {...valid.snapshot, time: '2024-02-29T12:30'}}, berlin), true,
  'valid leap day accepted');
assert.equal(snapshotGood({...valid, snapshot: {...valid.snapshot, time: '2026-03-29T02:30'}}, berlin), false,
  'nonexistent spring-forward local time rejected');
assert.equal(utcCandidatesForLocalTime('2026-10-25T02:30', 'Europe/Berlin').length, 2,
  'ambiguous fall-back local time maps to both valid UTC instants');
assert.equal(snapshotGood({...valid, temperature_band: '10_20'}, berlin), false,
  'snapshot temperature and consensus band must agree');
assert.equal(snapshotGood({...valid, snapshot: {...valid.snapshot, temperature_2m: NaN}}, berlin), false,
  'non-finite temperature rejected');
assert.equal(snapshotGood({...valid, snapshot: {...valid.snapshot, wind_speed_10m: -1}}, berlin), false,
  'negative wind rejected');
assert.equal(snapshotGood(valid, null), false, 'snapshot without a chain-read endpoint is not verifiable');
assert.equal(snapshotGood(valid, {url: 'https://api.open-meteo.com/v1/forecast'}), false,
  'snapshot without an explicit endpoint timezone is not verifiable');
assert.equal(snapshotGood(valid, {url: 'https://api.open-meteo.com/v1/forecast?timezone=Not/AZone'}), false,
  'unknown timezone rejected');
assert.equal(snapshotGood({verdict: 'UNREACHABLE', snapshot: null}, berlin), true,
  'non-valid verdict must carry no snapshot');
assert.equal(snapshotGood({verdict: 'UNREACHABLE', snapshot: valid.snapshot}, berlin), false,
  'non-valid verdict cannot carry snapshot fields');

for (const wind of [NaN, Infinity, -Infinity, '9', true, -0.1]) {
  assert.equal(snapshotGood({...valid, snapshot: {...valid.snapshot, wind_speed_10m: wind}}, berlin), false);
}
for (const time of ['2026-04-31T12:00', '2026-01-00T12:00', '2026-13-01T00:00',
  '2026-11-12T24:00', '2026-11-12T12:60', '2026-11-12T12:00:60', '2026-11-12T12:00Z']) {
  assert.equal(snapshotGood({...valid, snapshot: {...valid.snapshot, time}}, berlin), false, time);
}
for (const temperature of [-60, 0, 10, 20, 30, 60]) {
  const band = temperature < 0 ? 'LT0' : temperature < 10 ? '0_10' : temperature < 20 ? '10_20' : temperature < 30 ? '20_30' : 'GT30';
  assert.equal(snapshotGood({...valid, temperature_band: band, snapshot: {...valid.snapshot, temperature_2m: temperature}}, berlin), true);
}
for (const temperature of [-60.1, 60.1, Infinity, -Infinity, '6', true]) {
  assert.equal(snapshotGood({...valid, snapshot: {...valid.snapshot, temperature_2m: temperature}}, berlin), false);
}
assert.equal(utcCandidatesForLocalTime('2026-03-08T02:30', 'America/Chicago').length, 0);
assert.equal(utcCandidatesForLocalTime('2026-11-01T01:30', 'America/Chicago').length, 2);
assert.equal(utcCandidatesForLocalTime('2026-10-04T02:15', 'Australia/Lord_Howe').length, 0);
assert.equal(utcCandidatesForLocalTime('2026-04-05T01:45', 'Australia/Lord_Howe').length, 2);
assert.equal(snapshotGood({verdict: 'BOGUS', snapshot: null}, berlin), false);
assert.equal(snapshotGood({verdict: 'UNREACHABLE', snapshot: null}, {url: 'https://api.open-meteo.com/v1/forecast?latitude=999'}), true);
assert.equal(snapshotGood({verdict: 'UNREACHABLE', snapshot: null}, null), false);
console.log('ALL SNAPSHOT VERIFIER TESTS PASS');
