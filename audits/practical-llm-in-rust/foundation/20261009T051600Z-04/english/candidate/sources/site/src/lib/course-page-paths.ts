import { findChapterNeighbors } from './chapter-navigation';
import { cheatSheetRouteKey, indexCheatSheets, type CheatSheetData } from './cheat-sheets';
import { firstCourse, type CourseConfiguration } from './course-configuration';
import type { Locale } from '../i18n';
import type { PublicationChapterEntry, PublishableChapterSet } from './chapter-publication';

interface ChapterEntry extends PublicationChapterEntry {
  data: PublicationChapterEntry['data'] & {locale: Locale;title: string};
}
interface SheetEntry {data: CheatSheetData}

// One route/neighbor/sheet assembler serves both collection-scoped pages.
// A caller must supply already admitted sets, never raw metadata as approval.
export function buildCourseChapterPaths<T extends ChapterEntry,S extends SheetEntry>(
  chapters: readonly T[],
  sheets: readonly S[],
  admittedSets: readonly PublishableChapterSet<T>[],
  course: CourseConfiguration = firstCourse,
) {
  const sheetsByRoute=indexCheatSheets(chapters,sheets);
  const publishable=admittedSets.flatMap(set=>set.activeLocales.flatMap(locale=>{
    const entry=set.byLocale[locale];
    return entry?[{entry,equivalentLocales:set.activeLocales as readonly Locale[]}]:[];
  }));
  return publishable.map(({entry,equivalentLocales})=>{
    const localized=publishable.filter(candidate=>candidate.entry.data.locale===entry.data.locale).map(candidate=>({
      chapterId:candidate.entry.data.chapter_id,order:candidate.entry.data.order,title:candidate.entry.data.title,
    }));
    const {previous,next}=findChapterNeighbors(localized,entry.data.chapter_id);
    return {params:{locale:entry.data.locale,slug:entry.data.chapter_id},props:{
      entry,previous,next,equivalentLocales,course,
      cheatSheet:sheetsByRoute.get(cheatSheetRouteKey(entry.data.locale,entry.data.chapter_id))??null,
    }};
  });
}
