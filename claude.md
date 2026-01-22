# Project Source of Truth

This file serves as the single source of truth for the **UNYIELD** project to prevent hallucinations and maintain accurate context.

---

## Project Overview

**Name:** UNYIELD

**Purpose:** Enforce **honest, realistic workout logging** through video verification so that progress metrics (levels/points/streaks) remain meaningful, and training decisions can be made from accurate data.

**Tech Stack:**
- React Native 0.81.5 with React 19.1.0
- Expo SDK ~54.0.30
- JavaScript/JSX
- REST API backend (`https://unyield-main.onrender.com`)
- JWT authentication
- AsyncStorage for local persistence

---

## Important Facts

### Core Principles

1. **Data integrity over optics**
   - Logging unrealistic numbers makes points/levels/streaks **meaningless** and breaks progress tracking.

2. **Realistic validation**
   - A system that accepts implausible training logs without challenge will produce unreliable analytics and incentives.
   - Entries like "2000 reps × 100kg" should be treated as invalid, rejected, flagged, or quarantined.

3. **Measure what happened**
   - Training can only improve if logs reflect **what was actually performed**.
   - "Gamification" must be downstream of truthful inputs, not a substitute for them.

4. **Consistency beats fantasy**
   - Progress is driven by consistent, repeatable training and accurate recording, not inflated numbers.

5. **Video verification for competition**
   - Competition workout logs require video evidence (min 5 seconds) for admin verification.
   - Status tracking: pending, approved, rejected.

### Validation Limits (Verified from AppContext.js)

- `MAX_REPS = 2000`
- `MAX_WEIGHT_KG = 1000`
- `MAX_WEIGHT_LBS = 2200`

---

## Architecture

### Project Structure

```
UNYIELDINGGITHUB/
├── App.js                          # Root app component with provider hierarchy
├── index.js                        # Entry point
├── app.json                        # Expo configuration
├── assets/                         # Images (hoodie rewards, icons, splash)
├── src/
│   ├── components/                 # Reusable UI components
│   │   ├── common.js               # Common shared components
│   │   ├── GlobalHeader.jsx        # Header shown on dashboard
│   │   ├── ScreenHeader.jsx        # Standard screen headers
│   │   └── onboarding/             # Onboarding-specific components
│   ├── constants/
│   │   └── colors.js               # Theme/skin definitions, spacing, typography
│   ├── context/                    # React Context providers
│   │   ├── AppContext.js           # Main app state (user, logs, settings)
│   │   ├── AuthContext.jsx         # Authentication state & methods
│   │   ├── ThemeContext.js         # Theme/skin management
│   │   └── StreamlinedOnboardingContext.jsx  # Current onboarding flow
│   ├── navigation/
│   │   └── AppNavigator.js         # Main navigation structure
│   ├── screens/                    # Screen components
│   │   ├── admin/                  # Admin dashboard screens
│   │   ├── onboarding/streamlined/ # Onboarding flow screens
│   │   ├── DashboardScreen.js
│   │   ├── ProfileScreen.js
│   │   ├── LeaderboardScreen.js
│   │   ├── WorkoutSubmitScreen.js  # Competition workout logging with video
│   │   ├── WorkoutSummaryScreen.js
│   │   ├── TrainingReportScreen.js # Personal training log & analytics
│   │   ├── WelcomeScreen.js
│   │   ├── SplashScreen.js
│   │   ├── ChallengeScreen.js
│   │   ├── PrizesScreen.js
│   │   └── NotificationsScreen.js
│   ├── services/
│   │   └── api.js                  # API service layer
│   └── utils/
│       └── mockData.js             # Mock data for development
└── unyieldserver/                  # Backend directory (separate)
```

### Provider Hierarchy (App.js)

```
SafeAreaProvider
  └── ThemeProvider
      └── AuthProvider
          └── AppProvider
              └── StreamlinedOnboardingProvider
                  └── AppNavigator (NavigationContainer)
```

### Navigation Structure

**Stack Navigator** with conditional rendering:

1. **Auth Flow** - If not authenticated: `WelcomeScreen`
2. **Onboarding** - If authenticated but onboarding incomplete: `StreamlinedOnboardingNavigator`
3. **Main App** - If authenticated and onboarding complete: `Tabs` (Bottom Tab Navigator)

**Tab Navigator (5 tabs):**
- `Base` → DashboardScreen
- `Training` → TrainingReportScreen
- `Log` → Placeholder (center button triggers modal)
- `Leagues` → LeaderboardScreen
- `Stats` → ProfileScreen

**Modal Routes:**
- `LogModal` → WorkoutSubmitScreen (full-screen modal for video logging)
- `WorkoutSummary` → WorkoutSummaryScreen
- `Profile` → ProfileScreen (view any user)

---

## Key Files

| File | Purpose |
|------|---------|
| `index.js` | App entry point |
| `App.js` | Provider setup & root component |
| `app.json` | Expo configuration |
| `package.json` | Dependencies |
| `src/constants/colors.js` | Theming (3 skins: minimal, operator, midnight) |
| `src/services/api.js` | API client with all endpoints |
| `src/context/AppContext.js` | App state (user, logs, weightUnit, exercises) |
| `src/context/AuthContext.jsx` | Authentication (JWT, sign in/up, anonymous) |
| `src/context/ThemeContext.js` | Theme/skin management |
| `src/navigation/AppNavigator.js` | Main navigation structure |
| `src/screens/DashboardScreen.js` | Home/overview screen |
| `src/screens/WorkoutSubmitScreen.js` | Competition workout logging with video |
| `src/screens/TrainingReportScreen.js` | Personal training log & analytics |
| `src/screens/ProfileScreen.js` | User profile & settings |

---

## Data Models

### User Model
```javascript
{
  _id, id,
  username, name,
  email,
  profileImage,      // base64 string
  bio,
  region,            // Global, London, Manchester, etc.
  goal,              // Hypertrophy, Leanness, Performance
  fitnessLevel,      // beginner, intermediate, advanced, elite
  workoutFrequency,  // 1-2, 3-4, 5-6, 7
  preferredDays,     // ['Mon', 'Wed', 'Fri']
  weight, height, age,
  totalPoints,
  rank,              // calculated position
  streak, streakBest,
  logs,              // array of workout logs
  accolades,         // ['admin', 'staff', 'beta', 'verified_athlete', 'founding_member', 'community_support']
  createdAt
}
```

### Workout Log Model
```javascript
{
  id,
  exercise,          // exercise name (100+ exercises available)
  reps,
  weight,            // stored internally in kg
  duration,          // for cardio
  points,            // calculated based on intensity × reps × weight × streak
  date,              // ISO timestamp
  type,              // 'competition' | 'personal'
  videoUri,          // local path
  serverId,          // server video ID
  status,            // 'pending' | 'approved' | 'rejected'
  rejectionReason,
  verifiedByName,
  canAppeal
}
```

### League System (8 tiers)
| League | Min Points |
|--------|------------|
| IRON | 0 |
| BRONZE | 100 |
| SILVER | 400 |
| GOLD | 800 |
| PLATINUM | 1500 |
| DIAMOND | 2500 |
| ELITE | 5000 |
| UNYIELD | 10000 |

### Rank System (7 ranks)
| Rank | XP Required |
|------|-------------|
| INITIATE | 0 |
| ROOKIE | 500 |
| OPERATOR | 1500 |
| VETERAN | 3500 |
| ELITE | 7500 |
| COMMANDER | 15000 |
| LEGEND | 30000 |

---

## Features

### Core Features

**1. Two Types of Workout Logging:**

- **Competition Logs** (WorkoutSubmitScreen)
  - Requires video recording (min 5 seconds)
  - Exercise selection from 100+ exercises
  - Reps and weight input
  - Video uploaded to server for verification
  - Status: pending → approved/rejected
  - Appeals system for rejected videos

- **Personal Logs** (TrainingReportScreen)
  - No video required
  - For tracking personal training sessions
  - Separately tagged in UI

**2. Gamification:**
- Points calculated based on: exercise intensity × reps × weight × streak multiplier
- 7 ranks (INITIATE → LEGEND) based on total XP
- Daily streak tracking with best streak
- 8 leagues (IRON → UNYIELD) based on total points
- Leaderboards: All-time and weekly rankings by region

**3. Profile System:**
- Display name, username, bio
- Profile image (base64 encoded)
- Accolades/badges (Admin, Staff, Beta Tester, Verified Athlete, Founding Member, Community Support)
- Body metrics (weight, height, age)
- Fitness level, workout frequency, preferred days
- Goal selection (Hypertrophy, Leanness, Performance)
- Region selection

**4. Onboarding Flow (Streamlined):**
1. Entry (Sign up/Guest/Sign in)
2. Profile Setup (name, photo)
3. Goal Selection
4. Experience Level
5. Body Profile (age, height)
6. Training Availability (days per week)
7. Plan Preview

**5. Admin Dashboard:**
- User management
- Video moderation queue (pending → approve/reject)
- Appeals management
- Reports management
- Analytics

**6. Other Features:**
- Challenges (join/leave)
- Notifications
- Prizes/rewards
- Weight unit toggle (kg/lbs)

---

## API Endpoints

**Base URL:** `https://unyield-main.onrender.com`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/register` | Sign up |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/anonymous` | Guest login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/auth/check-username/:username` | Check username availability |
| GET | `/api/users/profile` | Get profile |
| PATCH | `/api/users/profile` | Update profile |
| DELETE | `/api/users/account` | Delete account |
| GET | `/api/workouts` | Get workouts |
| POST | `/api/workouts` | Log workout |
| DELETE | `/api/workouts/:id` | Delete workout |
| GET | `/api/leaderboard` | Get leaderboard |
| GET | `/api/videos` | Get user's videos |
| POST | `/api/videos/upload` | Upload video file |
| POST | `/api/videos` | Submit video metadata |
| GET | `/api/videos/queue` | Get verification queue (admin) |
| POST | `/api/videos/:id/verify` | Verify/reject video |
| POST | `/api/videos/:id/appeal` | Appeal rejection |
| GET | `/api/videos/appeals/queue` | Get appeals queue (admin) |
| GET | `/api/challenges` | Get challenges |
| GET | `/api/notifications` | Get notifications |

---

## State Management

**Context-based state management:**

| Context | Hook | State | Methods |
|---------|------|-------|---------|
| `AppContext` | `useApp()` | user, logs, weightUnit, isReady | addLog, deleteLog, updateUser, onboardingComplete, toggleWeightUnit |
| `AuthContext` | `useAuth()` | user, loading, error, onboardingCompleted | signInWithEmail, signUpWithEmail, signInAnonymous, signOut, deleteAccount, updateUserProfile |
| `ThemeContext` | `useTheme()` | skin, theme | setSkin |
| `StreamlinedOnboardingContext` | `useStreamlinedOnboarding()` | currentStepIndex, onboardingData | updateStepData, goToNextStep, completeOnboarding |

**Local Storage Keys:**
- `unyield_auth_token` - JWT token
- `unyield_user` - User data
- `unyield_logs` - Workout logs backup
- `unyield_skin` - Theme preference
- `unyield_workout_videos` - Local video cache
- `unyield_weight_unit` - Weight unit preference (kg/lbs)
- `@unyield_streamlined_onboarding_*` - Onboarding state

---

## Critical Workflows

### Workout Logging Workflow (Competition)

1. User taps center (+) button → Opens LogModal (WorkoutSubmitScreen)
2. User records video (min 5 seconds required)
3. User selects exercise from 100+ options
4. User enters reps and weight
5. User submits:
   - Video uploaded to server
   - Metadata sent (exercise, reps, weight)
   - Status set to `pending`
   - Points calculated but held until verification
6. Admin reviews video in moderation queue:
   - **Approve** → Status becomes `approved`, points awarded
   - **Reject** → Status becomes `rejected`, points not awarded, user can appeal
7. WorkoutSummary shown after submission

### Authentication Flow

```
SplashScreen → [Not Authenticated] → WelcomeScreen
              ↓ [Authenticated but onboarding incomplete]
              → StreamlinedOnboardingNavigator
              ↓ [Authenticated + onboarding complete]
              → Main Tabs
```

---

## Theme/Skin System

Three skins available (all dark themes with dull red accent):

| Skin | Name | Colors |
|------|------|--------|
| `minimal` | Premium Black | Dark background |
| `operator` | Dark Premium | Default theme |
| `midnight` | Premium Black | Dark background |

**Common theme colors:**
- Primary: `#9b2c2c` (dull red)
- Background: `#050505` / `#0a0a0a`
- Danger: `#ff003c`
- Gold: `#d4af37` / `#ffd700`

---

## Exercise Catalog

100+ exercises across categories: chest, back, shoulders, arms, legs, core, cardio, compound

Each exercise has:
- `id` - Unique identifier
- `name` - Display name
- `intensity` - Multiplier for points calculation
- `category` - Exercise category

---

## Instructions for Maintaining This File

1. **Only add facts that have been verified** through code inspection or user confirmation.
2. **Update this file when making significant changes** to architecture or structure.
3. **Reference this file** when making decisions to ensure consistency.
4. **Mark uncertain information** as `[To be verified]` until confirmed.
5. **This file is the source of truth** - do not rely on memory when implementing features.

# Patch Update

## Status: ✅ APPLIED

## Summary
XP progression has been adjusted so that **only Competition Logs** grant XP. **Personal Logs** no longer grant XP.

---

## Changes Applied

### XP & Progression
- ✅ **Competition Logs now exclusively grant XP**
  - Any log categorized as a Competition Log will award XP as normal.
- ✅ **Personal Logs no longer grant XP**
  - Any log categorized as a Personal Log will award **0 XP**.

---

## Implementation

### Files Modified
- `src/screens/TrainingReportScreen.js` (lines ~189-214)
  - Personal logs now set `points = 0` instead of calculating XP
  - Success message updated to: "Personal log added! No XP awarded (competition logs only)"
  - Modal info text updated to clarify the policy

### Log Type Rules
- **Competition Log** (WorkoutSubmitScreen)
  - Requires video evidence
  - Awards XP (per existing XP rules)
- **Personal Log** (TrainingReportScreen)
  - No video required
  - Awards **0 XP**

### UI/UX Changes
- Personal log creation shows: "Personal log added! No XP awarded (competition logs only)"
- Modal info text: "Personal logs track your training without XP. Competition logs (with video) award XP."

---

## Acceptance Criteria
- ✅ Creating/saving a **Personal Log** results in **no XP change**.
- ✅ Creating/saving a **Competition Log** results in **XP increase** based on current XP rules.
- ✅ UI messages correctly indicate XP is only for competition logs.

---
# Patch Update: Workout Builder Revamp

## Summary
The workout logging flow is rebuilt around **Workout Templates + Workout Sessions**. Users can now **create workouts**, **add exercises**, and **enter sets/reps/weight/time** directly within the workout session. This replaces the prior “single log entry” style flow and becomes the primary method of recording training data.

---

## Key Concepts

### Workout Template
A reusable workout definition (e.g., “Upper Body A”) containing an ordered list of exercises and default fields.

### Workout Session
A performed instance of a workout template on a specific date/time where the user enters actual results (sets, reps, load, duration, notes).

### Exercise Library Item
Canonical exercise definition (name, category, equipment, tracking type). Templates reference these.

---

## Changes

## 1) New Workout Builder
- ✅ Create, edit, duplicate, delete **Workout Templates**
- ✅ Add exercises to templates from:
  - Exercise Library (search + filter)
  - Custom exercise creation (user-defined)
- ✅ Reorder exercises within a template (drag/drop)
- ✅ Configure defaults per exercise within the template:
  - tracking type (strength / time / distance / rounds / bodyweight)
  - default sets
  - target rep range / target time
  - rest timer (optional)
  - notes / cues (optional)

---

## 2) New Data Entry Flow (Session-Based Logging)
- ✅ Start a **Workout Session** from a template
- ✅ Enter results exercise-by-exercise:
  - Sets: reps + weight (or reps only for bodyweight)
  - Time: duration + optional intensity
  - Distance: distance + time
  - Rounds: rounds + optional time
- ✅ Add/remove sets during the session
- ✅ Mark sets as completed
- ✅ Session autosave (draft) + explicit “Finish Workout”
- ✅ Session summary at end:
  - total volume (if applicable)
  - duration
  - PR highlights (optional)

---

## 3) Replace / Deprecate Current Implementation
- ❌ Current log-entry implementation is deprecated for workout tracking.
- ✅ Existing logs remain viewable (read-only) and are mapped to the closest compatible view:
  - If an old log contains exercise-like data, it displays as a “Legacy Session”.
  - If it does not, it remains as a general activity log.

---

## Data Model (Revamped)

### WorkoutTemplate
- id
- userId
- name
- description (optional)
- exercises: [WorkoutTemplateExercise]
- createdAt, updatedAt

### WorkoutTemplateExercise
- id
- templateId
- exerciseId (or customExerciseId)
- orderIndex
- trackingType
- defaultSets (optional)
- targetRange (optional)
- restSeconds (optional)
- notes (optional)

### WorkoutSession
- id
- userId
- templateId (optional; sessions can be ad-hoc)
- startedAt, finishedAt
- status: draft | complete
- exercises: [WorkoutSessionExercise]
- notes (optional)

### WorkoutSessionExercise
- id
- sessionId
- exerciseId (or customExerciseId)
- orderIndex
- trackingType
- sets: [SetEntry] (nullable for non-strength)

### SetEntry
- id
- sessionExerciseId
- setNumber
- reps (optional)
- weight (optional)
- durationSeconds (optional)
- distance (optional)
- completed: boolean
- rpe (optional)
- notes (optional)

---

## UI/UX Requirements

### Navigation
- “Workouts” tab:
  - Templates list (create/edit/duplicate)
  - Start button to launch a session
- “Active Session” screen:
  - Exercise cards
  - Add set, edit set inline
  - Rest timer (optional)
  - Finish Workout button
- “History”:
  - Completed sessions grouped by date
  - Session detail view with per-exercise breakdown

### Fast Entry
- Inline numeric keyboard focus
- “Copy last session values” (optional)
- Default sets pre-filled from template

---

## Migration Notes
- No destructive migration required.
- Keep l
