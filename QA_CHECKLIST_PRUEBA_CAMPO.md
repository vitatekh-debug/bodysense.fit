# ✅ Checklist QA — Prueba Real con Primeros 10 Atletas
## Vitatekh · Validación Pre-Producción

> **Cómo usar este documento:**  
> Ejecuta cada punto manualmente antes de dar acceso a los atletas.  
> Cada ítem tiene: qué hacer, qué esperar, y qué señal indica un fallo.

---

## PUNTO 1 — Registro de Datos y Validaciones de Entrada

**Objetivo:** Verificar que el sistema nunca rompe con datos inválidos o vacíos.

### Pruebas a ejecutar (dispositivo real, NO simulador)

| # | Acción | Resultado esperado | Señal de fallo |
|---|--------|--------------------|----------------|
| 1.1 | Registra un check-in con **fatiga = 1** (mínimo) y **sueño = 12h** (máximo) | Datos guardados, toast verde "¡Check-in registrado!" | Toast rojo o pantalla en blanco |
| 1.2 | Registra un check-in con **sueño = 5h** (menos de 6) | Aparece advertencia amarilla **"⚠ Menos de 6 horas afecta la recuperación"** debajo del slider | No aparece la advertencia |
| 1.3 | Abre la pantalla de RPE **sin session_id** en la URL | Aparece banner rojo **"Sin sesión de entrenamiento"** y el botón de guardar está desactivado | El botón está activo y al presionar no ocurre nada o crashea |
| 1.4 | Mueve el slider de RPE hasta los extremos | El número nunca sube de **20** ni baja de **6** | El slider permite valores fuera de rango |
| 1.5 | Haz un check-in dos veces el mismo día | El segundo check-in **actualiza** el primero (no duplica) — ícono "Actualizar Check-in" visible | Hay dos filas en la BD o el botón dice "Registrar" la segunda vez |
| 1.6 | Registra una sesión de RPE con duración = 90min, RPE = 14 | sRPE mostrado = **1260 UA** | Número diferente, NaN o vacío |
| 1.7 | Abre "Mi Carga" sin nunca haber registrado datos | Aparece estado vacío con botón **"Ir al Check-in"** | Pantalla en blanco, error, o número NaN |

**Tiempo estimado:** 15 minutos

---

## PUNTO 2 — Persistencia Offline (Campo Real — Sin WiFi)

**Objetivo:** Confirmar que un atleta en cancha sin internet puede registrar y que los datos llegan después.

### Pasos exactos

```
1. Desactiva WiFi y datos móviles en el dispositivo del atleta
2. Abre la app → verifica que carga (usa datos cacheados)
3. Registra un check-in completo
4. Observa el banner superior derecho: debe decir "1 pendiente"
5. Registra también un RPE (sesión de prueba)
6. Banner debe decir "2 pendientes"
7. Reactiva WiFi
8. Pon la app en segundo plano y vuelve a abrirla (App → Background → Foreground)
9. Observa Toast: debe aparecer "2 registros sincronizados"
10. Abre Supabase Studio → tabla daily_wellness → confirma el registro existe
```

| Verificación | Esperado | Fallo |
|---|---|---|
| Banner "X pendientes" visible | Aparece al guardar offline | No aparece — el atleta no sabe si se guardó |
| Toast de sincronización | Verde al recuperar conexión | No aparece — datos perdidos silenciosamente |
| Datos en Supabase | Registro insertado correctamente | Fila ausente o duplicada |

> **⚠ Caso crítico:** Si un atleta entrena en un estadio sin señal (muy común en torneos), estos 10 minutos de prueba evitan pérdida de datos reales.

**Tiempo estimado:** 20 minutos

---

## PUNTO 3 — ACWR: Cálculo Correcto y Zonas de Riesgo

**Objetivo:** Verificar que el motor de cálculo es correcto y no produce NaN, Infinity, ni zonas erróneas.

### Escenario A — Atleta sin historial (primer día)

```
Crea una cuenta de atleta nueva.
Registra UN solo check-in + UN RPE (ej: RPE 13, 60 min = 780 UA)
Espera 30 segundos.
Abre "Mi Carga"
```

| Verificación | Esperado |
|---|---|
| ACWR mostrado | "—" o "0.00" con nota "Sin historial suficiente" |
| Zona mostrada | "Carga Baja" (azul) — nunca "Riesgo Alto" con un solo dato |
| Error en pantalla | Ninguno |

### Escenario B — Atleta con 3 días de gap (no registró)

```
En Supabase Studio, inserta manualmente en acwr_snapshots:
  - athlete_id: [ID del atleta de prueba]
  - date: hace 4 días (YYYY-MM-DD)
  - acwr_ratio: 1.12
  - risk_zone: 'optimal'
  - acute_load: 840, chronic_load: 750
Abre "Mi Carga" en la app
```

| Verificación | Esperado |
|---|---|
| Warning "Último registro hace 4 días" | Aparece banner amarillo | 
| ACWR sigue mostrando el valor guardado | 1.12, zona óptima |
| No hay NaN ni error de división | Pantalla funcional |

### Escenario C — ACWR en zona de riesgo → CTA activo

```
Inserta en acwr_snapshots:
  - acwr_ratio: 1.6, risk_zone: 'very_high'
Abre la app como ese atleta
```

| Pantalla | Debe aparecer |
|---|---|
| Check-in (Tab 1) | Banner rojo "🚨 Riesgo Muy Alto — ACWR 1.60" + botón "🛡️ Ver rutina de prevención" |
| Mi Carga (Tab 2) | Caja roja con descripción + botón "🛡️ Ver rutina de prevención" |
| Al tocar el botón | Navega al tab de Sesiones Preventivas |

**Tiempo estimado:** 25 minutos

---

## PUNTO 4 — Seguridad y Aislamiento de Datos

**Objetivo:** Garantizar que un atleta NUNCA puede ver datos de otro atleta, y que el profesional solo ve su equipo.

### Prueba de aislamiento atleta

```
Crea 2 atletas: AtletaA (en tu equipo) y AtletaB (sin equipo)
Como AtletaA: registra un check-in y un RPE
Como AtletaB: intenta ver los datos de AtletaA
```

| Verificación | Esperado | Fallo crítico |
|---|---|---|
| AtletaB ve sus propios datos | Solo pantalla vacía "Sin datos aún" | AtletaB ve datos de AtletaA |
| AtletaB no puede hacer query directo a la BD | RLS rechaza la consulta | Supabase retorna filas de otro atleta |

### Prueba de aislamiento profesional

```
Crea 2 profesionales: ProA (con equipo) y ProB (sin equipo)
Como ProA: crea sesión, registra datos
Como ProB: abre el dashboard web
```

| Verificación | Esperado |
|---|---|
| ProB ve dashboard vacío | "No tienes atletas registrados" |
| ProB no ve al equipo de ProA | Tabla vacía |

### Prueba de privacidad en URL

```
Como profesional autenticado, copia la URL del dashboard.
Abre en incógnito (sin sesión).
```

| Verificación | Esperado |
|---|---|
| Redirección automática | Redirige a `/login` |
| No se exponen datos | Página de login, sin datos del equipo |

> **Cómo verificar RLS directamente:** Abre Supabase Studio → SQL Editor → ejecuta:
> ```sql
> -- Simula el contexto de AtletaB
> SET LOCAL role = 'authenticated';
> SET LOCAL request.jwt.claims = '{"sub": "[ID_DE_ATLETAB]"}';
> SELECT * FROM daily_wellness; -- Debe retornar 0 filas
> ```

**Tiempo estimado:** 20 minutos

---

## PUNTO 5 — Flujo Completo de Extremo a Extremo (E2E)

**Objetivo:** Simular exactamente lo que hará un atleta real en su primer día de uso. Ejecutar **sin interrupciones**.

### El flujo completo (1 atleta, 1 profesional, 45 minutos)

```
PASO 1 — Setup (Profesional):
  a. Registrarse como profesional en la app móvil
  b. Crear un equipo: "Equipo Test" — Fútbol
  c. Ir al dashboard web → confirmar "0 atletas"

PASO 2 — Onboarding atleta:
  a. Registrarse como atleta en la app
  b. El profesional añade al atleta al equipo (desde la app o directamente en BD)
  c. El profesional crea una sesión de entrenamiento:
     Fecha: hoy, Duración: 75 min, Tipo: Físico, Fase: Competición

PASO 3 — Registro del atleta (simular día real):
  a. Atleta abre la app → Tab "Check-in Diario"
  b. Registra: Fatiga 6, Sueño 7.5h, Calidad 4/5, Ánimo 4/5
  c. Toca "Registrar Check-in" → toast verde aparece
  d. Toca el atajo "⚡ Registrar RPE"
  e. Selecciona la sesión de 75 min → RPE 14
  f. Confirma → sRPE = 1050 UA → toast verde
  g. Toca "🩹 Registrar Dolor" → EVA 2, tobillo derecho, post-sesión
  h. Guarda → toast verde

PASO 4 — Vista del profesional (web):
  a. Abre el dashboard web
  b. Verifica que el atleta aparece en la tabla con ACWR calculado
  c. ACWR debe ser 0.00 o "—" (primer día, sin historial)
  d. EVA 2/10 → semáforo verde ✓
  e. Abre "Análisis de Carga" → selecciona el atleta → gráficas visibles
  f. Abre "Prevención" → tab Overview → atleta aparece en tabla SMCP

PASO 5 — Sesión preventiva:
  a. Profesional crea sesión preventiva en móvil:
     Título: "Prevención tobillo", Atleta: el de prueba, 2 ejercicios del catálogo
  b. Atleta abre Tab "Mis Sesiones Preventivas"
  c. Sesión aparece como "PENDIENTE"
  d. Expande → ve los 2 ejercicios con series/reps
  e. Toca "✓ Marcar como Completada" → confirma
  f. Sesión pasa a "COMPLETADAS" con fecha y hora
  g. Profesional en web (Prevención → Sesiones) → ve "1/1 (100%)" en barra de progreso
```

### Criterios de aprobación

| Paso | Criterio de éxito |
|------|------------------|
| 3c | Toast verde visible y desaparece en ~3.5s |
| 3f | sRPE = exactamente **1050** UA |
| 4b | El atleta aparece en el dashboard sin recargar manualmente |
| 4c | ACWR no es NaN, no es Infinity, no es negativo |
| 5c | La sesión preventiva aparece sin refrescar la app |
| 5g | La barra de progreso web se actualiza al recargar la página |

> **Si algún criterio falla:** No des acceso a los atletas reales hasta resolver el bloqueo.

**Tiempo estimado:** 45 minutos

---

## Resumen de Tiempos

| Punto | Descripción | Tiempo |
|-------|-------------|--------|
| 1 | Validaciones de entrada | 15 min |
| 2 | Prueba offline | 20 min |
| 3 | ACWR y zonas de riesgo | 25 min |
| 4 | Seguridad y aislamiento | 20 min |
| 5 | Flujo E2E completo | 45 min |
| **Total** | | **~2 horas** |

---

## Antes de Dar Acceso — Confirmaciones Finales

- [ ] Variables de entorno `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` están configuradas en la build de producción (no en `.env.local` del dev)
- [ ] La Edge Function `calculate-acwr` está desplegada: `supabase functions deploy calculate-acwr`
- [ ] La migración `001_initial_schema.sql` está aplicada en el proyecto de Supabase de producción
- [ ] Los 8 ejercicios del catálogo están insertados (seed data al final de la migración)
- [ ] El plan de Supabase tiene capacidad suficiente para 10 atletas haciendo check-in diario (~300 rows/mes)
- [ ] Tienes una forma de contactar a los 10 atletas si detectas un error crítico (WhatsApp / grupo)
- [ ] Un profesional de prueba tiene cuenta activa y puede ver el dashboard web en producción

---

*Generado automáticamente por Vitatekh QA Suite — Abril 2026*
