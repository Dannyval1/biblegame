export type GameMode = "challenge" | "timeAttack" | "survival" | "blitz";

export interface GameState {
  score: number;
  isGameOver: boolean;
  gameOverReason?: string;
  showContinueOption?: boolean;
}

export interface QuestionResult {
  isCorrect: boolean;
  timeTaken: number;
}

export interface GameModeConfig {
  name: string;
  icon: string;
  description: string;
  features: string[];
  timePerQuestion?: number;
  questionsToLoad?: number;
  initialLives?: number;
  totalTime?: number;
}

export abstract class BaseGameMode {
  protected gameState: GameState;
  protected config: GameModeConfig;

  constructor(config: GameModeConfig) {
    this.config = config;
    this.gameState = {
      score: 0,
      isGameOver: false,
    };
  }

  abstract onGameStart(): void;
  abstract onCorrectAnswer(result: QuestionResult): GameState;
  abstract onIncorrectAnswer(result: QuestionResult): GameState;
  abstract onTimeUp(): GameState;
  abstract getGameStatus(): any;
  abstract shouldShowTimer(): boolean;
  abstract getTimerSeconds(): number | null;

  getGameState(): GameState {
    return {
      ...this.gameState,
      gameOverReason: this.gameState.gameOverReason,
      showContinueOption: this.gameState.showContinueOption,
    };
  }

  getConfig(): GameModeConfig {
    return this.config;
  }
}

// Challenge Mode Implementation
export class ChallengeMode extends BaseGameMode {
  private lives: number;

  constructor() {
    super({
      name: "Challenge Mode",
      icon: "🛡️",
      description: "Get as far as you can with 3 lives",
      features: ["3 lives", "15 seconds per question", "Watch ads to continue"],
      timePerQuestion: 15,
      initialLives: 3,
    });
    this.lives = this.config.initialLives!;
  }

  onGameStart(): void {
    this.lives = this.config.initialLives!;
    this.gameState = {
      score: 0,
      isGameOver: false,
    };
  }

  onCorrectAnswer(result: QuestionResult): GameState {
    this.gameState.score++;
    return this.gameState;
  }

  onIncorrectAnswer(result: QuestionResult): GameState {
    this.lives--;
    if (this.lives <= 0) {
      this.gameState.isGameOver = true;
      this.gameState.gameOverReason = "No more lives";
      this.gameState.showContinueOption = true;
    }
    return this.gameState;
  }

  onTimeUp(): GameState {
    return this.onIncorrectAnswer({
      isCorrect: false,
      timeTaken: this.config.timePerQuestion!,
    });
  }

  getGameStatus(): any {
    return { lives: this.lives };
  }

  shouldShowTimer(): boolean {
    return true;
  }

  getTimerSeconds(): number {
    return this.config.timePerQuestion!;
  }

  getLives(): number {
    return this.lives;
  }

  revive(): void {
    this.lives = 1;
    this.gameState.isGameOver = false;
  }
}

// Time Attack Mode Implementation
export class TimeAttackMode extends BaseGameMode {
  private timeRemaining: number;
  private stopped = false;
  private correctStreak: number = 0;

  stop() {
    this.stopped = true;
  }

  constructor() {
    super({
      name: "Time Attack",
      icon: "⚡",
      description: "Answer as many questions as possible in 1 minute",
      features: [
        "-3 seconds for wrong answers",
        "+3 seconds for 3 correct streak",
        "Beat your high score",
      ],
      totalTime: 60,
    });
    this.timeRemaining = this.config.totalTime!;
  }

  onGameStart(): void {
    this.timeRemaining = this.config.totalTime!;
    this.correctStreak = 0;
    this.stopped = false;
    this.gameState = {
      score: 0,
      isGameOver: false,
    };
  }

  onCorrectAnswer(result: QuestionResult): GameState {
    this.gameState.score++;
    this.correctStreak++;

    if (this.correctStreak === 3) {
      this.timeRemaining += 3;
      this.correctStreak = 0;

      // Forzar actualización del componente
      this.gameState = { ...this.gameState }; // Clona el estado
    }

    return this.getGameState();
  }

  onIncorrectAnswer(result: QuestionResult): GameState {
    this.correctStreak = 0;
    this.timeRemaining = Math.max(0, this.timeRemaining - 3);

    if (this.timeRemaining <= 0) {
      this.onGlobalTimeUp();
      this.gameState = { ...this.gameState }; // Clona el estado
    }

    return this.getGameState();
  }

  onTimeUp(): GameState {
    // In Time Attack, time up on individual questions just moves to next
    // The global timer is handled separately in the component
    return this.gameState;
  }

  onGlobalTimeUp(): GameState {
    if (this.timeRemaining <= 0 && !this.gameState.isGameOver) {
      this.gameState.isGameOver = true;
      this.gameState.gameOverReason = "Time is up!";
    }
    return this.gameState;
  }

  getGameStatus(): any {
    return {
      timeRemaining: this.timeRemaining,
      correctStreak: this.correctStreak,
    };
  }

  shouldShowTimer(): boolean {
    return false; // Uses global timer instead
  }

  getTimerSeconds(): number | null {
    return null;
  }

  getTimeRemaining(): number {
    return this.timeRemaining;
  }

  getCorrectStreak(): number {
    return this.correctStreak;
  }

  tick(): boolean {
    if (this.stopped || this.gameState.isGameOver) return false;

    this.timeRemaining = Math.max(0, this.timeRemaining - 1);
    
    // Nueva lógica de actualización de estado
    if (this.timeRemaining <= 0) {
      this.gameState = {
        ...this.gameState,
        isGameOver: true,
        gameOverReason: "Time is up!"
      };
      return false;
    }
    return true;
  }

  getGameState(): GameState {
    return JSON.parse(JSON.stringify(this.gameState)); // Clonado profundo
  }
}

// Survival Mode (Example of easy extensibility)
export class SurvivalMode extends BaseGameMode {
  private consecutiveWrong: number = 0;

  constructor() {
    super({
      name: "Survival Mode",
      icon: "🔥",
      description: "Keep going! But 3 wrong answers in a row and you're out",
      features: [
        "3 strikes rule",
        "10 seconds per question",
        "Increasing difficulty",
      ],
      timePerQuestion: 10,
    });
  }

  onGameStart(): void {
    this.consecutiveWrong = 0;
    this.gameState = {
      score: 0,
      isGameOver: false,
    };
  }

  onCorrectAnswer(result: QuestionResult): GameState {
    this.consecutiveWrong = 0; // Reset wrong counter
    this.gameState.score++;
    return this.gameState;
  }

  onIncorrectAnswer(result: QuestionResult): GameState {
    this.consecutiveWrong++;

    if (this.consecutiveWrong >= 3) {
      this.gameState.isGameOver = true;
      this.gameState.gameOverReason = "3 wrong answers in a row";
    }
    return this.gameState;
  }

  onTimeUp(): GameState {
    return this.onIncorrectAnswer({
      isCorrect: false,
      timeTaken: this.config.timePerQuestion!,
    });
  }

  getGameStatus(): any {
    return { consecutiveWrong: this.consecutiveWrong };
  }

  shouldShowTimer(): boolean {
    return true;
  }

  getTimerSeconds(): number {
    return this.config.timePerQuestion!;
  }
}

// Factory function to create game modes
export function createGameMode(mode: GameMode): BaseGameMode {
  switch (mode) {
    case "challenge":
      return new ChallengeMode();
    case "timeAttack":
      return new TimeAttackMode();
    case "survival":
      return new SurvivalMode();
    default:
      throw new Error(`Unknown game mode: ${mode}`);
  }
}

// Configuration for the Game Mode Selection Modal
export const GAME_MODES_CONFIG = {
  challenge: {
    name: "Challenge Mode",
    icon: "🛡️",
    description: "Get as far as you can with 3 lives",
    features: ["3 lives", "15 seconds per question", "Watch ads to continue"],
  },
  timeAttack: {
    name: "Time Attack",
    icon: "⚡",
    description: "Answer as many questions as possible in 1 minute",
    features: [
      "-3 seconds for wrong answers",
      "+3 seconds for 3 correct streak",
      "Beat your high score",
    ],
  },
  survival: {
    name: "Survival Mode",
    icon: "🔥",
    description: "Keep going! But 3 wrong answers in a row and you're out",
    features: [
      "3 strikes rule",
      "10 seconds per question",
      "Increasing difficulty",
    ],
  },
};
