# VITATEKH — Informe Ejecutivo para Inversores
## Sistema de Gestión de Carga y Prevención de Lesiones en Deportistas

---

> **Versión del documento:** 1.0  
> **Fecha:** Abril 2026  
> **Confidencial — Uso exclusivo para proceso de inversión**

---

## ÍNDICE

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [El Problema que Resolvemos](#2-el-problema-que-resolvemos)
3. [La Solución: Qué es Vitatekh](#3-la-solución-qué-es-vitatekh)
4. [Base Científica y Metodológica](#4-base-científica-y-metodológica)
5. [Los Datos que Captura la App](#5-los-datos-que-captura-la-app)
6. [Cómo Procesa la Información](#6-cómo-procesa-la-información)
7. [Lo que el Sistema Entrega al Usuario](#7-lo-que-el-sistema-entrega-al-usuario)
8. [Arquitectura Tecnológica](#8-arquitectura-tecnológica)
9. [Usuarios y Roles](#9-usuarios-y-roles)
10. [Flujo Completo de Uso](#10-flujo-completo-de-uso)
11. [Módulos de la Aplicación](#11-módulos-de-la-aplicación)
12. [Mercado Objetivo](#12-mercado-objetivo)
13. [Modelo de Negocio](#13-modelo-de-negocio)
14. [Hoja de Ruta (Roadmap)](#14-hoja-de-ruta-roadmap)
15. [Ventaja Competitiva](#15-ventaja-competitiva)
16. [Glosario Técnico](#16-glosario-técnico)

---

## 1. Resumen Ejecutivo

**Vitatekh** es una plataforma digital de gestión de carga deportiva y prevención de lesiones, diseñada para fisioterapeutas y entrenadores que trabajan con deportistas de formación y élite en baloncesto, fútbol y voleibol.

La plataforma integra en un solo sistema:
- El **monitoreo diario** del estado físico y psicológico del atleta
- El **cálculo automatizado** del riesgo de lesión mediante el ACWR (Acute:Chronic Workload Ratio)
- La **evaluación biomecánica** objetiva (ratio H/Q, FMS — Functional Movement Screen)
- La **prescripción clínica automática** de intervenciones basadas en evidencia científica
- Un **dashboard analítico web** para que el profesional tome decisiones informadas en tiempo real

Vitatekh no es un simple registrador de datos: es un **sistema de alerta temprana y soporte de decisiones clínicas** que traduce múltiples variables de riesgo en acciones concretas y fundamentadas científicamente.

---

## 2. El Problema que Resolvemos

### 2.1 Las lesiones en el deporte son predecibles y costosas

Estudios científicos demuestran que entre el **60% y el 80% de las lesiones deportivas no traumáticas** (musculares, tendinosas, por sobreuso) son **prevenibles** si se monitorean correctamente las cargas de entrenamiento.

Sin embargo, la mayoría de los cuerpos técnicos de equipos amateur, semiprofesionales y en formación no disponen de herramientas para hacerlo porque:

| Problema | Consecuencia |
|----------|-------------|
| Los datos de carga se registran en papel o Excel | No hay cruce ni análisis en tiempo real |
| El ACWR se calcula manualmente (si se calcula) | Error humano, omisión, inconsistencia |
| No hay seguimiento del estado psicológico | El sobreentrenamiento se detecta tarde |
| Las evaluaciones biomecánicas no se integran con la carga | Decisiones clínicas desconectadas |
| No hay sistema de alerta para el entrenador | El profesional actúa reactivamente, no preventivamente |

### 2.2 El impacto económico y humano

- Una lesión de ligamento cruzado anterior (LCA) en un futbolista cuesta entre **USD 20.000 y 50.000** entre cirugía, rehabilitación y sustitución temporal.
- Un equipo de fútbol amateur o universitario pierde en promedio **4–6 jugadores por lesión de carga** por temporada.
- En el deporte en formación (juveniles, categorías sub), las lesiones por sobreuso afectan el **desarrollo a largo plazo** del atleta.
- Los equipos de alto rendimiento invierten hasta **USD 300.000 anuales** en infraestructura de monitoreo que Vitatekh ofrece de manera accesible.

### 2.3 La brecha tecnológica

Las herramientas existentes (Smartabase, Catapult, STATSports) están diseñadas para equipos de élite con presupuestos de 6 cifras. **No existe una solución accesible, completa y en español** para el segmento de equipos semiprofesionales, ligas universitarias, academias deportivas y fisioterapeutas independientes en Latinoamérica.

---

## 3. La Solución: Qué es Vitatekh

Vitatekh es un **ecosistema de dos aplicaciones** conectadas a una base de datos compartida en tiempo real:

### 3.1 App Móvil (iOS + Android)
Diseñada para uso en campo, en el vestuario y en el día a día:
- **Atletas** registran su bienestar diario, su percepción de esfuerzo y su dolor en menos de 2 minutos
- **Profesionales** crean sesiones, registran evaluaciones biomecánicas y consultan el estado del equipo

### 3.2 Dashboard Web
Panel analítico para el trabajo de despacho del profesional:
- Visualización histórica de cargas por atleta
- Tablas de estado del equipo con semáforos de riesgo
- Gráficas de tendencia ACWR, volumen e intensidad
- Evaluaciones SMCP completas (EVA, POMS, H/Q, FMS)
- Exportación de informes en PDF para historial clínico

### 3.3 Motor de Inteligencia Clínica
El núcleo diferenciador: un motor de reglas basado en evidencia que **cruza automáticamente** todos los datos y genera prescripciones de intervención con:
- Nivel de alerta (Rojo / Naranja / Amarillo / Informativo)
- Protocolo clínico específico (Nordic Curl, HSR, FIFA 11+, PRICE, etc.)
- Ajuste de carga recomendado (porcentaje de reducción y duración)
- Justificación científica con fuente bibliográfica

---

## 4. Base Científica y Metodológica

Todo el sistema se fundamenta en investigaciones publicadas en revistas indexadas de medicina deportiva y ciencias del deporte.

### 4.1 ACWR — Acute:Chronic Workload Ratio

**¿Qué es?**
El ACWR es el indicador más validado científicamente para predecir el riesgo de lesión por carga. Compara la carga de entrenamiento de la semana actual (carga aguda) con el promedio de las últimas 4 semanas (carga crónica).

**Fórmula:**
```
ACWR = Carga Aguda (7 días) ÷ Carga Crónica (28 días ÷ 4)
```

Donde cada carga se calcula con la **sRPE (Session Rate of Perceived Exertion)**:
```
sRPE = RPE (Escala Borg 6-20) × Duración de la sesión en minutos
```

**Zonas de riesgo validadas (Gabbett, 2016; Hulin et al., 2016):**

| ACWR | Zona | Color | Significado Clínico |
|------|------|-------|---------------------|
| < 0.8 | Carga Baja | 🔵 Azul | Estímulo insuficiente — riesgo de desentrenamiento |
| 0.8 – 1.3 | Zona Óptima | 🟢 Verde | Adaptación positiva — ventana de entrenamiento segura |
| 1.3 – 1.5 | Riesgo Alto | 🟡 Amarillo | Carga elevada — monitoreo intensivo requerido |
| > 1.5 | Riesgo Muy Alto | 🔴 Rojo | Alto riesgo de lesión — reducción de carga urgente |

**Evidencia científica:**
- Un atleta con ACWR > 1.5 tiene **2.1 veces más probabilidad de lesionarse** en la semana siguiente que uno en zona óptima. (Gabbett, 2016 — *British Journal of Sports Medicine*)
- El "sweet spot" de 0.8–1.3 maximiza la adaptación fisiológica y minimiza el riesgo.

**Por qué usamos SMA (Simple Moving Average) y no EWMA:**
El método de promedio simple es más transparente, replicable y menos sensible a errores de entrada única, lo que lo hace más confiable para contextos clínicos donde los profesionales necesitan entender el cálculo.

---

### 4.2 sRPE — Session Rate of Perceived Exertion

**¿Qué es?**
La percepción subjetiva del esfuerzo es el método más accesible y uno de los más válidos para cuantificar la carga interna de entrenamiento cuando no se dispone de equipamiento de monitoreo fisiológico avanzado.

**Escala de Borg Modificada (CR-10 / RPE 6-20):**

| Valor | Descripción | Equivalente fisiológico |
|-------|-------------|------------------------|
| 6–7 | Muy fácil | Caminar tranquilo — <50% VO2max |
| 8–9 | Fácil | Trote suave |
| 10–11 | Moderado | Calentamiento estándar |
| 12–13 | Algo duro | Zona aeróbica media |
| 14–15 | Duro | Umbral aeróbico |
| 16–17 | Muy duro | Zona anaeróbica |
| 18–20 | Máximo | Sprint máximo, VO2max |

**Validez:** Correlaciona >0.80 con frecuencia cardíaca y lactato sanguíneo en múltiples estudios. (Foster et al., 2001 — *Journal of Strength and Conditioning Research*)

---

### 4.3 SMCP — Sistema de Monitoreo Clínico y Preventivo

Vitatekh va más allá del ACWR e integra un sistema multidimensional que llamamos SMCP, compuesto por cuatro pilares:

#### Pilar 1: Bienestar Diario (Wellness Check-in)

Variables registradas diariamente por el atleta:

| Variable | Escala | Indicador clínico |
|----------|--------|-------------------|
| Fatiga | 1–10 | Marcador de recuperación muscular |
| Horas de sueño | 0–12 h | Regeneración del SNC |
| Calidad del sueño | 1–5 | Calidad recuperativa (profundidad) |
| Estado de ánimo | 1–5 | Señal de sobreentrenamiento psicológico |

#### Pilar 2: Dolor — Escala EVA con Semáforo

La Escala Visual Analógica (EVA) es el estándar internacional para cuantificar el dolor.

**Registro completo por Vitatekh:**
- Puntuación EVA (0–10)
- Región anatómica afectada (22 regiones bilaterales: hombro, rodilla, isquiotibial, tobillo, etc.)
- Momento del dolor (en reposo, pre-sesión, post-sesión, día siguiente)
- Tipo de dolor (agudo, crónico, inducido por ejercicio, referido)
- ¿Limita el rendimiento? (Sí/No)

**Semáforo clínico:**

| EVA | Semáforo | Acción del sistema |
|-----|----------|--------------------|
| 0–3 | 🟢 Verde | Continuar con monitoreo |
| 4–6 | 🟡 Amarillo | Modificar carga — reevaluar en 48h |
| 7–10 | 🔴 Rojo | **Detener actividad — derivar a médico** |

#### Pilar 3: POMS — Perfil de Estados de Ánimo (Escala Breve)

El POMS (Profile of Mood States) es el instrumento psicométrico más utilizado en ciencias del deporte para detectar sobreentrenamiento y estados de burnout. Vitatekh implementa la versión breve de 6 dimensiones.

**Dimensiones evaluadas (escala 0–4):**

| Dimensión | Emoji | Dirección | Qué mide |
|-----------|-------|-----------|----------|
| Tensión / Ansiedad | 😬 | Negativa | Activación nerviosa excesiva |
| Depresión / Desánimo | 😞 | Negativa | Estado de humor bajo persistente |
| Ira / Hostilidad | 😤 | Negativa | Irritabilidad como señal de fatiga central |
| **Vigor / Actividad** | ⚡ | **Positiva** | Energía y motivación — el único factor positivo |
| Fatiga / Inercia | 🥱 | Negativa | Cansancio acumulado |
| Confusión / Desorientación | 😵 | Negativa | Afectación cognitiva por sobreentrenamiento |

**TMD — Total Mood Disturbance:**
```
TMD = Tensión + Depresión + Ira + Fatiga + Confusión − Vigor
Rango: −4 (excelente) a +20 (crisis)
```

**El "Perfil Iceberg" del deportista saludable:**
Un atleta en óptimas condiciones muestra TMD negativo con Vigor elevado (como un iceberg con la punta verde sobre la línea). Cuando el TMD sube, el perfil "se hunde".

**Interpretación clínica:**

| TMD | Estado | Acción |
|-----|--------|--------|
| ≤ 0 | Óptimo | Mantener carga |
| 1–7 | Precaución | Reducir intensidad, monitorear |
| > 7 | 🚨 Riesgo sobreentrenamiento | **Intervención inmediata** |

**Evidencia:** Morgan et al. (1987) demostraron que el POMS predice rendimiento deportivo con >80% de precisión cuando se sigue longitudinalmente.

#### Pilar 4: Evaluaciones Biomecánicas

##### 4.4.1 — Ratio H/Q (Isocinetico)

**¿Qué es?**
El ratio Isquiotibial/Cuádriceps (H/Q) mide el equilibrio de fuerza entre los músculos extensores e flexores de la rodilla, obtenido con dinamometría isocinética o pruebas funcionales. Es el predictor más importante de lesión de isquiotibiales.

**Dos tipos de ratio:**

| Tipo | Velocidad | Umbral de riesgo | Referencia |
|------|-----------|-----------------|-----------|
| Convencional | 60°/s | < 0.60 = riesgo | Kannus, 1994 |
| Funcional | 180°/s | < 1.00 = riesgo | Croisier et al., 2008 |

**Variables registradas:**
- Tipo de ratio (convencional / funcional)
- Lado evaluado (izquierdo / derecho / bilateral)
- Velocidad angular (°/s)
- Torque pico cuádriceps (Nm/kg de peso corporal)
- Torque pico isquiotibiales (Nm/kg)
- Cálculo automático del ratio

**Clasificación automática:**

| Ratio | Estado | Color |
|-------|--------|-------|
| ≥ 0.65 (conv.) / ≥ 1.10 (func.) | Sin riesgo | 🟢 Verde |
| 0.60–0.65 / 1.00–1.10 | Límite | 🟡 Amarillo |
| < 0.60 / < 1.00 | **En riesgo** | 🔴 Rojo |

**Relevancia:** Croisier et al. (2008) demostraron que corregir desequilibrios H/Q reduce las lesiones de isquiotibiales en un **65%** en la temporada siguiente.

##### 4.4.2 — FMS (Functional Movement Screen)

**¿Qué es?**
El FMS es un protocolo estandarizado de 7 patrones de movimiento funcional que evalúa la calidad del movimiento, identifica asimetrías y predice riesgo de lesión. Es uno de los screening más utilizados en el ámbito deportivo a nivel mundial.

**Los 7 patrones evaluados (puntuación 0–3 cada uno):**

| # | Patrón | Qué evalúa |
|---|--------|-----------|
| 1 | Sentadilla Profunda (Deep Squat) | Movilidad bilateral de caderas, rodillas, tobillos y columna |
| 2 | Paso de Valla (Hurdle Step) | Control de cadera y estabilidad de la extremidad de apoyo |
| 3 | Zancada en Línea (Inline Lunge) | Estabilidad sagital, movilidad tobillo-cadera |
| 4 | Movilidad de Hombro | Amplitud glenohumeral y estabilidad escapular |
| 5 | Elevación Activa de Pierna Recta | Flexibilidad isquiotibial + movilidad de cadera |
| 6 | Push-Up de Estabilidad de Tronco | Control de cadena anterior, estabilidad lumbo-pélvica |
| 7 | Estabilidad Rotatoria | Control multiplanar e integración interextremidades |

**Criterios de puntuación por patrón:**

| Puntaje | Significado |
|---------|-------------|
| 0 | **Dolor durante el movimiento** — señal de alerta inmediata |
| 1 | No puede realizar el patrón sin compensaciones |
| 2 | Realiza con compensaciones visibles |
| 3 | Patrón correcto — sin compensaciones |

**Total máximo: 21 puntos**

**Umbral de riesgo (Cook et al., 2006):**
```
Total FMS ≤ 14 → Riesgo ELEVADO de lesión
Cualquier patrón = 0 → Señal de alerta INMEDIATA (requiere evaluación médica)
```

**Contexto registrado:** Vitatekh además captura el tipo de superficie (8 variantes: césped natural, artificial, cancha sintética, etc.) y el tipo de calzado (10 variantes: tacos de fútbol, zapatillas de baloncesto, pies descalzos, etc.) para contextualizar los resultados.

---

## 5. Los Datos que Captura la App

### 5.1 Datos Registrados por el Atleta

#### A. Check-in Diario (< 2 minutos cada día)

```
Fatiga percibida       → Escala 1–10
Horas de sueño         → 0 a 12 horas
Calidad del sueño      → 1 (pésima) a 5 (excelente)
Estado de ánimo        → 1 (muy bajo) a 5 (excelente)
```

#### B. RPE Post-Sesión (< 1 minuto después de entrenar)

```
RPE de la sesión       → Escala Borg 6–20
Duración confirmada    → Minutos (pre-cargado por el entrenador)
sRPE calculado         → RPE × Duración = Unidades Arbitrarias (UA)
```

#### C. Registro de Dolor EVA (cuando el atleta siente dolor)

```
Puntuación EVA         → 0 (sin dolor) a 10 (dolor máximo)
Región anatómica       → 22 opciones bilaterales
Momento del dolor      → Reposo / Pre-sesión / Post-sesión / Día siguiente
Tipo de dolor          → Agudo / Crónico / Inducido por ejercicio / Referido
Limita rendimiento     → Sí / No
```

#### D. Evaluación POMS (cuando el profesional lo solicita)

```
Tensión                → 0–4
Depresión              → 0–4
Ira                    → 0–4
Vigor                  → 0–4 (factor positivo)
Fatiga                 → 0–4
Confusión              → 0–4
TMD calculado          → Automáticamente
```

### 5.2 Datos Registrados por el Profesional

#### E. Sesión de Entrenamiento

```
Equipo/atletas         → Asignación por equipo
Fecha de la sesión     → AAAA-MM-DD
Duración               → Minutos
Tipo de sesión         → Técnico / Táctico / Físico / Partido / Recuperación / Prevención
Fase de temporada      → Pretemporada / Competición / Transición
Notas descriptivas     → Texto libre opcional
```

#### F. Evaluación H/Q (Ratio Isquiotibial/Cuádriceps)

```
Atleta evaluado        → Selección del roster
Tipo de ratio          → Convencional (60°/s) o Funcional (180°/s)
Lado                   → Izquierdo / Derecho / Bilateral
Velocidad angular      → °/s (60, 90, 120, 180, 240, 300)
Torque cuádriceps      → Nm/kg de peso corporal
Torque isquiotibiales  → Nm/kg de peso corporal
H/Q ratio              → Calculado automáticamente
Nivel de riesgo        → Clasificado automáticamente (verde/amarillo/rojo)
```

#### G. Evaluación FMS

```
Atleta evaluado        → Selección del roster
7 patrones             → Puntuación 0–3 cada uno
Total FMS              → Calculado automáticamente (máx. 21)
Riesgo de lesión       → Flag automático (≤14 o patrón en 0)
Superficie             → 8 tipos de superficie
Calzado                → 10 tipos de calzado
```

#### H. Sesión Preventiva

```
Título                 → Nombre del protocolo
Descripción            → Objetivo de la sesión
Fecha programada       → AAAA-MM-DD
Tipo                   → Grupal o Individual
Deporte                → Baloncesto / Fútbol / Voleibol
Atletas asignados      → Selección múltiple con checkboxes
Ejercicios             → Desde catálogo integrado (Series + Reps + Duración)
```

### 5.3 Datos Calculados Automáticamente

```
sRPE                   → RPE × Duración (tras cada sesión)
Carga Aguda (7d)       → Σ(sRPE) últimos 7 días
Carga Crónica (28d)    → Σ(sRPE) últimos 28 días ÷ 4
ACWR                   → Carga Aguda ÷ Carga Crónica
Zona de Riesgo         → low / optimal / high / very_high (automática)
TMD POMS               → T + D + A + F + C − Vigor (automática)
H/Q Ratio              → HamstringNm ÷ QuadricepsNm (automática)
FMS Total              → Suma de 7 patrones (automática)
Prescripciones         → Motor de 8 reglas clínicas (automática)
```

---

## 6. Cómo Procesa la Información

### 6.1 El Motor de Cálculo ACWR (Edge Function Serverless)

Después de cada registro del atleta, el sistema ejecuta automáticamente la función de cálculo en la nube:

**Proceso:**
1. Recupera todas las sRPE del atleta en los últimos 28 días
2. Calcula la carga aguda (7 días) y crónica (28 días ÷ 4)
3. Computa el ACWR y determina la zona de riesgo
4. Compara con el día anterior para detectar **transiciones de zona**
5. Si el atleta pasó de zona segura a zona de riesgo en < 24 horas → genera alerta automática
6. Si ACWR > 1.5 (independientemente) → genera alerta crítica al profesional
7. Guarda el snapshot diario (o lo actualiza si ya existía)

### 6.2 El Motor de Prescripción Clínica — Las 8 Reglas

El sistema cruza automáticamente todos los datos disponibles de un atleta y aplica 8 reglas clínicas basadas en evidencia:

---

#### REGLA 1 — Sobrecarga Crítica con Fatiga Psicológica
```
CONDICIÓN:  ACWR > 1.5 Y Vigor POMS < 3
ALERTA:     🔴 ROJO — URGENTE
PROTOCOLO:  "Descarga Urgente + Soporte Psicológico"
ACCIÓN:     Reducción del 50% de volumen Y 50% de intensidad durante 5 días
BIBLIOGRAFÍA: Gabbett (2016) BJSpM + Morgan et al. (1987) POMS-Sport
```

---

#### REGLA 2 — Dolor Severo con Sobrecarga
```
CONDICIÓN:  EVA > 6 Y ACWR > 1.3
ALERTA:     🔴 ROJO — URGENTE
PROTOCOLO:  "PRICE + Derivación Médica Inmediata"
ACCIÓN:     Suspender carga de entrenamiento (reducción 100%)
BIBLIOGRAFÍA: Bleakley et al. (2012) Cochrane — PRICE Protocol
```

---

#### REGLA 3 — Desequilibrio Isquiotibial
```
CONDICIÓN:  H/Q ratio en zona de riesgo O dolor en isquiotibiales (EVA > 4)
ALERTA:     🟠 NARANJA
PROTOCOLO:  "Nordic Hamstring + HSR (High Speed Running)"
ACCIONES:
  · Nordic Curl: 3 × 5 repeticiones, énfasis en fase excéntrica
  · High Speed Running progresivo
AJUSTE:     Reducción 30% de volumen durante 14 días
BIBLIOGRAFÍA: Petersen et al. (2011) AJSM — Nordic Curl RCT
              Mendiguchia et al. (2017) — HSR Protocol
```

---

#### REGLA 4 — Riesgo Biomecánico por FMS
```
CONDICIÓN:  FMS total ≤ 14 O cualquier patrón puntuado 0 (dolor)
ALERTA:     🟠 NARANJA
PROTOCOLO:  "FIFA 11+ / Corrección de Patrones de Movimiento"
ACCIONES:
  · FIFA 11+ completo (calentamiento preventivo estandarizado)
  · Corrección específica del patrón deficitario
AJUSTE:     Añadir 2 sesiones preventivas semanales
BIBLIOGRAFÍA: Soligard et al. (2008) BMJ — FIFA 11+ RCT
              Cook et al. (2006) — FMS injury prediction
```

---

#### REGLA 5 — Recuperación Insuficiente
```
CONDICIÓN:  Sueño < 6 horas Y Fatiga percibida > 7/10
ALERTA:     🟡 AMARILLO
PROTOCOLO:  "Recuperación Activa y Higiene del Sueño"
ACCIONES:
  · Sesión de recuperación activa (natación, bicicleta <60% FCmax)
  · Protocolo de higiene del sueño (rutinas, temperatura, oscuridad)
AJUSTE:     Reducción 20% de volumen durante 2 días
BIBLIOGRAFÍA: Walker (2017) — "Why We Sleep" / Sleep-performance research
```

---

#### REGLA 6 — Sobreentrenamiento Psicológico (POMS)
```
CONDICIÓN:  TMD > 7
ALERTA:     🟡 AMARILLO
PROTOCOLO:  "Descarga y Gestión Psicológica"
ACCIONES:
  · Sesión de relajación / meditación
  · Reducción de intensidad de entrenamiento
  · Evaluación de fuentes de estrés externo
AJUSTE:     Reducción 25% de intensidad durante 3 días
BIBLIOGRAFÍA: Morgan et al. (1987) — POMS overtraining prediction
              Kenttä & Hassmén (1998) — Overtraining review
```

---

#### REGLA 7 — Zona de Monitoreo Intensivo
```
CONDICIÓN:  ACWR entre 1.3 y 1.5
ALERTA:     🟡 AMARILLO — PREVENTIVO
PROTOCOLO:  "Monitoreo Intensivo de Carga"
ACCIONES:
  · Registro diario obligatorio de RPE
  · Revisión de progresión de carga semanal
  · Considerar día de recuperación activa
AJUSTE:     Mantener carga — no incrementar
BIBLIOGRAFÍA: Hulin et al. (2016) — ACWR monitoring BJSpM
```

---

#### REGLA 8 — Riesgo de Tobillo por Contexto de Equipo
```
CONDICIÓN:  Dolor en tobillo (región anatómica "ankle_*") + patrón de lesiones del equipo
ALERTA:     🔵 INFORMATIVO
PROTOCOLO:  "Revisión de Equipamiento y Superficie"
ACCIONES:
  · Revisar tipo de calzado y su desgaste
  · Evaluar tipo de superficie de entrenamiento
  · Considerar vendaje funcional preventivo
BIBLIOGRAFÍA: Verhagen et al. (2000) — Ankle injury prevention
```

---

### 6.3 Cruce de Variables — El Valor Diferencial

La potencia del sistema radica en que **ninguna variable se evalúa de forma aislada**. El motor cruza simultáneamente:

```
ACWR (carga física) + EVA (dolor) + POMS (estado psicológico) + H/Q (biomecánica) + FMS (movimiento)
                                    ↓
                     PRESCRIPCIÓN PERSONALIZADA POR ATLETA
```

**Ejemplo real:**
- Un atleta con ACWR = 1.4 (zona amarilla) podría seguir entrenando normalmente
- Si ese mismo atleta tiene EVA = 7 en rodilla → el sistema activa Regla 2 (alerta roja + suspensión)
- Si además tiene TMD = 9 → también activa Regla 6 (riesgo de sobreentrenamiento)
- El profesional recibe: 2 alertas, 2 protocolos específicos, 1 ajuste de carga claro

---

## 7. Lo que el Sistema Entrega al Usuario

### 7.1 Para el Profesional (entrenador / fisioterapeuta)

#### Dashboard en Tiempo Real (Web)
- Tabla de todo el equipo con semáforos de riesgo (ACWR, EVA, POMS, Alertas)
- Prescripciones clínicas automáticas por atleta
- Conteo de atletas por zona de riesgo
- Alertas de transición de zona (atletas que empeoraron desde ayer)

#### Análisis de Carga Histórico
- Gráfica de ACWR de los últimos 60 días con zonas de referencia marcadas
- Gráfica de volumen semanal (minutos totales de entrenamiento)
- Gráfica de sRPE semanal (carga interna acumulada)
- Tendencia de bienestar (fatiga, sueño, estado de ánimo superpuestos)
- Selector de atleta individual o vista de equipo

#### Panel de Prevención SMCP
- Resumen tabular de todas las evaluaciones por atleta (EVA + POMS + H/Q + FMS)
- Tab de dolor: semáforo con distribución verde/amarillo/rojo del equipo
- Tab de POMS: valores por dimensión + TMD de cada atleta
- Tab de H/Q: ratios isocinéticos con clasificación de riesgo
- Tab de FMS: 7 patrones individuales con código de color por score
- Tab de sesiones preventivas: estado de completación por atleta

#### Informes Exportables (PDF)
- Informe completo por equipo o por atleta individual
- Todas las métricas SMCP en una sola hoja
- Prescripciones clínicas adjuntas (con fundamento bibliográfico)
- Listo para historial clínico o presentación a directivos

### 7.2 Para el Atleta (app móvil)

- Su **ACWR actual** con zona de riesgo visualizada
- Sus **cargas aguda y crónica** en unidades arbitrarias
- Historial de los últimos 30 días de snapshots
- Sus **sesiones preventivas asignadas** con ejercicios detallados (series/reps/instrucciones)
- Botón de marcado como completada por sesión
- Acceso rápido a todos sus formularios de registro

---

## 8. Arquitectura Tecnológica

### 8.1 Stack Tecnológico

| Capa | Tecnología | Justificación |
|------|-----------|--------------|
| App Móvil | React Native + Expo (TypeScript) | Una sola base de código para iOS y Android |
| Web Dashboard | Next.js 14 (TypeScript) | SSR para datos frescos, SEO opcional |
| Base de Datos | PostgreSQL (Supabase) | Relacional, ACID, RLS nativo |
| Auth | Supabase Auth | JWT, sesiones seguras, OAuth preparado |
| Backend Serverless | Supabase Edge Functions (Deno) | ACWR auto-calculado en nube, escala a 0 |
| Monorepo | pnpm workspaces + Turborepo | Código compartido entre móvil y web |
| Tipos Compartidos | TypeScript (`packages/shared`) | Tipos únicos en toda la plataforma |

### 8.2 Base de Datos — 14 Tablas Principales

```
profiles              → Usuarios (atletas y profesionales)
teams                 → Equipos deportivos
team_members          → Relación atleta ↔ equipo
training_sessions     → Sesiones de entrenamiento
session_rpe           → RPE por sesión y atleta
acwr_snapshots        → ACWR calculado diariamente
daily_wellness        → Check-in diario del atleta
poms_assessments      → Evaluaciones POMS completas
pain_records          → Registros de dolor EVA
hq_evaluations        → Evaluaciones isocinéticas H/Q
biomechanical_evaluations → Evaluaciones FMS
prevention_sessions   → Sesiones preventivas
prevention_athletes   → Asignación + completación
exercises             → Catálogo de ejercicios preventivos
session_exercises     → Ejercicios dentro de una sesión
periodization_plans   → Planes de periodización
periodization_cycles  → Micro/meso/macrociclos
```

### 8.3 Seguridad — Row Level Security (RLS)

Cada dato en la base de datos tiene políticas de acceso a nivel de fila:
- Los atletas **solo ven sus propios datos**
- Los profesionales **solo ven datos de sus propios equipos**
- Ningún usuario puede ver datos de otro equipo, aunque tenga cuenta
- Las funciones de cálculo usan una clave de servicio que nunca se expone al cliente

### 8.4 Escalabilidad

| Componente | Capacidad actual | Capacidad con escala |
|-----------|-----------------|---------------------|
| Base de datos | 500 MB free tier | Hasta 500 GB en planes Pro |
| Edge Functions | 500.000 invocaciones/mes free | Millones en Pro |
| Conexiones concurrentes | 60 (free) | 200+ (Pro) |
| Auth users | Ilimitado | Ilimitado |

---

## 9. Usuarios y Roles

### 9.1 Profesional (Fisioterapeuta / Entrenador)

**Acceso:** Web + Móvil

**Puede:**
- Crear y gestionar equipos
- Añadir atletas al equipo (por email)
- Crear sesiones de entrenamiento para todo el equipo
- Ver el dashboard de riesgo del equipo en tiempo real
- Registrar evaluaciones H/Q y FMS de cualquier atleta del equipo
- Crear sesiones preventivas con ejercicios del catálogo y asignarlas a atletas
- Exportar informes PDF del equipo o individuales
- Visualizar análisis histórico de carga por atleta
- Recibir alertas de zona de riesgo y prescripciones automáticas

### 9.2 Atleta (Deportista)

**Acceso:** Solo Móvil

**Puede:**
- Registrar su check-in diario de bienestar
- Registrar su RPE después de cada sesión de entrenamiento
- Registrar dolor (EVA) cuando lo experimenta
- Completar la evaluación POMS cuando se la soliciten
- Ver su ACWR actual y su historial de 30 días
- Ver y completar las sesiones preventivas que le asigne su profesional

---

## 10. Flujo Completo de Uso

### Flujo Diario Típico

```
07:00 → El atleta abre la app
          ↓ Registra: Fatiga 6/10, Sueño 7h, Calidad 4/5, Ánimo 4/5
          ↓ Sistema: Guarda daily_wellness

17:30 → Termina el entrenamiento
          ↓ El atleta registra RPE = 14 (duro), 90 minutos
          ↓ Sistema: sRPE = 14 × 90 = 1.260 UA → guarda session_rpe
          ↓ Sistema: Recalcula ACWR automáticamente
          ↓ ACWR nuevo = 1.22 (zona óptima) → no hay alerta
          ↓ Snapshots actualizado en la BD

18:00 → El entrenador abre el dashboard web
          ↓ Ve el equipo completo con ACWR actualizados
          ↓ Detecta: Atleta #7 tiene ACWR = 1.48 (zona amarilla)
          ↓ Ve la prescripción: "Monitoreo intensivo — no incrementar carga"
          ↓ Toma decisión: el atleta #7 entrena con reducción de intensidad mañana
```

### Flujo Semanal

```
LUNES    → Entrenador crea sesiones de la semana en la app
MARTES   → Atletas registran RPE + check-in → ACWR actualizado
MIÉRCOLES → Entrenador revisa dashboard → ajusta planificación
JUEVES   → Fisio evalúa H/Q y FMS a 3 atletas en riesgo
           → Sistema genera prescripciones específicas
VIERNES  → Partido → atletas registran sRPE post-partido
SÁBADO   → Dashboard muestra ACWR post-competición del equipo
DOMINGO  → Sesión preventiva asignada → atletas la completan → fisio ve completaciones
```

---

## 11. Módulos de la Aplicación

### 11.1 Módulos Web

| Módulo | Ruta | Función Principal |
|--------|------|-----------------|
| Dashboard | `/dashboard` | Visión general del equipo — ACWR + alertas + prescripciones |
| Atletas | `/athletes` | Lista y perfil individual de cada atleta |
| Análisis de Carga | `/load-analysis` | Gráficas históricas ACWR, volumen, intensidad, wellness |
| Prevención SMCP | `/prevention` | Tablas EVA, POMS, H/Q, FMS + sesiones preventivas |
| Periodización | `/periodization` | Gestión de ciclos (micro/meso/macro) |
| Informes | `/reports` | Exportación PDF del equipo completo |

### 11.2 Módulos Móvil — Profesional

| Tab | Función |
|-----|---------|
| Dashboard | ACWR del equipo en tiempo real con semáforos |
| Atletas | Roster del equipo + detalle individual + registros H/Q y FMS |
| Sesiones | Crear entrenamientos + crear sesiones preventivas con ejercicios |
| Periodización | Gestión de ciclos de la temporada |
| Perfil | Cuenta y configuración |

### 11.3 Módulos Móvil — Atleta

| Tab | Función |
|-----|---------|
| Check-in | Registro diario de bienestar + RPE + atajos a EVA y POMS |
| Mi Carga | ACWR actual, zona de riesgo, cargas aguda/crónica, historial 30d |
| Mis Sesiones | Ver y completar sesiones preventivas asignadas con ejercicios |
| Perfil | Cuenta y configuración |

---

## 12. Mercado Objetivo

### 12.1 Segmento Primario

**Fisioterapeutas y preparadores físicos** que trabajan con:
- Academias de fútbol (categorías sub-14 a sub-23)
- Equipos de baloncesto universitarios y semiprofesionales
- Clubes de voleibol de liga regional y nacional
- Clínicas de fisioterapia con servicio a equipos deportivos

**Tamaño estimado en Colombia:**
- ~3.200 equipos de fútbol en ligas regionales y academias
- ~800 equipos de baloncesto en ligas departamentales
- ~400 equipos de voleibol en competición organizada
- ~2.400 fisioterapeutas deportivos activos (según ASOFISIO)

### 12.2 Segmento Secundario

- Ligas universitarias (ASCUN deportes — 75 universidades)
- Federaciones deportivas departamentales
- Selecciones regionales de jóvenes talentos
- Clínicas de alto rendimiento

### 12.3 Mercado Ampliado (Latam)

- Expansión natural a México, Argentina, Chile, Perú con el mismo idioma y contexto cultural
- Mercado total de deportes organizados en Latam: >50.000 equipos en las categorías objetivo

---

## 13. Modelo de Negocio

### 13.1 SaaS por Suscripción Mensual

| Plan | Precio/mes | Incluye |
|------|-----------|---------|
| **Starter** | USD 29 | 1 equipo, hasta 20 atletas, todas las funciones |
| **Professional** | USD 79 | 3 equipos, hasta 60 atletas, informes PDF ilimitados |
| **Club** | USD 199 | Equipos ilimitados, soporte prioritario, datos históricos ilimitados |
| **Enterprise** | A convenir | Multi-sede, API personalizada, onboarding dedicado |

### 13.2 Ingresos Adicionales

- **Onboarding y capacitación:** Talleres de formación en uso de la plataforma y metodología ACWR
- **Exportación de datos:** API para integración con sistemas existentes de clubes grandes
- **Marketplace de ejercicios:** Fisioterapeutas pueden publicar protocolos personalizados (comisión)

### 13.3 Proyección Conservadora (Año 1)

```
Meta: 150 profesionales suscritos (plan Starter promedio USD 29/mes)
ARR: 150 × 29 × 12 = USD 52.200
Churn esperado: 5% mensual (primeros 6 meses)
CAC estimado: USD 80 por cliente (marketing digital + referidos)
LTV estimado: USD 348 (12 meses)
LTV/CAC ratio: 4.35 (saludable para SaaS B2B)
```

---

## 14. Hoja de Ruta (Roadmap)

### Fase 1 — Completada ✅ (MVP Funcional)
- Monorepo + arquitectura completa
- Auth con roles (profesional/atleta)
- Check-in diario + RPE + ACWR automático
- Evaluaciones H/Q y FMS
- EVA de dolor + POMS
- Dashboard web completo con gráficas
- Panel SMCP con todas las evaluaciones
- Motor de prescripción (8 reglas)
- Sesiones preventivas con catálogo de ejercicios
- Informes PDF exportables

### Fase 2 — En Desarrollo (Q2 2026)
- Notificaciones push (Expo Notifications) para alertas críticas
- Periodización táctica completa con vista de calendario
- Registro de partidos con RPE pre/post partido
- Panel de gestión de equipos y atletas en web

### Fase 3 — Planificada (Q3 2026)
- Integración con wearables (Apple Watch, Garmin, Polar)
- Importación automática de frecuencia cardíaca y pasos
- EWMA como método alternativo de cálculo ACWR (configurable)
- Comparación de atletas y benchmarking por deporte

### Fase 4 — Visión (Q4 2026 – 2027)
- IA predictiva: modelo ML entrenado con datos históricos de la plataforma
- Predicción de lesiones 7 días antes con >75% de precisión
- Integración con GPS (STATSports, Catapult API) para carga externa objetiva
- Portal para federaciones: vista multi-equipo + selecciones

---

## 15. Ventaja Competitiva

### 15.1 vs. Herramientas Élite (Catapult, Smartabase, STATSports)

| Criterio | Competidores élite | Vitatekh |
|----------|-------------------|---------|
| Precio | USD 10.000–50.000/año | USD 348–2.400/año |
| Hardware requerido | GPS + sensores | Solo smartphone |
| Idioma | Inglés | Español (es-CO) |
| Curva de aprendizaje | Alta (requiere formación especializada) | Baja (intuitivo) |
| Integración SMCP | Parcial | Completa (ACWR + POMS + EVA + H/Q + FMS) |
| Prescripción automática | No | Sí (8 reglas con bibliografía) |

### 15.2 vs. Excel / Google Sheets

| Criterio | Excel | Vitatekh |
|----------|-------|---------|
| Registro en campo | Imposible en tiempo real | App móvil instantánea |
| Cálculo ACWR | Manual y propenso a error | Automático e inmediato |
| Alertas | Ninguna | Tiempo real con protocolo |
| Multi-atleta | Complejo | Nativo |
| Historial | Sin normalización | BD relacional completa |

### 15.3 Barreras de Entrada

1. **Propiedad intelectual del motor de reglas clínicas:** las 8 reglas y su lógica de cruce son una ventaja difícil de replicar sin expertise clínico y deportivo
2. **Datos históricos:** a medida que la plataforma crece, el dataset se vuelve un activo para modelos predictivos
3. **Red de fisioterapeutas:** el modelo B2B genera retención alta y referidos orgánicos
4. **Integración del SMCP completo:** ningún competidor en el segmento accesible integra los 5 pilares

---

## 16. Glosario Técnico

| Término | Definición |
|---------|-----------|
| **ACWR** | Acute:Chronic Workload Ratio. Cociente entre carga aguda (7d) y carga crónica (28d). Predictor de riesgo de lesión. |
| **sRPE** | Session Rate of Perceived Exertion. Carga interna = RPE × Duración. |
| **RPE** | Rate of Perceived Exertion. Escala de Borg 6-20 para medir percepción de esfuerzo. |
| **Carga Aguda** | Suma de sRPE de los últimos 7 días. Representa el estrés reciente. |
| **Carga Crónica** | Promedio semanal de las últimas 4 semanas (suma 28d ÷ 4). Representa la capacidad de trabajo. |
| **SMA** | Simple Moving Average. Promedio móvil simple — método usado para carga crónica. |
| **SMCP** | Sistema de Monitoreo Clínico y Preventivo. Marco integral de Vitatekh. |
| **POMS** | Profile of Mood States. Instrumento psicométrico para detectar sobreentrenamiento. |
| **TMD** | Total Mood Disturbance. Índice resumen del POMS = (T+D+A+F+C)−Vigor. |
| **EVA** | Escala Visual Analógica de dolor. 0 (sin dolor) a 10 (dolor máximo). |
| **H/Q** | Ratio Isquiotibial/Cuádriceps. Índice de equilibrio muscular en la rodilla. |
| **FMS** | Functional Movement Screen. 7 patrones de movimiento funcional, 21 puntos máximos. |
| **RLS** | Row Level Security. Seguridad a nivel de fila en PostgreSQL. |
| **SaaS** | Software as a Service. Modelo de suscripción en la nube. |
| **UA** | Unidades Arbitrarias. Unidad de medida de la carga de entrenamiento (sRPE). |
| **SSR** | Server-Side Rendering. El dashboard web se renderiza en el servidor para datos frescos. |
| **Zona Óptima** | ACWR entre 0.8 y 1.3. Ventana de entrenamiento segura y eficaz. |
| **Perfil Iceberg** | Patrón de POMS saludable: todas las dimensiones negativas bajas excepto Vigor elevado. |

---

## ANEXO — Referencias Bibliográficas

1. **Gabbett, T.J. (2016).** The training—injury prevention paradox: should athletes be training smarter and harder? *British Journal of Sports Medicine*, 50(5), 273-280.

2. **Hulin, B.T., Gabbett, T.J., et al. (2016).** Spikes in acute workload are associated with increased injury risk in elite cricket fast bowlers. *British Journal of Sports Medicine*, 48(8), 708-712.

3. **Foster, C., et al. (2001).** A new approach to monitoring exercise training. *Journal of Strength and Conditioning Research*, 15(1), 109-115. *(Validación del sRPE)*

4. **Morgan, W.P., et al. (1987).** Psychological monitoring of overtraining and staleness. *British Journal of Sports Medicine*, 21(3), 107-114. *(POMS y sobreentrenamiento)*

5. **Kannus, P. (1994).** Isokinetic evaluation of muscular performance: implications for muscle testing and rehabilitation. *International Journal of Sports Medicine*, 15(Suppl 1), S11-18. *(Umbral H/Q convencional 0.60)*

6. **Croisier, J.L., et al. (2008).** Strength imbalances and prevention of hamstring injury in professional soccer players. *American Journal of Sports Medicine*, 36(8), 1469-1475. *(Umbral H/Q funcional 1.00)*

7. **Cook, G., et al. (2006).** Pre-participation screening: the use of fundamental movements as an assessment of function. *North American Journal of Sports Physical Therapy*, 1(2), 62-72. *(FMS ≤ 14 y riesgo de lesión)*

8. **Soligard, T., et al. (2008).** Comprehensive warm-up programme to prevent injuries in young female footballers: cluster randomised controlled trial. *BMJ*, 337, a2469. *(FIFA 11+ eficacia)*

9. **Petersen, J., et al. (2011).** Preventive effect of eccentric training on acute hamstring injuries in men's soccer: a cluster-randomized controlled trial. *American Journal of Sports Medicine*, 39(11), 2296-2303. *(Nordic Curl: reducción 65% lesiones)*

10. **Bleakley, C., et al. (2012).** PRICE needs updating: should we call the POLICE? *British Journal of Sports Medicine*, 46(4), 220-221. *(Protocolo PRICE)*

---

*Documento preparado por el equipo técnico de Vitatekh.*  
*Para información adicional, demostraciones o reuniones de inversión, contactar a: juancho.9609@gmail.com*

---

**© 2026 Vitatekh. Todos los derechos reservados.**  
*Confidencial — Este documento contiene información propietaria y confidencial.*
