import { useMemo, useState } from "react";
import type * as React from "react";
import type { CellValueChangedEvent, ColDef, ICellRendererParams } from "ag-grid-community";
import { api, formatCurrency } from "../../lib/api";
import { AdminDataGrid } from "../../components/AdminDataGrid";
import { SectionCard } from "../../components/ui";
import type { StaffData } from "../../hooks/useStaffData";
import type { CarClass, Model } from "../../lib/types";

export function PricingTab({
  staff,
  classForm,
  modelForm,
  setClassForm,
  setModelForm,
  createClass,
  createModel,
}: {
  staff: StaffData;
  classForm: { class_name: string; daily_rate: string; weekly_rate: string };
  modelForm: { model_name: string; make_name: string; model_year: string; class_id: string };
  setClassForm: React.Dispatch<React.SetStateAction<{ class_name: string; daily_rate: string; weekly_rate: string }>>;
  setModelForm: React.Dispatch<React.SetStateAction<{ model_name: string; make_name: string; model_year: string; class_id: string }>>;
  createClass: (event: React.FormEvent) => Promise<boolean> | boolean;
  createModel: (event: React.FormEvent) => Promise<boolean> | boolean;
}) {
  const [openForm, setOpenForm] = useState<"class" | "model" | "">("");
  const modelsByClassId = useMemo(() => staff.models.reduce<Record<string, typeof staff.models>>((groups, model) => {
    groups[model.class_id] = [...(groups[model.class_id] || []), model];
    return groups;
  }, {}), [staff.models]);
  const selectedClass = staff.classById[modelForm.class_id];

  async function updateClassCell(event: CellValueChangedEvent<CarClass>) {
    const field = event.colDef.field as keyof CarClass | undefined;
    if (!field || field === "class_id" || event.oldValue === event.newValue) {
      return;
    }
    const value = field === "daily_rate" || field === "weekly_rate"
      ? Number(event.newValue || 0)
      : String(event.newValue ?? "").trim();

    if ((field === "daily_rate" || field === "weekly_rate") && Number.isNaN(value)) {
      staff.setError("Rate must be a valid number.");
      return;
    }

    await staff.perform(async () => {
      await api.updateCarClass(event.data.class_id, { [field]: value } as Partial<Omit<CarClass, "class_id">>);
    }, "Car class updated.");
  }

  async function updateModelCell(event: CellValueChangedEvent<Model>) {
    const field = event.colDef.field as keyof Model | undefined;
    if (!field || field === "model_name" || event.oldValue === event.newValue) {
      return;
    }
    const value = field === "model_year"
      ? Number(event.newValue || 0)
      : String(event.newValue ?? "").trim();

    if (field === "model_year" && Number.isNaN(value)) {
      staff.setError("Model year must be a valid number.");
      return;
    }

    await staff.perform(async () => {
      await api.updateModel(event.data.model_name, { [field]: value } as Partial<Model>);
    }, "Model updated.");
  }

  async function removeClass(carClass: CarClass) {
    if (!window.confirm(`Delete class ${carClass.class_name}?`)) {
      return;
    }
    await staff.perform(async () => {
      await api.deleteCarClass(carClass.class_id);
    }, "Car class deleted.");
  }

  async function removeModel(model: Model) {
    if (!window.confirm(`Delete model ${model.make_name} ${model.model_name}?`)) {
      return;
    }
    await staff.perform(async () => {
      await api.deleteModel(model.model_name);
    }, "Model deleted.");
  }

  const classColumns = useMemo<ColDef<CarClass>[]>(() => ([
    { field: "class_name", headerName: "Class", editable: true, minWidth: 190 },
    {
      field: "daily_rate",
      headerName: "Daily Rate",
      editable: true,
      valueParser: (params) => Number(params.newValue || 0),
      valueFormatter: (params) => formatCurrency(Number(params.value || 0)),
      minWidth: 145,
      filter: "agNumberColumnFilter",
    },
    {
      field: "weekly_rate",
      headerName: "Weekly Rate",
      editable: true,
      valueParser: (params) => Number(params.newValue || 0),
      valueFormatter: (params) => formatCurrency(Number(params.value || 0)),
      minWidth: 145,
      filter: "agNumberColumnFilter",
    },
    {
      headerName: "Models",
      valueGetter: (params) => modelsByClassId[params.data?.class_id || ""]?.length || 0,
      minWidth: 120,
      filter: "agNumberColumnFilter",
    },
    { field: "class_id", headerName: "Class ID", minWidth: 260 },
    {
      headerName: "Actions",
      editable: false,
      filter: false,
      sortable: false,
      pinned: "right",
      width: 120,
      cellRenderer: (params: ICellRendererParams<CarClass>) => (
        <button type="button" className="grid-action-button danger" onClick={() => params.data && void removeClass(params.data)}>
          Delete
        </button>
      ),
    },
  ]), [modelsByClassId, staff]);

  const modelColumns = useMemo<ColDef<Model>[]>(() => {
    const classIds = staff.carClasses.map((carClass) => carClass.class_id);
    const className = (classId: string | null | undefined) => staff.classById[classId || ""]?.class_name || classId || "-";
    const carCountByModel = staff.cars.reduce<Record<string, number>>((counts, car) => {
      counts[car.model_name] = (counts[car.model_name] || 0) + 1;
      return counts;
    }, {});

    return [
      { field: "model_name", headerName: "Model", minWidth: 180 },
      { field: "make_name", headerName: "Make", editable: true, minWidth: 150 },
      {
        field: "model_year",
        headerName: "Year",
        editable: true,
        valueParser: (params) => Number(params.newValue || 0),
        minWidth: 110,
        filter: "agNumberColumnFilter",
      },
      {
        field: "class_id",
        headerName: "Class",
        editable: true,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: classIds },
        valueFormatter: (params) => className(String(params.value || "")),
        minWidth: 190,
      },
      {
        headerName: "Cars",
        valueGetter: (params) => carCountByModel[params.data?.model_name || ""] || 0,
        minWidth: 110,
        filter: "agNumberColumnFilter",
      },
      {
        headerName: "Actions",
        editable: false,
        filter: false,
        sortable: false,
        pinned: "right",
        width: 120,
        cellRenderer: (params: ICellRendererParams<Model>) => (
          <button type="button" className="grid-action-button danger" onClick={() => params.data && void removeModel(params.data)}>
            Delete
          </button>
        ),
      },
    ];
  }, [staff]);

  return (
    <>
      <SectionCard title="Pricing And Models" subtitle="Maintain the class-rate matrix and vehicle catalog with admin-only controls.">
        <div className="action-strip">
          <button type="button" onClick={() => setOpenForm(openForm === "class" ? "" : "class")}>Add Class</button>
          <button type="button" onClick={() => setOpenForm(openForm === "model" ? "" : "model")}>Add Model</button>
        </div>
        {openForm === "class" ? (
          <form className="stack-form" onSubmit={async (event) => { if (await createClass(event)) setOpenForm(""); }}>
            <input placeholder="Class name" value={classForm.class_name} onChange={(e) => setClassForm((c) => ({ ...c, class_name: e.target.value }))} required />
            <input type="number" min="1" step="0.01" placeholder="Daily rate" value={classForm.daily_rate} onChange={(e) => setClassForm((c) => ({ ...c, daily_rate: e.target.value }))} required />
            <input type="number" min="1" step="0.01" placeholder="Weekly rate" value={classForm.weekly_rate} onChange={(e) => setClassForm((c) => ({ ...c, weekly_rate: e.target.value }))} required />
            <div className="action-strip">
              <button type="submit">Save Class</button>
              <button type="button" className="ghost-button" onClick={() => setOpenForm("")}>Cancel</button>
            </div>
          </form>
        ) : null}
        {openForm === "model" ? (
          <form className="stack-form" onSubmit={async (event) => { if (await createModel(event)) setOpenForm(""); }}>
            <input placeholder="Model name" value={modelForm.model_name} onChange={(e) => setModelForm((c) => ({ ...c, model_name: e.target.value }))} required />
            <input placeholder="Make" value={modelForm.make_name} onChange={(e) => setModelForm((c) => ({ ...c, make_name: e.target.value }))} required />
            <input type="number" min="1980" placeholder="Model year" value={modelForm.model_year} onChange={(e) => setModelForm((c) => ({ ...c, model_year: e.target.value }))} required />
            <select aria-label="Model vehicle class" value={modelForm.class_id} onChange={(e) => setModelForm((c) => ({ ...c, class_id: e.target.value }))} required>
              <option value="">Class</option>
              {staff.carClasses.map((item) => <option key={item.class_id} value={item.class_id}>{item.class_name}</option>)}
            </select>
            {selectedClass ? (
              <div className="identity-card">
                <strong>Model-class relationship</strong>
                <span>{selectedClass.class_name} controls this model's rates and reservation class.</span>
                <p>Cars registered to this model will be assignable only for {selectedClass.class_name} reservations.</p>
              </div>
            ) : null}
            <div className="action-strip">
              <button type="submit">Save Model</button>
              <button type="button" className="ghost-button" onClick={() => setOpenForm("")}>Cancel</button>
            </div>
          </form>
        ) : null}
      </SectionCard>
      <SectionCard title="Car Classes" subtitle="Inline edit class names and rate governance values. Delete is blocked when relational constraints require the class.">
        <AdminDataGrid
          rows={staff.carClasses}
          columns={classColumns}
          getRowId={(carClass) => carClass.class_id}
          emptyText="No classes configured."
          height={380}
          onCellValueChanged={updateClassCell}
        />
      </SectionCard>
      <SectionCard title="Vehicle Models" subtitle="Inline edit make, year, and model-to-class assignment. Model names stay fixed because cars reference them.">
        <AdminDataGrid
          rows={staff.models}
          columns={modelColumns}
          getRowId={(model) => model.model_name}
          emptyText="No models configured."
          height={470}
          onCellValueChanged={updateModelCell}
        />
      </SectionCard>
    </>
  );
}
