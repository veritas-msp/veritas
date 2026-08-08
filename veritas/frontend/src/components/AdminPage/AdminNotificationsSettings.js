import AdminTickets from "./AdminTickets";
export default function AdminNotificationsSettings({
  isCommunity = false
}) {
  return <AdminTickets isCommunity={isCommunity} restrictedView="notifications" />;
}
