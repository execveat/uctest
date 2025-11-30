import { DependencyGraph, DependencyModel, ExecutionPlan, ForceRefChain, SchedulerFilters } from './types';
export interface PlanOptions {
    filters?: SchedulerFilters;
    selection?: string[];
}
export declare function computeExecutionPlan(model: DependencyModel, graph: DependencyGraph, chains: ForceRefChain[], options?: PlanOptions): ExecutionPlan;
