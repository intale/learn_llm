// Filesystem-neutral course identity/routing. A boundary never approves publication.
export const FIRST_COURSE_ID = 'llm-from-scratch';
export const PRACTICAL_COURSE_ID = 'practical-llm-in-rust';
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
const courseKeys = ['id','route','collection','sheetCollection','contentDirectory','sheetDirectory','contractDirectory','crateDirectory','orientationChapterId','firstOrder','lastOrder','referenceLocale','activeLocales'];
const identities = [
  [FIRST_COURSE_ID,'course','chapters','cheatSheets','site/src/content/chapters','site/src/content/cheat-sheets','curriculum/chapters','rust/crates/llm-from-scratch','00-llm-parts',39],
  [PRACTICAL_COURSE_ID,'practical-llm-in-rust','practicalChapters','practicalCheatSheets','site/src/content/practical-chapters','site/src/content/practical-cheat-sheets','curriculum/practical/chapters','rust/crates/llm-from-scratch-practical','00-course-structure',44],
];
export function validateCourseBoundaries(value, registeredLocales = ['en','ru']) {
  if (!exactKeys(value,['schemaVersion','courses','firstCrateBaseline']) || value.schemaVersion !== 1 ||
      !Array.isArray(value.courses) || value.courses.length !== identities.length ||
      !Array.isArray(registeredLocales) || !registeredLocales.includes('en') || new Set(registeredLocales).size !== registeredLocales.length)
    throw new Error('invalid closed course boundary manifest');
  const courses = value.courses.map((course,index) => {
    const expected = identities[index];
    if (!exactKeys(course,courseKeys) ||
        ['id','route','collection','sheetCollection','contentDirectory','sheetDirectory','contractDirectory','crateDirectory','orientationChapterId','lastOrder'].some((key,i)=>course[key] !== expected[i]) ||
        course.firstOrder !== 0 || course.referenceLocale !== 'en' ||
        !Array.isArray(course.activeLocales) || course.activeLocales.length === 0 ||
        new Set(course.activeLocales).size !== course.activeLocales.length || course.activeLocales[0] !== 'en' ||
        course.activeLocales.some(locale => !registeredLocales.includes(locale)) ||
        (index === 0 && JSON.stringify(course.activeLocales) !== JSON.stringify(registeredLocales)) ||
        (index === 1 && JSON.stringify(course.activeLocales) !== JSON.stringify(['en'])))
      throw new Error('course identity/directory/locale drift');
    return Object.freeze({...course,activeLocales:Object.freeze([...course.activeLocales])});
  });
  if (!exactKeys(value.firstCrateBaseline,['revision','inventory','sha256']) ||
      value.firstCrateBaseline.revision !== '9f38a060903c472c4d571efd8e52da1f17e553ff' ||
      value.firstCrateBaseline.inventory !== 'artifacts/practical-llm-in-rust/foundation/first-core-inventory.json' ||
      value.firstCrateBaseline.sha256 !== '6bd9c5d4634f9850c3b53f8768afd270433ea89cc77160db65563ce39be60fb1')
    throw new Error('first course baseline drift');
  return Object.freeze({...value,courses:Object.freeze(courses),firstCrateBaseline:Object.freeze({...value.firstCrateBaseline})});
}
export function courseById(configuration,id = FIRST_COURSE_ID) {
  const course = configuration.courses.find(item=>item.id===id);
  if (!course) throw new Error('unknown course identity');
  return course;
}
export function courseRouteSuffix(course,chapterId) {
  if (chapterId === undefined) return `/${course.route}/`;
  if (!/^\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(chapterId) ||
      Number(chapterId.slice(0,2)) > course.lastOrder || Number(chapterId.slice(0,2)) < course.firstOrder)
    throw new Error('chapter outside course boundary');
  return `/${course.route}/${chapterId}/`;
}
export function isCourseOrientation(course,chapter) {
  return chapter.chapter_kind === 'orientation' && chapter.chapter_id === course.orientationChapterId && chapter.order === 0;
}
export function validateCourseChapterIdentity(course,chapter) {
  courseRouteSuffix(course,chapter.chapter_id);
  if (!course.activeLocales.includes(chapter.locale) || chapter.order !== Number(chapter.chapter_id.slice(0,2)) ||
      (chapter.chapter_kind === 'orientation' && !isCourseOrientation(course,chapter)) ||
      (chapter.order === 0 && !isCourseOrientation(course,chapter))) throw new Error('course-scoped chapter identity/locale drift');
  return chapter;
}
