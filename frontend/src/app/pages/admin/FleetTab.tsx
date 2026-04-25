import { QueueList, SectionCard } from "../../components/ui";
import type { StaffData } from "../../hooks/useStaffData";

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
  createLocation: (event: React.FormEvent) => void;
  createCar: (event: React.FormEvent) => void;
  deleteLocation: (locationId: string, city: string) => void;
}) {
  return (
    <>
      <SectionCard title="Locations And Fleet" subtitle="Manage branch setup and physical inventory from stacked mobile cards.">
        <form className="stack-form" onSubmit={createLocation}>
          <div className="field-grid two-col">
            <input placeholder="Street" value={locationForm.street} onChange={(e) => setLocationForm((c) => ({ ...c, street: e.target.value }))} required />
            <input placeholder="City" value={locationForm.city} onChange={(e) => setLocationForm((c) => ({ ...c, city: e.target.value }))} required />
            <input placeholder="State" value={locationForm.state} onChange={(e) => setLocationForm((c) => ({ ...c, state: e.target.value.toUpperCase().slice(0, 2) }))} required />
            <input placeholder="ZIP" value={locationForm.zip} onChange={(e) => setLocationForm((c) => ({ ...c, zip: e.target.value }))} required />
          </div>
          <button type="submit">Add Location</button>
        </form>
        <form className="stack-form" onSubmit={createCar}>
          <input placeholder="VIN" minLength={17} maxLength={17} value={carForm.vin} onChange={(e) => setCarForm((c) => ({ ...c, vin: e.target.value }))} required />
          <input type="number" min="0" placeholder="Current odometer" value={carForm.current_odometer_reading} onChange={(e) => setCarForm((c) => ({ ...c, current_odometer_reading: e.target.value }))} required />
          <select value={carForm.location_id} onChange={(e) => setCarForm((c) => ({ ...c, location_id: e.target.value }))} required>
            <option value="">Location</option>
            {staff.locations.map((item) => <option key={item.location_id} value={item.location_id}>{item.city}, {item.state}</option>)}
          </select>
          <select value={carForm.model_name} onChange={(e) => setCarForm((c) => ({ ...c, model_name: e.target.value }))} required>
            <option value="">Model</option>
            {staff.models.map((item) => <option key={item.model_name} value={item.model_name}>{item.make_name} {item.model_name}</option>)}
          </select>
          <button type="submit">Register Car</button>
        </form>
      </SectionCard>
      <SectionCard title="Current inventory" subtitle="Delete only records that are safe to remove.">
        <QueueList
          title="Locations"
          items={staff.locations.map((item) => ({
            id: item.location_id,
            title: `${item.city}, ${item.state}`,
            subtitle: item.street,
            meta: "Confirm before deleting",
          }))}
          emptyText="No locations configured."
        />
        <div className="action-strip">
          {staff.locations.slice(0, 4).map((item) => (
            <button key={item.location_id} type="button" className="danger-mini" onClick={() => deleteLocation(item.location_id, item.city)}>
              Delete {item.city}
            </button>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
