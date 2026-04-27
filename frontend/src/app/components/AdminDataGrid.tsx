import { useMemo } from "react";
import {
  ClientSideRowModelModule,
  DateFilterModule,
  ModuleRegistry,
  NumberEditorModule,
  NumberFilterModule,
  PaginationModule,
  SelectEditorModule,
  TextEditorModule,
  TextFilterModule,
  ValidationModule,
  type CellValueChangedEvent,
  type ColDef,
  type GetRowIdParams,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  DateFilterModule,
  NumberEditorModule,
  NumberFilterModule,
  PaginationModule,
  SelectEditorModule,
  TextEditorModule,
  TextFilterModule,
  ValidationModule,
]);

type AdminDataGridProps<T extends object> = {
  rows: T[];
  columns: ColDef<T>[];
  getRowId: (row: T) => string;
  emptyText: string;
  height?: number;
  onCellValueChanged?: (event: CellValueChangedEvent<T>) => Promise<void> | void;
};

export function AdminDataGrid<T extends object>({
  rows,
  columns,
  getRowId,
  emptyText,
  height = 430,
  onCellValueChanged,
}: AdminDataGridProps<T>) {
  const defaultColumn = useMemo<ColDef<T>>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    minWidth: 130,
  }), []);

  return (
    <div className="admin-grid-frame" style={{ minHeight: height }}>
      <div className="ag-theme-quartz admin-data-grid" style={{ height }}>
        <AgGridReact<T>
          rowData={rows}
          columnDefs={columns}
          defaultColDef={defaultColumn}
          getRowId={(params: GetRowIdParams<T>) => getRowId(params.data)}
          onCellValueChanged={(event) => { void onCellValueChanged?.(event); }}
          pagination
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 25, 50]}
          stopEditingWhenCellsLoseFocus
          overlayNoRowsTemplate={`<span class="admin-grid-empty">${emptyText}</span>`}
        />
      </div>
    </div>
  );
}
