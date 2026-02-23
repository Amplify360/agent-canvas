export interface ExploreAgent {
  name: string;
  description: string;
  tools: string[];
  icon: string;
}

export interface ExploreUseCase {
  id: string;
  title: string;
  challenge: string;
  solutionName: string;
  solutionDescription: string;
  capabilities: string[];
  impact: string;
  icon: string;
  agents: ExploreAgent[];
}

export interface ExplorePhase {
  id: string;
  number: string;
  name: string;
  subtitle: string;
  persona: string;
  description: string;
  colorVar: string;
  icon: string;
  useCases: ExploreUseCase[];
}
