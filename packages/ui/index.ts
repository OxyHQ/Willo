// Shared, app-agnostic UI components and design tokens for Willo. This
// package must never import from `@willo/frontend` (or reach into
// packages/frontend by relative path) — screens, routing, and app state
// live there. See AGENTS.md.

export { Icon, type IconName } from './components/icon';
export { default as Level, type Pose } from './components/Level';

export {
  Label,
  IconButton,
  Avatar,
  SectionTitle,
  Tile,
  AddButton,
  Pill,
} from './components/primitives';

export { colors, tones, type Tone } from './theme/tokens';

export {
  getGradient,
  getPrimaryColor,
  getSecondaryColor,
  getMidColor,
  TEMP_COLORS,
} from './colors';

export {
  Degree,
  Percentage,
  LabelBox,
  Label as CaptionLabel,
  Unit,
  Decimal,
  Value,
} from './styles';

export { BOX_SIZE, EXPANDED_BOX_SIZE, LARGE_BOX_SIZE } from './constants';
