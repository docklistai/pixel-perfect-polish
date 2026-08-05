#!/usr/bin/env bash
# LOCAL ONLY: proves PostgREST preserves Ops refusal SQLSTATEs and never returns 40001.
set -euo pipefail

AUTH_CONTAINER="supabase_auth_pixel-perfect-polish"
BASE_URL="http://127.0.0.1:54321"
TMP_RESPONSE="$(mktemp)"
trap 'rm -f "$TMP_RESPONSE"' EXIT

if [[ "$BASE_URL" != "http://127.0.0.1:54321" ]]; then
  echo "FAIL: Ops HTTP checks may only target local Supabase at 127.0.0.1:54321" >&2
  exit 1
fi
if [[ "$AUTH_CONTAINER" != "supabase_auth_pixel-perfect-polish" ]] ||
   ! docker ps --format '{{.Names}}' | grep -qx "$AUTH_CONTAINER"; then
  echo "FAIL: repository-local Supabase auth container is not running" >&2
  exit 1
fi

JWT_SECRET="$(docker inspect "$AUTH_CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}' |
  sed -n 's/^GOTRUE_JWT_SECRET=//p' | head -n 1)"
if [[ -z "$JWT_SECRET" ]]; then
  echo "FAIL: local JWT secret unavailable" >&2
  exit 1
fi
ANON_KEY="$(OPS_JWT_SECRET="$JWT_SECRET" node -e 'const c=require("crypto");const b=x=>Buffer.from(JSON.stringify(x)).toString("base64url");const h=b({alg:"HS256",typ:"JWT"});const p=b({iss:"supabase-demo",role:"anon",iat:1640192800,exp:4102444800});const s=c.createHmac("sha256",process.env.OPS_JWT_SECRET).update(`${h}.${p}`).digest("base64url");process.stdout.write(`${h}.${p}.${s}`)')"

AUTH_JSON="$(curl -fsS "$BASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" -H 'content-type: application/json' \
  --data '{"email":"alex@harbourview.co.uk","password":"Docklist2026"}')"
ACCESS_TOKEN="$(printf '%s' "$AUTH_JSON" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')"
if [[ -z "$ACCESS_TOKEN" ]]; then echo "FAIL: local manager sign-in failed" >&2; exit 1; fi

call_rpc() {
  local rpc="$1" body="$2"
  curl -sS -o "$TMP_RESPONSE" -w '%{http_code}' "$BASE_URL/rest/v1/rpc/$rpc" \
    -H "apikey: $ANON_KEY" -H "authorization: Bearer $ACCESS_TOKEN" \
    -H 'content-type: application/json' --data "$body"
}

status="$(call_rpc rpc_ops_create_handover '{"p_workspace_id":"10000000-0000-4000-8000-000000000001","p_request_id":"f5500000-0000-4000-8000-000000000001","p_location_id":"11000000-0000-4000-8000-000000000001","p_handover_date":"2000-01-01","p_rota_week_id":null,"p_notes":"Wrong date refusal","p_recipient_membership_ids":[],"p_entry_ids":[]}')"
if [[ "$status" != "500" ]] || ! grep -q '"code":"55000"' "$TMP_RESPONSE"; then
  echo "FAIL: deterministic refusal was HTTP $status: $(<"$TMP_RESPONSE")" >&2; exit 1
fi
if grep -q '40001' "$TMP_RESPONSE"; then echo "FAIL: refusal leaked 40001" >&2; exit 1; fi

status="$(call_rpc rpc_ops_create_entry '{"p_workspace_id":"10000000-0000-4000-8000-000000000001","p_request_id":"f5500000-0000-4000-8000-000000000002","p_entry_type":"task","p_title":"Invalid priority","p_description":null,"p_location_id":"11000000-0000-4000-8000-000000000001","p_area_label":null,"p_department_id":null,"p_rota_week_id":null,"p_shift_id":null,"p_subject_staff_member_id":null,"p_leave_request_id":null,"p_assigned_staff_member_id":null,"p_due_at":null,"p_priority":"urgent","p_severity":null,"p_occurred_at":null,"p_immediate_action":null,"p_parent_entry_id":null,"p_create_follow_up":false}')"
if [[ "$status" != "400" ]] || ! grep -q '"code":"22023"' "$TMP_RESPONSE"; then
  echo "FAIL: validation refusal was HTTP $status: $(<"$TMP_RESPONSE")" >&2; exit 1
fi

status="$(curl -sS -o "$TMP_RESPONSE" -w '%{http_code}' "$BASE_URL/rest/v1/rpc/rpc_ops_read_page" \
  -H "apikey: $ANON_KEY" -H 'content-type: application/json' \
  --data '{"p_workspace_id":"10000000-0000-4000-8000-000000000001"}')"
if [[ "$status" != "401" ]] || ! grep -q '"code":"42501"' "$TMP_RESPONSE"; then
  echo "FAIL: anonymous refusal was HTTP $status: $(<"$TMP_RESPONSE")" >&2; exit 1
fi

echo "ops-http-tests: PASS (55000→500, 22023→400, anonymous 42501→401, no 40001)"
