import { $, $$, expect } from '@wdio/globals';
import { allByText, byText, expectPath, expectToast, fill, loginAs } from '../support/app';
import { TD } from '../support/data';

const nameInput = () => $('input[placeholder^="e.g. Push Day"]');
// Vsak set ima dve številski polji: ponovitve in težo.
const setInputs = () => $$('input[type="number"]');
const removeLast = () => $('button*=Remove last');

describe('TS-03 Ustvarjanje predloge treninga za stranko', () => {
  before(async () => {
    await loginAs(TD.trainer, '/trainer');
  });

  it('K1: profil stranke ima zavihek s predlogami', async () => {
    await byText(TD.trainer.clientName).click();
    await expectPath(/^\/trainer\/clients\/[^/]+$/);
    await $('button*=Templates').click();
    await expect(byText('WORKOUT TEMPLATES')).toBeDisplayed();
    await expect($('button=New template')).toBeDisplayed();
  });

  it('K2: New template odpre prazen urejevalnik', async () => {
    await $('button=New template').click();
    await expect(byText('NEW TEMPLATE FOR CLIENT')).toBeDisplayed();
    await expect(nameInput()).toHaveValue('');
    await expect($('button*=Pick exercises from the library')).toBeDisplayed();
  });

  it('K3: prazno ime vrne napako', async () => {
    await $('button=Create template').click();
    await expect(byText('Give your template a name.')).toBeDisplayed();
    await expect(nameInput()).toBeDisplayed();
  });

  it('K4: predloga brez vaj vrne napako', async () => {
    await fill('input[placeholder^="e.g. Push Day"]', TD.templateName);
    await $('button=Create template').click();
    await expect(byText('Add at least one exercise.')).toBeDisplayed();
    await expect(nameInput()).toBeDisplayed();
  });

  it('K5: vaja iz knjižnice se doda na seznam', async () => {
    await $('button*=Pick exercises from the library').click();
    await fill('input[placeholder^="Search exercises"]', TD.exercise.query);
    await byText(TD.exercise.name).click();
    await $('button=Add 1 exercise').click();
    await expect(byText('Exercise library')).not.toBeExisting();
    await expect(byText(TD.exercise.name)).toBeDisplayed();
  });

  it('K6: zadnjega seta ni mogoče odstraniti', async () => {
    await byText(TD.exercise.name).click(); // razširi vajo
    await expect(setInputs()).toBeElementsArrayOfSize(3 * 2);

    await removeLast().click();
    await expect(setInputs()).toBeElementsArrayOfSize(2 * 2);

    await removeLast().click();
    await expect(setInputs()).toBeElementsArrayOfSize(1 * 2);
    await expect(removeLast()).not.toBeExisting();
    await expect($('span*=At least one set required')).toBeDisplayed();
  });

  it('K7: veljavna predloga se shrani in dodeli stranki', async () => {
    const [reps, weight] = await setInputs().getElements();
    await expect(reps).toHaveValue(String(TD.set.reps));
    // Polje že vsebuje "0"; dopisano "60" da vrednost 60.
    await weight.addValue(String(TD.set.weightKg));
    await $('button*=Add rest').click(); // privzeto 90 s
    await expect(byText(TD.set.restLabel)).toBeDisplayed();

    await $('button*=ADD SET').click();
    await $('button*=ADD SET').click();
    await expect(setInputs()).toBeElementsArrayOfSize(TD.set.count * 2);

    await $('button=Create template').click();
    await expectToast(`"${TD.templateName}" assigned to your client.`);
    await expect(byText('NEW TEMPLATE FOR CLIENT')).not.toBeExisting();
    await expect($('button*=Templates · 1')).toBeDisplayed();
  });

  it('K8: shranjena predloga se ujema z vnosom', async () => {
    await $(`[aria-label="Open template ${TD.templateName}"]`).click();
    await expect(byText(TD.templateName, 'h1')).toBeDisplayed();
    await expect(byText(TD.exercise.name)).toBeDisplayed();
    await expect(allByText(`${TD.set.weightKg} kg`, 'span')).toBeElementsArrayOfSize(TD.set.count);
    await expect(allByText(TD.set.restLabel, 'span')).toBeElementsArrayOfSize(TD.set.count);
    await expect(allByText(String(TD.set.reps), 'span')).toBeElementsArrayOfSize(TD.set.count);
  });
});
