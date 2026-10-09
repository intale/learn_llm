import manifest from '../../../configs/course-boundaries-v1.json';
import { locales, type Locale } from '../i18n';
// @ts-ignore One filesystem-neutral module also serves maintained Node checks.
import { validateCourseBoundaries, courseById } from './course-boundaries.mjs';

export interface CourseConfiguration {
  id: 'llm-from-scratch' | 'practical-llm-in-rust';
  route: 'course' | 'practical-llm-in-rust';
  collection: 'chapters' | 'practicalChapters';
  sheetCollection: 'cheatSheets' | 'practicalCheatSheets';
  contentDirectory: string;
  sheetDirectory: string;
  contractDirectory: string;
  crateDirectory: string;
  orientationChapterId: string;
  firstOrder: number;
  lastOrder: number;
  referenceLocale: Locale;
  activeLocales: readonly Locale[];
}
export const courseConfiguration = validateCourseBoundaries(manifest,[...locales]);
export const firstCourse = courseById(courseConfiguration) as CourseConfiguration;
export const practicalCourse = courseById(courseConfiguration,'practical-llm-in-rust') as CourseConfiguration;
