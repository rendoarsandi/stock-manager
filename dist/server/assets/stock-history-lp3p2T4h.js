import { n as useWebSocket } from "./WebSocketContext-H05AamCP.js";
import { t as showToast } from "./toast-kJrtdafl.js";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { jsxDEV } from "react/jsx-dev-runtime";
import { flexRender, getCoreRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
//#region app/pages/StockHistory.jsx
var _jsxFileName = "/data/data/com.termux/files/home/stock-manager/app/pages/StockHistory.jsx";
function StockHistory() {
	const queryClient = useQueryClient();
	const { addWsListener } = useWebSocket();
	const [sorting, setSorting] = useState([{
		id: "id",
		desc: true
	}]);
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 15
	});
	const { data: ledger = [], isLoading, error } = useQuery({
		queryKey: ["ledgerHistory"],
		queryFn: async () => {
			const res = await fetch("/api/products/ledger");
			if (!res.ok) throw new Error("Failed to fetch stock ledger");
			return res.json();
		}
	});
	useEffect(() => {
		if (error) showToast("Error", "Failed to load stock ledger", "error");
	}, [error]);
	useEffect(() => {
		const unsubscribe = addWsListener((msg) => {
			if (msg.type === "MOVEMENT_CREATED") queryClient.invalidateQueries({ queryKey: ["ledgerHistory"] });
		});
		const handleResync = () => {
			queryClient.invalidateQueries({ queryKey: ["ledgerHistory"] });
		};
		window.addEventListener("resync-data", handleResync);
		return () => {
			unsubscribe();
			window.removeEventListener("resync-data", handleResync);
		};
	}, [addWsListener, queryClient]);
	const table = useReactTable({
		data: ledger,
		columns: useMemo(() => [
			{
				accessorKey: "id",
				header: "ID"
			},
			{
				id: "product",
				header: "Product",
				accessorFn: (row) => row.name ? `${row.name} (${row.model || ""})` : `Product #${row.product_id}`,
				cell: ({ getValue }) => /* @__PURE__ */ jsxDEV("strong", { children: getValue() }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 67,
					columnNumber: 31
				}, this)
			},
			{
				accessorKey: "quantity_change",
				header: "Quantity Change",
				cell: ({ row, getValue }) => {
					const change = parseInt(getValue(), 10);
					const changeText = change > 0 ? `+${change}` : `${change}`;
					let color = "var(--warning)";
					if (row.original.movement_type === "initial") color = "var(--success)";
					else if (row.original.movement_type === "return") color = "var(--success)";
					else if (row.original.movement_type === "sale") color = "var(--danger)";
					else if (row.original.movement_type === "write_off") color = "var(--warning)";
					else if (row.original.movement_type === "manual_adjust") color = change >= 0 ? "var(--success)" : "var(--danger)";
					return /* @__PURE__ */ jsxDEV("span", {
						style: {
							fontWeight: "bold",
							color
						},
						children: changeText
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 89,
						columnNumber: 16
					}, this);
				}
			},
			{
				accessorKey: "movement_type",
				header: "Type",
				cell: ({ row, getValue }) => {
					const type = getValue();
					const change = parseInt(row.original.quantity_change, 10);
					let tagClass = "info";
					let typeLabel = type;
					if (type === "initial") {
						tagClass = "success";
						typeLabel = "Initial";
					} else if (type === "return") {
						tagClass = "success";
						typeLabel = "Return";
					} else if (type === "sale") {
						tagClass = "danger";
						typeLabel = "Sale";
					} else if (type === "write_off") {
						tagClass = "warning";
						typeLabel = "Write-Off";
					} else if (type === "manual_adjust") {
						tagClass = change >= 0 ? "success" : "danger";
						typeLabel = "Adjustment";
					}
					return /* @__PURE__ */ jsxDEV("span", {
						className: `status-tag ${tagClass}`,
						children: typeLabel
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 118,
						columnNumber: 16
					}, this);
				}
			},
			{
				accessorKey: "reference",
				header: "Reference",
				cell: ({ getValue }) => /* @__PURE__ */ jsxDEV("span", {
					style: {
						color: "var(--text-muted)",
						fontSize: "0.9rem"
					},
					children: getValue() || "-"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 125,
					columnNumber: 9
				}, this)
			},
			{
				accessorKey: "username",
				header: "User",
				cell: ({ getValue }) => getValue() || "System"
			},
			{
				accessorKey: "created_at",
				header: "Date",
				cell: ({ getValue }) => {
					const val = getValue();
					const cleanStr = typeof val === "string" && !val.includes("T") ? val.replace(/-/g, "/") : val;
					return new Date(cleanStr).toLocaleString();
				}
			}
		], []),
		state: {
			sorting,
			pagination
		},
		onSortingChange: setSorting,
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel()
	});
	return /* @__PURE__ */ jsxDEV("div", {
		className: "section-card",
		children: [
			/* @__PURE__ */ jsxDEV("div", {
				className: "section-header",
				children: /* @__PURE__ */ jsxDEV("h2", { children: "Stock Movement Ledger" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 164,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 163,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ jsxDEV("div", {
				className: "table-wrapper",
				children: /* @__PURE__ */ jsxDEV("table", { children: [/* @__PURE__ */ jsxDEV("thead", { children: table.getHeaderGroups().map((headerGroup) => /* @__PURE__ */ jsxDEV("tr", { children: headerGroup.headers.map((header) => {
					const isSortable = header.column.getCanSort();
					const sortDir = header.column.getIsSorted();
					return /* @__PURE__ */ jsxDEV("th", {
						style: isSortable ? {
							cursor: "pointer",
							userSelect: "none"
						} : {},
						onClick: header.column.getToggleSortingHandler(),
						children: [flexRender(header.column.columnDef.header, header.getContext()), isSortable && /* @__PURE__ */ jsxDEV("span", {
							className: "sort-icon",
							style: { opacity: sortDir ? 1 : .35 },
							children: sortDir === "asc" ? " ▲" : sortDir === "desc" ? " ▼" : " ↕"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 182,
							columnNumber: 25
						}, this)]
					}, header.id, true, {
						fileName: _jsxFileName,
						lineNumber: 175,
						columnNumber: 21
					}, this);
				}) }, headerGroup.id, false, {
					fileName: _jsxFileName,
					lineNumber: 170,
					columnNumber: 15
				}, this)) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 168,
					columnNumber: 11
				}, this), /* @__PURE__ */ jsxDEV("tbody", {
					id: "stock-ledger-table-body",
					children: isLoading ? /* @__PURE__ */ jsxDEV("tr", { children: /* @__PURE__ */ jsxDEV("td", {
						colSpan: 7,
						style: {
							textAlign: "center",
							color: "var(--text-muted)"
						},
						children: "Loading ledger history..."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 195,
						columnNumber: 17
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 194,
						columnNumber: 15
					}, this) : ledger.length === 0 ? /* @__PURE__ */ jsxDEV("tr", { children: /* @__PURE__ */ jsxDEV("td", {
						colSpan: 7,
						style: {
							textAlign: "center",
							color: "var(--text-muted)"
						},
						children: "No stock movements recorded yet."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 201,
						columnNumber: 17
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 200,
						columnNumber: 15
					}, this) : table.getRowModel().rows.map((row) => /* @__PURE__ */ jsxDEV("tr", { children: row.getVisibleCells().map((cell) => /* @__PURE__ */ jsxDEV("td", { children: flexRender(cell.column.columnDef.cell, cell.getContext()) }, cell.id, false, {
						fileName: _jsxFileName,
						lineNumber: 209,
						columnNumber: 21
					}, this)) }, row.id, false, {
						fileName: _jsxFileName,
						lineNumber: 207,
						columnNumber: 17
					}, this))
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 192,
					columnNumber: 11
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 167,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 166,
				columnNumber: 7
			}, this),
			ledger.length > 0 && /* @__PURE__ */ jsxDEV("div", {
				className: "pagination-controls",
				style: {
					display: "flex",
					gap: "0.5rem",
					alignItems: "center",
					marginTop: "1rem",
					justifyContent: "flex-end"
				},
				children: [
					/* @__PURE__ */ jsxDEV("button", {
						className: "btn btn-secondary btn-sm",
						onClick: () => table.previousPage(),
						disabled: !table.getCanPreviousPage(),
						children: "Prev"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 232,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ jsxDEV("span", {
						style: {
							fontSize: "0.85rem",
							color: "var(--text-secondary)"
						},
						children: [
							"Page ",
							table.getState().pagination.pageIndex + 1,
							" of ",
							table.getPageCount() || 1
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 239,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ jsxDEV("button", {
						className: "btn btn-secondary btn-sm",
						onClick: () => table.nextPage(),
						disabled: !table.getCanNextPage(),
						children: "Next"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 242,
						columnNumber: 11
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 222,
				columnNumber: 9
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 162,
		columnNumber: 5
	}, this);
}
//#endregion
//#region app/routes/stock-history.jsx?tsr-split=component
var SplitComponent = StockHistory;
//#endregion
export { SplitComponent as component };
