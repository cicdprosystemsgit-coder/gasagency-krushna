import { getRegulatorRecords } from "@/app/actions/regulators";
import { RegulatorsClient } from "../../admin/regulators/RegulatorsClient";

export default async function ManagerRegulatorsPage() {
  const records = await getRegulatorRecords();
  return <RegulatorsClient records={records} />;
}
