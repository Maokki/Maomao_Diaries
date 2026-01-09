// app/utils/maomaoQuotes.js

export const maomaoQuotes = [
  {
    text: "Welcome home, Master.", context: "Greeting"
  },
  {
    text: "My ability to learn about things I'm not interested in is below average.", context: "Thoughts"
  },
  {
    text: "You've got to be Jinshitting me.", context: "Angrily"
  },
  {
    text: "I guess they grow well when they're fed well.", context: "Observation"
  },
  {
    text: "I hate when people think everything's over just because they're dead!", context: "Angrily"
  },
  {
    text: "If his secret gets out and it gets me into trouble... I'll turn him into a eunuch for real.", context: "Angrily"
  },
  {
    text: "I'll have to do things to your body that you'd never tell your father about, then.", context: "Suggestions"
  },
  {
    text: "I'm sorry but I believe I squashed a frog when I fell", context: "Informs"
  },
  {
    text: "Still, there are fools who let their emotions control them, to the point of grave mistakes.", context: "Realtalk"
  },
  {
    text: "Even if she feels resentment, she won't be able to do anything", context: "Realtalk"
  },
  {
    text: "If I should die, I’d want to die of poison.", context: "Thoughts"
  },
  {
    text: "I would prefer to say I’m always eager to improve myself.", context: "Thoughts"
  },
  {
    text: "Knowledge is both my weapon and my curse. The more I know, the less I can pretend to be blind.", context: "Sigh"
  },
  {
    text: "Today we are learning CPR, which is basically forcing someone to breathe when they ... refuse.", context: "Sarcasm"
  },
  {
    text: "People with a strong sense of responsibility soon grow sick at heart.", context: "Realtalk"
  },
  {
    text: "Did you think that was enough IT'S NEVER ENOUGH", context: "Sarcasm"
  },
  {
    text: "Perish the thought.", context: "Suggestions"
  },
];

/**
 * Get a random quote from Maomao
 * @returns {Object} A random quote object with text and context
 */
export const getRandomQuote = () => {
  const randomIndex = Math.floor(Math.random() * maomaoQuotes.length);
  return maomaoQuotes[randomIndex];
};

/**
 * Get a quote by context/category
 * @param {string} context - The context to filter by
 * @returns {Object} A random quote from that context
 */
export const getQuoteByContext = (context) => {
  const filteredQuotes = maomaoQuotes.filter(q => q.context === context);
  if (filteredQuotes.length === 0) return getRandomQuote();
  
  const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
  return filteredQuotes[randomIndex];
};

/**
 * Get daily quote (same quote for the entire day)
 * @returns {Object} Quote of the day
 */
export const getDailyQuote = () => {
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
  const index = dayOfYear % maomaoQuotes.length;
  return maomaoQuotes[index];
};

export default {
  maomaoQuotes,
  getRandomQuote,
  getQuoteByContext,
  getDailyQuote
};