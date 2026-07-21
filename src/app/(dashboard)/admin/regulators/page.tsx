import { getRegulatorRecords } from "@/app/actions/regulators";
import { RegulatorsClient } from "./RegulatorsClient";

export default async function AdminRegulatorsPage() {
  const records = await getRegulatorRecords();
  return <RegulatorsClient records={records} />;
}
