export const CANVAS_WIDTH = 1600;
export const CANVAS_HEIGHT = 900;
export const LEFT_PANEL_WIDTH = 300;
export const HIT_LINE_Y = CANVAS_HEIGHT * 0.85;
export const OVERLAY_HEIGHT = 0;
export const PROGRESS_BAR_HEIGHT = 0;
export const NOTE_RADIUS = 22;
export const LANE_COUNT = 4;
export const LANE_WIDTH = (CANVAS_WIDTH - LEFT_PANEL_WIDTH) / LANE_COUNT;
export const BASE_PIXELS_PER_SECOND = 240;
// Time (seconds) for a note to travel from top of canvas to the hit line.
// Used as lead-in when starting from the beginning so the first note is visible.
export const LEAD_IN_SEC = (CANVAS_HEIGHT * 0.85) / BASE_PIXELS_PER_SECOND;
