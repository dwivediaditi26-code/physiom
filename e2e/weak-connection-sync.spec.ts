import { test, expect, type Page } from '@playwright/test';
import {
  signUp, login, startOrtho, fillDemographics, fillChiefComplaint, saveAssessment,
  expectPatientListed, expectCloudSaved, trackCloudSaves, noCrash, uniqueSuffix,
} from './appMap';

// On a weak connection the app must not send, or download, patients that have not
// changed. Checked against the real database API of the disposable TEST project
// (see e2e/README.md), because the unit tests only use a stand-in for it.
//
//  - saving a new patient sends that patient only, never the ones already saved
//    (the second patient is added on a second device, which starts with the first
//    patient already downloaded)
//  - signing in asks the cloud which patients changed (instead of downloading all of
//    them) and then downloads only the ones it lacks

type Sent = { names: string[] };

function watchSaves(page: Page) {
  const sent: Sent[] = [];
  page.on('request', (req) => {
    if (req.method() !== 'POST' || !req.url().includes('/rest/v1/patients')) return;
    try {
      const rows = req.postDataJSON();
      if (Array.isArray(rows)) sent.push({ names: rows.map((r: { name?: string }) => String(r.name || '')) });
    } catch { /* not JSON */ }
  });
  return sent;
}

function watchReads(page: Page) {
  const reads = { index: 0 };
  page.on('request', (req) => {
    const url = req.url();
    if (req.method() !== 'GET' || !url.includes('/rest/v1/patients')) return;
    const select = new URL(url).searchParams.get('select') || '';
    if (select.replace(/\s/g, '') === 'id,updated_at') reads.index++;
  });
  return reads;
}

async function addPatient(page: Page, name: string, note: string) {
  await startOrtho(page, { name, region: 'Knee', side: 'Right' });
  await fillDemographics(page, { name, age: 40, sex: 'Female' });
  await fillChiefComplaint(page, note);
  await saveAssessment(page);
  await expectPatientListed(page, name);
}

test.describe('Weak connection: only what changed travels', () => {
  test('a new patient is sent alone, and a restart asks what changed instead of downloading everyone', async ({ browser }, testInfo) => {
    // What is sent and asked does not depend on the screen size; the phone layout only
    // changes how the test would have to move around the screens.
    test.skip(testInfo.project.name === 'mobile-chrome', 'network traffic does not depend on screen size');
    test.setTimeout(240_000);
    const unique = uniqueSuffix();
    const account = { name: 'E2E Weak Connection', email: `e2e-weak-${unique}@physiomind-test.dev`, password: 'TestPass123!' };
    const first = `E2E Weak First ${unique}`;
    const second = `E2E Weak Second ${unique}`;

    // ── Device A saves the first patient ──
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    const savesA = trackCloudSaves(pageA);
    await signUp(pageA, account);
    await addPatient(pageA, first, `E2E-${unique} first`);
    await expectCloudSaved(savesA);

    // ── Device B: signs in (downloads the first patient), then saves a second one ──
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    const sent = watchSaves(pageB);
    const reads = watchReads(pageB);
    await login(pageB, { email: account.email, password: account.password });
    await expectPatientListed(pageB, first, 45_000);
    // The app first asked the cloud what it holds (this also proves the real database accepts
    // that question), then downloaded the patient it did not have.
    expect(reads.index, 'the app should ask the cloud which patients changed').toBeGreaterThan(0);
    await addPatient(pageB, second, `E2E-${unique} second`);
    await expect.poll(() => sent.some((s) => s.names.includes(second)), { timeout: 45_000 }).toBe(true);
    for (const s of sent) expect(s.names, 'a save must not re-send a patient that did not change').not.toContain(first);
    await noCrash(pageB);

    await ctxA.close();
    await ctxB.close();
  });
});
