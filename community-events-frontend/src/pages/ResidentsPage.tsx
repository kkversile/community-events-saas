import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Plus, Search, Upload, UserRoundPlus } from "lucide-react";
import { api, errorMessage, unwrap } from "../api/client";
import { Badge, Card, PageHeader, Spinner } from "../components/Ui";

export default function ResidentsPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [qtext, setQtext] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [importRows, setImportRows] = useState<any[] | null>(null);
  const [fileError, setFileError] = useState("");
  const [editing, setEditing] = useState<any | null>(null);

  const q = useQuery({
    queryKey: ["residents"],
    queryFn: () => api.get("/residents").then(unwrap<any[]>),
  });
  const units = useQuery({
    queryKey: ["units"],
    queryFn: () => api.get("/units").then(unwrap<any[]>),
  });
  const rows = useMemo(
    () =>
      q.data?.filter(
        (r) =>
          !qtext ||
          `${r.firstName} ${r.lastName ?? ""} ${r.mobile} ${r.memberships?.[0]?.unit?.unitNumber ?? ""}`
            .toLowerCase()
            .includes(qtext.toLowerCase()),
      ) ?? [],
    [q.data, qtext],
  );
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const visibleRows = rows.slice((page - 1) * pageSize, page * pageSize);

  if (q.isLoading || units.isLoading) return <Spinner />;

  async function loadCsv(file?: File) {
    if (!file) return;
    setFileError("");
    try {
      const text = await file.text();
      setImportRows(parseCsv(text));
    } catch (error) {
      setFileError(
        error instanceof Error ? error.message : "Could not read CSV",
      );
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
      <PageHeader
        title="Residents"
        subtitle="Users are separate from flats, so occupancy history remains correct."
        action={
          <div className="action-row">
            <input
              ref={fileRef}
              hidden
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => loadCsv(e.target.files?.[0])}
            />
            <button
              className="btn btn-secondary"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={17} />
              Import CSV
            </button>
            <button className="btn btn-primary" onClick={() => setOpen(true)}>
              <Plus size={17} />
              Add resident
            </button>
          </div>
        }
      />
      {fileError && <div className="form-error page-error">{fileError}</div>}
      <Card>
        <div className="toolbar">
          <div className="searchbox">
            <Search size={17} />
            <input
              placeholder="Search name, mobile or flat number"
              value={qtext}
              onChange={(e) => { setQtext(e.target.value); setPage(1); }}
            />
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Flat</th>
                <th>Resident</th>
                <th>Mobile</th>
                <th>Role</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r: any) => {
                const m = r.memberships?.[0];
                return (
                  <tr key={r.id}>
                    <td>
                      <strong>
                        {m
                          ? `${m.unit.building.code}-${m.unit.unitNumber}`
                          : "—"}
                      </strong>
                    </td>
                    <td>
                      {r.firstName} {r.lastName}
                    </td>
                    <td>{r.mobile}</td>
                    <td>{m?.role ?? r.roles?.[0]?.role ?? "—"}</td>
                    <td>
                      <Badge
                        tone={r.status === "ACTIVE" ? "success" : "warning"}
                      >
                        {r.status}
                      </Badge>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setEditing(r)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          <div className="pagination"><span>Showing {visibleRows.length ? (page - 1) * pageSize + 1 : 0}-{Math.min(page * pageSize, rows.length)} of {rows.length}</span><div className="action-row"><button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button><span>Page {page} of {pageCount}</span><button className="btn btn-ghost" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>Next</button></div></div>
      </Card>
      {open && (
        <ResidentModal
          units={units.data ?? []}
          onClose={() => setOpen(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["residents"] });
            qc.invalidateQueries({ queryKey: ["units"] });
          }}
        />
      )}
      {importRows && (
        <ImportResidentsModal
          rows={importRows}
          onClose={() => setImportRows(null)}
          onImported={() => {
            qc.invalidateQueries({ queryKey: ["residents"] });
            qc.invalidateQueries({ queryKey: ["units"] });
          }}
        />
      )}
      {editing && (
        <EditResidentModal
          resident={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["residents"] });
          }}
        />
      )}
    </>
  );
}

function EditResidentModal({
  resident,
  onClose,
  onSaved,
}: {
  resident: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    firstName: resident.firstName ?? "",
    lastName: resident.lastName ?? "",
    mobile: resident.mobile ?? "",
    email: resident.email ?? "",
    password: "",
  });
  const [error, setError] = useState("");
  const m = useMutation({
    mutationFn: () =>
      api.patch(`/residents/${resident.id}`, form).then(unwrap<any>),
    onSuccess: onSaved,
    onError: (e) => setError(errorMessage(e)),
  });
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon">
          <UserRoundPlus />
        </div>
        <h3>Edit resident</h3>
        <div className="form-grid">
          <label>
            First name
            <input
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </label>
          <label>
            Last name
            <input
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </label>
          <label>
            Mobile
            <input
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className="span2">
            Set password{" "}
            <input
              type="password"
              minLength={8}
              placeholder="Leave blank to keep current password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => m.mutate()}
            disabled={m.isPending}
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

function ResidentModal({
  units,
  onClose,
  onSaved,
}: {
  units: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    mobile: "",
    unitId: units.find((u) => u.isActive)?.id ?? "",
    membershipRole: "PRIMARY_RESIDENT",
  });
  const [error, setError] = useState("");
  const [created, setCreated] = useState<any>(null);
  const m = useMutation({
    mutationFn: () => api.post("/residents", form).then(unwrap<any>),
    onSuccess: (d) => {
      setCreated(d);
      onSaved();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  if (created)
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-icon">
            <UserRoundPlus />
          </div>
          <h3>Resident created</h3>
          <p>
            Share these temporary credentials privately. The resident will be
            forced to choose a new password after login.
          </p>
          <div className="credential-box">
            <span>Mobile</span>
            <strong>{created.mobile}</strong>
            <span>Login</span>
            <strong className="mono">
              {created.temporaryPassword ?? "Existing account linked"}
            </strong>
          </div>
          <div className="modal-actions">
            <button className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    );
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon">
          <UserRoundPlus />
        </div>
        <h3>Add resident</h3>
        <div className="form-grid">
          <label>
            First name
            <input
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </label>
          <label>
            Last name
            <input
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </label>
          <label>
            Mobile
            <input
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
            />
          </label>
          <label>
            Flat
            <select
              value={form.unitId}
              onChange={(e) => setForm({ ...form, unitId: e.target.value })}
            >
              {units.map((u) => (
                <option value={u.id} key={u.id}>
                  {u.building.code}-{u.unitNumber}
                </option>
              ))}
            </select>
          </label>
          <label>
            Membership
            <select
              value={form.membershipRole}
              onChange={(e) =>
                setForm({ ...form, membershipRole: e.target.value })
              }
            >
              <option>PRIMARY_RESIDENT</option>
              <option>OWNER</option>
              <option>TENANT</option>
              <option>FAMILY_MEMBER</option>
            </select>
          </label>
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="hint">
          A unique temporary password will be generated. It is never stored in
          plaintext.
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => m.mutate()}
            disabled={m.isPending}
          >
            Create resident
          </button>
        </div>
      </div>
    </div>
  );
}

function ImportResidentsModal({
  rows,
  onClose,
  onImported,
}: {
  rows: any[];
  onClose: () => void;
  onImported: () => void;
}) {
  const [preview, setPreview] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const previewMutation = useMutation({
    mutationFn: () =>
      api.post("/residents/import", { rows, dryRun: true }).then(unwrap<any>),
    onSuccess: setPreview,
    onError: (e) => setError(errorMessage(e)),
  });
  const importMutation = useMutation({
    mutationFn: () =>
      api.post("/residents/import", { rows, dryRun: false }).then(unwrap<any>),
    onSuccess: (d) => {
      setResult(d);
      onImported();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  useEffect(() => {
    previewMutation.mutate();
  }, []);

  function downloadCredentials() {
    if (!result?.credentials?.length) return;
    const csv = [
      "buildingCode,unitNumber,mobile,temporaryPassword",
      ...result.credentials.map((x: any) =>
        [x.buildingCode, x.unitNumber, x.mobile, x.temporaryPassword].join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "resident-temporary-credentials.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon">
          <Upload />
        </div>
        <h3>Import residents</h3>
        {!result && (
          <p>
            CSV columns:{" "}
            <span className="mono">
              buildingCode, unitNumber, firstName, lastName, mobile, email
            </span>
            . Import is blocked until every row passes preflight validation.
          </p>
        )}
        {previewMutation.isPending && (
          <div className="hint">Validating {rows.length} rows…</div>
        )}
        {error && <div className="form-error">{error}</div>}
        {preview && (
          <>
            <div className="import-summary">
              <div>
                <span>Total</span>
                <strong>{preview.total}</strong>
              </div>
              <div>
                <span>Valid</span>
                <strong>{preview.valid}</strong>
              </div>
              <div>
                <span>Errors</span>
                <strong>{preview.errors.length}</strong>
              </div>
            </div>
            {preview.errors.length > 0 && (
              <div className="import-errors">
                {preview.errors.map((e: any) => (
                  <div key={`${e.row}-${e.message}`}>
                    <strong>Row {e.row}</strong>
                    <span>{e.message}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {result && (
          <>
            <div className="success-box">
              <strong>{result.imported} residents imported</strong>
              <span>
                Download the temporary credentials now and share them privately.
                They are not recoverable from the database.
              </span>
            </div>
            <button
              className="btn btn-secondary btn-block"
              onClick={downloadCredentials}
            >
              <Download size={17} />
              Download temporary credentials
            </button>
          </>
        )}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            {result ? "Done" : "Cancel"}
          </button>
          {preview?.readyToImport && !result && (
            <button
              className="btn btn-primary"
              onClick={() => importMutation.mutate()}
              disabled={importMutation.isPending}
            >
              {importMutation.isPending ? "Importing…" : "Import residents"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function parseCsv(text: string) {
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field.trim());
      field = "";
      if (row.some(Boolean)) records.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field.trim());
  if (row.some(Boolean)) records.push(row);
  if (records.length < 2) throw new Error("CSV has no data rows");
  const headers = records[0].map((h) => h.trim());
  const required = ["buildingCode", "unitNumber", "firstName", "mobile"];
  const missing = required.filter((h) => !headers.includes(h));
  if (missing.length) throw new Error(`Missing columns: ${missing.join(", ")}`);
  return records
    .slice(1)
    .map((cols) =>
      Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? ""])),
    )
    .map((r) => ({
      buildingCode: r.buildingCode,
      unitNumber: r.unitNumber,
      firstName: r.firstName,
      lastName: r.lastName || undefined,
      mobile: r.mobile,
      email: r.email || undefined,
    }));
}
