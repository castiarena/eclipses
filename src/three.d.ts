// three ships without type declarations, and @types/three needs TypeScript 5. react-globe.gl already sees
// three as untyped, so the globe code treats it the same way.
declare module 'three'
