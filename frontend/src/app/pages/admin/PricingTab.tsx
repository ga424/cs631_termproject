import { useState } from "react";
import type * as React from "react";
import { formatCurrency } from "../../lib/api";
import { QueueList, SectionCard } from "../../components/ui";
import type { StaffData } from "../../hooks/useStaffData";

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
  createClass: (event: React.FormEvent) => Promise<void> | void;
  createModel: (event: React.FormEvent) => Promise<void> | void;
}) {
  const [openForm, setOpenForm] = useState<"class" | "model" | "">("");

  return (
    <>
      <SectionCard title="Pricing And Models" subtitle="Maintain the class-rate matrix and vehicle catalog with admin-only controls.">
        <div className="action-strip">
          <button type="button" onClick={() => setOpenForm(openForm === "class" ? "" : "class")}>Add Class</button>
          <button type="button" onClick={() => setOpenForm(openForm === "model" ? "" : "model")}>Add Model</button>
        </div>
        {openForm === "class" ? (
          <form className="stack-form" onSubmit={async (event) => { await createClass(event); setOpenForm(""); }}>
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
          <form className="stack-form" onSubmit={async (event) => { await createModel(event); setOpenForm(""); }}>
            <input placeholder="Model name" value={modelForm.model_name} onChange={(e) => setModelForm((c) => ({ ...c, model_name: e.target.value }))} required />
            <input placeholder="Make" value={modelForm.make_name} onChange={(e) => setModelForm((c) => ({ ...c, make_name: e.target.value }))} required />
            <input type="number" min="1980" placeholder="Model year" value={modelForm.model_year} onChange={(e) => setModelForm((c) => ({ ...c, model_year: e.target.value }))} required />
            <select aria-label="Model vehicle class" value={modelForm.class_id} onChange={(e) => setModelForm((c) => ({ ...c, class_id: e.target.value }))} required>
              <option value="">Class</option>
              {staff.carClasses.map((item) => <option key={item.class_id} value={item.class_id}>{item.class_name}</option>)}
            </select>
            <div className="action-strip">
              <button type="submit">Save Model</button>
              <button type="button" className="ghost-button" onClick={() => setOpenForm("")}>Cancel</button>
            </div>
          </form>
        ) : null}
      </SectionCard>
      <SectionCard title="Current pricing" subtitle="Quick reference for rate governance and BPMN support tasks.">
        <QueueList
          title="Classes"
          items={staff.carClasses.map((item) => ({
            id: item.class_id,
            title: item.class_name,
            subtitle: `${formatCurrency(item.daily_rate)} day / ${formatCurrency(item.weekly_rate)} week`,
            meta: "Pricing",
          }))}
          emptyText="No classes configured."
        />
      </SectionCard>
    </>
  );
}
