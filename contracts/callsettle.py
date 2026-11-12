# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""CallSettle: pay-per-call settlement for public APIs on GenLayer Studionet.

Protocol callsettle-1.3. The market is single-mode: every listed
endpoint is an Open-Meteo weather endpoint (list_endpoint rejects
any URL that is not exactly the forecast path, optionally followed
by a query string); providers compete on
per-call price (1-10 GEN). A buyer pays for one call: the exact
price is escrowed. Anyone may then trigger settlement: GenLayer
validators each independently fetch the endpoint URL and check the
live response against the one public mode (HTTP 200, JSON,
current.temperature_2m a number in -60..60, current.time a string).
They must agree exactly on verdict + temperature_band +
has_required_fields + the settlement-time snapshot, or the call stays
FUNDED and settlement can be retried (fail-closed). The schema_note
stored at listing is a
human-readable description of this single mode, not a per-endpoint
settlement rule: it is never fed into consensus.

Settlement-time snapshot (v1.3): for a RESPONSE_VALID settlement,
the validators' consensus-verified response is reduced to
standardized fields and written into the call record:
temperature_2m, current.time, wind_speed_10m (null when the
response carries no wind field — wind is not part of the single
public mode). get_call reads the snapshot back; the frontend shows
exactly these on-chain fields and never re-fetches the endpoint,
so what the buyer sees is the data the settlement was based on,
not a later fetch. A snapshot exists only for RESPONSE_VALID calls;
INVALID, UNREACHABLE and CANCELLED calls carry snapshot null.

Consensus encoding rule (learned from a failed first v1.3 deploy):
the consensus layer cannot encode a float (or a nested dict) in a
non-deterministic result — the leader and every validator crash
with exit_code 1. So the consensus value carries the snapshot as
flat integer fields only: temperature and wind in tenths of a
degree / km/h, time as a string. settle_call divides by 10 when
it writes the stored snapshot, so get_call still reads the real
values (temperature_2m 6.0, wind_speed_10m 10.1). The band is
derived from the tenths, never from a float, inside consensus.

Verdicts (deterministic code, no LLM anywhere in this contract):
  RESPONSE_VALID   -> escrow pays the provider, no violation
  RESPONSE_INVALID -> escrow refunds the buyer, provider violations +1
  UNREACHABLE      -> escrow refunds the buyer, no violation
Settlement never moves money directly: it records a pull-payment
credit; the entitled party withdraws it with withdraw(). A failed
payable call KEEPS its value in the contract: on Studionet a failed
payable is not refunded, so any value sent with a call that fails
stays in the contract. The frontend only ever submits the exact price to an
existing ACTIVE endpoint, so that path is unreachable from the UI,
and the v1.3 evidence run sends 0 GEN on its failed-payable
negatives, so no value is stranded there.

Temperature is a decision-free diagnostic only: it is stored as a
10-degree band (LT0 / 0_10 / 10_20 / 20_30 / GT30), never as a
decision field. The settlement-time snapshot additionally records
the exact temperature_2m, time and wind_speed_10m from the
consensus-verified response, for display only — the snapshot never
decides anything. Validators fetch inside the same consensus
round, so drift is small; a band flip at a boundary can only produce
MAJORITY_DISAGREE and a retry, never a wrong settlement. The same
holds for a snapshot mismatch: validators that fetched different
responses disagree, the call stays FUNDED, and settlement can be
retried.

Capacity (checked in the contract, mathematically consistent):
  MAX_ENDPOINTS_PER_PROVIDER = 8, MAX_ENDPOINTS_TOTAL = 32.
  8 * 4 = 32: one provider filling all 8 slots never blocks another
  provider from listing, and the total cap can only be reached by at
  least 4 providers. No capacity deadlock: the per-
  provider cap and the total cap are independent counts, and a full
  provider fails with a clear error instead of a stuck state.
  URL <= 256 chars, schema_note 10..280 chars.

Sender-bound roles: only the buyer can cancel a FUNDED call; only the
entitled party of a call can withdraw its credit; settle_call is open
to anyone because the outcome is decided by consensus, not by the
caller. No time gates anywhere (Studionet has no clock): every
transition is an explicit action.

Known limits (neutral, product-scope):
  * Single-mode market in v1.3: only Open-Meteo forecast endpoints
    can be listed (URL path enforced in list_endpoint). An endpoint
    that needs an API key cannot be listed meaningfully, because
    validators fetch without credentials.
  * A snapshot exists only for RESPONSE_VALID settlements. A later
    fetch of the same endpoint can return different weather; the
    snapshot is the record of what settlement was based on, and the
    frontend shows the snapshot instead of fetching again.
  * An endpoint has no delist action in v1: a listed endpoint stays
    ACTIVE. A provider that wants to stop selling simply stops being
    called; no funds are at risk from a stale listing because every
    call is paid per call and settled against the live response.
  * A call left FUNDED whose buyer disappears can still be settled by
    anyone, so funds are never stuck; the buyer can also cancel it
    while FUNDED.
"""
from genlayer import *
import json

GEN_WEI = 1000000000000000000  # 1 GEN = 10^18 wei
MIN_PRICE_GEN = 1
MAX_PRICE_GEN = 10
MAX_ENDPOINTS_PER_PROVIDER = 8
MAX_ENDPOINTS_TOTAL = 32
MAX_URL_CHARS = 256
MAX_NOTE_CHARS = 280
MIN_NOTE_CHARS = 10

VERDICTS = ["RESPONSE_VALID", "RESPONSE_INVALID", "UNREACHABLE"]
BANDS = ["LT0", "0_10", "10_20", "20_30", "GT30", "NONE"]


def _valid_openmeteo_url(url):
    """Strict Open-Meteo forecast gate: the URL must be exactly the
    forecast path, optionally followed by a query string. A junk path
    such as /v1/forecastXYZ is rejected, as is any other host."""
    prefix = 'https://api.open-meteo.com/v1/forecast'
    if not isinstance(url, str) or not url.startswith(prefix):
        return False
    rest = url[len(prefix):]
    return rest == '' or rest.startswith('?')


def fail(s):
    raise gl.vm.UserError(s)


def packed(x):
    return json.dumps(x, sort_keys=True, separators=(',', ':'))


def _band(temp):
    if temp < 0:
        return 'LT0'
    if temp < 10:
        return '0_10'
    if temp < 20:
        return '10_20'
    if temp < 30:
        return '20_30'
    return 'GT30'


def _band_from_tenths(t):
    if t < 0:
        return 'LT0'
    if t < 100:
        return '0_10'
    if t < 200:
        return '10_20'
    if t < 300:
        return '20_30'
    return 'GT30'


def _check_body(text):
    """Deterministic schema check on the fetched response body.

    Returns (has_required_fields, verdict, band, temp_tenths,
    time_str, wind_tenths). No LLM: the response is data to check,
    never instructions. Instruction-like text inside a body cannot
    change the verdict, because only the JSON shape is examined.
    The snapshot fields are integers only (temperature and wind in
    tenths, time as a string) because the consensus layer cannot
    encode a float; any other response gets all three snapshot
    fields None. Wind is not part of the single public mode: a
    missing or non-numeric wind field becomes wind None, never an
    INVALID verdict.
    """
    try:
        data = json.loads(text)
    except Exception:
        return False, 'RESPONSE_INVALID', 'NONE', None, None, None
    if not isinstance(data, dict):
        return False, 'RESPONSE_INVALID', 'NONE', None, None, None
    cur = data.get('current')
    if not isinstance(cur, dict):
        return False, 'RESPONSE_INVALID', 'NONE', None, None, None
    temp = cur.get('temperature_2m')
    tstr = cur.get('time')
    if not isinstance(tstr, str) or not tstr:
        return False, 'RESPONSE_INVALID', 'NONE', None, None, None
    if isinstance(temp, bool) or not isinstance(temp, (int, float)):
        return False, 'RESPONSE_INVALID', 'NONE', None, None, None
    if not -60 <= temp <= 60:
        return False, 'RESPONSE_INVALID', 'NONE', None, None, None
    wind = cur.get('wind_speed_10m')
    if isinstance(wind, bool) or not isinstance(wind, (int, float)):
        wind_tenths = None
    else:
        wind_tenths = int(round(wind * 10))
    return True, 'RESPONSE_VALID', _band(temp), int(round(temp * 10)), \
        tstr, wind_tenths


def _fetch_once(url):
    """One validator's independent fetch + check. Never raises: a fetch
    failure is UNREACHABLE, a bad body is RESPONSE_INVALID. Only a
    RESPONSE_VALID fetch carries snapshot fields, as flat integer
    fields (see the consensus encoding rule above)."""
    try:
        response = gl.nondet.web.request(url, method='GET')
    except Exception:
        return {'verdict': 'UNREACHABLE', 'temperature_band': 'NONE',
                'has_required_fields': False,
                'snap_temp_tenths': None, 'snap_time': None,
                'snap_wind_tenths': None}
    status = getattr(response, 'status', None)
    if status != 200:
        return {'verdict': 'UNREACHABLE', 'temperature_band': 'NONE',
                'has_required_fields': False,
                'snap_temp_tenths': None, 'snap_time': None,
                'snap_wind_tenths': None}
    body = response.body
    if isinstance(body, bytes):
        try:
            text = body.decode('utf-8')
        except Exception:
            return {'verdict': 'RESPONSE_INVALID',
                    'temperature_band': 'NONE',
                    'has_required_fields': False,
                    'snap_temp_tenths': None, 'snap_time': None,
                    'snap_wind_tenths': None}
    elif isinstance(body, str):
        text = body
    else:
        return {'verdict': 'RESPONSE_INVALID', 'temperature_band': 'NONE',
                'has_required_fields': False,
                'snap_temp_tenths': None, 'snap_time': None,
                'snap_wind_tenths': None}
    has, verdict, band, temp_tenths, tstr, wind_tenths = _check_body(text)
    return {'verdict': verdict, 'temperature_band': band,
            'has_required_fields': has,
            'snap_temp_tenths': temp_tenths, 'snap_time': tstr,
            'snap_wind_tenths': wind_tenths}


def _validate_check(res):
    if not isinstance(res, dict):
        fail('CHECK_RESULT')
    verdict = res.get('verdict')
    band = res.get('temperature_band')
    has = res.get('has_required_fields')
    temp_tenths = res.get('snap_temp_tenths')
    tstr = res.get('snap_time')
    wind_tenths = res.get('snap_wind_tenths')
    if verdict not in VERDICTS:
        fail('CHECK_VERDICT')
    if band not in BANDS:
        fail('CHECK_BAND')
    if not isinstance(has, bool):
        fail('CHECK_FIELDS')
    if verdict == 'RESPONSE_VALID' and (band == 'NONE' or not has):
        fail('CHECK_VALID')
    if verdict in ('RESPONSE_INVALID', 'UNREACHABLE') and has:
        fail('CHECK_INVALID')
    if verdict == 'RESPONSE_VALID':
        if isinstance(temp_tenths, bool) \
                or not isinstance(temp_tenths, int) \
                or not -600 <= temp_tenths <= 600:
            fail('CHECK_SNAPSHOT_TEMP')
        if not isinstance(tstr, str) or not tstr:
            fail('CHECK_SNAPSHOT_TIME')
        if wind_tenths is not None and (isinstance(wind_tenths, bool)
                                        or not isinstance(wind_tenths, int)
                                        or wind_tenths < 0):
            fail('CHECK_SNAPSHOT_WIND')
        if _band_from_tenths(temp_tenths) != band:
            fail('CHECK_SNAPSHOT_BAND')
    else:
        if temp_tenths is not None or tstr is not None \
                or wind_tenths is not None:
            fail('CHECK_SNAPSHOT_NONE')
    return {'verdict': verdict, 'temperature_band': band,
            'has_required_fields': has,
            'snap_temp_tenths': temp_tenths, 'snap_time': tstr,
            'snap_wind_tenths': wind_tenths}


def _run_check(url):
    def leader_fn():
        return _validate_check(_fetch_once(url))

    def validator_fn(result):
        if not isinstance(result, gl.vm.Return):
            try:
                leader_fn()
            except Exception:
                return True
            return False
        try:
            mine = _validate_check(_fetch_once(url))
        except Exception:
            return False
        leader = result.calldata
        if not isinstance(leader, dict):
            return False
        return (leader.get('verdict') == mine.get('verdict')
                and leader.get('temperature_band') == mine.get('temperature_band')
                and leader.get('has_required_fields') == mine.get('has_required_fields')
                and leader.get('snap_temp_tenths') == mine.get('snap_temp_tenths')
                and leader.get('snap_time') == mine.get('snap_time')
                and leader.get('snap_wind_tenths') == mine.get('snap_wind_tenths'))

    return gl.vm.run_nondet_unsafe(leader_fn, validator_fn)


@gl.evm.contract_interface
class _Recipient:
    class View:
        pass

    class Write:
        pass


class CallSettle(gl.Contract):
    endpoints: TreeMap[str, str]
    calls: TreeMap[str, str]
    provider_counts: TreeMap[str, str]
    next_endpoint_id: u32
    next_call_id: u32
    total_endpoints: u32
    total_received: u256
    total_withdrawn: u256

    def __init__(self):
        self.endpoints = TreeMap()
        self.calls = TreeMap()
        self.provider_counts = TreeMap()
        self.next_endpoint_id = u32(1)
        self.next_call_id = u32(1)
        self.total_endpoints = u32(0)
        self.total_received = u256(0)
        self.total_withdrawn = u256(0)

    def _load_endpoint(self, endpoint_id):
        raw = self.endpoints.get(str(endpoint_id), '')
        if not raw:
            fail('ENDPOINT_NOT_FOUND')
        return json.loads(raw)

    def _save_endpoint(self, e):
        self.endpoints[str(e['endpoint_id'])] = packed(e)
        return packed(e)

    def _load_call(self, call_id):
        raw = self.calls.get(str(call_id), '')
        if not raw:
            fail('CALL_NOT_FOUND')
        return json.loads(raw)

    def _save_call(self, c):
        self.calls[str(c['call_id'])] = packed(c)
        return packed(c)

    def _provider_count(self, provider):
        raw = self.provider_counts.get(provider, '')
        return int(raw) if raw else 0

    @gl.public.write
    def list_endpoint(self, url: str, price_gen: int,
                      schema_note: str) -> str:
        if not isinstance(url, str) or not 8 <= len(url.strip()) <= MAX_URL_CHARS:
            fail('URL_LENGTH')
        url = url.strip()
        if not url.startswith('https://'):
            fail('URL_HTTPS')
        if not _valid_openmeteo_url(url):
            fail('URL_HOST')
        if not isinstance(price_gen, int) or isinstance(price_gen, bool) \
                or not MIN_PRICE_GEN <= price_gen <= MAX_PRICE_GEN:
            fail('PRICE')
        if not isinstance(schema_note, str) \
                or not MIN_NOTE_CHARS <= len(schema_note.strip()) <= MAX_NOTE_CHARS:
            fail('NOTE_LENGTH')
        provider = str(gl.message.sender_address).lower()
        if self._provider_count(provider) >= MAX_ENDPOINTS_PER_PROVIDER:
            fail('PROVIDER_ENDPOINT_LIMIT')
        if int(self.total_endpoints) >= MAX_ENDPOINTS_TOTAL:
            fail('TOTAL_ENDPOINT_LIMIT')
        endpoint_id = int(self.next_endpoint_id)
        self.next_endpoint_id = u32(endpoint_id + 1)
        self.total_endpoints = u32(int(self.total_endpoints) + 1)
        self.provider_counts[provider] = str(self._provider_count(provider) + 1)
        e = {
            'endpoint_id': endpoint_id,
            'provider': provider,
            'url': url,
            'price_gen': price_gen,
            'price_wei': price_gen * GEN_WEI,
            'schema_note': schema_note.strip(),
            'status': 'ACTIVE',
            'calls': 0,
            'settled_valid': 0,
            'violations': 0,
        }
        return self._save_endpoint(e)

    @gl.public.write.payable
    def call_api(self, endpoint_id: int) -> str:
        e = self._load_endpoint(endpoint_id)
        if e['status'] != 'ACTIVE':
            fail('ENDPOINT_NOT_ACTIVE')
        if gl.message.value != u256(int(e['price_wei'])):
            fail('VALUE_MUST_EQUAL_PRICE')
        buyer = str(gl.message.sender_address).lower()
        call_id = int(self.next_call_id)
        self.next_call_id = u32(call_id + 1)
        self.total_received = self.total_received + u256(int(e['price_wei']))
        e['calls'] = int(e['calls']) + 1
        self._save_endpoint(e)
        c = {
            'call_id': call_id,
            'endpoint_id': int(endpoint_id),
            'buyer': buyer,
            'provider': e['provider'],
            'price_gen': int(e['price_gen']),
            'price_wei': int(e['price_wei']),
            'status': 'FUNDED',
            'verdict': '',
            'temperature_band': '',
            'snapshot': None,
            'has_required_fields': False,
            'buyer_credit': 0,
            'provider_credit': 0,
            'buyer_withdrawn': False,
            'provider_withdrawn': False,
        }
        return self._save_call(c)

    @gl.public.write
    def settle_call(self, call_id: int) -> str:
        c = self._load_call(call_id)
        if c['status'] != 'FUNDED':
            fail('CALL_NOT_FUNDED')
        e = self._load_endpoint(int(c['endpoint_id']))
        checked = _run_check(e['url'])
        c['verdict'] = checked['verdict']
        c['temperature_band'] = checked['temperature_band']
        c['has_required_fields'] = checked['has_required_fields']
        if checked['verdict'] == 'RESPONSE_VALID':
            # The stored snapshot divides the consensus tenths back to
            # real values for display; the division happens in
            # deterministic code after consensus, so no float ever
            # crosses the consensus layer.
            c['snapshot'] = {
                'temperature_2m': checked['snap_temp_tenths'] / 10,
                'time': checked['snap_time'],
                'wind_speed_10m': (checked['snap_wind_tenths'] / 10
                                   if checked['snap_wind_tenths'] is not None
                                   else None),
            }
        else:
            c['snapshot'] = None
        if checked['verdict'] == 'RESPONSE_VALID':
            c['status'] = 'SETTLED'
            c['provider_credit'] = int(c['price_wei'])
            e['settled_valid'] = int(e['settled_valid']) + 1
        elif checked['verdict'] == 'RESPONSE_INVALID':
            c['status'] = 'REFUNDED'
            c['buyer_credit'] = int(c['price_wei'])
            e['violations'] = int(e['violations']) + 1
        else:  # UNREACHABLE
            c['status'] = 'REFUNDED'
            c['buyer_credit'] = int(c['price_wei'])
        self._save_endpoint(e)
        return self._save_call(c)

    @gl.public.write
    def cancel_call(self, call_id: int) -> str:
        c = self._load_call(call_id)
        sender = str(gl.message.sender_address).lower()
        if sender != c['buyer']:
            fail('ONLY_BUYER_CAN_CANCEL')
        if c['status'] != 'FUNDED':
            fail('CALL_NOT_FUNDED')
        c['status'] = 'CANCELLED'
        c['buyer_credit'] = int(c['price_wei'])
        return self._save_call(c)

    @gl.public.write
    def withdraw(self, call_id: int) -> str:
        c = self._load_call(call_id)
        sender = str(gl.message.sender_address).lower()
        amount = 0
        role = ''
        if sender == c['provider'] and int(c['provider_credit']) > 0 \
                and not c['provider_withdrawn']:
            amount = int(c['provider_credit'])
            role = 'provider'
        elif sender == c['buyer'] and int(c['buyer_credit']) > 0 \
                and not c['buyer_withdrawn']:
            amount = int(c['buyer_credit'])
            role = 'buyer'
        else:
            fail('NO_CREDIT')
        if role == 'provider':
            c['provider_withdrawn'] = True
        else:
            c['buyer_withdrawn'] = True
        self._save_call(c)
        self.total_withdrawn = self.total_withdrawn + u256(amount)
        _Recipient(Address(sender)).emit_transfer(value=u256(amount))
        return packed({'call_id': int(call_id), 'role': role,
                       'withdrawn_wei': amount, 'sender': sender})

    @gl.public.view
    def get_protocol(self) -> str:
        return 'callsettle-1.3'

    @gl.public.view
    def get_limits(self) -> str:
        return packed({
            'min_price_gen': MIN_PRICE_GEN,
            'max_price_gen': MAX_PRICE_GEN,
            'max_endpoints_per_provider': MAX_ENDPOINTS_PER_PROVIDER,
            'max_endpoints_total': MAX_ENDPOINTS_TOTAL,
            'max_url_chars': MAX_URL_CHARS,
            'max_note_chars': MAX_NOTE_CHARS,
            'min_note_chars': MIN_NOTE_CHARS,
        })

    @gl.public.view
    def get_endpoint(self, endpoint_id: int) -> str:
        return self.endpoints.get(str(endpoint_id), '')

    @gl.public.view
    def get_all_endpoints(self) -> str:
        out = []
        for i in range(1, int(self.next_endpoint_id)):
            raw = self.endpoints.get(str(i), '')
            if raw:
                out.append(json.loads(raw))
        return packed(out)

    @gl.public.view
    def get_call(self, call_id: int) -> str:
        return self.calls.get(str(call_id), '')

    @gl.public.view
    def get_all_calls(self) -> str:
        out = []
        for i in range(1, int(self.next_call_id)):
            raw = self.calls.get(str(i), '')
            if raw:
                out.append(json.loads(raw))
        return packed(out)

    @gl.public.view
    def get_counts(self) -> str:
        violations = 0
        for i in range(1, int(self.next_endpoint_id)):
            raw = self.endpoints.get(str(i), '')
            if raw:
                violations += int(json.loads(raw)['violations'])
        return packed({
            'endpoint_count': int(self.total_endpoints),
            'call_count': int(self.next_call_id) - 1,
            'total_violations': violations,
            'total_received_wei': int(self.total_received),
            'total_withdrawn_wei': int(self.total_withdrawn),
            'contract_balance_wei': int(self.balance),
            'escrowed_wei': int(self.total_received - self.total_withdrawn),
        })
