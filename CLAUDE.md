@AGENTS.md

# FORGE — how to work in this repo

FORGE is a mobile app for makers (robots, drones, synths, CNC machines, solar rigs). You say what you're building, AI drafts areas and tasks around the parts you already own, and the build appears as a folder on Home and a living blueprint. Expo SDK 57, React Native 0.86, expo-router, Reanimated 4, RevenueCat.

The owner is learning. After each change, explain what you did in plain words. Keep code comments in the same plain style as the existing files: they explain *why*, not just what.

## Ground rules

- Work only in `src/`, `app.json` and `package.json` unless the owner asks otherwise. Don't touch `.env`, `sql/`, or any server or backend folder.
- Don't commit, push, deploy, run EAS builds or run database commands. The owner does those.
- Small, safe changes. Fix what's broken; don't redesign or refactor screens that work.
- After every change, `npx tsc --noEmit` must pass.
- Don't add dependencies without asking. The app is tested in **Expo Go** on an iPhone, and a new native package does nothing there.
- No web platform. Don't add `web` to `app.json`.

## Things that bite in this codebase

- **Native modules must be optional.** Before `require()`-ing a package that has native code, check the native half exists with `requireOptionalNativeModule('ModuleName')` from `'expo'` (see `loadSpeech` in `src/components/voice.tsx`). A try/catch around `require()` is NOT enough: in development, React Native shows a module that fails while loading as a red screen even inside a try. RevenueCat is the exception: it detects Expo Go by itself and runs its Test Store in "browser mode".
- **Colours are live.** `colors` in `src/theme.ts` is one object whose values are swapped in place when light/dark changes, and every screen remounts (`key={mode}` in `src/app/_layout.tsx`). Always read `colors.x` during render; never copy a colour into a module-level constant. Use the helpers `ink()`, `tint()`, `shade()`, `withAlpha()`, `keyboard()` and the `shared.*` styles.
- **Type** comes from `type.*` in `src/theme.ts`: Doto (dot-matrix) for headings, labels and numbers; Quicksand for anything read word by word.
- **Motion** uses the curves in `src/lib/motion.ts`. Tappable things use `Press` from `src/components/ui.tsx` (squeezes under the thumb) plus a haptic from `src/lib/haptics.ts`.
- `experimental_backgroundImage` gradients draw on phones but not in a browser, so keep a solid `backgroundColor` under them.

## Map

- `src/app/_layout.tsx`: fonts, sign-in state, RevenueCat setup, light/dark, and the one bottom nav drawn over Home and Settings.
- `src/app/home.tsx`: greeting and the sun/moon switch, search (builds, areas, tasks), NEXT UP (the step the user pinned themselves), the staggered two-column folder grid, the empty state.
- `src/app/new-project.tsx`: a new build (the nav's **+**). Name, icon, goal, parts you have, then ✦ DRAFT MY PLAN. The AI's draft opens in the YOUR PLAN sheet (`PlanReview`, ending in CREATE BUILD). A free account's 4th build goes to the paywall, carrying the half-made build with it.
- `src/components/voice.tsx`: "Say it out loud". **Switched off for now**: nothing imports it. Don't wire it back in unless the owner asks.
- `src/app/project/[id].tsx`: one build, with OVERVIEW / BLUEPRINT / TASKS tabs.
- `src/app/area/[id].tsx`: one area's tasks. Tick, swipe to delete with undo.
- `src/app/paywall.tsx`, `src/lib/pro.ts`: FORGE Pro through RevenueCat (`pro` entitlement, 3 free builds).
- `src/lib/appearance.tsx`: light/dark, saved on the phone. The "rain" switch snapshots the screen with `captureScreen` from react-native-view-shot.
- `src/lib/projects.ts`: every data read and write. `src/lib/ai.ts`: the AI planner client.
- `src/components/bottom-nav.tsx`: HOME bubble · orange + · SETTINGS, the same on iPhone and Android.
- Design reference: the owner's "FORGE Advert Stills" (dark and light Home, the voice sheet, YOUR PLAN, blueprint, area, search, the rain wipe).
