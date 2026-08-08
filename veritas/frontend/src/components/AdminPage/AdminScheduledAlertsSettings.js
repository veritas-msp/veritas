import AdminTickets from "./AdminTickets";
export default function AdminScheduledAlertsSettings({
  isCommunity = false
}) {
  return <AdminTickets isCommunity={isCommunity} restrictedView="scheduled-alerts" />;
}
