import type { Lang } from './types';

/** Per-language copy for wish cards. Devanagari renders in Baloo 2. */
export const WISH_TEXT: Record<Lang, { label: string; title: string; dear: string; signoff: string; fallback: string; templates: string[] }> = {
  en: {
    label: 'English',
    title: 'Shubh Deepavali',
    dear: 'Dear',
    signoff: 'With love,',
    fallback: 'May this Diwali fill your home with light, sweets and laughter.',
    templates: [
      'May this Diwali fill your home with light, sweets and laughter.',
      'Wishing you a sparkling Diwali and a bright year ahead. Save me some kaju katli!',
      'May Lakshmi bless your home with joy, health and prosperity. Happy Diwali!',
    ],
  },
  hi: {
    label: 'हिन्दी',
    title: 'शुभ दीपावली',
    dear: 'प्रिय',
    signoff: 'सप्रेम,',
    fallback: 'यह दीपावली आपके घर को रोशनी, मिठास और खुशियों से भर दे।',
    templates: [
      'यह दीपावली आपके घर को रोशनी, मिठास और खुशियों से भर दे।',
      'दीपों का यह पर्व आपके जीवन में सुख, समृद्धि और नई उमंग लाए।',
      'माँ लक्ष्मी की कृपा आप और आपके परिवार पर सदा बनी रहे। शुभ दीपावली!',
    ],
  },
  mr: {
    label: 'मराठी',
    title: 'शुभ दीपावली',
    dear: 'प्रिय',
    signoff: 'सस्नेह,',
    fallback: 'ही दिवाळी तुमच्या घरात प्रकाश, गोडवा आणि आनंद घेऊन येवो.',
    templates: [
      'ही दिवाळी तुमच्या घरात प्रकाश, गोडवा आणि आनंद घेऊन येवो.',
      'दिव्यांचा हा सण तुमच्या आयुष्यात सुख, समृद्धी आणि आरोग्य घेऊन येवो.',
      'लक्ष्मीची कृपा तुमच्या कुटुंबावर सदैव राहो. दिवाळीच्या हार्दिक शुभेच्छा!',
    ],
  },
};

export const THEMES = [
  { key: 'diya', label: 'Diya glow', emoji: '🪔' },
  { key: 'rangoli', label: 'Rangoli', emoji: '🌸' },
  { key: 'fireworks', label: 'Fireworks', emoji: '🎆' },
] as const;
