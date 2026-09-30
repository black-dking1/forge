/**
 * Voice input — "Say it out loud."
 *
 * The inside of the voice sheet on the New Build screen. You tap the
 * mic and describe your build: its name, what it does, the parts you
 * already have. The words appear as you speak, and the dot waveform
 * moves with your voice. Tap PLAN IT and one AI call turns what you
 * said into a name, a goal, a parts list and a whole plan
 * (draftFromSpeech in lib/ai.ts).
 *
 * The listening itself is done by the phone's own speech recogniser,
 * through the expo-speech-recognition package: Google's on Android,
 * Apple's on iPhone. FORGE never records or keeps the audio.
 *
 * WHY THE PACKAGE IS LOADED WITH require() INSIDE A try
 * It's native code, so it only exists in a FORGE build made after it
 * was added. On an older build (or in Expo Go) the import would crash
 * the whole app. Instead, the sheet falls back to the phone keyboard's
 * own dictation mic: tap FORGE's mic, the keyboard opens, tap the mic
 * on the keyboard and talk. Same sheet, same plan at the end.
 *
 * In that keyboard mode FORGE can't hear your voice itself, so the
 * rings and the waveform follow the words instead: they start when the
 * keyboard's dictation sends its first words, move while more keep
 * arriving, and settle into a flat line when you pause. Tap FORGE's mic
 * again (or Done) to close the keyboard and see BUILD MY PLAN.
 */

import { useEffect, useRef, useState, type RefObject } from 'react';
import { requireOptionalNativeModule } from 'expo';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import type {
  ExpoSpeechRecognitionErrorEvent,
  ExpoSpeechRecognitionModule as SpeechModuleValue,
  ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';
import { colors, keyboard, shared, space, tint, type } from '../theme';
import { curve } from '../lib/motion';
import { haptic } from '../lib/haptics';
import { DotIcon } from './icons';
import { LinkButton, PrimaryButton } from './ui';

type SpeechModule = typeof SpeechModuleValue;

function loadSpeech(): SpeechModule | null {
  // Ask first whether the native half exists. In Expo Go (or an older
  // build) it doesn't, and the package itself would throw on load — and
  // in development React Native reports that as a red-screen crash even
  // inside a try. requireOptionalNativeModule just answers null instead.
  if (Platform.OS !== 'web' && !requireOptionalNativeModule('ExpoSpeechRecognition')) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-speech-recognition').ExpoSpeechRecognitionModule as SpeechModule;
  } catch {
    return null;
  }
}

// Words the recogniser should expect from people who build things.
const MAKER_WORDS = [
  'Arduino', 'Arduino Mega', 'Arduino Uno', 'ESP32', 'ESP8266', 'Raspberry Pi', 'LiPo', 'servo', 'servos',
  'stepper', 'hexapod', 'breadboard', 'MOSFET', 'L298N', 'buck converter', 'IMU', 'PCB', 'CNC', 'FPV',
];

// On Android 13+ the recogniser can keep listening through pauses
// ("Hexapod. … 18 servos…"). Older Androids stop at the first pause.
const CONTINUOUS = Platform.OS === 'ios' || (Platform.OS === 'android' && Number(Platform.Version) >= 33);

const COLUMNS = 31; // the dot waveform's width, in columns (the design's 248px)
const MAX_SECONDS = 45; // stop listening after this long, whatever happens

type Phase = 'idle' | 'listening' | 'done';

const ERRORS: Record<string, string> = {
  'not-allowed': 'FORGE needs the microphone to hear you. Allow it in your phone’s settings, then try again.',
  'no-speech': 'Didn’t catch that. Tap the mic and try again.',
  'speech-timeout': 'Didn’t catch that. Tap the mic and try again.',
  nomatch: 'Didn’t catch that. Tap the mic and try again.',
  network: 'Voice needs an internet connection on this phone.',
  'service-not-allowed': 'This phone has no speech service turned on. You can type it instead.',
  'language-not-supported': 'This phone can’t recognise English speech yet. You can type it instead.',
  busy: 'The phone’s speech service is busy. Try again in a moment.',
};

export function VoicePanel({
  onPlan,
  busy,
  error: planError,
  onType,
}: {
  /** Called with what was said when you tap BUILD MY PLAN. */
  onPlan: (said: string) => void;
  /** true while the AI is drafting the plan */
  busy: boolean;
  /** a message from the AI step, if it failed */
  error: string | null;
  /** "Type it instead": close the sheet and use the form */
  onType?: () => void;
}) {
  const [speech] = useState(loadSpeech);
  const [phase, setPhase] = useState<Phase>('idle');
  const [text, setText] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [levels, setLevels] = useState<number[]>(() => Array(COLUMNS).fill(0));
  // true while the keyboard is up on the transcript, so the mic and the
  // waveform step aside and the sheet still fits above the keyboard
  const [typing, setTyping] = useState(false);
  const input = useRef<TextInput>(null);
  // Keyboard mode only: whether the keyboard's dictation has sent any
  // words since the keyboard opened, and when the latest ones came in.
  // That's the only sign of your voice FORGE gets in Expo Go.
  const [heard, setHeard] = useState(false);
  const lastWordAt = useRef(0);

  // Finished segments (Android sends a long talk in pieces) and the
  // words still being worked out.
  const finals = useRef('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Listen to the recogniser's events for as long as the sheet is open.
  useEffect(() => {
    if (!speech) return;
    const subs = [
      speech.addListener('start', () => {
        setPhase('listening');
        haptic.select();
      }),
      speech.addListener('result', (event: ExpoSpeechRecognitionResultEvent) => {
        const heard = event.results[0]?.transcript ?? '';
        // Android in continuous mode sends each sentence separately;
        // iPhone always sends everything heard so far.
        if (Platform.OS === 'android' && CONTINUOUS) {
          if (event.isFinal) {
            finals.current = `${finals.current} ${heard}`.trim();
            setText(finals.current);
          } else {
            setText(`${finals.current} ${heard}`.trim());
          }
        } else {
          setText(heard);
        }
      }),
      speech.addListener('volumechange', (event: { value: number }) => {
        // -2…10 from the phone; below 0 is silence. Scroll it in from the right.
        const level = Math.max(0, Math.min(1, event.value / 10));
        setLevels((current) => [...current.slice(1), level]);
      }),
      speech.addListener('error', (event: ExpoSpeechRecognitionErrorEvent) => {
        if (event.error === 'aborted') return; // we stopped it ourselves
        setProblem(ERRORS[event.error] ?? 'Voice stopped unexpectedly. Tap the mic to try again.');
        haptic.reject();
      }),
      speech.addListener('end', () => {
        if (timer.current) clearTimeout(timer.current);
        setLevels(Array(COLUMNS).fill(0));
        setPhase('done');
      }),
    ];
    return () => {
      subs.forEach((sub) => sub.remove());
      if (timer.current) clearTimeout(timer.current);
      try {
        speech.abort(); // the sheet closed mid-sentence
      } catch {
        // nothing was running
      }
    };
  }, [speech]);

  async function listen() {
    // No speech package in this build: hand over to the keyboard's mic.
    if (!speech) {
      haptic.select();
      input.current?.focus();
      return;
    }
    setProblem(null);

    if (!speech.isRecognitionAvailable()) {
      setProblem(ERRORS['service-not-allowed']);
      return;
    }
    const permission = await speech.requestPermissionsAsync();
    if (!permission.granted) {
      setProblem(ERRORS['not-allowed']);
      haptic.reject();
      return;
    }

    finals.current = '';
    setText('');
    speech.start({
      lang: 'en-US',
      interimResults: true,
      continuous: CONTINUOUS,
      addsPunctuation: true,
      contextualStrings: MAKER_WORDS,
      iosTaskHint: 'dictation',
      volumeChangeEventOptions: { enabled: true, intervalMillis: 90 },
    });
    timer.current = setTimeout(() => speech.stop(), MAX_SECONDS * 1000);
  }

  function stop() {
    // Closing the keyboard also ends the keyboard's dictation.
    if (typing) input.current?.blur();
    if (speech && phase === 'listening') speech.stop(); // sends the last words, then 'end'
  }

  /** Every change to the transcript. Growing text means words are arriving. */
  function onWords(next: string) {
    if (!speech && next.length > text.length) {
      lastWordAt.current = Date.now();
      if (!heard) {
        setHeard(true);
        haptic.select();
      }
    }
    setText(next);
  }

  // Keyboard mode "listens" once the keyboard's dictation starts sending words.
  const keyboardListening = !speech && typing && heard;
  const listening = phase === 'listening' || keyboardListening;
  const said = text.trim();
  const message = problem ?? planError;
  // The transcript can be edited once you've finished talking, and
  // always when the keyboard is doing the listening.
  const editable = !speech || (phase === 'done' && Boolean(said));
  // While the keyboard is up the sheet only has the top half of the
  // screen, so the mic and the waveform shrink to fit above it.
  const compact = typing;

  let status = 'TAP TO SPEAK';
  if (listening) status = 'LISTENING';
  else if (!speech && typing) status = 'NOW TAP THE MIC ON YOUR KEYBOARD';
  else if (said) status = 'GOT IT';
  else if (!speech) status = 'TAP, THEN THE MIC ON YOUR KEYBOARD';

  return (
    <View style={{ gap: space.lg }}>
      <Text style={[type.body, { color: colors.dim, marginTop: -2 }]}>
        Describe the build and the parts you already have.
      </Text>

      <View style={{ alignItems: 'center' }}>
        <MicButton
          size={compact ? 64 : 96}
          listening={listening}
          // While listening, or while the keyboard is up, the mic finishes.
          stops={listening || typing}
          onPress={listening || typing ? stop : listen}
          disabled={busy}
        />
        <Text
          style={[
            type.labelSm,
            {
              marginTop: -6,
              color: listening || said || typing ? colors.accent : colors.label,
              textAlign: 'center',
            },
          ]}
        >
          {status}
        </Text>
        <View style={{ marginTop: compact ? space.md : space.lg }}>
          {speech ? (
            <Waveform levels={levels} active={listening} rows={compact ? 9 : 13} />
          ) : (
            <WordWaveform running={keyboardListening} lastWordAt={lastWordAt} rows={compact ? 9 : 13} />
          )}
        </View>
      </View>

      <Pressable
        onPress={() => (editable ? input.current?.focus() : undefined)}
        style={{
          minHeight: compact ? 96 : 150,
          padding: 14,
          borderRadius: 12,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: listening || typing ? colors.accentLine : colors.folderLine,
          backgroundColor: colors.field,
        }}
      >
        <Text style={[type.labelSm, { color: listening ? colors.accent : colors.label, marginBottom: 8 }]}>
          TRANSCRIPT
        </Text>
        {editable ? (
          <TextInput
            ref={input}
            value={text}
            onChangeText={onWords}
            onFocus={() => {
              setHeard(false); // a fresh start each time the keyboard opens
              setTyping(true);
            }}
            onBlur={() => setTyping(false)}
            multiline
            // The keyboard's Return key says Done and closes it, instead of
            // starting a new line: the transcript is one thought, not a letter.
            returnKeyType="done"
            submitBehavior="blurAndSubmit"
            placeholder={EXAMPLE}
            placeholderTextColor={colors.faint}
            keyboardAppearance={keyboard()}
            cursorColor={colors.accent}
            selectionColor={tint(0.45)}
            maxLength={600}
            accessibilityLabel="What you said"
            style={[type.body, { color: colors.heading, padding: 0, textAlignVertical: 'top' }]}
          />
        ) : (
          <Text style={[type.body, { color: said ? colors.heading : colors.faint }]}>
            {said ? (listening ? `${said}|` : said) : EXAMPLE}
          </Text>
        )}
      </Pressable>

      {message ? <Text style={[type.bodySm, { color: colors.danger }]}>{message}</Text> : null}

      {/* Hidden while the keyboard is up: there's no room above it, and
          you finish talking first anyway (tap the mic, or Done). */}
      {!typing ? (
        <>
          <PrimaryButton
            label={busy ? 'FORGE IS PLANNING' : 'BUILD MY PLAN'}
            icon="arrow"
            busy={busy}
            disabled={!said || listening}
            onPress={() => {
              input.current?.blur();
              onPlan(said);
            }}
          />
          {onType && !busy ? <LinkButton label="TYPE IT INSTEAD" onPress={onType} /> : null}
        </>
      ) : null}
    </View>
  );
}

const EXAMPLE = '“A six-legged walking robot. I’ve got an Arduino Nano, twelve servos and a 2S LiPo.”';

// ---------------------------------------------------------------
// The mic, with rings pulsing out of it while it listens
// ---------------------------------------------------------------

const RING = {
  '0%': { opacity: 0.7, transform: [{ scale: 1 }] },
  '100%': { opacity: 0, transform: [{ scale: 1.9 }] },
};

function MicButton({
  size,
  listening,
  stops,
  onPress,
  disabled,
}: {
  size: number;
  listening: boolean;
  /** true when a tap finishes: stops listening, or closes the keyboard */
  stops: boolean;
  onPress: () => void;
  disabled: boolean;
}) {
  // The rings grow to 1.9× the mic. The box is shorter than that on
  // purpose: the rings spill a little over the text above and below,
  // as in the design, instead of pushing everything apart.
  return (
    <View style={{ width: size * 2, height: size * 1.5, alignItems: 'center', justifyContent: 'center' }}>
      {listening
        ? // three rings a third of a pulse apart, like the design's still
          [0, 467, 933].map((delay) => (
            <Animated.View
              key={delay}
              style={{
                position: 'absolute',
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: 2,
                borderColor: colors.accent,
                animationName: RING,
                animationDuration: 1400,
                animationDelay: delay,
                animationIterationCount: 'infinite',
                animationTimingFunction: curve.decelerate,
              }}
            />
          ))
        : null}
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={listening ? 'Stop listening' : stops ? 'Close the keyboard' : 'Start speaking'}
        style={({ pressed }) => [
          shared.primary,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: disabled ? 0.5 : 1,
            transform: [{ scale: pressed ? 0.94 : 1 }],
            boxShadow: listening
              ? `0 0 36px ${tint(0.6)}, inset 0 1px 0 rgba(255,255,255,0.25)`
              : `0 10px 26px ${tint(0.3)}, inset 0 1px 0 rgba(255,255,255,0.22)`,
          },
        ]}
      >
        <DotIcon name="mic" size={Math.round(size * 0.4)} color={colors.onAccent} />
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------
// The dot waveform — a flat line of dots at rest, bars while you talk
// ---------------------------------------------------------------

/** How strong a dot is, from the middle of its bar (1) out to the tip (0.3). */
const FADES = [1, 0.86, 0.72, 0.58, 0.44, 0.3];

function Waveform({ levels, active, rows = 13 }: { levels: number[]; active: boolean; rows?: number }) {
  const step = 8;
  const width = levels.length * step;
  const height = rows * step + step; // half a step of room above and below
  const middle = Math.floor(rows / 2);

  // The middle row is always lit (the flat line at rest); each column
  // grows up and down from it with the loudness of your voice, fading
  // towards its tips like the design. One path per strength of dot.
  const paths = FADES.map(() => '');
  levels.forEach((level, x) => {
    const reach = active ? Math.round(level * middle) : 0;
    for (let y = middle - reach; y <= middle + reach; y += 1) {
      const cx = x * step + step / 2;
      const cy = y * step + step;
      const fade = reach === 0 ? 0 : Math.round((Math.abs(y - middle) / reach) * (FADES.length - 1));
      paths[fade] += `M${cx - 2.6} ${cy}a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0 -5.2 0`;
    }
  });

  return (
    <Svg width={width} height={height} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {paths.map((d, i) => (d ? <Path key={i} d={d} fill={colors.accent} fillOpacity={FADES[i]} /> : null))}
    </Svg>
  );
}

/**
 * The waveform in keyboard mode (Expo Go). FORGE can't measure your
 * voice there, so the bars follow the words instead: busy while the
 * keyboard's dictation keeps sending them, easing back to the flat line
 * over a second of quiet. It keeps its own ticking state so the rest of
 * the sheet — and the text box the keyboard is typing into — doesn't
 * redraw eleven times a second.
 */
function WordWaveform({ running, lastWordAt, rows }: { running: boolean; lastWordAt: RefObject<number>; rows: number }) {
  const [levels, setLevels] = useState<number[]>(() => Array(COLUMNS).fill(0));

  useEffect(() => {
    if (!running) return;
    const tick = setInterval(() => {
      const quiet = Date.now() - lastWordAt.current;
      // full strength while words are coming in, fading out over the next 0.8s
      const energy = Math.max(0, Math.min(1, 1 - (quiet - 400) / 800));
      const level = energy * (0.25 + Math.random() * 0.75);
      setLevels((current) => [...current.slice(1), level]);
    }, 90);
    return () => {
      clearInterval(tick);
      setLevels(Array(COLUMNS).fill(0)); // start flat next time
    };
  }, [running, lastWordAt]);

  return <Waveform levels={levels} active={running} rows={rows} />;
}
