const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

function loadConsent(initial, unavailable = false) {
  const storage = new Map(initial ? [['vault-cookie-consent', initial]] : []);
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../src/features/legal/cookieConsent.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(compiled, {
    exports,
    require: (id) => id === './constants' ? { LEGAL_VERSION: '2026-10-10' } : require(id),
    localStorage: {
      getItem: (key) => { if (unavailable) throw new Error('Storage blocked'); return storage.get(key) ?? null; },
      setItem: (key, value) => { if (unavailable) throw new Error('Storage blocked'); storage.set(key, value); }
    }
  });
  return { ...exports, storage };
}

test('optional cookies are denied before a decision and after rejection', () => {
  const consent = loadConsent();
  assert.equal(consent.optionalCookiesAllowed(), false);
  assert.equal(consent.useCookieConsent.getState().isOpen, true);
  consent.useCookieConsent.getState().choose('rejected');
  assert.equal(consent.optionalCookiesAllowed(), false);
  assert.equal(consent.useCookieConsent.getState().isOpen, false);
  const saved = JSON.parse(consent.storage.get('vault-cookie-consent'));
  assert.equal(saved.choice, 'rejected');
  assert.equal(saved.version, '2026-10-10');
  assert.ok(Number.isFinite(Date.parse(saved.updated_at)));
  assert.equal(loadConsent(JSON.stringify(saved)).useCookieConsent.getState().isOpen, false);
});

test('acceptance survives reload and can be revoked without changing the choice on close', () => {
  const consent = loadConsent();
  consent.useCookieConsent.getState().choose('accepted');
  assert.equal(consent.optionalCookiesAllowed(), true);
  const reloaded = loadConsent(consent.storage.get('vault-cookie-consent'));
  assert.equal(reloaded.optionalCookiesAllowed(), true);
  reloaded.useCookieConsent.getState().open();
  assert.equal(reloaded.useCookieConsent.getState().isOpen, true);
  reloaded.useCookieConsent.getState().close();
  assert.equal(reloaded.optionalCookiesAllowed(), true);
  reloaded.useCookieConsent.getState().choose('rejected');
  assert.equal(reloaded.optionalCookiesAllowed(), false);
});

test('malformed, stale and unrecognized consent never enable optional cookies', () => {
  for (const value of ['broken', 'null', JSON.stringify({ choice: 'accepted', version: '2020-01-01' }), JSON.stringify({ choice: 'unknown', version: '2026-10-10' })]) {
    const consent = loadConsent(value);
    assert.equal(consent.optionalCookiesAllowed(), false);
    assert.equal(consent.useCookieConsent.getState().isOpen, true);
  }
});

test('unavailable storage preserves the visit decision and exposes persistence failure', () => {
  const consent = loadConsent(null, true);
  assert.equal(consent.optionalCookiesAllowed(), false);
  consent.useCookieConsent.getState().choose('rejected');
  assert.equal(consent.useCookieConsent.getState().choice, 'rejected');
  assert.equal(consent.useCookieConsent.getState().storageError, true);
  assert.equal(consent.useCookieConsent.getState().isOpen, false);
});
