# Abandoned first v1.3 deploy

Contract: `0x2992e9f69e8aAfBCB0E25AD1B433B3b31C0a7eAf`
Deploy tx: `0xaa09cbfa2d1f33da4436a6ad7ff018edbeb171e71c7547fe1ba69ba0c659a518`

## Why it was abandoned

The first v1.3 deploy (source with a nested snapshot dict carrying
floats in the non-deterministic consensus result) cannot settle:
the settle of C1 (tx `0xc407c7921de85550d6a00ac7690e110895f89c926092dd52d774b01c3e62ce9c`)
reached FINALIZED with result 7, leader ERROR, payload
`exit_code 1`, and every voting validator also reported
`exit_code 1` / disagree. The pure logic is correct in isolation
(mock + local stub pass); the consensus layer cannot encode a float
(or a nested dict) in a non-deterministic result. The fix, in the
redeployed v1.3 contract, carries the snapshot through consensus as
flat integer fields only (temperature and wind in tenths of a degree
/ km/h, time as a string); settle_call divides by 10 when it writes
the stored snapshot, so get_call still reads the real values.
No evidence tx from this deploy is used for the redeployed contract.

## Close-out (refunds the one funded call, C1)

- Listings E1/E2/E3 and call C1 (3 GEN escrowed from the buyer) were
  created before the settle failure; C1 stayed FUNDED.
- Cancel C1 (buyer): `0x7a57eaa776b2467b71f18fc97587231d810e1b62634d06a8cafdf031f70a0774` — FINALIZED, MAJORITY_AGREE, SUCCESS.
- Buyer withdraw of the 3 GEN refund: `0xb1a8f39c576c4f00c93156023a27b6c21faa1811706ad318d9176718c544b033` — FINALIZED, MAJORITY_AGREE, SUCCESS.
- C1 after close-out: status CANCELLED, buyer_withdrawn true.
- Contract balance after close-out: 0 wei (0 GEN).
- Counts after close-out: {"call_count":1,"contract_balance_wei":0,"endpoint_count":3,"escrowed_wei":0,"total_received_wei":3000000000000000000,"total_violations":0,"total_withdrawn_wei":3000000000000000000}.
