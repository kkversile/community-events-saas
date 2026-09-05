import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Home, Pencil, Plus } from "lucide-react";
import { api, errorMessage, unwrap } from "../api/client";
import { Badge, Card, PageHeader, Spinner } from "../components/Ui";
export default function BuildingsUnitsPage() {
  const qc = useQueryClient();
  const [buildingOpen, setBuildingOpen] = useState(false),
    [unitOpen, setUnitOpen] = useState(false),
    [editingBuilding, setEditingBuilding] = useState<any>(null),
    [editingUnit, setEditingUnit] = useState<any>(null),
    [removingBuilding, setRemovingBuilding] = useState<any>(null),
    [flatSearch, setFlatSearch] = useState(""),
    [flatPage, setFlatPage] = useState(1);
  const b = useQuery({
      queryKey: ["buildings"],
      queryFn: () => api.get("/buildings").then(unwrap<any[]>),
    }),
    u = useQuery({
      queryKey: ["units"],
      queryFn: () => api.get("/units").then(unwrap<any[]>),
    });
  const removeBuilding = useMutation({
    mutationFn: (building: any) => api.delete(`/buildings/${building.id}`),
    onSuccess: () => {
      setRemovingBuilding(null);
      qc.invalidateQueries({ queryKey: ["buildings"] });
      qc.invalidateQueries({ queryKey: ["units"] });
    },
  });
  const filteredUnits = useMemo(() => {
    const term = flatSearch.trim().toLowerCase().replace(/\s+/g, "");
    if (!term) return u.data ?? [];
    return (u.data ?? []).filter((x: any) => `${x.building.code}-${x.unitNumber}`.toLowerCase().includes(term) || String(x.unitNumber).toLowerCase().includes(term));
  }, [u.data, flatSearch]);
  const flatPageSize = 10;
  const flatPageCount = Math.max(1, Math.ceil(filteredUnits.length / flatPageSize));
  const visibleUnits = filteredUnits.slice((flatPage - 1) * flatPageSize, flatPage * flatPageSize);
  if (b.isLoading || u.isLoading) return <Spinner />;
  return (
    <>
      <PageHeader
        title="Buildings & Flats"
        subtitle="Physical units remain stable even when residents change."
        action={
          <div className="action-row">
            <button
              className="btn btn-secondary"
              onClick={() => setBuildingOpen(true)}
            >
              <Building2 size={17} />
              Building
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setUnitOpen(true)}
            >
              <Plus size={17} />
              Flat
            </button>
          </div>
        }
      />
      <div className="two-col">
        <Card>
          <h3>Buildings</h3>
          <div className="master-list">
            {b.data?.map((x: any) => (
              <div className="master-row" key={x.id}>
                <div>
                  <strong>{x.name}</strong>
                  <span>
                    {x.code} · {x._count.units} flats
                  </span>
                </div>
                <Badge tone={x.isActive ? "success" : "neutral"}>
                  {x.isActive ? "Active" : "Inactive"}
                </Badge>
                <button
                  className="btn btn-secondary"
                  onClick={() => setEditingBuilding(x)}
                  title="Edit building"
                >
                  <Pencil size={15} /> Edit
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => setRemovingBuilding(x)}
                  disabled={!x.isActive}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3>Flats</h3>
          <div className="toolbar"><input aria-label="Search flat number" placeholder="Search flat number (e.g. 101 or A-101)" value={flatSearch} onChange={(e) => { setFlatSearch(e.target.value); setFlatPage(1); }} /></div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Flat</th>
                  <th>Floor</th>
                  <th>Resident</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleUnits.map((x: any) => (
                  <tr key={x.id}>
                    <td>
                      <strong>
                        {x.building.code}-{x.unitNumber}
                      </strong>
                    </td>
                    <td>{x.floor ?? "—"}</td>
                    <td>
                      {x.memberships?.[0]?.user?.firstName ?? "Unassigned"}
                    </td>
                    <td>
                      <Badge tone={x.isActive ? "success" : "neutral"}>
                        {x.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setEditingUnit(x)}
                        title="Edit flat"
                      >
                        <Pencil size={15} /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination"><span>Showing {visibleUnits.length ? (flatPage - 1) * flatPageSize + 1 : 0}-{Math.min(flatPage * flatPageSize, filteredUnits.length)} of {filteredUnits.length}</span><div className="action-row"><button className="btn btn-ghost" disabled={flatPage <= 1} onClick={() => setFlatPage((p) => p - 1)}>Previous</button><span>Page {flatPage} of {flatPageCount}</span><button className="btn btn-ghost" disabled={flatPage >= flatPageCount} onClick={() => setFlatPage((p) => p + 1)}>Next</button></div></div>
        </Card>
      </div>
      {buildingOpen && (
        <SimpleCreate
          title="Add building"
          icon={<Building2 />}
          fields={[
            ["name", "Building name"],
            ["code", "Code"],
          ]}
          onClose={() => setBuildingOpen(false)}
          onSubmit={(v) =>
            api
              .post("/buildings", {
                ...v,
                sortOrder: (b.data?.length ?? 0) + 1,
              })
              .then(() => {
                setBuildingOpen(false);
                qc.invalidateQueries({ queryKey: ["buildings"] });
              })
          }
        />
      )}{" "}
      {unitOpen && (
        <UnitCreate
          buildings={b.data ?? []}
          onClose={() => setUnitOpen(false)}
          onSaved={() => {
            setUnitOpen(false);
            qc.invalidateQueries({ queryKey: ["units"] });
            qc.invalidateQueries({ queryKey: ["buildings"] });
          }}
        />
      )}
      {editingBuilding && (
        <EditBuilding
          building={editingBuilding}
          onClose={() => setEditingBuilding(null)}
          onSaved={() => {
            setEditingBuilding(null);
            qc.invalidateQueries({ queryKey: ["buildings"] });
          }}
        />
      )}
      {editingUnit && (
        <EditUnit
          unit={editingUnit}
          onClose={() => setEditingUnit(null)}
          onSaved={() => {
            setEditingUnit(null);
            qc.invalidateQueries({ queryKey: ["units"] });
            qc.invalidateQueries({ queryKey: ["buildings"] });
          }}
        />
      )}
      {removingBuilding && (
        <ConfirmRemoveBuilding
          building={removingBuilding}
          saving={removeBuilding.isPending}
          error={removeBuilding.error ? errorMessage(removeBuilding.error) : ""}
          onClose={() => {
            if (!removeBuilding.isPending) setRemovingBuilding(null);
          }}
          onConfirm={() => removeBuilding.mutate(removingBuilding)}
        />
      )}
    </>
  );
}

function EditBuilding({
  building,
  onClose,
  onSaved,
}: {
  building: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [v, setV] = useState({
    name: building.name ?? "",
    isActive: !!building.isActive,
  });
  const [error, setError] = useState("");
  const m = useMutation({
    mutationFn: () => api.patch(`/buildings/${building.id}`, v),
    onSuccess: onSaved,
    onError: (e) => setError(errorMessage(e)),
  });
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon">
          <Building2 />
        </div>
        <h3>Edit building</h3>
        <label>
          Building name
          <input
            value={v.name}
            onChange={(e) => setV({ ...v, name: e.target.value })}
          />
        </label>
        <label className="checkbox-line">
          <input
            type="checkbox"
            checked={v.isActive}
            onChange={(e) => setV({ ...v, isActive: e.target.checked })}
          />{" "}
          Active
        </label>
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

function EditUnit({
  unit,
  onClose,
  onSaved,
}: {
  unit: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [v, setV] = useState({
    floor: unit.floor ?? "",
    unitType: unit.unitType ?? "Apartment",
    isActive: !!unit.isActive,
  });
  const [error, setError] = useState("");
  const m = useMutation({
    mutationFn: () => api.patch(`/units/${unit.id}`, v),
    onSuccess: onSaved,
    onError: (e) => setError(errorMessage(e)),
  });
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon">
          <Home />
        </div>
        <h3>
          Edit flat {unit.building.code}-{unit.unitNumber}
        </h3>
        <label>
          Floor
          <input
            value={v.floor}
            onChange={(e) => setV({ ...v, floor: e.target.value })}
          />
        </label>
        <label>
          Flat type
          <input
            value={v.unitType}
            onChange={(e) => setV({ ...v, unitType: e.target.value })}
          />
        </label>
        <label className="checkbox-line">
          <input
            type="checkbox"
            checked={v.isActive}
            onChange={(e) => setV({ ...v, isActive: e.target.checked })}
          />{" "}
          Active
        </label>
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

function ConfirmRemoveBuilding({
  building,
  saving,
  error,
  onClose,
  onConfirm,
}: {
  building: any;
  saving: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon">
          <Building2 />
        </div>
        <h3>Delete {building.name}?</h3>
        <p>
          This permanently deletes the block, all{" "}
          {building._count?.units ?? "associated"} flats, memberships, bookings,
          waitlist entries, and contribution records. This cannot be undone.
        </p>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={saving}
          >
            {saving ? "Deleting…" : "Delete block"}
          </button>
        </div>
      </div>
    </div>
  );
}
function SimpleCreate({
  title,
  icon,
  fields,
  onClose,
  onSubmit,
}: {
  title: string;
  icon: any;
  fields: string[][];
  onClose: () => void;
  onSubmit: (v: any) => Promise<any>;
}) {
  const [v, setV] = useState<any>({}),
    [error, setError] = useState("");
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon">{icon}</div>
        <h3>{title}</h3>
        {fields.map(([k, l]) => (
          <label key={k}>
            {l}
            <input
              value={v[k] ?? ""}
              onChange={(e) => setV({ ...v, [k]: e.target.value })}
            />
          </label>
        ))}
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onSubmit(v).catch((e) => setError(errorMessage(e)))}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
function UnitCreate({
  buildings,
  onClose,
  onSaved,
}: {
  buildings: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [v, setV] = useState({
      buildingId: buildings[0]?.id ?? "",
      unitNumber: "",
      floor: "",
      unitType: "Apartment",
    }),
    [error, setError] = useState("");
  const m = useMutation({
    mutationFn: () => api.post("/units", v),
    onSuccess: onSaved,
    onError: (e) => setError(errorMessage(e)),
  });
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon">
          <Home />
        </div>
        <h3>Add flat</h3>
        <label>
          Building
          <select
            value={v.buildingId}
            onChange={(e) => setV({ ...v, buildingId: e.target.value })}
          >
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Flat number
          <input
            value={v.unitNumber}
            onChange={(e) => setV({ ...v, unitNumber: e.target.value })}
          />
        </label>
        <label>
          Floor
          <input
            value={v.floor}
            onChange={(e) => setV({ ...v, floor: e.target.value })}
          />
        </label>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={() => m.mutate()}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
