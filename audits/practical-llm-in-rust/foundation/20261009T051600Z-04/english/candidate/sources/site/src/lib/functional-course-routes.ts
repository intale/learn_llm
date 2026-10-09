import {findPublishableChapterSets as baseSets, type PublicationChapterEntry, type PublishableChapterSet} from './chapter-publication';
import { firstCourse } from './course-configuration';

export function findPublishableChapterSets<T extends PublicationChapterEntry>(entries: readonly T[]): PublishableChapterSet<T>[] {
  return baseSets(entries.filter(e => e.data.order <= firstCourse.lastOrder));
}
