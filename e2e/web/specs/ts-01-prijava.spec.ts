import { $, browser, expect } from '@wdio/globals';
import { byText, expectPath, signOut, submitLogin } from '../support/app';
import { TD } from '../support/data';

describe('TS-01 Prijava in usmerjanje glede na vlogo', () => {
  it('K1: stran /login prikaže prijavni obrazec', async () => {
    await browser.url('/login');
    await expect(byText('Welcome back', 'h1')).toBeDisplayed();
    await expect($('input[type="email"]')).toBeDisplayed();
    await expect($('input[type="password"]')).toBeDisplayed();
    await expect($('button=Log in')).toBeDisplayed();
  });

  it('K2: napačno geslo prikaže napako in uporabnik ostane na /login', async () => {
    await submitLogin(TD.trainer.email, TD.wrongPassword);
    // Sporočilo mora govoriti o prijavnih podatkih (ne npr. o nedosegljivem strežniku).
    await expect($('.login-card')).toHaveText(expect.stringMatching(/credential|password|geslo/i));
    await expectPath('/login');
  });

  it('K3: pravilni podatki trenerja preusmerijo na /trainer s seznamom strank', async () => {
    await submitLogin(TD.trainer.email, TD.trainer.password);
    await expectPath('/trainer');
    await expect($('h1*=Coach Test')).toBeDisplayed();
    await expect(byText(TD.trainer.clientName)).toBeDisplayed();
  });

  it('K4: trener ne more odpreti /admin', async () => {
    await browser.url('/admin');
    await expectPath('/trainer');
    await expect($('h1*=Coach Test')).toBeDisplayed();
    await expect($('*=TRAINER APPLICATIONS')).not.toBeExisting();
  });

  it('K5: Sign out odjavi uporabnika in preusmeri na prijavo', async () => {
    await signOut();
    await expect($('input[type="email"]')).toHaveValue('');
  });

  it('K6: neprijavljen uporabnik je s /trainer preusmerjen na /login', async () => {
    await browser.url('/trainer');
    await expectPath('/login');
    await expect($('button=Log in')).toBeDisplayed();
  });

  it('K7: administrator je preusmerjen na /admin s seznamom prijav', async () => {
    await submitLogin(TD.admin.email, TD.admin.password);
    await expectPath('/admin');
    await expect(byText('2 pending reviews', 'h1')).toBeDisplayed();
    await expect(byText(TD.applicantA.name, 'h3')).toBeDisplayed();
    await expect(byText(TD.applicantB.name, 'h3')).toBeDisplayed();
  });
});
