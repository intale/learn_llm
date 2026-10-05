import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {readChapterLocaleConfiguration} from './chapter-locale-config.mjs';
import {composeChapterConfigurations, validateFunctionalManifest} from '../site/src/lib/functional-course-publication.mjs';

export {activeLocalesForChapter} from './chapter-locale-config.mjs';
export {validateFunctionalManifest};

export function readFunctionalChapterLocaleConfiguration(root, localeConfiguration) {
  const base = readChapterLocaleConfiguration(root, localeConfiguration);
  const value = JSON.parse(readFileSync(join(root, 'site/src/i18n/functional-chapter-locales.json'), 'utf8'));
  return composeChapterConfigurations(base, value);
}
