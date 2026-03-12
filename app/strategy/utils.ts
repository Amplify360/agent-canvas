import type { Initiative } from './types';

export function countUniqueLinkedAgentsForService(
  initiatives: Initiative[],
  serviceId: string
): number {
  const serviceInitiatives = initiatives.filter((initiative) => initiative.serviceId === serviceId);
  const agentIds = new Set(
    serviceInitiatives.flatMap((initiative) => initiative.linkedAgents.map((agent) => agent.id))
  );
  return agentIds.size;
}
