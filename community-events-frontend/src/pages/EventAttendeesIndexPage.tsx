import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CalendarDays, UsersRound } from "lucide-react";
import { format } from "date-fns";
import { api, unwrap } from "../api/client";
import { Badge, Card, Empty, PageHeader, Spinner } from "../components/Ui";

export default function EventAttendeesIndexPage() {
  const events = useQuery({ queryKey: ["events"], queryFn: () => api.get("/events").then(unwrap<any[]>) });
  const attendeeQueries = useQueries({ queries: (events.data ?? []).map((event: any) => ({ queryKey: ["event-participation", event.id], queryFn: () => api.get(`/events/${event.id}/participation`).then(unwrap<any[]>) })) });
  if (events.isLoading) return <Spinner />;
  return <><PageHeader title="Event attendees" subtitle="View confirmed families and waitlists for every event." /><div className="cards-grid">{(events.data ?? []).map((event: any, index: number) => { const rows = attendeeQueries[index]?.data ?? []; const count = rows.reduce((total: number, row: any) => total + row.bookings.length, 0); return <Card key={event.id} className="event-admin-card"><div className="event-admin-top"><div className="event-icon"><CalendarDays /></div><Badge tone={event.status === "DRAFT" ? "warning" : "success"}>{event.status}</Badge></div><h3>{event.name}</h3><p>{format(new Date(event.startDate), "dd MMM yyyy")} - {format(new Date(event.endDate), "dd MMM yyyy")}</p><div className="mini-stats"><span><UsersRound size={14} /> {count} attendees</span><span>{event._count?.sessions ?? 0} sessions</span></div><Link className="btn btn-primary btn-block" to={`/admin/events/${event.id}/attendees`}>View attendees</Link></Card>; })}</div>{!events.data?.length && <Empty title="No events yet" />}</>;
}
