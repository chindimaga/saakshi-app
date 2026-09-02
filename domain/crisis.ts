const CRISIS_PATTERN = /i am under 18|i'?m under 18|i want to die|kill myself|ನಾನು 18|18ರ ಒಳಗೆ|ಆತ್ಮಹತ್ಯೆ|ಸಾಯಬೇಕು|18 வயது|தற்கொலை|சாக வேண்டும்|சாவ/i;

export function hasCrisisSignal(text: string): boolean {
  return CRISIS_PATTERN.test(text);
}
