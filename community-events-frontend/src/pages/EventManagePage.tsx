import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  CalendarClock,
  Download,
  IndianRupee,
  Rocket,
  UsersRound,
} from "lucide-react";
import { format } from "date-fns";
import { api, errorMessage, unwrap } from "../api/client";
import { Badge, Card, Empty, PageHeader, Spinner } from "../components/Ui";

const validTime = (x: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(x);
function TimeFields({
  form,
  setForm,
}: {
  form: any;
  setForm: (v: any) => void;
}) {
  return (
    <>
      <label>
        Start time
        <input
          type="time"
          value={form.startTime}
          onChange={(e) => setForm({ ...form, startTime: e.target.value })}
        />
      </label>
      <label>
        End time
        <input
          type="time"
          value={form.endTime}
          onChange={(e) => setForm({ ...form, endTime: e.target.value })}
        />
      </label>
    </>
  );
}
function SessionForm({
  initial,
  onClose,
  onSave,
  saving,
  title,
}: {
  initial: any;
  onClose: () => void;
  onSave: (v: any) => void;
  saving: boolean;
  title: string;
}) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  function submit() {
    if (!form.name?.trim()) return setError("Session name is required");
    if (
      !validTime(form.startTime) ||
      !validTime(form.endTime) ||
      form.startTime >= form.endTime
    )
      return setError("Use valid HH:MM times; end time must be later");
    if (Number(form.capacity) < 1)
      return setError("Capacity must be at least 1");
    onSave({
      ...form,
      name: form.name.trim(),
      capacity: Number(form.capacity),
    });
  }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <div className="form-grid">
          <label>
            Session name
            <input
              value={form.name ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          {form.sessionType !== undefined && (
            <label>
              Type
              <select value={form.sessionType} onChange={(e) => setForm({ ...form, sessionType: e.target.value })}>
                <option value="DAILY">Daily</option>
                <option value="SPECIAL">Special</option>
              </select>
            </label>
          )}
          {form.sessionType !== undefined && (
            <label>
              Type
              <select
                value={form.sessionType}
                onChange={(e) =>
                  setForm({ ...form, sessionType: e.target.value })
                }
              >
                <option value="DAILY">Daily</option>
                <option value="SPECIAL">Special</option>
              </select>
            </label>
          )}
          <label>
            Capacity
            <input
              type="number"
              min="1"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            />
          </label>
          <TimeFields form={form} setForm={setForm} />
          {form.sessionDate !== undefined && (
            <label>
              Date
              <input
                type="date"
                value={form.sessionDate}
                onChange={(e) =>
                  setForm({ ...form, sessionDate: e.target.value })
                }
              />
            </label>
          )}
        </div>
        <label>
          <input
            type="checkbox"
            checked={form.allowWaitlist}
            onChange={(e) =>
              setForm({ ...form, allowWaitlist: e.target.checked })
            }
          />{" "}
          Allow waitlist
        </label>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={saving}
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
export default function EventManagePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<any>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [specialOpen, setSpecialOpen] = useState(false);
  const q = useQuery({
    queryKey: ["event", id],
    queryFn: () => api.get(`/events/${id}`).then(unwrap<any>),
    enabled: !!id,
  });
  const participation = useQuery({
    queryKey: ["event-participation", id],
    queryFn: () => api.get(`/events/${id}/participation`).then(unwrap<any[]>),
    enabled: !!id,
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["event", id] });
    qc.invalidateQueries({ queryKey: ["event-participation", id] });
  };
  const generate = useMutation({
    mutationFn: () =>
      api
        .post(`/events/${id}/sessions/generate`, {
          name: "Daily Pooja",
          capacity: 5,
          startTime: "08:00",
          endTime: "10:00",
          allowWaitlist: true,
        })
        .then(unwrap<any>),
    onSuccess: () => {
      setMessage("Daily Pooja sessions generated");
      refresh();
    },
    onError: (e) => setMessage(errorMessage(e)),
  });
  const update = useMutation({
    mutationFn: (v: any) =>
      api.patch(`/events/${id}/sessions/${v.id}`, v).then(unwrap<any>),
    onSuccess: () => {
      setEditing(null);
      setMessage("Session updated");
      refresh();
    },
    onError: (e) => setMessage(errorMessage(e)),
  });
  const bulk = useMutation({
    mutationFn: (v: any) =>
      api.patch(`/events/${id}/sessions/bulk`, v).then(unwrap<any>),
    onSuccess: () => {
      setBulkOpen(false);
      setMessage("All sessions updated");
      refresh();
    },
    onError: (e) => setMessage(errorMessage(e)),
  });
  const special = useMutation({
    mutationFn: (v: any) =>
      api.post(`/events/${id}/sessions`, v).then(unwrap<any>),
    onSuccess: () => {
      setSpecialOpen(false);
      setMessage("Special pooja added");
      refresh();
    },
    onError: (e) => setMessage(errorMessage(e)),
  });
  const campaign = useMutation({
    mutationFn: () =>
      api
        .post(`/events/${id}/contribution-campaigns`, {
          name: "Festival Contribution",
          amountPerUnit: 2000,
          isMandatory: false,
        })
        .then(unwrap<any>),
    onSuccess: () => {
      setMessage("Contribution ledger created");
      refresh();
    },
    onError: (e) => setMessage(errorMessage(e)),
  });
  const publish = useMutation({
    mutationFn: () => api.post(`/events/${id}/publish`).then(unwrap<any>),
    onSuccess: () => {
      setMessage("Event published");
      refresh();
    },
    onError: (e) => setMessage(errorMessage(e)),
  });
  if (q.isLoading) return <Spinner />;
  const e = q.data;
  if (!e) return null;
  function exportParticipation() {
    const lines = ["date,session,flat,resident,adults,children,seniors"];
    for (const s of participation.data ?? [])
      for (const b of s.bookings)
        lines.push(
          [
            format(new Date(s.sessionDate), "yyyy-MM-dd"),
            s.name,
            b.unit,
            b.resident,
            b.adults,
            b.children,
            b.seniors,
          ]
            .map((v: any) => `"${String(v).replaceAll('"', '""')}"`)
            .join(","),
        );
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${e.slug}-participation.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  return (
    <>
      <PageHeader
        title={e.name}
        subtitle={`${format(new Date(e.startDate), "dd MMM yyyy")} - ${format(new Date(e.endDate), "dd MMM yyyy")}`}
        action={
          <Badge tone={e.status === "DRAFT" ? "warning" : "success"}>
            {e.status}
          </Badge>
        }
      />
      {message && (
        <div className="notice">
          {message}
          <button onClick={() => setMessage("")}>x</button>
        </div>
      )}
      <div className="event-subnav"><button className="btn btn-primary">Event setup</button><button className="btn btn-secondary" onClick={() => navigate(`/admin/events/${id}/attendees`)}><UsersRound size={16} /> Attendees ({e._count?.bookings ?? 0})</button></div>
      <div className="setup-grid">
        <Card>
          <div className="setup-head">
            <CalendarClock />
            <div>
              <strong>Participation sessions</strong>
              <span>{e.sessions.length} configured</span>
            </div>
          </div>
          <p>Create daily sessions or edit all timings together.</p>
          <div className="action-row">
            <button
              className="btn btn-secondary"
              onClick={() => generate.mutate()}
              disabled={generate.isPending}
            >
              Generate daily sessions
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setBulkOpen(true)}
            >
              Bulk edit Daily Pooja
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setSpecialOpen(true)}
            >
              Add special pooja
            </button>
          </div>
        </Card>
        <Card>
          <div className="setup-head">
            <IndianRupee />
            <div>
              <strong>Contribution campaign</strong>
              <span>
                {e.campaigns.length
                  ? `Rs ${Number(e.campaigns[0].amountPerUnit).toLocaleString("en-IN")} per flat`
                  : "Not configured"}
              </span>
            </div>
          </div>
          <p>Persist an obligation row for every active flat.</p>
          <button
            className="btn btn-secondary"
            onClick={() => campaign.mutate()}
            disabled={campaign.isPending || e.campaigns.length > 0}
          >
            {e.campaigns.length ? "Campaign created" : "Create campaign"}
          </button>
        </Card>
        <Card>
          <div className="setup-head">
            <Rocket />
            <div>
              <strong>Publish</strong>
              <span>Make visible to residents</span>
            </div>
          </div>
          <p>Publishing requires at least one session.</p>
          <button
            className="btn btn-primary"
            onClick={() => publish.mutate()}
            disabled={publish.isPending || e.status !== "DRAFT"}
          >
            {e.status === "DRAFT" ? "Publish event" : "Published"}
          </button>
        </Card>
      </div>
      <Card>
        <h3>Sessions</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Session</th>
                <th>Type</th>
                <th>Time</th>
                <th>Capacity</th>
                <th>Waitlist</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {e.sessions.map((s: any) => (
                <tr key={s.id}>
                  <td>{format(new Date(s.sessionDate), "EEE, dd MMM")}</td>
                  <td>{s.name}</td>
                  <td>{s.sessionType === "SPECIAL" ? "Special" : "Daily"}</td>
                  <td>
                    {s.startTime} - {s.endTime}
                  </td>
                  <td>{s.capacity}</td>
                  <td>{s.allowWaitlist ? "Enabled" : "Disabled"}</td>
                  <td>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setEditing(s)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="participation-heading">
        <div>
          <h2>Family participation</h2>
          <p>Authoritative flat-by-date view.</p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={exportParticipation}
          disabled={!participation.data?.some((s) => s.bookings.length)}
        >
          <Download size={17} />
          Export CSV
        </button>
      </div>
      {participation.isLoading ? (
        <Spinner />
      ) : participation.data?.length ? (
        <div className="participation-grid">
          {participation.data.map((s: any) => (
            <Card key={s.id} className="participation-card">
              <div className="participation-card-head">
                <div>
                  <strong>
                    {format(new Date(s.sessionDate), "EEEE, dd MMM")}
                  </strong>
                  <span>
                    {s.startTime} - {s.bookings.length}/{s.capacity} families
                  </span>
                </div>
                <Badge
                  tone={
                    s.capacity && s.bookings.length >= s.capacity
                      ? "danger"
                      : "success"
                  }
                >
                  {s.capacity && s.bookings.length >= s.capacity
                    ? "Full"
                    : `${Math.max(0, (s.capacity ?? 0) - s.bookings.length)} left`}
                </Badge>
              </div>
              {s.bookings.length ? (
                <div className="participant-list">
                  {s.bookings.map((b: any) => (
                    <div key={b.id}>
                      <span className="flat-pill">{b.unit}</span>
                      <div>
                        <strong>{b.resident}</strong>
                        <span>
                          {b.adults} adults - {b.children} children -{" "}
                          {b.seniors} seniors
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty title="No families booked" />
              )}
              {s.waitlist.length > 0 && (
                <div className="waitlist-mini">
                  <UsersRound size={16} />
                  <strong>Waitlist</strong>
                  {s.waitlist.map((w: any) => (
                    <span key={w.id}>
                      #{w.position} {w.unit}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Empty title="No sessions yet" description="Generate sessions above." />
      )}
      {editing && (
        <SessionForm
          title="Edit session"
          initial={{
            id: editing.id,
            name: editing.name,
            sessionType: editing.sessionType ?? "DAILY",
            startTime: editing.startTime,
            endTime: editing.endTime,
            capacity: editing.capacity,
            allowWaitlist: editing.allowWaitlist,
          }}
          onClose={() => setEditing(null)}
          onSave={(v) => update.mutate(v)}
          saving={update.isPending}
        />
      )}{" "}
      {bulkOpen && (
        <SessionForm
          title="Bulk edit Daily Pooja"
          initial={{
            startTime: e.sessions[0]?.startTime ?? "08:00",
            endTime: e.sessions[0]?.endTime ?? "10:00",
            capacity: e.sessions[0]?.capacity ?? 5,
            allowWaitlist: e.sessions[0]?.allowWaitlist ?? true,
          }}
          onClose={() => setBulkOpen(false)}
          onSave={(v) => bulk.mutate(v)}
          saving={bulk.isPending}
        />
      )}{" "}
      {specialOpen && (
        <SessionForm
          title="Add special pooja"
          initial={{
            name: "Special Pooja",
            sessionType: "SPECIAL",
            sessionDate: format(new Date(e.startDate), "yyyy-MM-dd"),
            startTime: "10:30",
            endTime: "12:00",
            capacity: 5,
            allowWaitlist: true,
          }}
          onClose={() => setSpecialOpen(false)}
          onSave={(v) => special.mutate(v)}
          saving={special.isPending}
        />
      )}
    </>
  );
}
