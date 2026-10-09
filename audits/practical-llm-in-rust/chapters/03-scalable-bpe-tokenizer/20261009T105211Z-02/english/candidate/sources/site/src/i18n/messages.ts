export const messageKeys = [
  'siteTitle',
  'siteDescription',
  'skipToContent',
  'homeLabel',
  'languageSwitchLabel',
  'darkThemeLabel',
  'languagePickerTitle',
  'languagePickerIntro',
  'eyebrow',
  'homeTitle',
  'homeIntro',
  'examplesTitle',
  'examplesDescription',
  'formulasTitle',
  'formulasDescription',
  'historyTitle',
  'historyDescription',
  'courseNote',
  'courseLinkLabel',
  'repositoryLinkLabel',
  'courseEyebrow',
  'courseTitle',
  'courseDescription',
  'courseEmpty',
  'contentRevisionLabel',
  'allChaptersLabel',
  'chapterObjectiveLabel',
  'chapterNavigationLabel',
  'previousChapterLabel',
  'nextChapterLabel',
  'diagramFullViewOpenLabel',
  'diagramFullViewCloseLabel',
  'footerNote',
] as const;

export type MessageKey = (typeof messageKeys)[number];
export const COURSE_HOME_MESSAGE_KEYS = [
  'courseSelectionTitle',
  'basicsCourseTitle',
  'basicsCourseDescription',
  'basicsCourseStart',
  'practicalCourseTitle',
  'practicalCourseDescription',
  'practicalCourseStart',
  'practicalCourseLanguage',
  'practicalCoursePrerequisite',
] as const;
export const COURSE_INDEX_MESSAGE_KEYS = [
  'practicalCourseEyebrow',
  'practicalIndexDescription',
] as const;
export const courseMessageKeys = [...COURSE_HOME_MESSAGE_KEYS, ...COURSE_INDEX_MESSAGE_KEYS] as const;
export type CourseMessageKey = (typeof courseMessageKeys)[number];
export type CourseHomeMessages = Readonly<Record<(typeof COURSE_HOME_MESSAGE_KEYS)[number],string>>;
export type CourseIndexMessages = Readonly<Record<(typeof COURSE_INDEX_MESSAGE_KEYS)[number],string>>;
export type CourseMessages = Readonly<Record<CourseMessageKey,string>>;
export type Messages = Readonly<Record<MessageKey, string>> & Partial<CourseMessages>;
export function hasCourseHomeMessages(copy: Messages): copy is Messages & CourseHomeMessages {
  return COURSE_HOME_MESSAGE_KEYS.every(key => typeof copy[key] === 'string' && copy[key]!.trim() !== '');
}
export function hasCourseIndexMessages(copy: Messages): copy is Messages & CourseIndexMessages {
  return COURSE_INDEX_MESSAGE_KEYS.every(key => typeof copy[key] === 'string' && copy[key]!.trim() !== '');
}
export function hasCourseMessages(copy: Messages): copy is Messages & CourseMessages {
  return hasCourseHomeMessages(copy) && hasCourseIndexMessages(copy);
}
