import AdminTickets from "./AdminTickets";
export default function AdminWebhooksSettings({
  isCommunity = false
}) {
  return <AdminTickets isCommunity={isCommunity} restrictedView="webhooks" />;
}
