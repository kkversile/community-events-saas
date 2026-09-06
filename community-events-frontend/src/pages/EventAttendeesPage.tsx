import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, UsersRound } from "lucide-react";
import { format } from "date-fns";
import { api, unwrap } from "../api/client";
import { Badge, Card, Empty, PageHeader, Spinner } from "../components/Ui";

export default function EventAttendeesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const event = useQuery({ queryKey: ["event", id], queryFn: () => api.get(`/events/${id}`).then(unwrap<any>), enabled: !!id });
  const participation = useQuery({ queryKey: ["event-participation", id], queryFn: () => api.get(`/events/${id}/participation`).then(unwrap<any[]>), enabled: !!id });

  if (event.isLoading || participation.isLoading) return <Spinner />;
  if (!event.data) return null;
  const rows = participation.data ?? [];
  const attendeeCount = rows.reduce((total, row) => total + row.bookings.length, 0);
  function exportCsv() {
    const lines = ["date,session,flat,resident,adults,children,seniors"];
    for (const row of rows) for (const booking of row.bookings) lines.push([
      format(new Date(row.sessionDate), "yyyy-MM-dd"), row.name, booking.unit, booking.resident,
      booking.adults, booking.children, booking.seniors,
    ].map((value: any) => `"${String(value).replaceAll('"', '""')}"`).join(","));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${event.data.slug}-attendees.csv`; link.click(); URL.revokeObjectURL(link.href);
  }
  return <>
    <button className="link-button" onClick={() => navigate(`/admin/events/${id}`)}><ArrowLeft size={18} /> Back to event</button>
    <PageHeader title={`${event.data.name} attendees`} subtitle={`${format(new Date(event.data.startDate), "dd MMM yyyy")} - ${format(new Date(event.data.endDate), "dd MMM yyyy")}`} action={<Badge tone={event.data.status === "DRAFT" ? "warning" : "success"}>{event.data.status}</Badge>} />
    <div className="event-subnav"><button className="btn btn-secondary" onClick={() => navigate(`/admin/events/${id}`)}>Event setup</button><button className="btn btn-primary"><UsersRound size={16} /> Attendees ({attendeeCount})</button></div>
    <div className="participation-heading"><div><h2>Attendees</h2><p>Confirmed families grouped by pooja session.</p></div><button className="btn btn-secondary" onClick={exportCsv} disabled={!attendeeCount}><Download size={17} /> Export CSV</button></div>
    {rows.length ? <div className="participation-grid">{rows.map((row: any) => <Card key={row.id} className="participation-card"><div className="participation-card-head"><div><strong>{format(new Date(row.sessionDate), "EEEE, dd MMM")}</strong><span>{row.name} · {row.startTime} - {row.endTime}</span></div><Badge tone={row.capacity && row.bookings.length >= row.capacity ? "danger" : "success"}>{row.bookings.length}/{row.capacity ?? "∞"} booked</Badge></div>{row.bookings.length ? <div className="participant-list">{row.bookings.map((booking: any) => <div key={booking.id}><span className="flat-pill">{booking.unit}</span><div><strong>{booking.resident}</strong><span>{booking.adults} adults - {booking.children} children - {booking.seniors} seniors</span></div></div>)}</div> : <Empty title="No attendees booked" />}{row.waitlist.length > 0 && <div className="waitlist-mini"><UsersRound size={16} /><strong>Waitlist</strong>{row.waitlist.map((wait: any) => <span key={wait.id}>#{wait.position} {wait.unit}</span>)}</div>}</Card>)}</div> : <Empty title="No sessions yet" description="Create sessions from Event setup." />}
  </>;
}
