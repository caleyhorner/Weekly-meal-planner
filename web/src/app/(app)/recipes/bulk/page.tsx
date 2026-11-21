import { BulkImport } from "./bulk-import";

// Each item is read by the AI in its own request; give slow pages room.
export const maxDuration = 120;

export default function BulkImportPage() {
  return <BulkImport />;
}
