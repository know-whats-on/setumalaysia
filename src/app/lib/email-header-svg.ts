/**
 * Builds monocolor SVG strings for the email header in two variants:
 *   - 'light' → black paths on transparent background (for light mode)
 *   - 'dark'  → white paths on transparent background (for dark mode)
 *
 * Both are uploaded to Supabase Storage. The email HTML uses the standard
 * dual-image swap technique so supporting clients (Apple Mail, Outlook)
 * show the correct variant, while Gmail falls back to the light version.
 *
 * Uses the monocolor Figma exports (Vector-42-* series).
 */
import setuPaths from '../../imports/svg-6my0c9kntx';
import gharPaths from '../../imports/svg-87swt4ce4b';
import hciPaths from '../../imports/svg-opkoc69d76';
import partnershipPaths from '../../imports/svg-36siv7nv5r';

/** Bump this whenever the SVG content changes to trigger re-upload */
export const HEADER_SVG_VERSION = 4;

export type HeaderVariant = 'light' | 'dark';

function buildSetuSvg(fill: string): string {
  const p = setuPaths;
  const f = `fill="${fill}"`;
  return `
    <path d="${p.p3fb62800}" ${f}/><path d="${p.p2889eb00}" ${f}/><path d="${p.p35b2fd00}" ${f}/><path d="${p.p10962600}" ${f}/>
    <path d="${p.p99ce440}" ${f}/><path d="${p.p17c072c0}" ${f}/><path d="${p.p1bd66700}" ${f}/><path d="${p.p5a98740}" ${f}/>
    <path d="${p.p13d20e00}" ${f}/><path d="${p.p7c34c80}" ${f}/><path d="${p.p2e240080}" ${f}/>
    <path d="${p.p3579ba80}" ${f}/><path d="${p.p5c28280}" ${f}/><path d="${p.p36550e00}" ${f}/><path d="${p.p882f200}" ${f}/>
    <path d="${p.p3a020c00}" ${f}/><path d="${p.p34503200}" ${f}/><path d="${p.p2eb13d00}" ${f}/><path d="${p.p79b5200}" ${f}/>
    <path d="${p.p3cba500}" ${f}/><path d="${p.p28837780}" ${f}/><path d="${p.p3b38ee00}" ${f}/><path d="${p.p2be9c900}" ${f}/>
    <path d="${p.pc30ba00}" ${f}/><path d="${p.p1dda74f0}" ${f}/>
    <path d="${p.p2ca56d00}" ${f}/><path d="${p.p3abfcd00}" ${f}/><path d="${p.p32da100}" ${f}/><path d="${p.p39f2bc0}" ${f}/>
    <path d="${p.p1e0ab600}" ${f}/><path d="${p.p2f170b00}" ${f}/><path d="${p.p25e4c400}" ${f}/><path d="${p.p11f2700}" ${f}/>
    <path d="${p.p22a5cc00}" ${f}/><path d="${p.p14622080}" ${f}/><path d="${p.p22f4c880}" ${f}/><path d="${p.p21c02f80}" ${f}/>
    <path d="${p.p16a23b00}" ${f}/><path d="${p.p37ab3400}" ${f}/><path d="${p.p168da900}" ${f}/><path d="${p.pab02d00}" ${f}/>
    <path d="${p.p3f517400}" ${f}/><path d="${p.p131dd500}" ${f}/>`;
}

function buildGharSvg(fill: string): string {
  const p = gharPaths;
  const f = `fill="${fill}"`;
  return `
    <path d="${p.p2769a380}" ${f}/><path d="${p.p24793880}" ${f}/><path d="${p.p2e613d00}" ${f}/>
    <path d="${p.p2d36a080}" ${f}/><path d="${p.p1830b100}" ${f}/><path d="${p.p3e473500}" ${f}/>
    <path d="${p.p2c030980}" ${f}/><path d="${p.p2cd6d200}" ${f}/><path d="${p.p21215900}" ${f}/>
    <path d="${p.p3ec6e800}" ${f}/><path d="${p.pcde6280}" ${f}/><path d="${p.p24faac80}" ${f}/>
    <path d="${p.p13de3980}" ${f}/><path d="${p.p6d75a80}" ${f}/><path d="${p.pbf9180}" ${f}/>
    <path d="${p.p2c831e00}" ${f}/><path d="${p.p2a789080}" ${f}/><path d="${p.p14d5e040}" ${f}/>
    <path d="${p.p1e3f4400}" ${f}/><path d="${p.p11b93280}" ${f}/><path d="${p.p36bd1500}" ${f}/>
    <path d="${p.p248d3300}" ${f}/><path d="${p.p30cde400}" ${f}/><path d="${p.p10cdc680}" ${f}/>
    <path d="${p.p230b9300}" ${f}/><path d="${p.p9492770}" ${f}/><path d="${p.p35b18300}" ${f}/>
    <path d="${p.p1c6b8680}" ${f}/><path d="${p.p3c9500}" ${f}/><path d="${p.p1598b700}" ${f}/>
    <path d="${p.p5dfad80}" ${f}/><path d="${p.pd47a380}" ${f}/><path d="${p.p3653be00}" ${f}/>
    <path d="${p.p365620c0}" ${f}/><path d="${p.p15e73480}" ${f}/><path d="${p.p16c99000}" ${f}/>
    <path d="${p.pa4eba80}" ${f}/><path d="${p.p2080b600}" ${f}/><path d="${p.p3132ce10}" ${f}/>
    <path d="${p.p20a31e00}" ${f}/><path d="${p.pb808ab0}" ${f}/><path d="${p.p3f8a4700}" ${f}/>
    <path d="${p.p8206f00}" ${f}/><path d="${p.p285c8800}" ${f}/><path d="${p.p268e8080}" ${f}/>
    <path d="${p.p22b38200}" ${f}/><path d="${p.p1bf3df30}" ${f}/><path d="${p.p27809700}" ${f}/>
    <path d="${p.p31680d70}" ${f}/><path d="${p.p12a12200}" ${f}/><path d="${p.p1936a440}" ${f}/>
    <path d="${p.p361dea00}" ${f}/><path d="${p.p27a7bd80}" ${f}/><path d="${p.p33da8780}" ${f}/>`;
}

function buildPartnershipSvg(fill: string): string {
  const p = partnershipPaths;
  const f = `fill="${fill}"`;
  return `
    <path d="${p.p28e6a880}" ${f}/><path d="${p.p9f20500}" ${f}/><path d="${p.p39ad500}" ${f}/>
    <path d="${p.p2ed49b00}" ${f}/><path d="${p.p1003e3f0}" ${f}/><path d="${p.pc22bb00}" ${f}/>
    <path d="${p.p35984480}" ${f}/><path d="${p.pe93d400}" ${f}/><path d="${p.p30773900}" ${f}/>
    <path d="${p.p13eb0000}" ${f}/><path d="${p.p13eeb280}" ${f}/><path d="${p.p29a71300}" ${f}/>
    <path d="${p.p3228e900}" ${f}/><path d="${p.p29f6fb80}" ${f}/><path d="${p.p18537b00}" ${f}/>
    <path d="${p.p2dc8b640}" ${f}/><path d="${p.p2cef6f00}" ${f}/>`;
}

function buildHciSvg(fill: string, oFill81: string, oFill73: string): string {
  const p = hciPaths;
  const f = `fill="${fill}"`;
  return `
    <path d="${p.p3c935300}" ${f}/>
    <path d="${p.p15e72d00}" ${f}/>
    <path d="${p.p11315200}" fill="${oFill73}"/>
    <path clip-rule="evenodd" d="${p.p39d1aa80}" fill="${oFill81}" fill-rule="evenodd"/>
    <path d="${p.p38402e00}" fill="${oFill81}"/><path d="${p.p29d35b00}" fill="${oFill81}"/>
    <path d="${p.p35d57700}" fill="${oFill81}"/><path d="${p.p2585ab00}" fill="${oFill81}"/>
    <path d="${p.p15c0e500}" fill="${oFill81}"/><path d="${p.p62ba00}" fill="${oFill81}"/>
    <path d="${p.pa190500}" fill="${oFill81}"/><path d="${p.p3b9df500}" fill="${oFill81}"/>
    <path d="${p.p275d2b00}" fill="${oFill81}"/><path d="${p.p1784f7c0}" fill="${oFill81}"/>
    <path d="${p.p2b760680}" fill="${oFill81}"/><path d="${p.p1d9bd400}" fill="${oFill81}"/>
    <path d="${p.p1eab3e00}" fill="${oFill81}"/><path d="${p.p87f6500}" fill="${oFill81}"/>
    <path d="${p.p3055c1e0}" fill="${oFill81}"/><path d="${p.p1c11b400}" fill="${oFill81}"/>
    <path d="${p.p1ad9a100}" fill="${oFill81}"/><path d="${p.pd0d7700}" fill="${oFill81}"/>
    <path d="${p.p700f500}" fill="${oFill81}"/><path d="${p.p3a4701f0}" fill="${oFill81}"/>
    <path d="${p.p28de0b80}" fill="${oFill81}"/><path d="${p.p290e6a00}" fill="${oFill81}"/>
    <path d="${p.pa424c00}" fill="${oFill81}"/><path d="${p.p4d59b80}" fill="${oFill81}"/>
    <path d="${p.p324efd00}" fill="${oFill81}"/><path d="${p.p5433b00}" fill="${oFill81}"/>
    <path d="${p.p251c7680}" fill="${oFill81}"/><path d="${p.p399780c0}" fill="${oFill81}"/>
    <path d="${p.p9883500}" fill="${oFill81}"/><path d="${p.p2a5d09c0}" fill="${oFill81}"/>
    <path d="${p.p25c27480}" fill="${oFill81}"/><path d="${p.p22149440}" fill="${oFill81}"/>
    <path d="${p.p2303a300}" fill="${oFill81}"/><path d="${p.p30c6a200}" fill="${oFill81}"/>
    <path d="${p.p18274b00}" fill="${oFill81}"/><path d="${p.p3f387180}" fill="${oFill81}"/>
    <path d="${p.p31891400}" fill="${oFill81}"/><path d="${p.pc3ad200}" fill="${oFill81}"/>
    <path d="${p.p31709700}" fill="${oFill81}"/><path d="${p.p21fb5100}" fill="${oFill81}"/>
    <path d="${p.p39eb0600}" fill="${oFill81}"/><path d="${p.p18fff180}" fill="${oFill81}"/>
    <path d="${p.p10c95500}" fill="${oFill81}"/><path d="${p.p1ed04a00}" fill="${oFill81}"/>
    <path d="${p.p35441280}" fill="${oFill81}"/><path d="${p.p3f8c6c80}" fill="${oFill81}"/>
    <path d="${p.p8e28500}" fill="${oFill81}"/><path d="${p.p22679e80}" fill="${oFill81}"/>
    <path d="${p.p3ba72a80}" fill="${oFill81}"/><path d="${p.p6fa8380}" fill="${oFill81}"/>
    <path d="${p.p399a3900}" fill="${oFill81}"/><path d="${p.p22ed4c80}" fill="${oFill81}"/>
    <path d="${p.p2927f480}" fill="${oFill81}"/><path d="${p.p20050400}" fill="${oFill81}"/>
    <path d="${p.p3d46b300}" fill="${oFill81}"/><path d="${p.p1d8dcd00}" fill="${oFill81}"/>
    <path d="${p.p14727f00}" fill="${oFill81}"/><path d="${p.p178a3400}" fill="${oFill81}"/>
    <path d="${p.p29d95900}" fill="${oFill81}"/><path d="${p.p2ee08700}" fill="${oFill81}"/>
    <path d="${p.p18d5a100}" fill="${oFill81}"/>`;
}

/**
 * Builds the complete email header as a single combined SVG string.
 * Layout: SETU | divider | GHAR, then "in partnership with", then HCI.
 * No background — transparent.
 *
 * @param variant  'light' = black paths, 'dark' = white paths
 */
export function buildEmailHeaderSvg(variant: HeaderVariant = 'light'): string {
  const isLight = variant === 'light';
  const fill = isLight ? 'black' : 'white';
  const stroke = isLight ? 'black' : 'white';
  // For HCI semi-transparent paths: simulate opacity via rgba
  const oFill81 = isLight ? 'rgba(0,0,0,0.81)' : 'rgba(255,255,255,0.9)';
  const oFill73 = isLight ? 'rgba(0,0,0,0.73)' : 'rgba(255,255,255,0.85)';

  const canvasW = 800;
  const canvasH = 370;

  // Row 1: SETU + line + GHAR — centered
  const setuW = 213, setuH = 100;
  const gharW = 390, gharH = 100;
  const lineGap = 15;
  const rowW = setuW + lineGap + 2 + lineGap + gharW;
  const rowX = (canvasW - rowW) / 2;
  const rowY = 20;

  // Row 2: "in partnership with" — centered
  const partW = 280, partH = 31;
  const partX = (canvasW - partW) / 2;
  const partY = rowY + setuH + 18;

  // Row 3: HCI — centered
  const hciW = 680, hciH = 150;
  const hciX = (canvasW - hciW) / 2;
  const hciY = partY + partH + 14;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasW} ${canvasH}" width="${canvasW}" height="${canvasH}">
  <svg x="${rowX}" y="${rowY}" width="${setuW}" height="${setuH}" viewBox="0 0 284.901 134">${buildSetuSvg(fill)}</svg>
  <line x1="${rowX + setuW + lineGap}" y1="${rowY + 5}" x2="${rowX + setuW + lineGap}" y2="${rowY + setuH - 5}" stroke="${stroke}" stroke-width="2"/>
  <svg x="${rowX + setuW + lineGap + 2 + lineGap}" y="${rowY}" width="${gharW}" height="${gharH}" viewBox="0 0 433.001 111.045">${buildGharSvg(fill)}</svg>
  <svg x="${partX}" y="${partY}" width="${partW}" height="${partH}" viewBox="0 0 370.651 40.6412">${buildPartnershipSvg(fill)}</svg>
  <svg x="${hciX}" y="${hciY}" width="${hciW}" height="${hciH}" viewBox="0 0 768.505 169.307">${buildHciSvg(fill, oFill81, oFill73)}</svg>
</svg>`;
}

export function buildHciLogoSvg(variant: HeaderVariant = 'light'): string {
  const isLight = variant === 'light';
  const fill = isLight ? 'black' : 'white';
  const oFill81 = isLight ? 'rgba(0,0,0,0.81)' : 'rgba(255,255,255,0.9)';
  const oFill73 = isLight ? 'rgba(0,0,0,0.73)' : 'rgba(255,255,255,0.85)';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 768.505 169.307" width="768.505" height="169.307">${buildHciSvg(fill, oFill81, oFill73)}</svg>`;
}

export function buildHciLogoDataUri(variant: HeaderVariant = 'light'): string {
  const svg = buildHciLogoSvg(variant);
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

/** Encode the header SVG as a base64 data URI */
export function buildEmailHeaderDataUri(variant: HeaderVariant = 'light'): string {
  const svg = buildEmailHeaderSvg(variant);
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}
