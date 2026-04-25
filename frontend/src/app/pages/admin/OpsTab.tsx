import { QueueList, SectionCard, StatGrid } from "../../components/ui";
import type { StaffData } from "../../hooks/useStaffData";

export function OpsTab({ staff }: { staff: StaffData }) {
  const fleetByLocation = staff.dashboard?.locations || [];
  const fleetStatusItems = (staff.dashboard?.fleet || []).map((item) => ({
    id: item.vin,
    title: `${item.location_name} · ${item.status}`,
    subtitle: `${item.model_name} · ${item.vin}`,
    meta: `${item.current_odometer_reading.toLocaleString()} mi`,
  }));

  return (
    <>
      <StatGrid stats={staff.stats} />
      <SectionCard title="Location Drilldown" subtitle="Utilization, rented fleet, available fleet, and reserved requests by branch.">
        <div className="location-kpi-grid">
          {fleetByLocation.map((location) => (
            <article key={location.location_id} className="location-kpi-card">
              <div>
                <strong>{location.location_name}</strong>
                <span>{location.utilization_percent.toFixed(1)}% utilization</span>
              </div>
              <dl>
                <div><dt>Total</dt><dd>{location.total_cars}</dd></div>
                <div><dt>Available</dt><dd>{location.available_cars}</dd></div>
                <div><dt>Rented</dt><dd>{location.rented_cars}</dd></div>
                <div><dt>Reserved</dt><dd>{location.reserved_requests}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Fleet Status Drilldown" subtitle="Vehicle status by branch and VIN.">
        <QueueList title="Fleet by branch" items={fleetStatusItems} emptyText="No fleet records available." />
      </SectionCard>
      <SectionCard title="Operational Health" subtitle="Admin oversight of live branch activity and configuration-sensitive workflows.">
        <QueueList title="Priority admin watchlist" items={staff.managerAlerts.slice(0, 6)} emptyText="No elevated branch issues." />
      </SectionCard>
    </>
  );
}
