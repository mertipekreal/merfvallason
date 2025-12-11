import type {
  StoryElement,
  Character,
  WorldSetting,
  DreamAsset,
} from "@shared/schema";
import { log } from "../../../index";

interface StoryRequest {
  prompt: string;
  emotionalTone: "happy" | "sad" | "exciting" | "mysterious" | "romantic";
}

interface CharacterRequest {
  name: string;
  role: "protagonist" | "antagonist" | "supporting" | "background";
  description: string;
}

interface WorldRequest {
  name: string;
  theme: string;
  mood: "bright" | "dark" | "neutral" | "vibrant";
}

interface DreamRequest {
  type: "visual" | "audio" | "text";
  prompt: string;
  emotionalIntensity: number;
}

const STORY_TEMPLATES: Record<string, string[]> = {
  happy: [
    "The sun rose over the peaceful village, casting golden light on the smiling faces of the townsfolk.",
    "Laughter echoed through the streets as children played their games, their joy infectious.",
    "Every heart in the land felt light, filled with hope and promise of beautiful days ahead.",
  ],
  sad: [
    "Rain fell gently on the empty streets, each drop a tear from the crying sky.",
    "The silence spoke louder than words, echoing the emptiness within.",
    "Memories faded like old photographs, leaving only shadows of what once was.",
  ],
  exciting: [
    "The countdown began—three, two, one—and everything changed in an instant!",
    "Adrenaline surged through every fiber as the moment of truth arrived.",
    "No turning back now. The adventure of a lifetime had just begun.",
  ],
  mysterious: [
    "Shadows danced in the flickering candlelight, hiding secrets in their depths.",
    "The old book's pages whispered tales of forgotten magic and ancient prophecies.",
    "Something was watching from the darkness, waiting for the perfect moment to reveal itself.",
  ],
  romantic: [
    "Their eyes met across the crowded room, and time seemed to stand still.",
    "Words were unnecessary; their hearts spoke a language all their own.",
    "In that moment, two souls found what they had been searching for all along.",
  ],
};

const PERSONALITY_TRAITS = [
  "brave", "curious", "compassionate", "stubborn", "witty",
  "mysterious", "loyal", "ambitious", "gentle", "fierce",
  "wise", "playful", "determined", "cautious", "optimistic",
  "creative", "analytical", "charismatic", "reserved", "adaptable",
];

const MOTIVATIONS = [
  "seeking redemption for past mistakes",
  "protecting loved ones from harm",
  "uncovering the truth behind a mystery",
  "achieving greatness against all odds",
  "finding their true purpose in life",
  "overcoming personal fears and limitations",
  "restoring balance to a broken world",
  "proving their worth to those who doubted them",
];

const QUIRKS = [
  "always hums when nervous",
  "collects unusual objects",
  "speaks in riddles when stressed",
  "has a peculiar way of laughing",
  "never breaks a promise",
  "can't resist helping strangers",
  "talks to animals as if they understand",
  "has an uncanny sense of timing",
];

const WORLD_ELEMENTS: Record<string, string[]> = {
  bright: [
    "Crystal towers that catch the morning light",
    "Gardens that bloom in impossible colors",
    "Rivers that sing as they flow",
    "Mountains that glow at sunset",
  ],
  dark: [
    "Shadows that move of their own accord",
    "Twisted forests where light fears to enter",
    "Ancient ruins holding forgotten secrets",
    "Storms that never seem to end",
  ],
  neutral: [
    "Quiet villages where time moves slowly",
    "Vast plains stretching to the horizon",
    "Libraries holding centuries of knowledge",
    "Markets bustling with diverse crowds",
  ],
  vibrant: [
    "Floating islands connected by rainbow bridges",
    "Cities where magic and technology intertwine",
    "Festivals that celebrate life year-round",
    "Creatures of every color and form",
  ],
};

const LOCATION_TYPES = [
  "The Heart", "The Edge", "The Gateway", "The Sanctuary",
  "The Nexus", "The Cradle", "The Summit", "The Depths",
];

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function randomSelect<T>(array: T[], count: number): T[] {
  return shuffle(array).slice(0, count);
}

export class CreativeEngine {
  async generateStory(request: StoryRequest): Promise<{ story: string }> {
    log(`Generating story with tone: ${request.emotionalTone}`);

    const templates = STORY_TEMPLATES[request.emotionalTone] || STORY_TEMPLATES.exciting;
    const opening = templates[Math.floor(Math.random() * templates.length)];

    const middleParts = [
      `The protagonist, driven by an inner calling, ventured forth into the unknown.`,
      `Challenges arose at every turn, each one a test of character and resolve.`,
      `Allies appeared in unexpected places, their support invaluable in dark times.`,
      `The path twisted and turned, leading to discoveries both wondrous and terrifying.`,
    ];

    const closingsByTone: Record<string, string> = {
      happy: "And so, with hearts full of joy, they embraced the bright future that awaited them.",
      sad: "Yet even in sorrow, there was a quiet beauty—a reminder that to love is to live, even through loss.",
      exciting: "The adventure was far from over. This was just the beginning of an epic saga!",
      mysterious: "But some questions remained unanswered, waiting in the shadows for another day.",
      romantic: "Their love, tested by fire and fate, had proven stronger than anything the world could throw at them.",
    };

    const middle = randomSelect(middleParts, 2).join(" ");
    const closing = closingsByTone[request.emotionalTone] || closingsByTone.exciting;

    const promptEnhancement = request.prompt
      ? `\n\nInspired by the vision: "${request.prompt}"\n\n`
      : "";

    const story = `${opening}${promptEnhancement}\n\n${middle}\n\n${closing}`;

    return { story };
  }

  async generateCharacter(request: CharacterRequest): Promise<{
    character: {
      name: string;
      role: string;
      backstory: string;
      personality: string[];
      emotionalProfile: { positive: number; negative: number; neutral: number };
      motivations: string[];
      quirks: string[];
    };
  }> {
    log(`Creating character: ${request.name} (${request.role})`);

    const roleBackstories: Record<string, string> = {
      protagonist: `Born into a world that demanded everything, ${request.name} rose to become the hero fate chose to lead the way.`,
      antagonist: `${request.name}'s path was forged in darkness, their convictions as strong as any hero's, just pointed in a different direction.`,
      supporting: `${request.name} found purpose in helping others, their strength lying not in power but in unwavering loyalty.`,
      background: `Living quietly in the margins of great events, ${request.name} observed and understood more than most realized.`,
    };

    const emotionalProfiles: Record<string, { positive: number; negative: number; neutral: number }> = {
      protagonist: { positive: 60, negative: 15, neutral: 25 },
      antagonist: { positive: 20, negative: 50, neutral: 30 },
      supporting: { positive: 50, negative: 20, neutral: 30 },
      background: { positive: 35, negative: 25, neutral: 40 },
    };

    const backstory = request.description
      ? `${request.description}. ${roleBackstories[request.role]}`
      : roleBackstories[request.role];

    return {
      character: {
        name: request.name,
        role: request.role,
        backstory,
        personality: randomSelect(PERSONALITY_TRAITS, 4),
        emotionalProfile: emotionalProfiles[request.role],
        motivations: randomSelect(MOTIVATIONS, 2),
        quirks: randomSelect(QUIRKS, 2),
      },
    };
  }

  async generateWorld(request: WorldRequest): Promise<{
    world: {
      name: string;
      theme: string;
      mood: string;
      description: string;
      keyLocations: { name: string; description: string }[];
      atmosphere: string;
      inhabitants: string[];
      uniqueElements: string[];
    };
  }> {
    log(`Building world: ${request.name} (${request.mood})`);

    const moodDescriptions: Record<string, string> = {
      bright: "A realm where light and hope prevail, where every dawn brings new possibilities.",
      dark: "A land shrouded in shadow and mystery, where secrets lurk in every corner.",
      neutral: "A balanced world where nature and civilization coexist in quiet harmony.",
      vibrant: "An explosion of color and energy, where the extraordinary is everyday.",
    };

    const atmospheres: Record<string, string> = {
      bright: "The air itself seems to sparkle with potential and promise.",
      dark: "An ever-present mist hangs low, carrying whispers of ancient times.",
      neutral: "A gentle breeze carries the scent of wildflowers and distant rain.",
      vibrant: "Energy crackles invisibly, making every moment feel electric.",
    };

    const inhabitants: Record<string, string[]> = {
      bright: ["Sun Weavers", "Crystal Guardians", "Dream Painters", "Light Seekers"],
      dark: ["Shadow Walkers", "Night Keepers", "Mist Dwellers", "Ancient Watchers"],
      neutral: ["Village Folk", "Wandering Scholars", "Nature Protectors", "Artisan Guilds"],
      vibrant: ["Color Shifters", "Energy Dancers", "Reality Benders", "Joy Makers"],
    };

    const elements = WORLD_ELEMENTS[request.mood] || WORLD_ELEMENTS.neutral;
    const selectedElements = randomSelect(elements, 3);

    const locationTypes = randomSelect(LOCATION_TYPES, 3);
    const keyLocations = locationTypes.map((locType, i) => ({
      name: `${locType} of ${request.name}`,
      description: selectedElements[i] || "A place of wonder and mystery.",
    }));

    return {
      world: {
        name: request.name,
        theme: request.theme || "Fantasy",
        mood: request.mood,
        description: `${request.name}: ${moodDescriptions[request.mood]} ${request.theme ? `This ${request.theme} world` : "This world"} holds countless stories waiting to be told.`,
        keyLocations,
        atmosphere: atmospheres[request.mood],
        inhabitants: randomSelect(inhabitants[request.mood], 3),
        uniqueElements: selectedElements,
      },
    };
  }

  async generateDreamAsset(request: DreamRequest): Promise<{
    asset: {
      type: string;
      name: string;
      description: string;
      emotionalImpact: number;
      content: string;
      tags: string[];
    };
  }> {
    log(`Creating ${request.type} asset with intensity ${request.emotionalIntensity}%`);

    const assetNames: Record<string, string[]> = {
      visual: ["Dawn's Embrace", "Shadows Dancing", "Eternal Moment", "Color Symphony"],
      audio: ["Whispers of Time", "Rising Storm", "Gentle Echo", "Pulse of Life"],
      text: ["The Unspoken", "Words Unwritten", "Voice of Silence", "Eternal Poem"],
    };

    const assetDescriptions: Record<string, string[]> = {
      visual: [
        "A composition that captures the essence of light and shadow in perfect balance.",
        "Colors blend and flow like emotions given visual form.",
        "Every detail tells a story of its own within the greater narrative.",
      ],
      audio: [
        "Sounds that resonate with the deepest parts of the soul.",
        "A melody that tells stories words never could.",
        "Rhythms that pulse with the heartbeat of the universe.",
      ],
      text: [
        "Words carefully chosen to paint pictures in the mind.",
        "Prose that flows like a river through the landscape of imagination.",
        "Text that speaks directly to the heart, bypassing the mind entirely.",
      ],
    };

    const contentByType: Record<string, (intensity: number) => string> = {
      visual: (intensity) => `
╔═══════════════════════════════════╗
║  ${intensity > 70 ? "▓▓▓▓▓▓▓▓▓▓" : intensity > 40 ? "▓▓▓▓▓░░░░░" : "░░░░░░░░░░"}  VISUAL CONCEPT  ║
║                                   ║
║  Palette: ${intensity > 50 ? "Warm, saturated hues" : "Cool, muted tones"}  ║
║  Composition: ${intensity > 60 ? "Dynamic, energetic" : "Balanced, serene"}   ║
║  Focal Point: Center ${intensity > 70 ? "with motion" : "with stillness"}   ║
║                                   ║
║  Prompt: "${request.prompt.slice(0, 25)}..."   ║
╚═══════════════════════════════════╝`,
      audio: (intensity) => `
♪ ═══════════════════════════════ ♪
  AUDIO COMPOSITION BLUEPRINT
  
  Tempo: ${intensity > 70 ? "160 BPM (Intense)" : intensity > 40 ? "90 BPM (Moderate)" : "60 BPM (Calm)"}
  Key: ${intensity > 50 ? "Major (Uplifting)" : "Minor (Contemplative)"}
  
  Layers:
  - Base: ${intensity > 60 ? "Driving percussion" : "Ambient pads"}
  - Middle: ${intensity > 50 ? "Melodic strings" : "Gentle piano"}
  - Top: ${intensity > 70 ? "Soaring vocals" : "Subtle textures"}
  
  Inspired by: "${request.prompt.slice(0, 30)}..."
♪ ═══════════════════════════════ ♪`,
      text: (intensity) => {
        const styles = intensity > 70 
          ? "bold, passionate, and intense"
          : intensity > 40 
            ? "balanced, thoughtful, and measured"
            : "gentle, subtle, and serene";
        
        return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CREATIVE TEXT COMPOSITION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Style: ${styles}
  
  "${request.prompt}"
  
  Echoes of meaning ripple outward,
  Each word a stone cast into
  The still waters of consciousness.
  
  ${intensity > 60 ? "The intensity builds, demanding attention." : "Quietly, meaning unfolds."}
  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
      },
    };

    const names = assetNames[request.type] || assetNames.text;
    const descriptions = assetDescriptions[request.type] || assetDescriptions.text;
    const contentGenerator = contentByType[request.type] || contentByType.text;

    const tags: string[] = [
      request.type,
      request.emotionalIntensity > 70 ? "intense" : request.emotionalIntensity > 40 ? "moderate" : "subtle",
      "ai-generated",
      "creative",
      request.emotionalIntensity > 50 ? "emotional" : "contemplative",
    ];

    return {
      asset: {
        type: request.type,
        name: names[Math.floor(Math.random() * names.length)],
        description: descriptions[Math.floor(Math.random() * descriptions.length)],
        emotionalImpact: request.emotionalIntensity,
        content: contentGenerator(request.emotionalIntensity),
        tags,
      },
    };
  }
}

export const creativeEngine = new CreativeEngine();
