/** Ink stories, compiled at build time by vite-plugin-ink.ts. */
declare module '*.ink' {
  const storyJson: string;
  export default storyJson;
}
