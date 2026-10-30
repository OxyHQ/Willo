/**
 * The news card's stories, from Clarity's public news (the same stories as
 * Discover): no credential, the same answer for every reader. The card shows
 * one at a time and turns to the next every two minutes.
 */

import { ClarityClient } from '@clarity.surf/sdk';
import { useQuery } from '@tanstack/react-query';
import type { NewsCard } from './cards';
import { useTick } from './use-tick';

/** How long each story stays on the card. */
const STORY_TURN_MS = 2 * 60_000;
/** Stories fetched at once: an hour of turns. */
const STORIES_PER_FETCH = 30;

const clarity = new ClarityClient({ baseUrl: process.env.EXPO_PUBLIC_CLARITY_API_URL });

/**
 * The story to show now, or `null` while there is none. `languages` are
 * primary subtags, most wanted first; Clarity falls back to every language
 * when those have no news.
 */
export function useCurrentStory(languages: readonly string[]): Omit<NewsCard, 'kind'> | null {
  const turn = useTick(STORY_TURN_MS);
  const stories = useQuery({
    queryKey: ['frame-news', languages.join(',')],
    queryFn: () => clarity.publicNews({ languages: [...languages], limit: STORIES_PER_FETCH }),
    staleTime: 15 * 60_000,
    refetchInterval: 15 * 60_000,
  });
  // A story worth a card has a title; the first of its articles speaks for it.
  const shown = (stories.data ?? []).filter((story) => story.title && story.articles[0]);
  if (shown.length === 0) return null;
  const story = shown[turn % shown.length];
  const article = story?.articles[0];
  if (!story || !article) return null;
  return {
    id: story.id,
    title: story.title,
    publisher: article.publisher ?? null,
    imageUrl: article.imageUrl ?? null,
    imageSeeds: article.imageSeeds ?? [],
  };
}
