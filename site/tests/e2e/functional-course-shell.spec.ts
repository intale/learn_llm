import {expect,test} from '@playwright/test';
import {publishableChapterLocaleManifest as manifest} from './helpers/publishable-chapter-navigation';
import {chapterPath} from './chapter-helpers';

for(const locale of ['en','ru'] as const) {
  test('functional shell preserves the current '+locale+' publication boundary',async({page})=>{
    const chapters=manifest.chapters.filter(c=>c.activeLocales.includes(locale));
    await page.goto(chapterPath(locale,'').replace(/\/course\/\//,'/course/'));
    const links=page.locator('.course-list h2 a');
    await expect(links).toHaveCount(chapters.length);
    const actual=await links.evaluateAll(nodes=>nodes.map(n=>new URL((n as HTMLAnchorElement).href).pathname.split('/').filter(Boolean).at(-1)));
    expect(actual).toEqual(chapters.map(c=>c.chapterId));
    for(const width of [1280,390]) {
      await page.setViewportSize({width,height:800});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
    }
    const terminal=chapters.at(-1)!;
    await page.goto(chapterPath(locale,terminal.chapterId));
    await expect(page.locator('[data-chapter-root]')).toHaveAttribute('data-chapter-id',terminal.chapterId);
    // No unapproved successor route may appear in course navigation or sitemap.
    if(terminal.order===39)await expect(page.locator('a[href*="40-reference-core-handoff"]')).toHaveCount(0);
  });
}
