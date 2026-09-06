import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("desktop sidebar exposes a ChatGPT-style account menu instead of the GitHub card", () => {
  const sidebar = read("components/app/desktop-sidebar.tsx");
  const accountMenu = read("components/account/sidebar-account-menu.tsx");
  const navigation = read("components/app/navigation.ts");
  assert.match(sidebar, /SidebarAccountMenu/);
  assert.doesNotMatch(sidebar, /SidebarCommunity/);
  assert.match(accountMenu, /PopoverContent side="left"/);
  assert.match(accountMenu, /ویرایش نام نمایشی/);
  assert.match(accountMenu, /تغییر رمز عبور/);
  assert.match(accountMenu, /خروج از حساب/);
  assert.doesNotMatch(navigation, /href: "\/account"/);
});

test("login and registration passwords can be revealed without changing the submitted field", () => {
  const authForm = read("components/auth/auth-form.tsx");
  const passwordInput = read("components/account/password-input.tsx");
  assert.match(authForm, /<PasswordInput name="password"/);
  assert.match(passwordInput, /type=\{visible \? "text" : "password"\}/);
  assert.match(passwordInput, /نمایش رمز عبور/);
  assert.match(passwordInput, /مخفی کردن رمز عبور/);
  assert.match(passwordInput, /type="button"/);
});

test("profile editing persists display name through the server account database", () => {
  const form = read("components/account/account-forms.tsx");
  const route = read("app/api/auth/profile/route.ts");
  const auth = read("lib/server/auth.ts");
  const db = read("lib/server/account-db.ts");
  assert.match(form, /fetch\("\/api\/auth\/profile"/);
  assert.match(route, /updateCurrentAccountProfile/);
  assert.match(auth, /updateUserDisplayName\(user\.id, parsed\.data\.displayName\)/);
  assert.match(db, /method: "PATCH"/);
  assert.match(db, /display_name: displayName/);
});

test("password changes require the current password before replacing its salted hash", () => {
  const form = read("components/account/account-forms.tsx");
  const route = read("app/api/auth/password/route.ts");
  const auth = read("lib/server/auth.ts");
  const db = read("lib/server/account-db.ts");
  assert.match(form, /currentPassword/);
  assert.match(form, /newPassword/);
  assert.match(form, /confirmPassword/);
  assert.match(route, /changeCurrentAccountPassword/);
  assert.match(auth, /verifyPassword\(parsed\.data\.currentPassword, user\.passwordHash\)/);
  assert.match(auth, /hashPassword\(parsed\.data\.newPassword\)/);
  assert.match(db, /password_hash: passwordHash/);
});

test("workspace passes the authenticated server identity into the client shell", () => {
  const layout = read("app/(workspace)/layout.tsx");
  const routeLayout = read("components/app/app-route-layout.tsx");
  const shell = read("components/app-shell.tsx");
  assert.match(layout, /const account = await getCurrentAccount\(\)/);
  assert.match(layout, /<AppRouteLayout account=\{account\}>/);
  assert.match(routeLayout, /account=\{account\}/);
  assert.match(shell, /account=\{account\}/);
});
