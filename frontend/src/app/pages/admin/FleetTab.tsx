import { useMemo, useState } from "react";
import type * as React from "react";
import type { CellValueChangedEvent, ColDef, ICellRendererParams } from "ag-grid-community";
import { AdminDataGrid } from "../../components/AdminDataGrid";
import { SectionCard } from "../../components/ui";
import type { StaffData } from "../../hooks/useStaffData";
import { api } from "../../lib/api";
import type { Car, Location } from "../../lib/types";

export function FleetTab({
  staff,
  locationForm,
  carForm,
  setLocationForm,
  setCarForm,
  createLocation,
  createCar,
  deleteLocation,
}: {
  staff: StaffData;
  locationForm: { street: string; city: string; state: string; zip: string };
  carForm: { vin: string; current_odometer_reading: string; location_id: string; model_name: string };
  setLocationForm: React.Dispatch<React.SetStateAction<{ street: string; city: string; state: string; zip: string }>>;
  setCarForm: React.Dispatch<React.SetStateAction<{ vin: string; current_odometer_reading: string; location_id: string; model_name: string }>>;
  createLocation: (event: React.FormEvent) => Promise<void> | void;
  createCar: (event: React.FormEvent) => Promise<void> | void;
  deleteLocation: (locationId: string, city: string) => void;
}) {
  const [openForm, setOpenForm] = useState<"location" | "car" | "">("");
  const selectedModel = staff.modelByName[carForm.model_name];
  const selectedModelClass = selectedModel ? staff.classById[selectedModel.class_id] : undefined;
  const modelsByClass = staff.carClasses.map((carClass) => ({
    carClass,
    models: staff.models.filter((model) => model.class_id === carClass.class_id),
  })).filter((group) => group.models.length > 0);

  async function updateLocationCell(event: CellValueChangedEvent<Location>) {
    const field = event.colDef.field as keyof Location | undefined;
    if (!field || field === "location_id" || event.oldValue === event.newValue) {
      return;
    }
    const value = field === "state"
      ? String(event.newValue ?? "").toUpperCase().slice(0, 2)
      : String(event.newValue ?? "").trim();

    await staff.perform(async () => {
      await api.updateLocation(event.data.location_id, { [field]: value } as Partial<Omit<Location, "location_id">>);
    }, "Location updated.");
  }

  async function updateCarCell(event: CellValueChangedEvent<Car>) {
    const field = event.colDef.field as keyof Car | undefined;
    if (!field || field === "vin" || event.oldValue === event.newValue) {
      return;
    }
    const value = field === "current_odometer_reading"
      ? Number(event.newValue || 0)
      : String(event.newValue ?? "").trim();

    if (field === "current_odometer_reading" && Number.isNaN(value)) {
      staff.setError("Odometer must be a valid number.");
      return;
    }

    await staff.perform(async () => {
      await api.updateCar(event.data.vin, { [field]: value } as Partial<Omit<Car, "vin">>);
    }, "Car updated.");
  }

  async function removeCar(vin: string) {
    if (!window.confirm(`Delete car ${vin}?`)) {
      return;
    }
    await staff.perform(async () => {
      await api.deleteCar(vin);
    }, "Car deleted.");
  }

  const locationColumns = useMemo<ColDef<Location>[]>(() => ([
    { field: "city", headerName: "City", editable: true, minWidth: 160 },
    { field: "state", headerName: "State", editable: true, minWidth: 110, valueParser: (params) => String(params.newValue ?? "").toUpperCase().slice(0, 2) },
    { field: "street", headerName: "Street", editable: true, minWidth: 230 },
    { field: "zip", headerName: "ZIP", editable: true, minWidth: 120 },
    { field: "location_id", headerName: "Location ID", minWidth: 260 },
    {
      headerName: "Actions",
      editable: false,
      filter: false,
      sortable: false,
      pinned: "right",
      width: 120,
      cellRenderer: (params: ICellRendererParams<Location>) => (
        <button type="button" className="grid-action-button danger" onClick={() => params.data && deleteLocation(params.data.location_id, params.data.city)}>
          Delete
        </button>
      ),
    },
  ]), [deleteLocation]);

  const carColumns = useMemo<ColDef<Car>[]>(() => {
    const locationIds = staff.locations.map((location) => location.location_id);
    const modelNames = staff.models.map((model) => model.model_name);
    const locationName = (locationId: string | null | undefined) => {
      const location = locationId ? staff.locationById[locationId] : undefined;
      return location ? `${location.city}, ${location.state}` : locationId || "-";
    };
    const modelName = (name: string | null | undefined) => {
      const model = name ? staff.modelByName[name] : undefined;
      const carClass = model ? staff.classById[model.class_id] : undefined;
      return model ? `${model.make_name} ${model.model_name} (${carClass?.class_name || "Unclassified"})` : name || "-";
    };

    return [
      { field: "vin", headerName: "VIN", minWidth: 190 },
      {
        field: "location_id",
        headerName: "Location",
        editable: true,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: locationIds },
        valueFormatter: (params) => locationName(String(params.value || "")),
        minWidth: 180,
      },
      {
        field: "model_name",
        headerName: "Model / Class",
        editable: true,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: modelNames },
        valueFormatter: (params) => modelName(String(params.value || "")),
        minWidth: 270,
      },
      {
        field: "current_odometer_reading",
        headerName: "Odometer",
        editable: true,
        valueParser: (params) => Number(params.newValue || 0),
        minWidth: 145,
      },
      {
        headerName: "Status",
        valueGetter: (params) => staff.openRentalVinSet.has(params.data?.vin || "") ? "Rented" : "Available",
        minWidth: 130,
      },
      {
        headerName: "Actions",
        editable: false,
        filter: false,
        sortable: false,
        pinned: "right",
        width: 120,
        cellRenderer: (params: ICellRendererParams<Car>) => (
          <button type="button" className="grid-action-button danger" onClick={() => params.data && void removeCar(params.data.vin)}>
            Delete
          </button>
        ),
      },
    ];
  }, [staff]);

  return (
    <>
      <SectionCard title="Locations And Fleet" subtitle="Manage branch setup and physical inventory from stacked mobile cards.">
        <div className="action-strip">
          <button type="button" onClick={() => setOpenForm(openForm === "location" ? "" : "location")}>Add Location</button>
          <button type="button" onClick={() => setOpenForm(openForm === "car" ? "" : "car")}>Register Car</button>
        </div>
        {openForm === "location" ? (
          <form className="stack-form" onSubmit={async (event) => { await createLocation(event); setOpenForm(""); }}>
            <div className="field-grid two-col">
              <input placeholder="Street" value={locationForm.street} onChange={(e) => setLocationForm((c) => ({ ...c, street: e.target.value }))} required />
              <input placeholder="City" value={locationForm.city} onChange={(e) => setLocationForm((c) => ({ ...c, city: e.target.value }))} required />
              <input placeholder="State" value={locationForm.state} onChange={(e) => setLocationForm((c) => ({ ...c, state: e.target.value.toUpperCase().slice(0, 2) }))} required />
              <input placeholder="ZIP" value={locationForm.zip} onChange={(e) => setLocationForm((c) => ({ ...c, zip: e.target.value }))} required />
            </div>
            <div className="action-strip">
              <button type="submit">Save Location</button>
              <button type="button" className="ghost-button" onClick={() => setOpenForm("")}>Cancel</button>
            </div>
          </form>
        ) : null}
        {openForm === "car" ? (
          <form className="stack-form" onSubmit={async (event) => { await createCar(event); setOpenForm(""); }}>
            <input placeholder="VIN" minLength={17} maxLength={17} value={carForm.vin} onChange={(e) => setCarForm((c) => ({ ...c, vin: e.target.value }))} required />
            <input type="number" min="0" placeholder="Current odometer" value={carForm.current_odometer_reading} onChange={(e) => setCarForm((c) => ({ ...c, current_odometer_reading: e.target.value }))} required />
            <select aria-label="Car branch location" value={carForm.location_id} onChange={(e) => setCarForm((c) => ({ ...c, location_id: e.target.value }))} required>
              <option value="">Location</option>
              {staff.locations.map((item) => <option key={item.location_id} value={item.location_id}>{item.city}, {item.state}</option>)}
            </select>
            <select aria-label="Car model" value={carForm.model_name} onChange={(e) => setCarForm((c) => ({ ...c, model_name: e.target.value }))} required>
              <option value="">Model</option>
              {modelsByClass.map((group) => (
                <optgroup key={group.carClass.class_id} label={group.carClass.class_name}>
                  {group.models.map((item) => (
                    <option key={item.model_name} value={item.model_name}>
                      {item.make_name} {item.model_name} ({item.model_year})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {selectedModel ? (
              <div className="identity-card">
                <strong>Relational assignment</strong>
                <span>{selectedModel.make_name} {selectedModel.model_name} is governed by {selectedModelClass?.class_name || "Unknown class"}</span>
                <p>Cars inherit their rental class through the selected model. Change the model if this VIN belongs to a different class.</p>
              </div>
            ) : null}
            <div className="action-strip">
              <button type="submit">Save Car</button>
              <button type="button" className="ghost-button" onClick={() => setOpenForm("")}>Cancel</button>
            </div>
          </form>
        ) : null}
      </SectionCard>
      <SectionCard title="Locations" subtitle="Inline edit branch address details. Delete remains guarded by backend constraints.">
        <AdminDataGrid
          rows={staff.locations}
          columns={locationColumns}
          getRowId={(location) => location.location_id}
          emptyText="No locations configured."
          height={360}
          onCellValueChanged={updateLocationCell}
        />
      </SectionCard>
      <SectionCard title="Cars" subtitle="Inline edit branch assignment, model/class, and odometer while preserving VIN identity.">
        <AdminDataGrid
          rows={staff.cars}
          columns={carColumns}
          getRowId={(car) => car.vin}
          emptyText="No cars registered."
          height={500}
          onCellValueChanged={updateCarCell}
        />
      </SectionCard>
    </>
  );
}
