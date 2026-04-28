import { useMemo } from "react";
import type { ColDef } from "ag-grid-community";
import { AdminDataGrid } from "../../components/AdminDataGrid";
import { SectionCard, StatGrid } from "../../components/ui";
import type { StaffData } from "../../hooks/useStaffData";
import { formatDateTime, formatPercent } from "../../lib/api";
import type { DashboardFleetItem, DashboardLocationSummary, EntityAuditEvent } from "../../lib/types";

type WatchlistRow = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
};

export function OpsTab({ staff, auditEvents }: { staff: StaffData; auditEvents: EntityAuditEvent[] }) {
  const fleetByLocation = staff.dashboard?.locations || [];
  const fleetStatusItems = staff.dashboard?.fleet || [];
  const watchlistItems = staff.managerAlerts.slice(0, 12);

  const locationColumns = useMemo<ColDef<DashboardLocationSummary>[]>(() => ([
    { field: "location_name", headerName: "Location", minWidth: 210 },
    { field: "utilization_percent", headerName: "Utilization", valueFormatter: (params) => formatPercent(Number(params.value || 0)), minWidth: 145 },
    { field: "total_cars", headerName: "Total", minWidth: 110, filter: "agNumberColumnFilter" },
    { field: "available_cars", headerName: "Available", minWidth: 130, filter: "agNumberColumnFilter" },
    { field: "rented_cars", headerName: "Rented", minWidth: 120, filter: "agNumberColumnFilter" },
    { field: "reserved_requests", headerName: "Reserved Requests", minWidth: 170, filter: "agNumberColumnFilter" },
  ]), []);

  const fleetColumns = useMemo<ColDef<DashboardFleetItem>[]>(() => ([
    { field: "location_name", headerName: "Location", minWidth: 200 },
    { field: "status", headerName: "Status", minWidth: 130 },
    { field: "model_name", headerName: "Model", minWidth: 180 },
    { field: "vin", headerName: "VIN", minWidth: 190 },
    { field: "current_odometer_reading", headerName: "Odometer", valueFormatter: (params) => `${Number(params.value || 0).toLocaleString()} mi`, minWidth: 140, filter: "agNumberColumnFilter" },
    { field: "active_contract_no", headerName: "Contract", valueFormatter: (params) => params.value || "-", minWidth: 180 },
  ]), []);

  const watchlistColumns = useMemo<ColDef<WatchlistRow>[]>(() => ([
    { field: "title", headerName: "Issue", minWidth: 240 },
    { field: "subtitle", headerName: "Context", minWidth: 220 },
    { field: "meta", headerName: "Due / Status", minWidth: 180 },
  ]), []);

  const auditColumns = useMemo<ColDef<EntityAuditEvent>[]>(() => ([
    { field: "event_timestamp", headerName: "When", valueFormatter: (params) => formatDateTime(String(params.value || "")), minWidth: 190 },
    { field: "actor_username", headerName: "Who", minWidth: 160 },
    { field: "actor_role", headerName: "Role", minWidth: 120 },
    { field: "action", headerName: "Action", minWidth: 130 },
    { field: "entity_type", headerName: "Entity", minWidth: 150 },
    { field: "entity_id", headerName: "Entity ID", minWidth: 220 },
    { field: "notes", headerName: "Details", valueFormatter: (params) => params.value || "-", minWidth: 260 },
  ]), []);

  return (
    <>
      <StatGrid stats={staff.stats} />
      <SectionCard title="Location Drilldown" subtitle="Utilization, rented fleet, available fleet, and reserved requests by branch.">
        <AdminDataGrid
          rows={fleetByLocation}
          columns={locationColumns}
          getRowId={(location) => location.location_id}
          emptyText="No branch KPI records available."
          height={340}
        />
      </SectionCard>
      <SectionCard title="Fleet Status Drilldown" subtitle="Vehicle status by branch and VIN.">
        <AdminDataGrid
          rows={fleetStatusItems}
          columns={fleetColumns}
          getRowId={(item) => item.vin}
          emptyText="No fleet records available."
          height={420}
        />
      </SectionCard>
      <SectionCard title="Operational Health" subtitle="Admin oversight of live branch activity and configuration-sensitive workflows.">
        <AdminDataGrid
          rows={watchlistItems}
          columns={watchlistColumns}
          getRowId={(item) => item.id}
          emptyText="No elevated branch issues."
          height={320}
        />
      </SectionCard>
      <SectionCard title="Entity Audit Trail" subtitle="Recent creates, updates, and deletes with actor, timestamp, entity, and details.">
        <AdminDataGrid
          rows={auditEvents}
          columns={auditColumns}
          getRowId={(item) => item.event_id}
          emptyText="No entity audit events recorded yet."
          height={430}
        />
      </SectionCard>
    </>
  );
}
