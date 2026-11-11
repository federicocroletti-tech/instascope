import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHandler, validSummary } from '../api/insights.mjs';

const summary = {
  currentDate: '2026-11-01T00:00:00.000Z',
  previousDate: '2026-10-01T00:00:00.000Z',
  followers: 3,
  following: 3,
  pendingRequests: null,
  newFollowers: 1,
  lostFollowers: 1,
  nonReciprocal: 1,
};
const env = {
  OPENAI_API_KEY: 'synthetic-provider-key',
  INSTASCOPE_AI_MODEL: 'synthetic-model',
  NG_APP_SUPABASE_URL: 'https://auth.example.invalid',
  NG_APP_SUPABASE_ANON_KEY: 'synthetic-public-key',
};
const request = () => ({
  method: 'POST',
  headers: { authorization: `Bearer ${'synthetic'.repeat(4)}`, 'content-type': 'application/json' },
  body: { consent: true, language: 'it', question: 'Cosa cambia?', summary },
});
async function invoke(handler, input = request()) {
  const output = { headers: {} };
  await handler(input, {
    setHeader(key, value) {
      output.headers[key] = value;
    },
    status(status) {
      output.status = status;
      return this;
    },
    json(body) {
      output.body = body;
    },
  });
  return output;
}
const owner = () => Response.json({ id: 'synthetic-owner', app_metadata: { role: 'owner' } });

test('rejects identity fields, missing metrics, negative counts and invalid periods', () => {
  assert.equal(validSummary(summary), true);
  assert.equal(validSummary({ ...summary, username: 'private' }), false);
  assert.equal(validSummary({ ...summary, followers: -1 }), false);
  assert.equal(validSummary({ ...summary, followers: undefined }), false);
  assert.equal(validSummary({ ...summary, previousDate: summary.currentDate }), false);
  assert.equal(validSummary({ ...summary, currentDate: 'invalid' }), false);
});

test('fails closed without configuration, credentials or explicit consent', async () => {
  const neverFetch = () => {
    throw new Error('Must not contact provider');
  };
  assert.equal((await invoke(createHandler({}, neverFetch))).status, 503);
  const handler = createHandler(env, neverFetch);
  assert.equal((await invoke(handler, { ...request(), headers: {} })).status, 415);
  const noToken = request();
  delete noToken.headers.authorization;
  assert.equal((await invoke(handler, noToken)).status, 401);
  const noConsent = request();
  noConsent.body.consent = false;
  assert.equal((await invoke(handler, noConsent)).status, 400);
  const identity = request();
  identity.body.summary = { ...summary, username: 'private' };
  assert.equal((await invoke(handler, identity)).status, 400);
});

test('validates owner using server-side app_metadata, not user_metadata', async () => {
  let calls = 0;
  const handler = createHandler(env, async () => {
    calls++;
    return Response.json({ id: 'user', user_metadata: { role: 'owner' } });
  });
  assert.equal((await invoke(handler)).status, 403);
  assert.equal(calls, 1);
});

test('forwards only aggregate context, bounds generation and disables caching', async () => {
  const calls = [];
  const handler = createHandler(env, async (url, options) => {
    calls.push({ url: String(url), options });
    return calls.length === 1
      ? owner()
      : Response.json({ choices: [{ message: { content: 'Saldo zero.' } }] });
  });
  const output = await invoke(handler);
  assert.equal(output.status, 200);
  assert.equal(output.body.answer, 'Saldo zero.');
  assert.equal(output.headers['Cache-Control'], 'no-store');
  assert.equal(calls[0].url, 'https://auth.example.invalid/auth/v1/user');
  const payload = JSON.parse(calls[1].options.body);
  assert.equal(payload.store, false);
  assert.equal(payload.max_completion_tokens, 700);
  assert.deepEqual(JSON.parse(payload.messages[1].content).summary, summary);
  assert.equal(calls[1].options.body.includes('synthetic-owner'), false);
});

test('rate limits repeated authenticated requests before calling the provider', async () => {
  let providerCalls = 0;
  const handler = createHandler(env, async (url) => {
    if (String(url).includes('/auth/')) return owner();
    providerCalls++;
    return Response.json({ choices: [{ message: { content: 'Risposta.' } }] });
  });
  for (let index = 0; index < 5; index++) assert.equal((await invoke(handler)).status, 200);
  assert.equal((await invoke(handler)).status, 429);
  assert.equal(providerCalls, 5);
});

test('returns sanitized provider failures and rejects malformed or oversized requests', async () => {
  const handler = createHandler(env, async (url) =>
    String(url).includes('/auth/')
      ? owner()
      : new Response('secret upstream error', { status: 500 }),
  );
  assert.deepEqual((await invoke(handler)).body, { error: 'provider_unavailable' });
  assert.equal((await invoke(handler, { ...request(), body: '{' })).status, 400);
  assert.equal((await invoke(handler, { ...request(), body: 'x'.repeat(4097) })).status, 413);
  assert.equal((await invoke(handler, { ...request(), method: 'DELETE' })).status, 405);
  assert.deepEqual((await invoke(createHandler({}), { method: 'GET' })).body, { enabled: false });
});
