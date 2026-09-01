const MOBILE_BREAKPOINT = 680;
const MOBILE_SIDE_GAP = 16;
const SOURCE_GATE_Y = 449.95061728395063;
const SOURCE_TOKEN_LEFT = 170;
const SOURCE_TOKEN_RIGHT = 854;

export function getImageLayout({
  stageWidth,
  stageHeight,
  sourceWidth,
  sourceHeight,
}) {
  const isPortraitMobile = stageWidth <= MOBILE_BREAKPOINT && stageHeight > stageWidth;

  if (isPortraitMobile) {
    const sourceTokenWidth = SOURCE_TOKEN_RIGHT - SOURCE_TOKEN_LEFT;
    const scale = (stageWidth - MOBILE_SIDE_GAP * 2) / sourceTokenWidth;
    const sourceTokenCenter = (SOURCE_TOKEN_LEFT + SOURCE_TOKEN_RIGHT) / 2;
    const renderedWidth = sourceWidth * scale;
    const renderedHeight = sourceHeight * scale;

    return {
      mode: "token-fit",
      scale,
      renderedWidth,
      renderedHeight,
      offsetX: stageWidth / 2 - sourceTokenCenter * scale,
      offsetY: stageHeight * .44 - SOURCE_GATE_Y * scale,
    };
  }

  const scale = Math.max(stageWidth / sourceWidth, stageHeight / sourceHeight);
  const renderedWidth = sourceWidth * scale;
  const renderedHeight = sourceHeight * scale;

  return {
    mode: "cover",
    scale,
    renderedWidth,
    renderedHeight,
    offsetX: (stageWidth - renderedWidth) / 2,
    offsetY: (stageHeight - renderedHeight) / 2,
  };
}

export function getLowerCopyCenter({ gateY, stageHeight }) {
  return gateY + (stageHeight - gateY) / 2;
}
