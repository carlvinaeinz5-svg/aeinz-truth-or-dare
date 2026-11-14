export type TaskLevel = "child" | "pleasing" | "dirty";
export type TaskType = "truth" | "dare";
export type TaskTheme = "classic" | "road_trip" | "music" | "aeinz_sooth";

export const taskThemeLabels: Record<TaskTheme, string> = {
  classic: "Classic",
  road_trip: "Road Trip",
  music: "Music",
  aeinz_sooth: "Aeinz Sooth",
};

export const themedTasks: Record<Exclude<TaskTheme, "classic">, Record<TaskLevel, Record<TaskType, string[]>>> = {
  road_trip: {
    child: {
      truth: [
        "If you could plan a road trip anywhere, where would you go first?",
        "What snack would you bring for everyone to share on a trip?",
        "Which player would be the best at spotting interesting things along the way?",
      ],
      dare: [
        "Mime packing a suitcase for a trip in ten seconds.",
        "Make up a silly travel slogan for the group.",
        "Name three things you would bring on a pretend adventure before the group counts to five.",
      ],
    },
    pleasing: {
      truth: [
        "Which player would you choose as your travel buddy, and what would make the trip fun?",
        "What is one place you would love to explore with friends?",
        "What is your funniest travel mix-up or day-out story?",
      ],
      dare: [
        "Give a cheerful tour-guide introduction to the room for 20 seconds.",
        "Act out your reaction to realizing you packed for the wrong weather.",
        "Invent a three-step dance for arriving at your dream destination.",
      ],
    },
    dirty: {
      truth: [
        "Which player would make the most charming travel companion, and why?",
        "What is your idea of a perfect adults-only getaway?",
        "What is the boldest spontaneous trip you would actually feel comfortable taking?",
      ],
      dare: [
        "Give the group a confident, flirtatious pitch for your dream getaway.",
        "Strike three dramatic holiday-photo poses; you can pass on any pose.",
        "Deliver a playful one-line travel invitation to someone in the group, with their consent.",
      ],
    },
  },
  music: {
    child: {
      truth: [
        "What kind of song always makes you want to move?",
        "If your day had a theme tune, what would it sound like?",
        "Which player would you pick to make up a silly group song?",
      ],
      dare: [
        "Hum a made-up tune and let the group guess its mood.",
        "Do a tiny dance like a friendly music robot.",
        "Invent a band name using two words chosen by the group.",
      ],
    },
    pleasing: {
      truth: [
        "What song brings back a happy memory for you?",
        "What music would you choose for a celebration with this group?",
        "Which player would you trust to create the best party playlist?",
      ],
      dare: [
        "Perform a dramatic silent music video for 15 seconds.",
        "Make up a short chorus about the group without using anyone's private information.",
        "Conduct an imaginary orchestra through a big finish.",
      ],
    },
    dirty: {
      truth: [
        "What song would you choose for a confident entrance?",
        "Which player has the most captivating music taste, and what do you like about it?",
        "What kind of music would set the mood for your ideal date?",
      ],
      dare: [
        "Give a playful, confident lip-sync performance to a song you choose.",
        "Dedicate an imaginary award-show song to someone in the room, if they're comfortable.",
        "Show off a dance move that makes you feel irresistible; passing is always okay.",
      ],
    },
  },
  aeinz_sooth: {
    child: {
      truth: [
        "What is one fun thing you would try if you knew your friends would cheer you on?",
        "What silly talent would you show off if you had no reason to feel shy?",
        "Which player brings the boldest, happiest energy to the group?",
      ],
      dare: [
        "Strike your biggest superhero pose and let the group cheer.",
        "Give a 10-second speech about why your favorite snack deserves an award.",
        "Choose a silly dance move and invite the group to copy it; anyone may pass.",
      ],
    },
    pleasing: {
      truth: [
        "What is something bold you would like to try when the moment feels right?",
        "When have you surprised yourself by being more confident than you expected?",
        "What is one harmless rule you would invent for a night of pure fun?",
      ],
      dare: [
        "Give a confident 15-second pep talk to the whole group.",
        "Show a bold pose that makes you feel proud of yourself.",
        "Choose a playful challenge for the group that everyone can comfortably pass on.",
      ],
    },
    dirty: {
      truth: [
        "What confident side of yourself do you wish people saw more often?",
        "What is one daring but comfortable experience you would like to have?",
        "What kind of bold compliment makes you feel most appreciated?",
      ],
      dare: [
        "Give your most charismatic introduction as if arriving at a glamorous party.",
        "Share a confident compliment with someone who welcomes it.",
        "Do a dramatic runway walk or choose a pose instead; either option counts.",
      ],
    },
  },
};

const PRIVACY_PROMPT_PATTERN =
  /\b(?:phone|mobile|social media|search history|photo gallery|profile picture|private messages?|text message|last text|text you (?:received|sent)|call (?:a friend|your crush)|contact(?:ing)? (?:someone|other people|a friend)|send(?:ing)? (?:a|one|someone)? ?(?:message|text)|post(?:ing)? (?:a|your) (?:funny )?selfie|scroll through your)\b/i;

export function isPrivacySensitiveTask(prompt: string) {
  return PRIVACY_PROMPT_PATTERN.test(prompt);
}

export const tasks: Record<TaskLevel, Record<TaskType, string[]>> = {
  child: {
    truth: [
      "What's the funniest face you can make right now?",
      "If you could have any superpower for a day, what would you do?",
      "What's your favorite cartoon character and why?",
      "Tell us about a time you laughed so hard you snorted.",
      "What's the silliest thing you've ever eaten?",
      "If your pet could talk, what would it say about you?",
      "What's your go-to dance move when nobody's watching?",
      "Which emoji describes you best today?",
      "If you were a fruit, what fruit would you be?",
      "What's the weirdest dream you've ever had?",
      "If you could be any animal for a day, which would you choose?",
      "What's the most ridiculous outfit you've ever worn?",
      "Tell us your best knock-knock joke!",
      "What's your secret talent that nobody knows about?",
      "If you could only eat one color of food forever, what color?",
    ],
    dare: [
      "Do an impression of a chicken for 15 seconds.",
      "Talk in a robot voice until your next turn.",
      "Spin around 5 times and then try to walk straight.",
      "Make up a short rap about the person on your left.",
      "Pretend you're a waiter and take everyone's drink order.",
      "Act like a monkey for 20 seconds.",
      "Balance a book on your head and walk across the room.",
      "Sing 'Twinkle Twinkle Little Star' in a dramatic opera voice.",
      "Do 10 jumping jacks while naming animals.",
      "Create a secret handshake with the person opposite you.",
      "Walk like a penguin for 30 seconds.",
      "Make up a silly song about the current weather.",
      "Do your best dinosaur roar.",
      "Try to juggle with three imaginary balls.",
      "Speak only in questions for the next minute.",
    ],
  },
  pleasing: {
    truth: [
      "What's the most embarrassing song you secretly love?",
      "If you could swap lives with someone in this room, who would it be?",
      "What's a skill you wish you had but don't?",
      "Tell us about your most awkward date experience.",
      "What's the last lie you told?",
      "If you could be invisible for an hour, where would you go?",
      "What's a food combination you love but others find weird?",
      "Have you ever pretended to laugh at a joke you didn't get?",
      "What's your guilty pleasure TV show?",
      "If you could only eat one meal for the rest of your life, what?",
      "What's the most adventurous thing you've ever done?",
      "If you could have dinner with any historical figure, who?",
      "What's your most irrational fear?",
      "Tell us about a time you completely failed at something.",
      "What's the best piece of advice you've ever received?",
    ],
    dare: [
      "Do your best impression of another player in the room.",
      "Speak in an accent for the next 3 rounds.",
      "Let the group choose a new profile picture for your phone.",
      "Post a funny selfie on your social media.",
      "Call a friend and tell them you just saw a unicorn.",
      "Do a dramatic reading of the last text message you received.",
      "Dance to a song chosen by the group for 30 seconds.",
      "Try to lick your elbow for 10 seconds.",
      "Swap an item of clothing with the person next to you.",
      "Tell a joke with a completely straight face.",
      "Do a handstand against the wall (or try to).",
      "Speak in rhymes for the next 2 minutes.",
      "Let someone draw something on your face with makeup.",
      "Do the worm dance move (or your best attempt).",
      "Compliment every person in the room sincerely.",
    ],
  },
  dirty: {
    truth: [
      "What's your biggest turn-on that you've never told anyone?",
      "Describe in detail the most seductive dream you've ever had.",
      "If you could spend one night with anyone in this room, who?",
      "What's the most scandalous place you've ever been intimate?",
      "Rate everyone here from most to least attractive.",
      "What's the naughtiest fantasy you replay in your mind?",
      "What's the most flirtatious thing you've ever done?",
      "Describe your perfect kiss in slow, sensual detail.",
      "What's the wildest thing you've ever done under desire?",
      "If you could read one person's dirty thoughts, whose?",
      "What's your biggest secret that would make everyone blush?",
      "Describe the sexiest outfit you own.",
      "What's the most tempting offer you've ever received?",
      "If you could enact one fantasy right now, what?",
      "What part of your body do you find most irresistible?",
    ],
    dare: [
      "Give a slow, sensual shoulder massage to the person on your left.",
      "Whisper something dangerously flirty in the ear of the person to your right.",
      "Do your most seductive dance move while maintaining eye contact.",
      "Send a boldly flirtatious text to the last person you messaged.",
      "Describe the player across from you using only suggestive adjectives.",
      "Feed the person next to you a bite of something in a sensual way.",
      "Let someone in the group scroll through your photo gallery.",
      "Perform a slow body roll while everyone watches.",
      "Write a short, steamy poem about an object in this room.",
      "Do 10 slow squats while holding intense eye contact.",
      "Let the group send one message from your phone to anyone.",
      "Give a lingering hug to the person you find most attractive.",
      "Trace a shape very slowly on someone's palm.",
      "Call a friend and say 'I can't stop thinking about you' in a sultry voice.",
      "Imitate a famous seduction scene from a movie.",
    ],
  },
};

export const wildcardTasks: Record<TaskType, string[]> = {
  truth: [
    "If you had to marry someone in this room, who and why?",
    "What's the most embarrassing thing in your search history?",
    "Rate everyone in the room by attractiveness.",
    "What's the biggest secret you're keeping from the group?",
    "Describe your perfect partner in extreme detail.",
    "What's the naughtiest thought you've had today?",
    "If you could swap bodies with someone here, who?",
    "What's the most scandalous rumor you've heard about yourself?",
    "Describe your first kiss in slow motion.",
    "What's the wildest fantasy you've never told anyone?",
  ],
  dare: [
    "Do a body roll in slow motion.",
    "Let the group go through your phone for 30 seconds.",
    "Perform a lap dance on an empty chair.",
    "Call your crush and confess something.",
    "Do a trust fall with the person behind you.",
    "Let someone blindfold you for the next round.",
    "Whisper your deepest secret to the person on your left.",
    "Do your best impression of a sensual massage therapist.",
    "Let someone write a status on your social media.",
    "Do a dramatic reading of the last flirty text you sent.",
  ],
};
