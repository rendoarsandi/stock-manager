import { n as useWebSocket } from "./WebSocketContext-H05AamCP.js";
import { t as showToast } from "./toast-kJrtdafl.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { jsxDEV } from "react/jsx-dev-runtime";
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
//#region app/pages/Products.jsx
var _jsxFileName = "/data/data/com.termux/files/home/stock-manager/app/pages/Products.jsx";
function Products() {
	const queryClient = useQueryClient();
	const { addWsListener } = useWebSocket();
	const [globalFilter, setGlobalFilter] = useState("");
	const [sorting, setSorting] = useState([{
		id: "id",
		desc: false
	}]);
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10
	});
	const [activeModal, setActiveModal] = useState(null);
	const [selectedProduct, setSelectedProduct] = useState(null);
	const [formName, setFormName] = useState("");
	const [formMasterSku, setFormMasterSku] = useState("");
	const [formModel, setFormModel] = useState("");
	const [formDesc, setFormDesc] = useState("");
	const [formStock, setFormStock] = useState(0);
	const [formThreshold, setFormThreshold] = useState(10);
	const [adjustQty, setAdjustQty] = useState("");
	const [adjustType, setAdjustType] = useState("manual_adjust");
	const [adjustRef, setAdjustRef] = useState("");
	const [hoverCard, setHoverCard] = useState({
		visible: false,
		x: 0,
		y: 0,
		productId: null,
		name: "",
		model: "",
		movements: [],
		loading: false,
		error: false
	});
	useRef(null);
	const { data: products = [], isLoading, error } = useQuery({
		queryKey: ["products"],
		queryFn: async () => {
			const res = await fetch("/api/products");
			if (!res.ok) throw new Error("Failed to fetch products");
			return res.json();
		}
	});
	useEffect(() => {
		if (error) showToast("Error", "Failed to load products", "error");
	}, [error]);
	useEffect(() => {
		const unsubscribe = addWsListener((msg) => {
			if (msg.type === "PRODUCT_CREATED" || msg.type === "PRODUCT_UPDATED" || msg.type === "PRODUCT_DELETED" || msg.type === "MOVEMENT_CREATED") queryClient.invalidateQueries({ queryKey: ["products"] });
		});
		const handleResync = () => {
			queryClient.invalidateQueries({ queryKey: ["products"] });
		};
		window.addEventListener("resync-data", handleResync);
		return () => {
			unsubscribe();
			window.removeEventListener("resync-data", handleResync);
		};
	}, [addWsListener, queryClient]);
	const createProductMutation = useMutation({
		mutationFn: async (newProduct) => {
			const res = await fetch("/api/products", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(newProduct)
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.message || "Failed to create product");
			}
			return res.json();
		},
		onSuccess: () => {
			showToast("Success", "Product created successfully", "success");
			queryClient.invalidateQueries({ queryKey: ["products"] });
			closeModal();
		},
		onError: (err) => {
			showToast("Error", err.message, "error");
		}
	});
	const editProductMutation = useMutation({
		mutationFn: async ({ id, updatedProduct }) => {
			const res = await fetch(`/api/products/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(updatedProduct)
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.message || "Failed to update product");
			}
			return res.json();
		},
		onSuccess: () => {
			showToast("Updated", "Product details saved", "success");
			queryClient.invalidateQueries({ queryKey: ["products"] });
			closeModal();
		},
		onError: (err) => {
			showToast("Error", err.message, "error");
		}
	});
	const deleteProductMutation = useMutation({
		mutationFn: async (id) => {
			const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.message || "Failed to delete product");
			}
		},
		onSuccess: () => {
			showToast("Deleted", "Product deleted successfully", "success");
			queryClient.invalidateQueries({ queryKey: ["products"] });
			closeModal();
		},
		onError: (err) => {
			showToast("Error", err.message, "error");
		}
	});
	const adjustStockMutation = useMutation({
		mutationFn: async ({ id, adjustment }) => {
			const res = await fetch(`/api/products/${id}/adjust-stock`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(adjustment)
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.message || "Failed to adjust stock");
			}
			return res.json();
		},
		onSuccess: () => {
			showToast("Success", "Stock level adjusted", "success");
			queryClient.invalidateQueries({ queryKey: ["products"] });
			closeModal();
		},
		onError: (err) => {
			showToast("Error", err.message, "error");
		}
	});
	const openAddModal = () => {
		setFormName("");
		setFormMasterSku("");
		setFormModel("");
		setFormDesc("");
		setFormStock(0);
		setFormThreshold(10);
		setActiveModal("add");
	};
	const openEditModal = (product) => {
		setSelectedProduct(product);
		setFormName(product.name || "");
		setFormMasterSku(product.master_sku || "");
		setFormModel(product.model || "");
		setFormDesc(product.description || "");
		setFormThreshold(product.low_stock_threshold || 0);
		setActiveModal("edit");
	};
	const openAdjustModal = (product) => {
		setSelectedProduct(product);
		setAdjustQty("");
		setAdjustType("manual_adjust");
		setAdjustRef("");
		setActiveModal("adjust");
	};
	const openDeleteModal = (product) => {
		setSelectedProduct(product);
		setActiveModal("delete");
	};
	const closeModal = () => {
		setActiveModal(null);
		setSelectedProduct(null);
	};
	const handleAddSubmit = (e) => {
		e.preventDefault();
		createProductMutation.mutate({
			name: formName,
			master_sku: formMasterSku,
			model: formModel,
			description: formDesc,
			initial_stock: parseInt(formStock, 10) || 0,
			low_stock_threshold: parseInt(formThreshold, 10) || 0
		});
	};
	const handleEditSubmit = (e) => {
		e.preventDefault();
		editProductMutation.mutate({
			id: selectedProduct.id,
			updatedProduct: {
				name: formName,
				master_sku: formMasterSku,
				model: formModel,
				description: formDesc,
				low_stock_threshold: parseInt(formThreshold, 10) || 0
			}
		});
	};
	const handleAdjustSubmit = (e) => {
		e.preventDefault();
		const qtyChange = parseInt(adjustQty, 10);
		if (isNaN(qtyChange) || qtyChange === 0) {
			showToast("Warning", "Quantity change cannot be zero", "warning");
			return;
		}
		adjustStockMutation.mutate({
			id: selectedProduct.id,
			adjustment: {
				quantity_change: qtyChange,
				movement_type: adjustType,
				reference: adjustRef
			}
		});
	};
	const handleDeleteSubmit = () => {
		deleteProductMutation.mutate(selectedProduct.id);
	};
	useEffect(() => {
		if (!hoverCard.productId) return;
		let active = true;
		setHoverCard((prev) => ({
			...prev,
			loading: true,
			error: false
		}));
		fetch(`/api/products/${hoverCard.productId}/ledger`).then((res) => {
			if (!res.ok) throw new Error("Failed to load ledger");
			return res.json();
		}).then((data) => {
			if (!active) return;
			data.sort((a, b) => {
				const da = typeof a.created_at === "string" && !a.created_at.includes("T") ? a.created_at.replace(/-/g, "/") : a.created_at;
				const db = typeof b.created_at === "string" && !b.created_at.includes("T") ? b.created_at.replace(/-/g, "/") : b.created_at;
				return new Date(da) - new Date(db);
			});
			setHoverCard((prev) => ({
				...prev,
				movements: data,
				loading: false
			}));
		}).catch((err) => {
			if (!active) return;
			setHoverCard((prev) => ({
				...prev,
				loading: false,
				error: true
			}));
		});
		return () => {
			active = false;
		};
	}, [hoverCard.productId]);
	useEffect(() => {
		const handleDocumentClick = (e) => {
			if (hoverCard.visible) {
				const trigger = e.target.closest(".hover-ledger-trigger");
				const card = document.getElementById("hover-ledger-card");
				if (!trigger && (!card || !card.contains(e.target))) setHoverCard((prev) => ({
					...prev,
					visible: false,
					productId: null
				}));
			}
		};
		document.addEventListener("click", handleDocumentClick);
		return () => document.removeEventListener("click", handleDocumentClick);
	}, [hoverCard.visible]);
	const triggerHoverCard = (e, product) => {
		const rect = e.currentTarget.getBoundingClientRect();
		e.currentTarget;
		setHoverCard((prev) => {
			const cardWidth = 580;
			const cardHeight = 250;
			let left = rect.left;
			if (left + cardWidth > window.innerWidth) left = window.innerWidth - cardWidth - 10;
			if (left < 10) left = 10;
			let top = rect.bottom + window.scrollY + 8;
			if (rect.bottom + cardHeight > window.innerHeight) {
				top = rect.top + window.scrollY - cardHeight - 8;
				if (top < window.scrollY) top = rect.bottom + window.scrollY + 8;
			}
			return {
				...prev,
				visible: true,
				x: left,
				y: top,
				productId: product.id,
				name: product.name,
				model: product.model
			};
		});
	};
	const handleMouseEnter = (e, product) => {
		if (window.matchMedia("(hover: hover)").matches) triggerHoverCard(e, product);
	};
	const handleMouseLeave = () => {
		if (window.matchMedia("(hover: hover)").matches) setHoverCard((prev) => ({
			...prev,
			visible: false,
			productId: null
		}));
	};
	const handleCellClick = (e, product) => {
		e.preventDefault();
		e.stopPropagation();
		if (hoverCard.visible && hoverCard.productId === product.id) setHoverCard((prev) => ({
			...prev,
			visible: false,
			productId: null
		}));
		else triggerHoverCard(e, product);
	};
	const table = useReactTable({
		data: products,
		columns: useMemo(() => [
			{
				accessorKey: "id",
				header: "ID"
			},
			{
				accessorKey: "name",
				header: "Name",
				cell: ({ row }) => {
					const product = row.original;
					return /* @__PURE__ */ jsxDEV("span", {
						className: "hover-ledger-trigger",
						style: {
							fontWeight: 500,
							cursor: "help",
							textDecoration: "underline dotted var(--text-muted)",
							textUnderlineOffset: "4px"
						},
						onMouseEnter: (e) => handleMouseEnter(e, product),
						onMouseLeave: handleMouseLeave,
						onClick: (e) => handleCellClick(e, product),
						children: product.name
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 391,
						columnNumber: 11
					}, this);
				}
			},
			{
				accessorKey: "master_sku",
				header: "Master SKU",
				cell: ({ getValue }) => {
					return /* @__PURE__ */ jsxDEV("span", {
						className: "status-tag info",
						style: {
							backgroundColor: "var(--accent-light)",
							color: "var(--text-secondary)",
							fontWeight: "500"
						},
						children: getValue() || "-"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 414,
						columnNumber: 11
					}, this);
				}
			},
			{
				accessorKey: "model",
				header: "SKU",
				cell: ({ getValue }) => /* @__PURE__ */ jsxDEV("span", {
					className: "status-tag info",
					children: getValue()
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 430,
					columnNumber: 31
				}, this)
			},
			{
				accessorKey: "current_stock",
				header: "Stock",
				cell: ({ getValue }) => /* @__PURE__ */ jsxDEV("span", {
					style: {
						fontWeight: 600,
						fontSize: "1rem"
					},
					children: getValue()
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 436,
					columnNumber: 9
				}, this)
			},
			{
				accessorKey: "low_stock_threshold",
				header: "Threshold"
			},
			{
				accessorKey: "status",
				header: "Status",
				accessorFn: (row) => {
					if (row.current_stock <= 0) return "Out of Stock";
					if (row.current_stock <= row.low_stock_threshold) return "Low Stock";
					return "Good";
				},
				cell: ({ getValue }) => {
					const status = getValue();
					let statusClass = "success";
					if (status === "Out of Stock") statusClass = "danger";
					if (status === "Low Stock") statusClass = "warning";
					return /* @__PURE__ */ jsxDEV("span", {
						className: `status-tag ${statusClass}`,
						children: status
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 456,
						columnNumber: 16
					}, this);
				}
			},
			{
				id: "actions",
				header: "Actions",
				cell: ({ row }) => {
					const product = row.original;
					return /* @__PURE__ */ jsxDEV("div", {
						className: "actions-cell",
						children: [
							/* @__PURE__ */ jsxDEV("button", {
								className: "btn btn-secondary btn-sm btn-adjust",
								onClick: () => openAdjustModal(product),
								children: [/* @__PURE__ */ jsxDEV("svg", {
									viewBox: "0 0 24 24",
									fill: "none",
									stroke: "currentColor",
									children: /* @__PURE__ */ jsxDEV("path", { d: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 471,
										columnNumber: 17
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 470,
									columnNumber: 15
								}, this), "Adjust"]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 466,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ jsxDEV("button", {
								className: "btn btn-secondary btn-sm btn-edit",
								onClick: () => openEditModal(product),
								children: [/* @__PURE__ */ jsxDEV("svg", {
									viewBox: "0 0 24 24",
									fill: "none",
									stroke: "currentColor",
									children: /* @__PURE__ */ jsxDEV("path", { d: "M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 480,
										columnNumber: 17
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 479,
									columnNumber: 15
								}, this), "Edit"]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 475,
								columnNumber: 13
							}, this),
							/* @__PURE__ */ jsxDEV("button", {
								className: "btn btn-danger btn-sm btn-delete",
								onClick: () => openDeleteModal(product),
								children: [/* @__PURE__ */ jsxDEV("svg", {
									viewBox: "0 0 24 24",
									fill: "none",
									stroke: "currentColor",
									children: /* @__PURE__ */ jsxDEV("path", { d: "M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 489,
										columnNumber: 17
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 488,
									columnNumber: 15
								}, this), "Delete"]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 484,
								columnNumber: 13
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 465,
						columnNumber: 11
					}, this);
				}
			}
		], [hoverCard.visible, hoverCard.productId]),
		state: {
			globalFilter,
			sorting,
			pagination
		},
		onGlobalFilterChange: setGlobalFilter,
		onSortingChange: setSorting,
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel()
	});
	return /* @__PURE__ */ jsxDEV("div", {
		className: "section-card",
		children: [
			/* @__PURE__ */ jsxDEV("div", {
				className: "section-header",
				children: [/* @__PURE__ */ jsxDEV("h2", { children: "Product List" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 520,
					columnNumber: 9
				}, this), /* @__PURE__ */ jsxDEV("button", {
					id: "btn-add-product",
					className: "btn btn-primary",
					onClick: openAddModal,
					children: [/* @__PURE__ */ jsxDEV("svg", {
						viewBox: "0 0 24 24",
						fill: "none",
						stroke: "currentColor",
						children: /* @__PURE__ */ jsxDEV("path", { d: "M5 12h14M12 5v14" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 523,
							columnNumber: 13
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 522,
						columnNumber: 11
					}, this), "Add Product"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 521,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 519,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ jsxDEV("div", {
				style: {
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "1.5rem",
					gap: "1rem",
					flexWrap: "wrap"
				},
				children: /* @__PURE__ */ jsxDEV("div", {
					className: "search-wrapper",
					children: [/* @__PURE__ */ jsxDEV("svg", {
						viewBox: "0 0 24 24",
						fill: "none",
						stroke: "currentColor",
						children: [/* @__PURE__ */ jsxDEV("circle", {
							cx: "11",
							cy: "11",
							r: "8"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 542,
							columnNumber: 13
						}, this), /* @__PURE__ */ jsxDEV("path", { d: "m21 21-4.3-4.3" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 543,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 541,
						columnNumber: 11
					}, this), /* @__PURE__ */ jsxDEV("input", {
						type: "text",
						placeholder: "Search name or SKU...",
						value: globalFilter ?? "",
						onChange: (e) => setGlobalFilter(e.target.value)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 545,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 540,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 530,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ jsxDEV("div", {
				className: "table-wrapper",
				children: /* @__PURE__ */ jsxDEV("table", { children: [/* @__PURE__ */ jsxDEV("thead", { children: table.getHeaderGroups().map((headerGroup) => /* @__PURE__ */ jsxDEV("tr", { children: headerGroup.headers.map((header) => {
					const isSortable = header.column.getCanSort();
					const sortDir = header.column.getIsSorted();
					return /* @__PURE__ */ jsxDEV("th", {
						className: isSortable ? "sortable-header" : "",
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
							lineNumber: 572,
							columnNumber: 25
						}, this)]
					}, header.id, true, {
						fileName: _jsxFileName,
						lineNumber: 564,
						columnNumber: 21
					}, this);
				}) }, headerGroup.id, false, {
					fileName: _jsxFileName,
					lineNumber: 559,
					columnNumber: 15
				}, this)) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 557,
					columnNumber: 11
				}, this), /* @__PURE__ */ jsxDEV("tbody", {
					id: "products-table-body",
					children: isLoading ? /* @__PURE__ */ jsxDEV("tr", { children: /* @__PURE__ */ jsxDEV("td", {
						colSpan: 8,
						style: {
							textAlign: "center",
							color: "var(--text-muted)"
						},
						children: "Loading products..."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 585,
						columnNumber: 17
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 584,
						columnNumber: 15
					}, this) : table.getRowModel().rows.length === 0 ? /* @__PURE__ */ jsxDEV("tr", { children: /* @__PURE__ */ jsxDEV("td", {
						colSpan: 8,
						style: {
							textAlign: "center",
							color: "var(--text-muted)"
						},
						children: "No products registered. Click \"Add Product\" to create one."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 591,
						columnNumber: 17
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 590,
						columnNumber: 15
					}, this) : table.getRowModel().rows.map((row) => /* @__PURE__ */ jsxDEV("tr", { children: row.getVisibleCells().map((cell) => /* @__PURE__ */ jsxDEV("td", { children: flexRender(cell.column.columnDef.cell, cell.getContext()) }, cell.id, false, {
						fileName: _jsxFileName,
						lineNumber: 599,
						columnNumber: 21
					}, this)) }, row.id, false, {
						fileName: _jsxFileName,
						lineNumber: 597,
						columnNumber: 17
					}, this))
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 582,
					columnNumber: 11
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 556,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 555,
				columnNumber: 7
			}, this),
			products.length > 0 && /* @__PURE__ */ jsxDEV("div", {
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
						lineNumber: 622,
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
						lineNumber: 629,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ jsxDEV("button", {
						className: "btn btn-secondary btn-sm",
						onClick: () => table.nextPage(),
						disabled: !table.getCanNextPage(),
						children: "Next"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 632,
						columnNumber: 11
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 612,
				columnNumber: 9
			}, this),
			hoverCard.visible && /* @__PURE__ */ jsxDEV("div", {
				id: "hover-ledger-card",
				className: "hover-ledger-card visible",
				style: {
					position: "absolute",
					left: `${hoverCard.x}px`,
					top: `${hoverCard.y}px`,
					zIndex: 1e3
				},
				children: [/* @__PURE__ */ jsxDEV("div", {
					className: "hover-card-header",
					children: [/* @__PURE__ */ jsxDEV("div", {
						style: {
							fontWeight: 600,
							color: "var(--text-primary)",
							fontSize: "0.9rem"
						},
						children: hoverCard.name
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 655,
						columnNumber: 13
					}, this), /* @__PURE__ */ jsxDEV("div", {
						style: {
							fontSize: "0.75rem",
							color: "var(--text-secondary)",
							fontWeight: 500
						},
						children: hoverCard.model
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 658,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 654,
					columnNumber: 11
				}, this), hoverCard.loading ? /* @__PURE__ */ jsxDEV("div", {
					style: {
						padding: "1.5rem",
						textAlign: "center",
						color: "var(--text-secondary)",
						fontSize: "0.8rem"
					},
					children: [/* @__PURE__ */ jsxDEV("span", { className: "loading-spinner" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 664,
						columnNumber: 15
					}, this), " Loading stock history..."]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 663,
					columnNumber: 13
				}, this) : hoverCard.error ? /* @__PURE__ */ jsxDEV("div", {
					style: {
						padding: "1.5rem",
						color: "var(--danger)",
						fontSize: "0.8rem",
						textAlign: "center",
						fontWeight: 500
					},
					children: "⚠️ Failed to load stock history"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 667,
					columnNumber: 13
				}, this) : hoverCard.movements.length === 0 ? /* @__PURE__ */ jsxDEV("div", {
					style: {
						padding: "1.5rem",
						color: "var(--text-secondary)",
						fontSize: "0.8rem",
						textAlign: "center"
					},
					children: "No stock history recorded."
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 671,
					columnNumber: 13
				}, this) : /* @__PURE__ */ jsxDEV("div", {
					style: { overflowX: "auto" },
					children: /* @__PURE__ */ jsxDEV("table", {
						className: "hover-ledger-table",
						style: {
							width: "100%",
							borderCollapse: "collapse"
						},
						children: [/* @__PURE__ */ jsxDEV("thead", { children: [/* @__PURE__ */ jsxDEV("tr", { children: [
							/* @__PURE__ */ jsxDEV("th", {
								rowSpan: 2,
								style: {
									textAlign: "center",
									verticalAlign: "middle"
								},
								children: "Tanggal"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 679,
								columnNumber: 21
							}, this),
							/* @__PURE__ */ jsxDEV("th", {
								rowSpan: 2,
								style: {
									textAlign: "center",
									verticalAlign: "middle"
								},
								children: "No. SJ"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 680,
								columnNumber: 21
							}, this),
							/* @__PURE__ */ jsxDEV("th", {
								rowSpan: 2,
								style: {
									textAlign: "center",
									verticalAlign: "middle"
								},
								children: "Keterangan"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 681,
								columnNumber: 21
							}, this),
							/* @__PURE__ */ jsxDEV("th", {
								colSpan: 2,
								style: { textAlign: "center" },
								children: "Mutasi Barang"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 682,
								columnNumber: 21
							}, this),
							/* @__PURE__ */ jsxDEV("th", {
								rowSpan: 2,
								style: {
									textAlign: "center",
									verticalAlign: "middle"
								},
								children: "Stok Akhir"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 683,
								columnNumber: 21
							}, this)
						] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 678,
							columnNumber: 19
						}, this), /* @__PURE__ */ jsxDEV("tr", { children: [/* @__PURE__ */ jsxDEV("th", {
							style: {
								color: "var(--success)",
								textAlign: "center"
							},
							children: "Masuk"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 686,
							columnNumber: 21
						}, this), /* @__PURE__ */ jsxDEV("th", {
							style: {
								color: "var(--danger)",
								textAlign: "center"
							},
							children: "Keluar"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 687,
							columnNumber: 21
						}, this)] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 685,
							columnNumber: 19
						}, this)] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 677,
							columnNumber: 17
						}, this), /* @__PURE__ */ jsxDEV("tbody", { children: (() => {
							let balance = 0;
							return hoverCard.movements.map((m, idx) => {
								const qty = m.quantity_change;
								balance += qty;
								let cleanStr = null;
								if (typeof m.created_at === "string") cleanStr = m.created_at.includes("T") ? m.created_at : m.created_at.replace(/-/g, "/");
								else if (typeof m.created_at === "number") cleanStr = m.created_at;
								const dateObj = cleanStr ? new Date(cleanStr) : null;
								const dateStr = dateObj && !isNaN(dateObj.getTime()) ? `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}` : m.created_at || "-";
								let noSj = "-";
								if (m.reference) {
									const orderIdMatch = m.reference.match(/(?:Order ID:\s*)([a-zA-Z0-9\/\-]+)/i);
									if (orderIdMatch && orderIdMatch[1]) noSj = orderIdMatch[1];
									else if (m.reference.startsWith("Opname ID:")) noSj = "-";
									else noSj = m.reference;
								}
								let keterangan = m.movement_type.toUpperCase();
								if (m.movement_type === "initial") keterangan = "STOCK OPNAME";
								else if (m.movement_type === "manual_adjust") if (m.reference && m.reference.includes("Opname")) keterangan = "STOCK OPNAME";
								else if (m.quantity_change > 0) keterangan = "BARANG MASUK";
								else keterangan = "MANUAL ADJUST";
								else if (m.movement_type === "sale") keterangan = m.platform_name ? m.platform_name.toUpperCase() : "SHOPEE";
								else if (m.movement_type === "return") keterangan = "DIRETUR";
								else if (m.movement_type === "write_off") keterangan = "WRITE OFF";
								const masuk = qty > 0 ? qty : "";
								const keluar = qty < 0 ? Math.abs(qty) : "";
								return /* @__PURE__ */ jsxDEV("tr", { children: [
									/* @__PURE__ */ jsxDEV("td", {
										style: { textAlign: "center" },
										children: dateStr
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 745,
										columnNumber: 27
									}, this),
									/* @__PURE__ */ jsxDEV("td", {
										style: {
											fontFamily: "monospace",
											fontSize: "0.72rem"
										},
										children: noSj
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 746,
										columnNumber: 27
									}, this),
									/* @__PURE__ */ jsxDEV("td", { children: /* @__PURE__ */ jsxDEV("span", {
										className: "status-tag info",
										style: {
											fontSize: "0.65rem",
											padding: "0.1rem 0.35rem",
											display: "inline-block"
										},
										children: keterangan
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 748,
										columnNumber: 29
									}, this) }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 747,
										columnNumber: 27
									}, this),
									/* @__PURE__ */ jsxDEV("td", {
										style: {
											color: "var(--success)",
											fontWeight: 600,
											textAlign: "center"
										},
										children: masuk
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 752,
										columnNumber: 27
									}, this),
									/* @__PURE__ */ jsxDEV("td", {
										style: {
											color: "var(--danger)",
											fontWeight: 600,
											textAlign: "center"
										},
										children: keluar
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 753,
										columnNumber: 27
									}, this),
									/* @__PURE__ */ jsxDEV("td", {
										style: {
											fontWeight: 600,
											color: "var(--text-primary)",
											textAlign: "center"
										},
										children: balance
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 754,
										columnNumber: 27
									}, this)
								] }, m.id || idx, true, {
									fileName: _jsxFileName,
									lineNumber: 744,
									columnNumber: 25
								}, this);
							});
						})() }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 690,
							columnNumber: 17
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 676,
						columnNumber: 15
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 675,
					columnNumber: 13
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 644,
				columnNumber: 9
			}, this),
			activeModal === "add" && /* @__PURE__ */ jsxDEV("div", {
				className: "modal-overlay",
				children: /* @__PURE__ */ jsxDEV("div", {
					className: "modal",
					children: [
						/* @__PURE__ */ jsxDEV("div", {
							className: "modal-header",
							children: [/* @__PURE__ */ jsxDEV("h3", { children: "Create New Product" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 771,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("button", {
								className: "modal-close",
								onClick: closeModal,
								children: "×"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 772,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 770,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("div", {
							className: "modal-body",
							children: /* @__PURE__ */ jsxDEV("form", {
								id: "modal-product-form",
								className: "login-form",
								style: { gap: "1rem" },
								onSubmit: handleAddSubmit,
								children: [
									/* @__PURE__ */ jsxDEV("div", {
										className: "form-group",
										children: [/* @__PURE__ */ jsxDEV("label", {
											htmlFor: "p-name",
											children: "Product Name (Unique)"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 777,
											columnNumber: 19
										}, this), /* @__PURE__ */ jsxDEV("input", {
											type: "text",
											id: "p-name",
											required: true,
											placeholder: "e.g. Korek Api Model A",
											value: formName,
											onChange: (e) => setFormName(e.target.value)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 778,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 776,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("div", {
										className: "form-group",
										children: [/* @__PURE__ */ jsxDEV("label", {
											htmlFor: "p-master-sku",
											children: "Master SKU (Optional)"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 788,
											columnNumber: 19
										}, this), /* @__PURE__ */ jsxDEV("input", {
											type: "text",
											id: "p-master-sku",
											placeholder: "e.g. CROSUP_1S",
											value: formMasterSku,
											onChange: (e) => setFormMasterSku(e.target.value)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 789,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 787,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("div", {
										className: "form-group",
										children: [/* @__PURE__ */ jsxDEV("label", {
											htmlFor: "p-model",
											children: "SKU (Reference)"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 798,
											columnNumber: 19
										}, this), /* @__PURE__ */ jsxDEV("input", {
											type: "text",
											id: "p-model",
											required: true,
											placeholder: "e.g. CROBAR_1S",
											value: formModel,
											onChange: (e) => setFormModel(e.target.value)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 799,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 797,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("div", {
										className: "form-group",
										children: [/* @__PURE__ */ jsxDEV("label", {
											htmlFor: "p-desc",
											children: "Description (Optional)"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 809,
											columnNumber: 19
										}, this), /* @__PURE__ */ jsxDEV("textarea", {
											id: "p-desc",
											placeholder: "Details about branding, packaging...",
											value: formDesc,
											onChange: (e) => setFormDesc(e.target.value)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 810,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 808,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("div", {
										className: "form-group",
										children: [/* @__PURE__ */ jsxDEV("label", {
											htmlFor: "p-stock",
											children: "Initial Stock Level"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 818,
											columnNumber: 19
										}, this), /* @__PURE__ */ jsxDEV("input", {
											type: "number",
											id: "p-stock",
											min: "0",
											value: formStock,
											onChange: (e) => setFormStock(parseInt(e.target.value, 10) || 0)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 819,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 817,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("div", {
										className: "form-group",
										children: [/* @__PURE__ */ jsxDEV("label", {
											htmlFor: "p-threshold",
											children: "Low Stock Alert Threshold"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 828,
											columnNumber: 19
										}, this), /* @__PURE__ */ jsxDEV("input", {
											type: "number",
											id: "p-threshold",
											min: "0",
											value: formThreshold,
											onChange: (e) => setFormThreshold(parseInt(e.target.value, 10) || 0)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 829,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 827,
										columnNumber: 17
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 775,
								columnNumber: 15
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 774,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("div", {
							className: "modal-footer",
							children: [/* @__PURE__ */ jsxDEV("button", {
								className: "btn btn-secondary",
								onClick: closeModal,
								children: "Cancel"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 840,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("button", {
								type: "submit",
								form: "modal-product-form",
								className: "btn btn-primary",
								disabled: createProductMutation.isPending,
								children: createProductMutation.isPending ? "Saving..." : "Save Product"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 841,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 839,
							columnNumber: 13
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 769,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 768,
				columnNumber: 9
			}, this),
			activeModal === "edit" && /* @__PURE__ */ jsxDEV("div", {
				className: "modal-overlay",
				children: /* @__PURE__ */ jsxDEV("div", {
					className: "modal",
					children: [
						/* @__PURE__ */ jsxDEV("div", {
							className: "modal-header",
							children: [/* @__PURE__ */ jsxDEV("h3", { children: "Edit Product Details" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 854,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("button", {
								className: "modal-close",
								onClick: closeModal,
								children: "×"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 855,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 853,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("div", {
							className: "modal-body",
							children: /* @__PURE__ */ jsxDEV("form", {
								id: "modal-product-edit-form",
								className: "login-form",
								style: { gap: "1rem" },
								onSubmit: handleEditSubmit,
								children: [
									/* @__PURE__ */ jsxDEV("div", {
										className: "form-group",
										children: [/* @__PURE__ */ jsxDEV("label", {
											htmlFor: "p-edit-name",
											children: "Product Name (Unique)"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 860,
											columnNumber: 19
										}, this), /* @__PURE__ */ jsxDEV("input", {
											type: "text",
											id: "p-edit-name",
											required: true,
											value: formName,
											onChange: (e) => setFormName(e.target.value)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 861,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 859,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("div", {
										className: "form-group",
										children: [/* @__PURE__ */ jsxDEV("label", {
											htmlFor: "p-edit-master-sku",
											children: "Master SKU"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 870,
											columnNumber: 19
										}, this), /* @__PURE__ */ jsxDEV("input", {
											type: "text",
											id: "p-edit-master-sku",
											placeholder: "e.g. CROSUP_1S",
											value: formMasterSku,
											onChange: (e) => setFormMasterSku(e.target.value)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 871,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 869,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("div", {
										className: "form-group",
										children: [/* @__PURE__ */ jsxDEV("label", {
											htmlFor: "p-edit-model",
											children: "SKU (Reference)"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 880,
											columnNumber: 19
										}, this), /* @__PURE__ */ jsxDEV("input", {
											type: "text",
											id: "p-edit-model",
											required: true,
											value: formModel,
											onChange: (e) => setFormModel(e.target.value)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 881,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 879,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("div", {
										className: "form-group",
										children: [/* @__PURE__ */ jsxDEV("label", {
											htmlFor: "p-edit-desc",
											children: "Description"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 890,
											columnNumber: 19
										}, this), /* @__PURE__ */ jsxDEV("textarea", {
											id: "p-edit-desc",
											value: formDesc,
											onChange: (e) => setFormDesc(e.target.value)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 891,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 889,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("div", {
										className: "form-group",
										children: [/* @__PURE__ */ jsxDEV("label", {
											htmlFor: "p-edit-threshold",
											children: "Low Stock Alert Threshold"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 898,
											columnNumber: 19
										}, this), /* @__PURE__ */ jsxDEV("input", {
											type: "number",
											id: "p-edit-threshold",
											required: true,
											min: "0",
											value: formThreshold,
											onChange: (e) => setFormThreshold(parseInt(e.target.value, 10) || 0)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 899,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 897,
										columnNumber: 17
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 858,
								columnNumber: 15
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 857,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("div", {
							className: "modal-footer",
							children: [/* @__PURE__ */ jsxDEV("button", {
								className: "btn btn-secondary",
								onClick: closeModal,
								children: "Cancel"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 911,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("button", {
								type: "submit",
								form: "modal-product-edit-form",
								className: "btn btn-primary",
								disabled: editProductMutation.isPending,
								children: editProductMutation.isPending ? "Updating..." : "Update Details"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 912,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 910,
							columnNumber: 13
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 852,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 851,
				columnNumber: 9
			}, this),
			activeModal === "adjust" && selectedProduct && /* @__PURE__ */ jsxDEV("div", {
				className: "modal-overlay",
				children: /* @__PURE__ */ jsxDEV("div", {
					className: "modal",
					children: [
						/* @__PURE__ */ jsxDEV("div", {
							className: "modal-header",
							children: [/* @__PURE__ */ jsxDEV("h3", { children: ["Adjust Stock: ", selectedProduct.name] }, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 925,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("button", {
								className: "modal-close",
								onClick: closeModal,
								children: "×"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 926,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 924,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("div", {
							className: "modal-body",
							children: [/* @__PURE__ */ jsxDEV("div", {
								style: {
									marginBottom: "1rem",
									padding: "0.5rem",
									backgroundColor: "var(--bg-primary)",
									borderRadius: "var(--border-radius-sm)",
									fontSize: "0.9rem"
								},
								children: [
									/* @__PURE__ */ jsxDEV("strong", { children: "Current Stock:" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 938,
										columnNumber: 17
									}, this),
									" ",
									/* @__PURE__ */ jsxDEV("span", {
										style: { fontWeight: 600 },
										children: selectedProduct.current_stock
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 939,
										columnNumber: 17
									}, this),
									" units"
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 929,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("form", {
								id: "modal-adjust-form",
								className: "login-form",
								style: { gap: "1rem" },
								onSubmit: handleAdjustSubmit,
								children: [
									/* @__PURE__ */ jsxDEV("div", {
										className: "form-group",
										children: [/* @__PURE__ */ jsxDEV("label", {
											htmlFor: "p-adjust-qty",
											children: "Quantity Change"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 943,
											columnNumber: 19
										}, this), /* @__PURE__ */ jsxDEV("input", {
											type: "number",
											id: "p-adjust-qty",
											required: true,
											placeholder: "Use negative numbers to subtract (e.g. -5)",
											value: adjustQty,
											onChange: (e) => setAdjustQty(e.target.value)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 944,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 942,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("div", {
										className: "form-group",
										children: [/* @__PURE__ */ jsxDEV("label", {
											htmlFor: "p-adjust-type",
											children: "Movement Type"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 954,
											columnNumber: 19
										}, this), /* @__PURE__ */ jsxDEV("select", {
											id: "p-adjust-type",
											value: adjustType,
											onChange: (e) => setAdjustType(e.target.value),
											children: [
												/* @__PURE__ */ jsxDEV("option", {
													value: "manual_adjust",
													children: "Manual Adjustment"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 960,
													columnNumber: 21
												}, this),
												/* @__PURE__ */ jsxDEV("option", {
													value: "return",
													children: "Return"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 961,
													columnNumber: 21
												}, this),
												/* @__PURE__ */ jsxDEV("option", {
													value: "write_off",
													children: "Write Off (Loss/Damaged)"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 962,
													columnNumber: 21
												}, this)
											]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 955,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 953,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("div", {
										className: "form-group",
										children: [/* @__PURE__ */ jsxDEV("label", {
											htmlFor: "p-adjust-ref",
											children: "Reference/Reason"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 966,
											columnNumber: 19
										}, this), /* @__PURE__ */ jsxDEV("input", {
											type: "text",
											id: "p-adjust-ref",
											required: true,
											placeholder: "e.g. Stock count recount, damaged box, return from J&T",
											value: adjustRef,
											onChange: (e) => setAdjustRef(e.target.value)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 967,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 965,
										columnNumber: 17
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 941,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 928,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("div", {
							className: "modal-footer",
							children: [/* @__PURE__ */ jsxDEV("button", {
								className: "btn btn-secondary",
								onClick: closeModal,
								children: "Cancel"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 979,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("button", {
								type: "submit",
								form: "modal-adjust-form",
								className: "btn btn-primary",
								disabled: adjustStockMutation.isPending,
								children: adjustStockMutation.isPending ? "Saving..." : "Save Adjustment"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 980,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 978,
							columnNumber: 13
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 923,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 922,
				columnNumber: 9
			}, this),
			activeModal === "delete" && selectedProduct && /* @__PURE__ */ jsxDEV("div", {
				className: "modal-overlay",
				children: /* @__PURE__ */ jsxDEV("div", {
					className: "modal",
					children: [
						/* @__PURE__ */ jsxDEV("div", {
							className: "modal-header",
							children: [/* @__PURE__ */ jsxDEV("h3", { children: "Confirm Delete Product" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 993,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("button", {
								className: "modal-close",
								onClick: closeModal,
								children: "×"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 994,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 992,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("div", {
							className: "modal-body",
							children: [/* @__PURE__ */ jsxDEV("p", {
								style: {
									marginBottom: "1rem",
									color: "var(--text-primary)"
								},
								children: [
									"Are you sure you want to delete product ",
									/* @__PURE__ */ jsxDEV("strong", { children: selectedProduct.name }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 998,
										columnNumber: 57
									}, this),
									"?"
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 997,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("p", {
								style: {
									color: "var(--danger)",
									fontSize: "0.85rem",
									fontWeight: 500,
									marginBottom: "0.5rem"
								},
								children: "⚠️ This action is permanent and will delete all associated order item histories and stock movements!"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1e3,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 996,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("div", {
							className: "modal-footer",
							children: [/* @__PURE__ */ jsxDEV("button", {
								className: "btn btn-secondary",
								onClick: closeModal,
								children: "Cancel"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1005,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("button", {
								className: "btn btn-danger",
								onClick: handleDeleteSubmit,
								disabled: deleteProductMutation.isPending,
								children: deleteProductMutation.isPending ? "Deleting..." : "🗑️ Delete Product"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 1006,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 1004,
							columnNumber: 13
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 991,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 990,
				columnNumber: 9
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 518,
		columnNumber: 5
	}, this);
}
//#endregion
//#region app/routes/products.jsx?tsr-split=component
var SplitComponent = Products;
//#endregion
export { SplitComponent as component };
