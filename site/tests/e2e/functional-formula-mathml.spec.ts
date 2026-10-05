import {expect,test} from '@playwright/test';
import {publishableChapterLocaleManifest as manifest} from './helpers/publishable-chapter-navigation';
import {chapterPath} from './chapter-helpers';
for(const chapter of manifest.chapters.filter(c=>c.order>=40)) {
  for(const locale of chapter.activeLocales) {
    test('functional MathML '+locale+':'+chapter.chapterId,async({page})=>{
      await page.goto(chapterPath(locale,chapter.chapterId));
      await expect(page.locator('.lesson-body math')).not.toHaveCount(0);
      await expect(page.locator('.lesson-body math annotation[encoding="application/x-tex"]')).not.toHaveCount(0);
      for(const width of [1280,390]) {
        await page.setViewportSize({width,height:800});
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
      }
    });
  }
}
