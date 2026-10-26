---
name: Pro-Audio Precision Console
colors:
  surface: '#101419'
  surface-dim: '#101419'
  surface-bright: '#36393f'
  surface-container-lowest: '#0a0e13'
  surface-container-low: '#181c21'
  surface-container: '#1c2025'
  surface-container-high: '#262a30'
  surface-container-highest: '#31353b'
  on-surface: '#e0e2ea'
  on-surface-variant: '#b9cbb9'
  inverse-surface: '#e0e2ea'
  inverse-on-surface: '#2d3136'
  outline: '#849585'
  outline-variant: '#3b4b3d'
  surface-tint: '#00e478'
  primary: '#f1ffef'
  on-primary: '#003919'
  primary-container: '#00ff87'
  on-primary-container: '#007138'
  inverse-primary: '#006d36'
  secondary: '#ffdb9d'
  on-secondary: '#412d00'
  secondary-container: '#feb700'
  on-secondary-container: '#6b4b00'
  tertiary: '#fffaf9'
  on-tertiary: '#680018'
  tertiary-container: '#ffd4d4'
  on-tertiary-container: '#c50036'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#60ff98'
  primary-fixed-dim: '#00e478'
  on-primary-fixed: '#00210c'
  on-primary-fixed-variant: '#005227'
  secondary-fixed: '#ffdea8'
  secondary-fixed-dim: '#ffba20'
  on-secondary-fixed: '#271900'
  on-secondary-fixed-variant: '#5e4200'
  tertiary-fixed: '#ffdada'
  tertiary-fixed-dim: '#ffb3b5'
  on-tertiary-fixed: '#40000b'
  on-tertiary-fixed-variant: '#920025'
  background: '#101419'
  on-background: '#e0e2ea'
  surface-variant: '#31353b'
typography:
  display-hero:
    fontFamily: JetBrains Mono
    fontSize: 72px
    fontWeight: '700'
    lineHeight: 72px
    letterSpacing: -0.04em
  display-hero-mobile:
    fontFamily: JetBrains Mono
    fontSize: 44px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  telemetry-value:
    fontFamily: JetBrains Mono
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.02em
  telemetry-unit:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.08em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.12em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-sm: 0.5rem
  gutter-lg: 1.5rem
  margin: 1.5rem
  margin-mobile: 0.75rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system targets touring musicians, audio engineers, and stage performers who need instantaneous, zero-ambiguity visual telemetry under extreme lighting conditions—from pitch-black stages to glare-heavy studios.

The aesthetic fuses **Tactile Skeuomorphism** and **Technical Brutalism**:
- Hardware-grade cues inspired by modular synthesizers, rack-mount master clocks, and digital audio workstations.
- Razor-sharp structural discipline where every pixel communicates operational state, pitch deviation, or rhythmic sync.
- Extreme glanceability: critical performance data can be registered instantly from four feet away under low-light or strobe conditions.

## Colors

The system uses a calibrated, emissive palette set against deeply light-absorbing matte surfaces:

- **Primary (`#00FF87` - Electric Emerald):** Phase-locked, dead-center pitch, on-beat quantization, active transport, and non-destructive states. Emits an optical phosphor glow.
- **Secondary (`#FFB800` - Signal Amber):** Phase drift, boundary tolerance, pre-roll, headroom warnings, and buffered status.
- **Tertiary (`#FF3355` - High-Voltage Coral):** Out-of-sync, pitch dissonance, hard clipping, mute/solo flags, and critical arm states.
- **Neutral Surface Palette:**
  - Base Canvas (`#0B0F14`): Carbon-black substrate with minimal chromatic reflection.
  - Surface Mid (`#121820`): Midnight slate module plates and recessed control panels.
  - Surface Raised (`#1A2230`): Raised transport blocks, tactile rockers, and interactive enclosures.
  - Border Subdued (`#232E40`): 1px structural hair-lines defining modular chassis tracks.
  - Text Muted (`#5F7596`): De-emphasized legends, patch parameter descriptions, and unit suffixes.

## Typography

Typography prioritizes fixed-width alignment and zero optical jitter during live continuous data streams:

- **JetBrains Mono:** Reserved for all dynamic numeric displays (BPM readouts, millisecond intervals, cent-deviation indicators, timecodes, and rack patch legends). All dynamic figures must use `font-variant-numeric: tabular-nums` to prevent horizontal jumping when tracking active tempo shifts.
- **Space Grotesk:** Anchors module titles and operational modal headers with mechanical precision.
- **Geist:** Provides crisp, low-fatigue readability for patch notes, routing descriptions, and diagnostic outputs.

## Layout & Spacing

The system runs on a strict **Fluid Modular Grid** with dense, equipment-like proportions:

- **Mobile Viewports (<768px):** Single-column layout organized into stacked "chassis trays." Controls conform to a minimum touch target of 48×48px, utilizing dense 8px gutters to preserve screen real estate for live frequency and tempo monitors.
- **Tablet/Stage Landscape (768px–1024px):** 6-column split layout. Master tempo, key metrics, and tuning arcs lock into a persistent left control bay; track-level telemetry fills the right viewport.
- **Studio Desktop (>1024px):** 12-column variable module system mimicking an analog Eurorack console. Channels scale horizontally while parameter strips hold strict standard heights (40px, 56px, 80px).

## Elevation & Depth

Depth is established through milled plate nesting, edge highlights, and LED-inspired radiance rather than traditional soft drop-shadows:

- **Tier 0 (Base Plate):** `#0B0F14` flat chassis surface.
- **Tier 1 (Recessed Well):** Inset bevel (`inset 0 1px 3px rgba(0,0,0,0.8)`) applied to meter housings, fader tracks, and LED segments.
- **Tier 2 (Raised Module / Faceplate):** `#121820` surface bounded by a top-edge mechanical lightcatch (`1px solid rgba(255,255,255,0.08)`) and bottom shadow (`0 2px 4px rgba(0,0,0,0.6)`).
- **Emissive State Elevation:** Glowing elements do not use drop-shadows; they use tight concentric photonic halation:
  - In-Tune / Sync Lock: `0 0 10px rgba(0, 255, 135, 0.45), 0 0 1px #00FF87`
  - High Drift / Warning: `0 0 10px rgba(255, 184, 0, 0.45), 0 0 1px #FFB800`
  - Critical / Dissonant: `0 0 10px rgba(255, 51, 85, 0.5), 0 0 1px #FF3355`

## Shapes

The design system enforces a precision-tooled contour language (`roundedness: 1`):

- Modules, display bezels, faders, and button caps use a tight 4px (`0.25rem`) radius, echoing machine-cut, deburred anodized metal plates.
- LED meter segments are hard-edged rectangles with 1px micro-gaps.
- Circular controls (rotary encoders, tuner gauge arcs) maintain unbroken geometric curves framed by high-contrast tick-marks.

## Components

### Buttons & Transport Triggers
- **Primary Buttons:** High-contrast mechanical blocks with `#1A2230` background, a 1px border of `#232E40`, and uppercase `JetBrains Mono` text.
- **Active / Engaged:** Background transitions directly into the luminous state (e.g., `#00FF87` text and border with an active neon glow).
- **Physical Feel:** On `:active`, remove top-edge lightcatch and translate content 1px downward to deliver immediate tactile feedback for live triggers.

### Tuner Gauge & Cent Arc
- **Visual Display:** Semicircular needle meter with 50 fine tick divisions.
- **Dynamics:** Needle tracks pitch deviations using smooth cubic-bezier transitions. Cent-zero is marked by an LED notch.
- **Color Transitions:** The needle and readout dynamically sweep from `#00FF87` at ±3 cents, shift to `#FFB800` between 4–15 cents drift, and flare into `#FF3355` when exceeding 15 cents off-pitch.

### Segmented LED & VU Meters
- Constructed from discrete rectangular blocks (2px width × 8px height) spaced 1px apart.
- Segment brightness steps: 15% opacity when dark/inactive, 100% full saturation with peripheral glow when illuminated.
- Peak-hold indicators remain lit for 1.2 seconds as single-pixel needle caps.

### Numeric Inputs & Rotary Steppers
- Monospaced digits encapsulated in recessed sunken wells (`#080B0F`).
- Support vertical drag-scrubbing with immediate micro-stepper feedback.
- Double-click reveals a raw, high-contrast monospace edit box.

### Control Chips & Status Badges
- Compact indicators containing an emissive 6px circular LED pip adjacent to `label-caps` text.
- Borderless with a deep matte fill (`#121820`), maintaining low visual weight until triggered into an active glow state.

### Module Containers & Cards
- Rigid structural plates with a 1px `#232E40` perimeter border.
- Module headers feature a debossed hardware-style plate label in `label-caps`, separating master channel operations from granular secondary controls.