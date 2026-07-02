/**
 * EmailHeaderPreview — renders the exact Figma monocolor header
 * using the imported SVG vector components (42-series, all black).
 * No background rectangle — logos sit directly on the container.
 * Used in email preview modals (in-app only).
 */
import SetuVector from '../../imports/Vector-42-5064';
import GharVector from '../../imports/Vector-42-5060';
import PartnershipVector from '../../imports/InPartnershipWith-42-5056';
import HciVector from '../../imports/Vector-42-5048';

export function EmailHeaderPreview() {
  return (
    <div className="px-5 py-6">
      {/* Row 1: SETU | divider | GHAR */}
      <div className="flex items-center justify-center gap-3 mb-4">
        {/* SETU logo — viewBox 284.901 x 134, scaled down */}
        <div className="relative shrink-0" style={{ width: 142, height: 67 }}>
          <SetuVector />
        </div>
        {/* Vertical divider */}
        <div className="w-[2px] h-14 bg-black shrink-0" />
        {/* GHAR logo — viewBox 433.001 x 111.045, scaled down */}
        <div className="relative shrink-0" style={{ width: 195, height: 50 }}>
          <GharVector />
        </div>
      </div>

      {/* "in partnership with" — viewBox 370.651 x 40.6412 */}
      <div className="flex justify-center mb-3">
        <div className="relative" style={{ width: 200, height: 22 }}>
          <PartnershipVector />
        </div>
      </div>

      {/* HCI emblem — viewBox 768.505 x 169.307, scaled to fit */}
      <div className="flex justify-center">
        <div className="relative" style={{ width: 340, height: 75 }}>
          <HciVector />
        </div>
      </div>
    </div>
  );
}
