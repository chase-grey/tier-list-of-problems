import { initializeShadowWeb, type AppDef, type ApiFn, type JsonObject } from './ShadowWeb.js';
import type { Pitch } from '../types/models';

interface PitchDetails extends JsonObject {
  problem: string;
  ideaForSolution: string;
  whyNow: string;
  smartToolsFit: string;
  epicFit: string;
  maintenance: string;
  success: string;
  internCandidate: string; // "true" | "false" from M
}

interface PitchInfo extends JsonObject {
  id: string;
  title: string;
  category: string;
  details: PitchDetails;
}

interface GetPitchesByProjectOutput extends JsonObject {
  pitches: PitchInfo[];
}

type PitchInfoApi = {
  getPitchesByProject: ApiFn<{ prjId: string }, GetPitchesByProjectOutput>;
};

type PitchInfoApps = {
  pitchInfo: AppDef<PitchInfoApi, JsonObject>;
};

export async function fetchPitchesByProject(prjId: string): Promise<Pitch[]> {
  const { pitchInfo: api } = await initializeShadowWeb<PitchInfoApps>({ pitchInfo: {} });
  const result = await api.getPitchesByProject({ prjId });

  return result.pitches.map((p) => ({
    id: p.id,
    title: p.title,
    category: p.category,
    details: {
      problem: p.details.problem,
      ideaForSolution: p.details.ideaForSolution || undefined,
      whyNow: p.details.whyNow || undefined,
      smartToolsFit: p.details.smartToolsFit || undefined,
      epicFit: p.details.epicFit || undefined,
      maintenance: p.details.maintenance || undefined,
      success: p.details.success || undefined,
      internCandidate: p.details.internCandidate === 'true' ? true : undefined,
    },
  }));
}
