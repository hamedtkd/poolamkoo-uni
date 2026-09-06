import assert from "node:assert/strict";
import test from "node:test";
import { databaseNameForScope } from "../lib/local-database-scope.ts";

test("legacy database remains owned by first account", () => {
  assert.equal(databaseNameForScope("user-a", null), "poolyar-local");
  assert.equal(databaseNameForScope("user-a", "user-a"), "poolyar-local");
});

test("additional accounts receive isolated database names", () => {
  assert.equal(databaseNameForScope("user-b", "user-a"), "poolyar-local-user-b");
});

test("scope is sanitized before becoming part of IndexedDB name", () => {
  assert.equal(databaseNameForScope("user/b@example.com", "user-a"), "poolyar-local-userbexamplecom");
});
