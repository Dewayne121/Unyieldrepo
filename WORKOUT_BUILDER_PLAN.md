# Plan: Replace Personal Logs with Workout Builder

## Overview
Replace the current single-exercise personal log modal with a full **Workout Builder** system supporting templates, multi-exercise sessions, and set-by-set tracking.

## Current State (TrainingReportScreen.js)
- Single exercise per log entry
- Simple modal with exercise selector, reps input, weight input
- Logs stored flat in `logs` array with `type: 'personal'`
- No set tracking, no templates, no session grouping

## Target State (Workout Builder)

### New Data Models

```javascript
// WorkoutTemplate - Reusable workout definition
{
  id, userId, name, description,
  exercises: [{
    id, exerciseId, orderIndex,
    trackingType,          // 'strength' | 'time' | 'distance'
    defaultSets,           // e.g., 3
    targetRepRange,        // e.g., "8-10"
    restSeconds,           // optional
    notes
  }],
  createdAt, updatedAt
}

// WorkoutSession - Performed instance of a template
{
  id, userId, templateId,  // null for ad-hoc sessions
  startedAt, finishedAt,
  status: 'draft' | 'complete',
  name, notes,
  exercises: [{
    id, exerciseId, orderIndex, trackingType,
    sets: [{
      id, setNumber, reps, weight,
      durationSeconds, distance,
      completed: false,
      notes
    }]
  }]
}
```

### New Screens to Create

| Screen | Purpose | Navigation |
|--------|---------|------------|
| `WorkoutHomeScreen.js` | List templates + recent sessions | Tab: "Training" |
| `TemplateBuilderScreen.js` | Create/edit workout templates | Stack: push from Home |
| `ActiveSessionScreen.js` | Active workout with set entry | Stack: push from Home |
| `SessionHistoryScreen.js` | View past sessions | Stack: push from Home |
| `SessionDetailScreen.js` | View completed session | Stack: push from History |

### New Context

```javascript
// WorkoutContext.js
{
  templates, sessions, activeSession,
  createTemplate, updateTemplate, deleteTemplate, duplicateTemplate,
  startSession, updateSet, finishSession, deleteSession
}
```

---

## Implementation Steps

### Step 1: Create WorkoutContext
**File:** `src/context/WorkoutContext.js`

- State: `templates`, `sessions`, `activeSession`
- Methods: CRUD for templates and sessions
- AsyncStorage persistence: `unyield_templates`, `unyield_sessions`
- Sync with backend API (new endpoints)

### Step 2: Create WorkoutHomeScreen (Replace TrainingReportScreen)
**File:** `src/screens/WorkoutHomeScreen.js`

**Sections:**
1. Quick Actions: "Start Empty Workout", "Create Template"
2. My Templates (horizontal scroll)
3. Recent Sessions (list)

**Navigation:**
- Tap template → Start session
- Long press template → Edit/Delete
- "Create Template" → TemplateBuilderScreen

### Step 3: Create TemplateBuilderScreen
**File:** `src/screens/TemplateBuilderScreen.js`

**Features:**
- Template name input
- Add exercises from library (search + filter)
- Configure per-exercise:
  - Tracking type (strength/time/distance)
  - Default sets
  - Target rep range
  - Rest timer
- Reorder exercises (drag handle)
- Save/Delete buttons

### Step 4: Create ActiveSessionScreen
**File:** `src/screens/ActiveSessionScreen.js`

**Features:**
- Header: Template name, **elapsed timer**, "Finish" button
- Exercise cards (one per exercise in template)
- Each card shows:
  - Exercise name
  - Set rows: [Set #] [Reps] [Weight] [Complete checkbox]
  - "Add Set" button
- Mark sets complete as you go
- **Rest timer** (optional) after completing a set
- Autosave draft
- Finish → Session summary modal

### Step 5: Create SessionHistoryScreen & SessionDetailScreen
**File:** `src/screens/SessionHistoryScreen.js`
**File:** `src/screens/SessionDetailScreen.js`

**History Screen:**
- List of completed sessions grouped by date
- Each shows: name, date, total volume, exercise count
- Tap → SessionDetailScreen

**Detail Screen:**
- Session info (date, duration, total volume)
- Per-exercise breakdown with all sets

### Step 6: Update Navigation
**File:** `src/navigation/AppNavigator.js`

Create nested stack for Training tab:
```javascript
import TrainingNavigator from './TrainingNavigator';

<Tab.Screen name="Training" component={TrainingNavigator} />
```

**New file:** `src/navigation/TrainingNavigator.js`
```javascript
<Stack.Navigator>
  <Stack.Screen name="WorkoutHome" component={WorkoutHomeScreen} />
  <Stack.Screen name="TemplateBuilder" component={TemplateBuilderScreen} />
  <Stack.Screen name="ActiveSession" component={ActiveSessionScreen} />
  <Stack.Screen name="SessionHistory" component={SessionHistoryScreen} />
  <Stack.Screen name="SessionDetail" component={SessionDetailScreen} />
</Stack.Navigator>
```

### Step 7: Backend API Integration
**File:** `src/services/api.js`

Add new methods:
```javascript
async getTemplates() { ... }
async createTemplate(template) { ... }
async updateTemplate(id, template) { ... }
async deleteTemplate(id) { ... }
async getSessions() { ... }
async startSession(session) { ... }
async updateSession(id, session) { ... }
async finishSession(id) { ... }
```

**Backend routes to add** (future work):
- GET/POST/PATCH/DELETE `/api/workout-templates`
- GET/POST/PATCH `/api/workout-sessions`

### Step 8: Data Migration
**Action:** Deprecate old personal logs (user choice: "Hide old logs")

```javascript
// Old TrainingReportScreen to be removed
// Old personal logs remain in storage but not displayed
// New WorkoutHomeScreen shows only new workout sessions
```

---

## File Changes Summary

### New Files to Create
```
src/context/WorkoutContext.js
src/navigation/TrainingNavigator.js
src/screens/WorkoutHomeScreen.js
src/screens/TemplateBuilderScreen.js
src/screens/ActiveSessionScreen.js
src/screens/SessionHistoryScreen.js
src/screens/SessionDetailScreen.js
src/components/ExerciseCard.js
src/components/SetRow.js
src/components/TemplateExerciseItem.js
```

### Files to Modify
```
src/navigation/AppNavigator.js (add TrainingNavigator)
src/services/api.js (add template/session methods)
src/context/AppContext.js (optional: migrate legacy logs)
```

### Files to Deprecate
```
src/screens/TrainingReportScreen.js (legacy, can delete later)
```

---

## UI/UX Patterns

### Common Components to Create

**ExerciseCard.js**
- Shows exercise name, category icon
- Expandable to show sets
- Used in: ActiveSessionScreen, SessionDetailScreen

**SetRow.js**
- Inputs for: set number, reps, weight, complete checkbox
- Used in: ActiveSessionScreen, TemplateBuilderScreen

**TemplateExerciseItem.js**
- Drag handle, exercise name, config icon
- Used in: TemplateBuilderScreen

### Screen Header Pattern
Use existing `ScreenHeader` component:
```javascript
<ScreenHeader
  title="WORKOUTS"
  subtitle="Templates & Sessions"
  rightAction={<AddButton />}
/>
```

---

## Acceptance Criteria

1. ✅ Create workout templates with multiple exercises
2. ✅ Start a workout session from a template
3. ✅ Log multiple sets per exercise (reps + weight)
4. ✅ Mark sets as complete during workout
5. ✅ Finish workout and see summary
6. ✅ View past sessions with full details
7. ✅ Edit/delete templates
8. ✅ Ad-hoc sessions (start without template)
9. ✅ Autosave draft sessions
10. ✅ Elapsed timer tracks workout duration
11. ✅ Rest timer between sets (optional)

---

## Implementation Order

1. WorkoutContext (state management foundation)
2. WorkoutHomeScreen (main entry point)
3. TemplateBuilderScreen (template creation)
4. ActiveSessionScreen (core workout logging)
5. SessionHistoryScreen + Detail (view past data)
6. TrainingNavigator (navigation wiring)
7. Backend API integration (future)
8. Testing & polish

---

## User Decisions (Confirmed)

1. **Sync Strategy:** Local first, sync on demand
   - Store in AsyncStorage immediately
   - Backend sync to be implemented later (separate task)

2. **Timer Features:** Both elapsed + rest timers
   - ActiveSessionScreen tracks total workout duration
   - Optional rest timer between sets

3. **Legacy Data:** Hide old logs
   - Existing personal logs will be deprecated
   - Only new workout sessions will be visible
