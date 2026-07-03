# Bodysense — Esquema de Base de Datos

Fuente de verdad: `supabase/migrations/` (aplicar en orden numérico).

## Tablas principales

| Tabla | Migración | Propósito |
|---|---|---|
| `profiles` | 001 | Perfiles (professional / athlete), extiende `auth.users` |
| `teams`, `team_members` | 001 / 008 | Equipos del profesional y membresía de atletas |
| `training_sessions`, `session_rpe` | 001 | Sesiones ejecutadas y RPE post-sesión (sRPE = RPE × min) |
| `planned_sessions` | 007 | Planificación semanal; `srpe_projected` generada |
| `acwr_snapshots` | 001 | Ratio carga aguda/crónica (Edge Function `calculate-acwr`) |
| `daily_wellness` | 001 / 004 | Check-in diario (fatiga, sueño, ánimo, EVA/POMS rápido) |
| `poms_assessments` | 004 | POMS Short Form; `tmd_score` generada |
| `hq_evaluations` | 004 | Ratio isocinético H/Q; `hq_ratio` y `risk_flag` generadas |
| `pain_records` | 004 | Dolor EVA 0-10; `traffic_light` generada |
| `biomechanical_evaluations` | 004 | FMS 7 patrones; `fms_total` y `fms_injury_risk` generadas |
| `ankle_foot_assessments` | 009 | Módulo avanzado tobillo/pie y rendimiento funcional |
| `periodization_plans`, `periodization_cycles` | 008 | Macro/meso/microciclos |
| `prevention_sessions`, `prevention_athletes` | 008 | Sesiones preventivas y asistencia |
| `exercises`, `session_exercises` | 008 | Catálogo de ejercicios y prescripción por sesión |
| `game_records` | 008 | Partidos con RPE pre/post |
| `notifications` | 006 | Notificaciones in-app |

## Módulo 009 — Tobillo, Pie y Rendimiento Funcional

Tabla `ankle_foot_assessments`. Modelos TypeScript en
`packages/shared/src/types/index.ts` (`AnkleFootAssessment`,
`SingleLegSquatResult`, `BoscoProtocol`).

### Biomecánica clínica (campos simétricos `_left` / `_right`)
- `foot_type` — ENUM `normal | flat | cavus` (Test de Línea de Feiss)
- `dorsiflexion_rom` (0-60°) / `plantiflexion_rom` (0-90°) — goniometría
- `wblt_cm` (0-25 cm) — Weight-Bearing Lunge Test; < 9-10 cm sugiere restricción
- `windlass_test` — BOOLEAN, reactividad de fascia plantar
- `anterior_impingement` — BOOLEAN, pinzamiento de la mortaja maleolar
- `myofascial_status` — ENUM `hypertonic | phasic | optimal` (complejo gastro-sóleo-calcáneo-fascia)

### Fuerza y control motor
- `daniels_muscle_grade` (0-5) — evaluación muscular manual (escala Daniels)
- `single_leg_squat` — JSONB `{ knee_valgus, pelvic_drop, trunk_rotation, overall_status }`
  con `overall_status`: `optimal | compensated | deficient`

### Agilidad y pliometría
- `agility_t_test_seconds` — NUMERIC, T-Test de agilidad
- `bosco_protocol` — JSONB `{ squat_jump_cm, cmj_cm, drop_jump_rsi }`

### RLS
- Atleta: lee sus propios registros (`athlete_id = auth.uid()`)
- Profesional: lee/inserta para sus atletas vía `is_my_athlete()`; actualiza solo sus evaluaciones
