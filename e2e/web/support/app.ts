import { $, $$, browser, expect } from '@wdio/globals';
import { Key } from 'webdriverio';

/** Element, katerega lastno besedilo je natanko `text` (ne predniki, ki ga le vsebujejo). */
export function byText(text: string, tag = '*') {
  const literal = text.includes('"') ? `'${text}'` : `"${text}"`;
  return $(`//${tag}[text()[normalize-space()=${literal}]]`);
}

export function allByText(text: string, tag = '*') {
  return $$(`//${tag}[text()[normalize-space()="${text}"]]`);
}

export async function expectPath(path: string | RegExp) {
  const matches = (pathname: string) =>
    typeof path === 'string' ? pathname === path : path.test(pathname);
  await browser.waitUntil(async () => matches(new URL(await browser.getUrl()).pathname), {
    timeoutMsg: `Pričakovana pot ${path}, dejanska ${await browser.getUrl()}`,
  });
}

/**
 * Zamenja vsebino polja. setValue() v Reactovih nadzorovanih poljih stare vrednosti ne
 * počisti (React je ne zazna), zato jo izberemo in prepišemo s tipkovnico.
 */
export async function fill(selector: string, value: string) {
  const field = $(selector);
  await field.click();
  await browser.keys([Key.Ctrl, 'a']);
  await browser.keys(Key.Backspace);
  await field.addValue(value);
  await expect(field).toHaveValue(value);
}

/** Izpolni prijavni obrazec in klikne "Log in" (ne čaka na izid). */
export async function submitLogin(email: string, password: string) {
  await fill('input[type="email"]', email);
  await fill('input[type="password"]', password);
  await $('button=Log in').click();
}

export async function loginAs(account: { email: string; password: string }, landing: string) {
  await browser.url('/login');
  await submitLogin(account.email, account.password);
  await expectPath(landing);
}

export async function signOut() {
  await $('button=Sign out').click();
  await expectPath('/login');
}

/** Obvestilo (toast) izgine po 4 s, zato ga ujamemo takoj, ko se pojavi. */
export async function expectToast(message: string) {
  await expect(byText(message, 'div')).toBeDisplayed();
}
