import { useCallback } from 'react';
import type {
  HouseholdRecord,
  HouseholdRulesAcknowledgement,
  HouseholdRulesVersion,
} from '../lib/household';
import { generateSignedHouseRulesPdf } from '../lib/household-rules-pdf';
import { downloadAppFile } from '../lib/file-download';
import { PdfCanvasViewer } from './pdf-canvas-viewer';

interface SignedHouseRulesPdfViewerProps {
  household: HouseholdRecord;
  version: HouseholdRulesVersion;
  acknowledgement: HouseholdRulesAcknowledgement;
}

export function SignedHouseRulesPdfViewer({
  household,
  version,
  acknowledgement,
}: SignedHouseRulesPdfViewerProps) {
  const loadPdf = useCallback(
    async () => generateSignedHouseRulesPdf({ household, version, acknowledgement }),
    [acknowledgement, household, version],
  );

  return (
    <PdfCanvasViewer
      className="mt-4"
      title="Signed House Rules"
      fileName={`signed-house-rules-${acknowledgement.id}.pdf`}
      loadPdf={loadPdf}
      loadingLabel="Preparing signed House Rules PDF..."
      loadErrorLabel="The signed House Rules PDF could not be prepared right now."
      downloadErrorLabel="The signed House Rules PDF could not be downloaded right now."
      onDownload={({ blob, fileName, title }) =>
        downloadAppFile({ blob, fileName, title, directoryName: 'house-rules' })}
      compact
      minViewportHeight={240}
      maxViewportHeight={380}
      testIdPrefix={`signed-house-rules-pdf-${acknowledgement.id}`}
    />
  );
}
