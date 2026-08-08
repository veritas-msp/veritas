import AdminTickets from "./AdminTickets";
export default function AdminEmailIngestionSettings({
  isCommunity = false
}) {
  return <AdminTickets isCommunity={isCommunity} restrictedView="email-ingestion" />;
}
