export interface ChapterNavigationTarget {
  chapterId: string;
  order: number;
  title: string;
}

export interface ChapterNeighbors<T extends ChapterNavigationTarget> {
  previous: T | null;
  current: T;
  next: T | null;
}

const chapterIdPattern = /^\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function orderChapterTargets<T extends ChapterNavigationTarget>(
  targets: readonly T[],
): T[] {
  const chapterIds = new Set<string>();
  const orders = new Set<number>();

  for (const target of targets) {
    if (!chapterIdPattern.test(target.chapterId)) {
      throw new Error(`invalid chapter navigation ID "${target.chapterId}"`);
    }
    if (!Number.isInteger(target.order) || target.order < 1) {
      throw new Error(
        `invalid chapter navigation order for ${target.chapterId}`,
      );
    }
    if (target.title.trim().length === 0) {
      throw new Error(
        `missing chapter navigation title for ${target.chapterId}`,
      );
    }
    if (chapterIds.has(target.chapterId)) {
      throw new Error(`duplicate chapter navigation ID "${target.chapterId}"`);
    }
    if (orders.has(target.order)) {
      throw new Error(`duplicate chapter navigation order ${target.order}`);
    }
    chapterIds.add(target.chapterId);
    orders.add(target.order);
  }

  return [...targets].sort(
    (left, right) =>
      left.order - right.order || left.chapterId.localeCompare(right.chapterId),
  );
}

export function findChapterNeighbors<T extends ChapterNavigationTarget>(
  targets: readonly T[],
  currentChapterId: string,
): ChapterNeighbors<T> {
  const ordered = orderChapterTargets(targets);
  const currentIndex = ordered.findIndex(
    (target) => target.chapterId === currentChapterId,
  );

  if (currentIndex === -1) {
    throw new Error(
      `current chapter "${currentChapterId}" is absent from published navigation`,
    );
  }

  return {
    previous: ordered[currentIndex - 1] ?? null,
    current: ordered[currentIndex],
    next: ordered[currentIndex + 1] ?? null,
  };
}
