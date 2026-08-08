import AdminTickets from "./AdminTickets";
export default function AdminCollectorsSettings({
  isCommunity = false
}) {
  return <AdminTickets isCommunity={isCommunity} restrictedView="collectors" />;
}
