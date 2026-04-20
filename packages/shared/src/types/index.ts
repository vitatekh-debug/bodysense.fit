// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = "professional" | "athlete";

export type Sport = "basketball" | "football" | "volleyball";

export type SessionPhase = "preseason" | "competition" | "transition";

export type SessionType =
  | "technical"
  | "tactical"
  | "physical"
  | "match"
  | "recovery"
  | "prevention";

export type PeriodizationModel = "classic" | "tactical";

export type AcwrRiskZone = "low" | "optimal" | "high" | "very_high";

export type PreventionSessionType = "group" | "individual";

// ─── SMCP / POMS / Biomechanics Enums ────────────────────────────────────────

/** When pain was recorded relative to session (matches DB enum pain_timing) */
export type PainTiming = "pre_session" | "post_session" | "rest" | "next_morning";

/** Pain type classification */
export type PainType = "acute" | "chronic" | "exercise_induced" | "referred";

/** Body region for pain localization (matches DB enum pain_region) */
export type PainRegion =
  | "head" | "neck"
  | "shoulder_left" | "shoulder_right"
  | "elbow_left" | "elbow_right"
  | "wrist_left" | "wrist_right"
  | "lumbar" | "thoracic"
  | "hip_left" | "hip_right"
  | "groin_left" | "groin_right"
  | "hamstring_left" | "hamstring_right"
  | "quadriceps_left" | "quadriceps_right"
  | "knee_left" | "knee_right"
  | "calf_left" | "calf_right"
  | "ankle_left" | "ankle_right"
  | "foot_left" | "foot_right"
  | "other";

/** EVA traffic light — 0-3 green, 4-6 yellow, 7-10 red */
export type EvaTrafficLight = "green" | "yellow" | "red";

/** Type of H/Q ratio measurement */
export type HqRatioType = "conventional" | "functional";

/** Evaluated limb side */
export type EvalSide = "left" | "right" | "bilateral";

/** Surface type for biomechanical eval (matches DB enum surface_type) */
export type SurfaceType =
  | "natural_grass" | "artificial_grass_3g" | "artificial_grass_4g"
  | "hard_court" | "parquet" | "tartan" | "sand" | "gym_floor" | "other";

/** Footwear type for biomechanical eval (matches DB enum footwear_type) */
export type FootwearType =
  | "cleats_fg" | "cleats_ag" | "cleats_sg" | "turf"
  | "basketball" | "volleyball" | "running" | "training"
  | "barefoot" | "other";

// ─── Database Row Types ────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  sport?: Sport;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  sport: Sport;
  professional_id: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  athlete_id: string;
  joined_at: string;
}

export interface TrainingSession {
  id: string;
  athlete_id: string;
  team_id?: string;
  date: string;
  duration_min: number;
  session_type: SessionType;
  phase: SessionPhase;
  description?: string;
  created_by: string;
  created_at: string;
}

export interface GameRecord {
  id: string;
  team_id: string;
  date: string;
  opponent?: string;
  duration_min: number;
  pre_rpe?: number;
  post_rpe?: number;
  result?: "win" | "loss" | "draw";
  notes?: string;
  created_at: string;
}

export interface DailyWellness {
  id: string;
  athlete_id: string;
  date: string;
  fatigue: number;        // 1-10
  sleep_hours: number;    // 0-12
  sleep_quality: number;  // 1-5
  mood: number;           // 1-5
  notes?: string;
  // Quick POMS fields (added in migration 004)
  vigor_quick?: number;          // 0-4 quick vigor check
  confusion_quick?: number;      // 0-4 quick confusion check
  // Quick EVA fields
  eva_pre?: number;              // 0-10 pain before training
  eva_post?: number;             // 0-10 pain after training
  pain_region_quick?: PainRegion;
  created_at: string;
}

export interface SessionRpe {
  id: string;
  session_id: string;
  athlete_id: string;
  rpe: number;            // 6-20 Borg scale
  srpe: number;           // rpe × duration_min
  created_at: string;
}

export interface AcwrSnapshot {
  id: string;
  athlete_id: string;
  date: string;
  acute_load: number;     // sum of sRPE last 7 days
  chronic_load: number;   // rolling avg 28 days × 7
  acwr_ratio: number;     // acute / chronic
  risk_zone: AcwrRiskZone;
  created_at: string;
}

export interface PreventionSession {
  id: string;
  created_by: string;
  title: string;
  description?: string;
  date: string;
  type: PreventionSessionType;
  sport?: Sport;
  created_at: string;
}

export interface PreventionAthlete {
  id: string;
  session_id: string;
  athlete_id: string;
  completed_at?: string;
}

export interface Exercise {
  id: string;
  name: string;
  sport?: Sport;
  category: string;
  instructions?: string;
  video_url?: string;
  image_url?: string;
  created_at: string;
}

export interface SessionExercise {
  id: string;
  session_id: string;
  exercise_id: string;
  sets?: number;
  reps?: number;
  duration_sec?: number;
  order_index: number;
  notes?: string;
}

export interface PeriodizationPlan {
  id: string;
  team_id: string;
  name: string;
  model: PeriodizationModel;
  start_date: string;
  end_date: string;
  created_by: string;
  created_at: string;
}

export type CycleLevel = "macrocycle" | "mesocycle" | "microcycle";

export interface PeriodizationCycle {
  id: string;
  plan_id: string;
  parent_id?: string;
  level: CycleLevel;
  name: string;
  phase: SessionPhase;
  start_date: string;
  end_date: string;
  objectives?: string;
}

// ─── POMS Assessment ─────────────────────────────────────────────────────────

/**
 * Profile of Mood States (POMS) assessment.
 * Each dimension: 0-4 (Short Form adaptado).
 * TMD (Total Mood Disturbance) = Tension + Depression + Anger + Fatigue + Confusion − Vigor
 * Positive adaptation: low TMD, high Vigor (iceberg profile)
 * Overtraining signal: high Confusion + high Fatigue + low Vigor
 * Note: no evaluated_by — athlete self-reports or professional enters without attribution.
 */
export interface PomsAssessment {
  id: string;
  athlete_id: string;
  date: string;
  /** Tension-Anxiety dimension 0-4 */
  tension: number;
  /** Depression-Dejection dimension 0-4 */
  depression: number;
  /** Anger-Hostility dimension 0-4 */
  anger: number;
  /** Vigor-Activity dimension 0-4 (positive, higher = better) */
  vigor: number;
  /** Fatigue-Inertia dimension 0-4 */
  fatigue_poms: number;
  /** Confusion-Bewilderment dimension 0-4 */
  confusion: number;
  /** Computed by DB: tension+depression+anger+fatigue_poms+confusion-vigor. Range: -4 to 20 */
  tmd_score: number;
  notes?: string;
  created_at: string;
}

// ─── H/Q Evaluation (Isokinetic Dynamometry) ─────────────────────────────────

/**
 * Hamstring/Quadriceps strength ratio from isokinetic dynamometer.
 * Conventional ratio (60°/s):  H/Q < 0.6 = injury risk
 * Functional ratio  (180°/s):  H/Q < 1.0 = injury risk
 */
export interface HqEvaluation {
  id: string;
  athlete_id: string;
  evaluated_by: string;
  date: string;
  side: EvalSide;
  /** Angular velocity — DB column: speed_deg_per_sec, must be 60|180|240|300 */
  speed_deg_per_sec: number;
  ratio_type: HqRatioType;
  quadriceps_peak_nm_kg: number;        // Nm/kg
  hamstring_peak_nm_kg: number;         // Nm/kg
  /** Computed by DB: hamstring / quadriceps */
  hq_ratio: number;
  /** Computed by DB: true if below threshold (conv<0.6 / func<1.0) */
  risk_flag: boolean;
  asymmetry_index?: number;
  notes?: string;
  created_at: string;
}

// ─── Pain Records (EVA Scale) ─────────────────────────────────────────────────

/**
 * Pain record using EVA (Escala Visual Analógica) 0-10.
 * Traffic light interpretation:
 *   Green  (0-3): Normal/acceptable — continue training
 *   Yellow (4-6): Moderate — modify training, monitor
 *   Red    (7-10): Severe — stop, refer to medical staff
 * Note: DB columns are timing (not pain_timing), body_region (not pain_region)
 */
export interface PainRecord {
  id: string;
  athlete_id: string;
  session_id?: string;
  date: string;
  /** DB column: timing */
  timing: PainTiming;
  /** DB column: body_region */
  body_region: PainRegion;
  pain_type: PainType;
  eva_score: number;                    // 0-10
  /** Computed by DB: green/yellow/red */
  traffic_light: EvaTrafficLight;
  limits_performance: boolean;
  notes?: string;
  created_at: string;
}

// ─── Biomechanical Evaluation ─────────────────────────────────────────────────

/**
 * Full biomechanical evaluation including FMS (Functional Movement Screen).
 * FMS: 7 movement patterns, each scored 0-3.
 * Total ≤ 14 = elevated injury risk.
 * Score 0 on any pattern = automatic flag (pain present).
 */
export interface BiomechanicalEvaluation {
  id: string;
  athlete_id: string;
  evaluated_by: string;
  date: string;
  surface_type?: SurfaceType;
  footwear_type?: FootwearType;
  // FMS patterns (0-3 each, 0 = pain during movement)
  fms_deep_squat: number;             // Deep Squat
  fms_hurdle_step: number;            // Hurdle Step
  fms_inline_lunge: number;           // Inline Lunge
  fms_shoulder_mobility: number;      // Shoulder Mobility
  fms_aslr: number;                   // Active Straight Leg Raise (DB col: fms_aslr)
  fms_trunk_stability: number;        // Trunk Stability Push-Up (DB col: fms_trunk_stability)
  fms_rotary_stability: number;       // Rotary Stability
  /** Computed by DB: sum of 7 FMS scores */
  fms_total: number;
  /** Computed by DB: fms_total <= 14 */
  fms_injury_risk: boolean;
  // Additional biomechanical observations (DB columns: findings, recommendations)
  findings?: string;
  recommendations?: string;
  follow_up_date?: string;
  created_at: string;
}

// ─── View / Composite Types ───────────────────────────────────────────────────

export interface AthleteWithAcwr extends Profile {
  latest_acwr?: AcwrSnapshot;
  team?: Team;
}

export interface SessionWithRpe extends TrainingSession {
  rpe?: SessionRpe;
}

export interface PreventionSessionFull extends PreventionSession {
  athletes: Profile[];
  exercises: (SessionExercise & { exercise: Exercise })[];
}

// ─── ACWR Risk Thresholds ─────────────────────────────────────────────────────

export const ACWR_ZONES: Record<AcwrRiskZone, { min: number; max: number; color: string; label: string }> = {
  low:       { min: 0,    max: 0.8,  color: "#3B82F6", label: "Carga Baja"    },
  optimal:   { min: 0.8,  max: 1.3,  color: "#22C55E", label: "Zona Óptima"   },
  high:      { min: 1.3,  max: 1.5,  color: "#F59E0B", label: "Riesgo Alto"   },
  very_high: { min: 1.5,  max: Infinity, color: "#EF4444", label: "Riesgo Muy Alto" },
};

export function getAcwrRiskZone(ratio: number): AcwrRiskZone {
  if (ratio < 0.8)  return "low";
  if (ratio < 1.3)  return "optimal";
  if (ratio < 1.5)  return "high";
  return "very_high";
}

// ─── SMCP Composite Types ─────────────────────────────────────────────────────

/** Full SMCP snapshot for a single athlete on a given date */
export interface SmcpAthleteSnapshot {
  athlete: Profile;
  latest_acwr?: AcwrSnapshot;
  latest_poms?: PomsAssessment;
  latest_pain?: PainRecord;
  latest_hq_left?: HqEvaluation;
  latest_hq_right?: HqEvaluation;
  latest_biomech?: BiomechanicalEvaluation;
  daily_wellness?: DailyWellness;
}

/** POMS alert levels based on TMD score */
export type PomsAlertLevel = "normal" | "warning" | "overtraining_risk";

/** H/Q risk level */
export type HqRiskLevel = "safe" | "borderline" | "at_risk";

// ─── Supabase Database type helper ────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      profiles:                  { Row: Profile };
      teams:                     { Row: Team };
      team_members:              { Row: TeamMember };
      training_sessions:         { Row: TrainingSession };
      game_records:              { Row: GameRecord };
      daily_wellness:            { Row: DailyWellness };
      session_rpe:               { Row: SessionRpe };
      acwr_snapshots:            { Row: AcwrSnapshot };
      prevention_sessions:       { Row: PreventionSession };
      prevention_athletes:       { Row: PreventionAthlete };
      exercises:                 { Row: Exercise };
      session_exercises:         { Row: SessionExercise };
      periodization_plans:       { Row: PeriodizationPlan };
      periodization_cycles:      { Row: PeriodizationCycle };
      // SMCP / POMS / Biomechanics (migration 004)
      poms_assessments:          { Row: PomsAssessment };
      hq_evaluations:            { Row: HqEvaluation };
      pain_records:              { Row: PainRecord };
      biomechanical_evaluations: { Row: BiomechanicalEvaluation };
    };
  };
}
