export interface GeneratedContentIdea {
  topic: string;
  hook: string;
  caption: string;
  cta: string;
  imageSuggestion: string;
  channel: string;
  suggestedTime: string;
}

const TOPIC_BANK: GeneratedContentIdea[] = [
  {
    topic: "Acne myths vs. facts",
    hook: "\"Toothpaste cures acne\" — and 4 other myths we hear every week.",
    caption: "Let's clear up some skin myths we hear in the clinic every week. Toothpaste, sun exposure, and \"popping it out\" are not treatments — they often make things worse. Book a consultation for a plan built around your skin.",
    cta: "Book a consultation this week",
    imageSuggestion: "Carousel: 5 myth cards with a clean icon-led design",
    channel: "Google Post + Instagram",
    suggestedTime: "Tomorrow, 10:30 AM",
  },
  {
    topic: "Meet the doctor",
    hook: "The face behind your treatment plan.",
    caption: "A quick introduction to our lead dermatologist — years of experience, specialties, and what patients can expect from their first visit.",
    cta: "Meet the doctor — book your first visit",
    imageSuggestion: "Portrait photo in clinic, warm natural light",
    channel: "Google Post + Facebook",
    suggestedTime: "Thursday, 6:00 PM",
  },
  {
    topic: "Before & after — real patient result",
    hook: "8 weeks, one consistent routine.",
    caption: "Real results from a real patient journey (shared with consent). Consistency and the right treatment plan make the difference — see what's possible.",
    cta: "Start your own journey",
    imageSuggestion: "Before/after split image, patient-consented",
    channel: "Instagram Reel",
    suggestedTime: "Friday, 7:15 PM",
  },
];

export function generateContentIdea(prompt: string): GeneratedContentIdea {
  const hash = [...prompt].reduce((a, c) => a + c.charCodeAt(0), 0);
  return TOPIC_BANK[hash % TOPIC_BANK.length];
}
