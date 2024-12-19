import { expect, test, galata } from '@jupyterlab/galata';
import path from 'path';

const BACKEND = process.env.BACKEND ?? 'rtc';
test.use({ autoGoto: false });

test.describe('UI Test', () => {
  test.describe('Extension activation test', () => {
    test('should emit an activation console message', async ({
      page,
      request
    }) => {
      const logs: string[] = [];

      page.on('console', message => {
        logs.push(message.text());
      });

      await page.goto();
      const expectedExtension = BACKEND === 'rtc' ? 7 : 6;
      expect(logs.filter(s => s.includes('@jupyter/suggestions'))).toHaveLength(
        expectedExtension
      );
      await page.getByTitle('Jupyter Suggestions');
      expect(await page.screenshot()).toMatchSnapshot({
        name: `${BACKEND}-main-page.png`
      });
    });
  });
  test.describe('Panel activation test', () => {
    test('should add the suggestion panel to the right', async ({
      page,
      request
    }) => {
      await page.goto();

      await page.sidebar.open('right');
      await page.getByTitle('Jupyter Suggestions').click();
      await page.getByTitle('All Suggestions');
      expect(await page.screenshot()).toMatchSnapshot({
        name: `${BACKEND}-side-panel.png`
      });
    });
  });
});

test.describe('Notebook Test', () => {
  test.beforeEach(async ({ page, tmpPath }) => {
    await page.contents.uploadDirectory(
      path.resolve(__dirname, './notebooks'),
      tmpPath
    );
    await page.filebrowser.openDirectory(tmpPath);
  });

  test('Should add suggestion widget', async ({ page, tmpPath }) => {
    await page.goto();
    const notebook = 'test.ipynb';
    await page.sidebar.open('right');
    await page.getByTitle('Jupyter Suggestions').click();
    await page.getByTitle('All Suggestions');

    await page.notebook.openByPath(`${tmpPath}/${notebook}`);
    await page.notebook.activate(notebook);

    await page.notebook.selectCells(0);
    await page.getByRole('button', { name: 'Suggestion menu' }).click();
    await page.getByText('Suggest change').click();
    await page.waitForTimeout(500);
    await page.notebook.selectCells(1);
    await page.getByRole('button', { name: 'Suggestion menu' }).click();
    await page.getByText('Suggest delete').click();
    await page.waitForTimeout(500);
    expect(await page.screenshot()).toMatchSnapshot({
      name: `${BACKEND}-add-suggestion.png`
    });
    await page
      .getByLabel('All Suggestions (2)', { exact: true })
      .getByText('def foo(): print(123) return')
      .fill('def foobar():\n    print(123)\n    return 123');
    await page.waitForTimeout(500);
    expect(
      await page.getByLabel('All Suggestions (2)', { exact: true }).screenshot()
    ).toMatchSnapshot({
      name: `${BACKEND}-change-cell-content.png`
    });
    await page.getByLabel('Accept suggestion').nth(2).click();
    await page.waitForTimeout(500);
    expect(await page.screenshot()).toMatchSnapshot({
      name: `${BACKEND}-accept-change-suggestion.png`
    });
    await page.getByLabel('Accept suggestion').nth(1).click();
    await page.waitForTimeout(500);
    expect(await page.screenshot()).toMatchSnapshot({
      name: `${BACKEND}-accept-delete-suggestion.png`
    });
  });
});
