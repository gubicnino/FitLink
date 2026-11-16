import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { $, $$, browser, expect } from '@wdio/globals';
import { byText, expectPath, expectToast, fill, loginAs, signOut, submitLogin } from '../support/app';
import { TD } from '../support/data';
import { DOWNLOAD_DIR } from '../wdio.conf';

describe('TS-02 Obravnava prijave trenerja', () => {
  before(async () => {
    await loginAs(TD.admin, '/admin');
  });

  it('K1: seznam prikaže obe čakajoči prijavi', async () => {
    await expect(byText('2 pending reviews', 'h1')).toBeDisplayed();
    await expect(byText(TD.applicantA.name, 'h3')).toBeDisplayed();
    await expect(byText(TD.applicantB.name, 'h3')).toBeDisplayed();
    await expect($$('//span[text()[normalize-space()="Cert attached"]]')).toBeElementsArrayOfSize(2);
  });

  it('K2: podrobnosti prijave A prikažejo PENDING, podatke in certifikat', async () => {
    await byText(TD.applicantA.name, 'h3').click();
    await expectPath(/^\/admin\/applications\/[^/]+$/);
    await expect(byText(TD.applicantA.name, 'h1')).toBeDisplayed();
    await expect(byText('PENDING', 'span')).toBeDisplayed();
    await expect($('iframe[title="Certificate preview"]')).toBeDisplayed();
  });

  it('K3: Download prenese veljaven PDF certifikat', async () => {
    await $('button=Download').click();
    const file = resolve(DOWNLOAD_DIR, TD.applicantA.certificate);
    await browser.waitUntil(() => existsSync(file), {
      timeoutMsg: `Datoteka ${TD.applicantA.certificate} se ni prenesla.`,
    });
    expect(readFileSync(file).subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('K4: prekratek razlog zavrnitve je zavrnjen, prijava ostane odprta', async () => {
    await $('button=Reject').click();
    await fill('textarea', TD.shortReason);
    await $('button=Reject application').click();
    await expectToast('Please write a short reason (at least 5 characters).');
    await expect($('textarea')).toBeDisplayed();
    await expectPath(/^\/admin\/applications\//);
  });

  it('K5: veljaven razlog zavrne prijavo A in jo odstrani s seznama', async () => {
    await fill('textarea', TD.validReason);
    await $('button=Reject application').click();
    await expectToast(`${TD.applicantA.name} rejected.`);
    await expectPath('/admin');
    await expect(byText('1 pending review', 'h1')).toBeDisplayed();
    await expect(byText(TD.applicantA.name, 'h3')).not.toBeExisting();
  });

  it('K6: Approve odobri prijavo B in jo odstrani s seznama', async () => {
    await byText(TD.applicantB.name, 'h3').click();
    await $('button=Approve').click();
    await expectToast(`${TD.applicantB.name} approved as a trainer.`);
    await expectPath('/admin');
    await expect(byText('No pending applications')).toBeDisplayed();
  });

  it('K7: odobreni kandidat se prijavi kot TRAINER', async () => {
    await signOut();
    await submitLogin(TD.applicantB.email, TD.applicantB.password);
    await expectPath('/trainer');
    await expect(byText('TRAINER', 'div')).toBeDisplayed();
    await expect($('h1*=Coach Kandidat')).toBeDisplayed();
  });
});
