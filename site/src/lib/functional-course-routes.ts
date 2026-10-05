import {findPublishableChapterSets as baseSets, type PublicationChapterEntry, type PublishableChapterSet} from './chapter-publication';
import {chapterLocaleConfiguration} from './functional-chapter-locales';
import {functionalPublicationEvidence, functionalPrivateReviewScope} from './functional-chapter-catalogs';
// @ts-ignore Shared filesystem-neutral selectors.
import {selectProductionChapterSets, selectPrivateReviewChapterSets} from './functional-course-publication.mjs';

export function findPublishableChapterSets<T extends PublicationChapterEntry>(entries: readonly T[]): PublishableChapterSet<T>[] {
  const reference = baseSets(entries.filter(e => e.data.order < 40));
  const production = selectProductionChapterSets({baseSets:reference, entries,
    configuration:chapterLocaleConfiguration,evidence:functionalPublicationEvidence()});
  const scope = functionalPrivateReviewScope();
  return (scope ? selectPrivateReviewChapterSets({productionSets:production,entries,
    configuration:chapterLocaleConfiguration,scope,buildRole:'private-review'}) : production) as PublishableChapterSet<T>[];
}
