export interface Messages {
  languageName: string;
  siteTitle: string;
  siteDescription: string;
  skipToContent: string;
  homeLabel: string;
  languageSwitchLabel: string;
  eyebrow: string;
  homeTitle: string;
  homeIntro: string;
  examplesTitle: string;
  examplesDescription: string;
  formulasTitle: string;
  formulasDescription: string;
  historyTitle: string;
  historyDescription: string;
  courseNote: string;
  courseLinkLabel: string;
  footerNote: string;
}

export const en: Messages = {
  languageName: 'English',
  siteTitle: 'LLM, piece by piece',
  siteDescription: 'Learn how modern language models work by implementing each part in Rust.',
  skipToContent: 'Skip to content',
  homeLabel: 'Home',
  languageSwitchLabel: 'Language',
  eyebrow: 'From text to a working model',
  homeTitle: 'Build an LLM from first principles',
  homeIntro:
    'Follow small, executable examples until tensors, attention, training, and generation fit together as one Rust program.',
  examplesTitle: 'Learn by running code',
  examplesDescription: 'Every concept begins with a tiny Rust example and deterministic output.',
  formulasTitle: 'Connect code to the formula',
  formulasDescription: 'Symbols are introduced only when they explain the behavior you can observe.',
  historyTitle: 'See what came before',
  historyDescription: 'Each chapter contrasts the modern component with the historical approach it replaced.',
  courseNote:
    'Chapter 1 is ready: follow English and Cyrillic text from UTF-8 bytes through Unicode scalar values to vocabulary IDs.',
  courseLinkLabel: 'Start the course',
  footerNote: 'A static, bilingual course for understanding language models from the inside.',
};
