declare module 'virtual:answers' {
  const book: {
    entries: unknown[];
    check: { yearsSumToAllYears: boolean; largestDifference: number };
    source: string;
    takenAt: string;
  };
  export default book;
}
declare module 'virtual:sources' {
  const sources: Record<string, string>;
  export default sources;
}
declare module '*?raw' {
  const text: string;
  export default text;
}
declare module '*.css';
