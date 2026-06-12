import { n as useWebSocket } from "./WebSocketContext-H05AamCP.js";
import { t as showToast } from "./toast-kJrtdafl.js";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { jsxDEV } from "react/jsx-dev-runtime";
//#region app/pages/Opname.jsx
var _jsxFileName = "/data/data/com.termux/files/home/stock-manager/app/pages/Opname.jsx";
function Opname() {
	const queryClient = useQueryClient();
	const { addWsListener } = useWebSocket();
	const [activeModal, setActiveModal] = useState(null);
	const [selectedOpnameId, setSelectedOpnameId] = useState(null);
	const [isFormInitialized, setIsFormInitialized] = useState(false);
	const [notes, setNotes] = useState("");
	const [physicalCounts, setPhysicalCounts] = useState({});
	const [productSearch, setProductSearch] = useState("");
	const { data: opnames = [], isLoading, error } = useQuery({
		queryKey: ["opnames"],
		queryFn: async () => {
			const res = await fetch("/api/stock/opname");
			if (!res.ok) throw new Error("Failed to fetch opname history");
			return res.json();
		}
	});
	const { data: products = [] } = useQuery({
		queryKey: ["products"],
		queryFn: async () => {
			const res = await fetch("/api/products");
			if (!res.ok) throw new Error("Failed to fetch products");
			return res.json();
		},
		enabled: activeModal === "new"
	});
	const { data: opnameDetails, isLoading: isLoadingDetails } = useQuery({
		queryKey: ["opnameDetails", selectedOpnameId],
		queryFn: async () => {
			if (!selectedOpnameId) return null;
			const res = await fetch(`/api/stock/opname/${selectedOpnameId}`);
			if (!res.ok) throw new Error("Failed to fetch opname details");
			return res.json();
		},
		enabled: activeModal === "details" && !!selectedOpnameId
	});
	useEffect(() => {
		if (activeModal === "new" && products.length > 0 && !isFormInitialized) {
			const initialCounts = {};
			products.forEach((p) => {
				initialCounts[p.id] = p.current_stock;
			});
			setPhysicalCounts(initialCounts);
			setIsFormInitialized(true);
		}
	}, [
		products,
		activeModal,
		isFormInitialized
	]);
	useEffect(() => {
		if (error) showToast("Error", "Failed to load stock opname history", "error");
	}, [error]);
	useEffect(() => {
		const unsubscribe = addWsListener((msg) => {
			if (msg.type === "OPNAME_CREATED" || msg.type === "MOVEMENT_CREATED") queryClient.invalidateQueries({ queryKey: ["opnames"] });
		});
		const handleResync = () => {
			queryClient.invalidateQueries({ queryKey: ["opnames"] });
		};
		window.addEventListener("resync-data", handleResync);
		return () => {
			unsubscribe();
			window.removeEventListener("resync-data", handleResync);
		};
	}, [addWsListener, queryClient]);
	const createOpnameMutation = useMutation({
		mutationFn: async (payload) => {
			const res = await fetch("/api/stock/opname", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload)
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.message || "Failed to save stock opname");
			}
			return res.json();
		},
		onSuccess: () => {
			showToast("Success", "Stock opname saved successfully", "success");
			queryClient.invalidateQueries({ queryKey: ["opnames"] });
			queryClient.invalidateQueries({ queryKey: ["products"] });
			closeModal();
		},
		onError: (err) => {
			showToast("Error", err.message, "error");
		}
	});
	const openNewOpnameModal = () => {
		setNotes("");
		setProductSearch("");
		setPhysicalCounts({});
		setIsFormInitialized(false);
		setActiveModal("new");
	};
	const openDetailsModal = (id) => {
		setSelectedOpnameId(id);
		setActiveModal("details");
	};
	const closeModal = () => {
		setActiveModal(null);
		setSelectedOpnameId(null);
		setIsFormInitialized(false);
	};
	const handlePhysicalCountChange = (productId, val) => {
		setPhysicalCounts((prev) => ({
			...prev,
			[productId]: val
		}));
	};
	const handleNewOpnameSubmit = (e) => {
		e.preventDefault();
		const items = [];
		let hasError = false;
		products.forEach((p) => {
			const val = physicalCounts[p.id] !== void 0 ? physicalCounts[p.id] : p.current_stock;
			const physical_stock = parseInt(val, 10);
			if (isNaN(physical_stock) || physical_stock < 0) hasError = true;
			else items.push({
				product_id: p.id,
				physical_stock
			});
		});
		if (hasError) {
			showToast("Error", "Please enter a valid non-negative physical stock count for all products", "error");
			return;
		}
		createOpnameMutation.mutate({
			notes: notes.trim(),
			items
		});
	};
	const formatDate = (dateStr) => {
		if (!dateStr) return "-";
		try {
			let cleanStr = null;
			if (typeof dateStr === "string") cleanStr = dateStr.includes("T") ? dateStr : dateStr.replace(/-/g, "/");
			else if (typeof dateStr === "number") cleanStr = dateStr;
			if (!cleanStr) return String(dateStr);
			const d = new Date(cleanStr);
			if (isNaN(d.getTime())) return String(dateStr);
			return d.toLocaleString("id-ID", {
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
				hour: "2-digit",
				minute: "2-digit"
			});
		} catch (e) {
			return String(dateStr);
		}
	};
	const filteredProducts = products.filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.model.toLowerCase().includes(productSearch.toLowerCase()));
	return /* @__PURE__ */ jsxDEV("div", {
		className: "section-card",
		children: [
			/* @__PURE__ */ jsxDEV("div", {
				className: "section-header",
				children: [/* @__PURE__ */ jsxDEV("h2", { children: "Stock Opname (Physical Inventory Audit)" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 209,
					columnNumber: 9
				}, this), /* @__PURE__ */ jsxDEV("button", {
					id: "btn-new-opname",
					className: "btn btn-primary",
					onClick: openNewOpnameModal,
					children: [/* @__PURE__ */ jsxDEV("svg", {
						viewBox: "0 0 24 24",
						fill: "none",
						stroke: "currentColor",
						children: /* @__PURE__ */ jsxDEV("path", { d: "M5 12h14M12 5v14" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 212,
							columnNumber: 13
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 211,
						columnNumber: 11
					}, this), "New Stock Opname"]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 210,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 208,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ jsxDEV("div", {
				className: "table-wrapper",
				children: /* @__PURE__ */ jsxDEV("table", { children: [/* @__PURE__ */ jsxDEV("thead", { children: /* @__PURE__ */ jsxDEV("tr", { children: [
					/* @__PURE__ */ jsxDEV("th", { children: "Opname ID" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 222,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ jsxDEV("th", { children: "Date" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 223,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ jsxDEV("th", { children: "User" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 224,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ jsxDEV("th", { children: "Notes" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 225,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ jsxDEV("th", { children: "Items Counted" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 226,
						columnNumber: 15
					}, this),
					/* @__PURE__ */ jsxDEV("th", { children: "Actions" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 227,
						columnNumber: 15
					}, this)
				] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 221,
					columnNumber: 13
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 220,
					columnNumber: 11
				}, this), /* @__PURE__ */ jsxDEV("tbody", {
					id: "opname-table-body",
					children: isLoading ? /* @__PURE__ */ jsxDEV("tr", { children: /* @__PURE__ */ jsxDEV("td", {
						colSpan: 6,
						style: {
							textAlign: "center",
							color: "var(--text-muted)"
						},
						children: "Loading reports..."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 233,
						columnNumber: 17
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 232,
						columnNumber: 15
					}, this) : opnames.length === 0 ? /* @__PURE__ */ jsxDEV("tr", { children: /* @__PURE__ */ jsxDEV("td", {
						colSpan: 6,
						style: {
							textAlign: "center",
							color: "var(--text-muted)"
						},
						children: "No stock opname records found. Click \"New Stock Opname\" to start."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 239,
						columnNumber: 17
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 238,
						columnNumber: 15
					}, this) : opnames.map((item) => /* @__PURE__ */ jsxDEV("tr", { children: [
						/* @__PURE__ */ jsxDEV("td", { children: /* @__PURE__ */ jsxDEV("strong", { children: ["#", item.id] }, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 246,
							columnNumber: 23
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 246,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ jsxDEV("td", { children: formatDate(item.created_at) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 247,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ jsxDEV("td", { children: /* @__PURE__ */ jsxDEV("span", {
							className: "status-tag info",
							children: item.username || "Unknown"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 248,
							columnNumber: 23
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 248,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ jsxDEV("td", { children: /* @__PURE__ */ jsxDEV("span", {
							style: {
								fontSize: "0.9rem",
								color: "var(--text-secondary)"
							},
							children: item.notes || "-"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 249,
							columnNumber: 23
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 249,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ jsxDEV("td", { children: /* @__PURE__ */ jsxDEV("span", {
							className: "status-tag success",
							children: [item.items_count, " products"]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 250,
							columnNumber: 23
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 250,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ jsxDEV("td", { children: /* @__PURE__ */ jsxDEV("button", {
							className: "btn btn-secondary btn-sm btn-view-details",
							onClick: () => openDetailsModal(item.id),
							children: [/* @__PURE__ */ jsxDEV("svg", {
								viewBox: "0 0 24 24",
								fill: "none",
								stroke: "currentColor",
								children: [/* @__PURE__ */ jsxDEV("path", { d: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 254,
									columnNumber: 25
								}, this), /* @__PURE__ */ jsxDEV("circle", {
									cx: "12",
									cy: "12",
									r: "3"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 255,
									columnNumber: 25
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 253,
								columnNumber: 23
							}, this), "View Details"]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 252,
							columnNumber: 21
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 251,
							columnNumber: 19
						}, this)
					] }, item.id, true, {
						fileName: _jsxFileName,
						lineNumber: 245,
						columnNumber: 17
					}, this))
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 230,
					columnNumber: 11
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 219,
					columnNumber: 9
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 218,
				columnNumber: 7
			}, this),
			activeModal === "new" && /* @__PURE__ */ jsxDEV("div", {
				className: "modal-overlay",
				children: /* @__PURE__ */ jsxDEV("div", {
					className: "modal",
					style: { maxWidth: "650px" },
					children: [
						/* @__PURE__ */ jsxDEV("div", {
							className: "modal-header",
							children: [/* @__PURE__ */ jsxDEV("h3", { children: "New Stock Opname" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 272,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("button", {
								className: "modal-close",
								onClick: closeModal,
								children: "×"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 273,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 271,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("div", {
							className: "modal-body",
							children: /* @__PURE__ */ jsxDEV("form", {
								id: "new-opname-form",
								style: {
									display: "flex",
									flexDirection: "column",
									gap: "1.25rem"
								},
								onSubmit: handleNewOpnameSubmit,
								children: [
									/* @__PURE__ */ jsxDEV("div", {
										className: "form-group",
										children: [/* @__PURE__ */ jsxDEV("label", {
											htmlFor: "opname-notes",
											children: "Audit Notes"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 278,
											columnNumber: 19
										}, this), /* @__PURE__ */ jsxDEV("textarea", {
											id: "opname-notes",
											placeholder: "Enter notes for this audit (e.g. Weekly physical stock count)",
											value: notes,
											onChange: (e) => setNotes(e.target.value)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 279,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 277,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("div", {
										style: {
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
											gap: "1rem",
											flexWrap: "wrap"
										},
										children: [/* @__PURE__ */ jsxDEV("div", {
											style: {
												fontWeight: 600,
												fontSize: "0.95rem"
											},
											children: "Product Physical Counts"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 288,
											columnNumber: 19
										}, this), /* @__PURE__ */ jsxDEV("input", {
											type: "text",
											id: "opname-search-input",
											className: "form-input",
											placeholder: "🔍 Search product name or SKU...",
											style: {
												maxWidth: "300px",
												padding: "0.35rem 0.5rem",
												fontSize: "0.8rem",
												marginBottom: 0
											},
											value: productSearch,
											onChange: (e) => setProductSearch(e.target.value)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 289,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 287,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("div", {
										className: "table-wrapper",
										style: {
											maxHeight: "350px",
											overflowY: "auto"
										},
										children: /* @__PURE__ */ jsxDEV("table", { children: [/* @__PURE__ */ jsxDEV("thead", { children: /* @__PURE__ */ jsxDEV("tr", { children: [
											/* @__PURE__ */ jsxDEV("th", { children: "Product Name (SKU)" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 304,
												columnNumber: 25
											}, this),
											/* @__PURE__ */ jsxDEV("th", {
												style: {
													textAlign: "right",
													width: "100px"
												},
												children: "System"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 305,
												columnNumber: 25
											}, this),
											/* @__PURE__ */ jsxDEV("th", {
												style: {
													textAlign: "right",
													width: "120px"
												},
												children: "Physical Count"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 306,
												columnNumber: 25
											}, this)
										] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 303,
											columnNumber: 23
										}, this) }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 302,
											columnNumber: 21
										}, this), /* @__PURE__ */ jsxDEV("tbody", {
											id: "opname-modal-table-body",
											children: filteredProducts.map((p) => {
												const countVal = physicalCounts[p.id] ?? p.current_stock;
												return /* @__PURE__ */ jsxDEV("tr", {
													className: "opname-product-row",
													children: [
														/* @__PURE__ */ jsxDEV("td", { children: [/* @__PURE__ */ jsxDEV("div", {
															style: { fontWeight: 500 },
															children: p.name
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 315,
															columnNumber: 31
														}, this), /* @__PURE__ */ jsxDEV("div", {
															style: {
																fontSize: "0.8rem",
																color: "var(--text-muted)"
															},
															children: p.model
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 316,
															columnNumber: 31
														}, this)] }, void 0, true, {
															fileName: _jsxFileName,
															lineNumber: 314,
															columnNumber: 29
														}, this),
														/* @__PURE__ */ jsxDEV("td", {
															style: {
																textAlign: "right",
																fontWeight: 500
															},
															children: p.current_stock
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 318,
															columnNumber: 29
														}, this),
														/* @__PURE__ */ jsxDEV("td", {
															style: { textAlign: "right" },
															children: /* @__PURE__ */ jsxDEV("input", {
																type: "number",
																className: "physical-stock-input form-input",
																style: {
																	width: "100px",
																	padding: "0.25rem 0.5rem",
																	textAlign: "right"
																},
																min: "0",
																required: true,
																value: countVal,
																onChange: (e) => handlePhysicalCountChange(p.id, e.target.value)
															}, void 0, false, {
																fileName: _jsxFileName,
																lineNumber: 320,
																columnNumber: 31
															}, this)
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 319,
															columnNumber: 29
														}, this)
													]
												}, p.id, true, {
													fileName: _jsxFileName,
													lineNumber: 313,
													columnNumber: 27
												}, this);
											})
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 309,
											columnNumber: 21
										}, this)] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 301,
											columnNumber: 19
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 300,
										columnNumber: 17
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 276,
								columnNumber: 15
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 275,
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
								lineNumber: 339,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("button", {
								type: "submit",
								form: "new-opname-form",
								className: "btn btn-primary",
								disabled: createOpnameMutation.isPending,
								children: createOpnameMutation.isPending ? "Saving..." : "Save Opname"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 340,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 338,
							columnNumber: 13
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 270,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 269,
				columnNumber: 9
			}, this),
			activeModal === "details" && selectedOpnameId && /* @__PURE__ */ jsxDEV("div", {
				className: "modal-overlay",
				children: /* @__PURE__ */ jsxDEV("div", {
					className: "modal",
					style: { maxWidth: "750px" },
					children: [
						/* @__PURE__ */ jsxDEV("div", {
							className: "modal-header",
							children: [/* @__PURE__ */ jsxDEV("h3", { children: ["Stock Opname Report #", selectedOpnameId] }, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 353,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("button", {
								className: "modal-close",
								onClick: closeModal,
								children: "×"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 354,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 352,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("div", {
							className: "modal-body",
							children: isLoadingDetails ? /* @__PURE__ */ jsxDEV("div", {
								style: {
									padding: "1.5rem",
									textAlign: "center",
									color: "var(--text-secondary)"
								},
								children: "Loading details..."
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 358,
								columnNumber: 17
							}, this) : !opnameDetails ? /* @__PURE__ */ jsxDEV("div", {
								style: {
									padding: "1.5rem",
									textAlign: "center",
									color: "var(--danger)"
								},
								children: "Failed to load report details."
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 362,
								columnNumber: 17
							}, this) : /* @__PURE__ */ jsxDEV("div", {
								className: "print-report-container",
								children: [/* @__PURE__ */ jsxDEV("div", {
									className: "print-header",
									style: { marginBottom: "1.5rem" },
									children: [/* @__PURE__ */ jsxDEV("h2", {
										className: "print-only-title",
										style: {
											display: "none",
											marginBottom: "0.5rem",
											borderBottom: "2px solid var(--text-primary)",
											paddingBottom: "0.5rem"
										},
										children: "STOCK OPNAME REPORT"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 368,
										columnNumber: 21
									}, this), /* @__PURE__ */ jsxDEV("div", {
										style: {
											display: "grid",
											gridTemplateColumns: "120px 1fr",
											gap: "0.5rem",
											fontSize: "0.95rem"
										},
										children: [
											/* @__PURE__ */ jsxDEV("strong", { children: "Opname ID:" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 372,
												columnNumber: 23
											}, this),
											" ",
											/* @__PURE__ */ jsxDEV("span", { children: ["#", opnameDetails.id] }, void 0, true, {
												fileName: _jsxFileName,
												lineNumber: 372,
												columnNumber: 51
											}, this),
											/* @__PURE__ */ jsxDEV("strong", { children: "Date:" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 373,
												columnNumber: 23
											}, this),
											" ",
											/* @__PURE__ */ jsxDEV("span", { children: formatDate(opnameDetails.created_at) }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 373,
												columnNumber: 46
											}, this),
											/* @__PURE__ */ jsxDEV("strong", { children: "User:" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 374,
												columnNumber: 23
											}, this),
											" ",
											/* @__PURE__ */ jsxDEV("span", { children: opnameDetails.username || "Unknown" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 374,
												columnNumber: 46
											}, this),
											/* @__PURE__ */ jsxDEV("strong", { children: "Notes:" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 375,
												columnNumber: 23
											}, this),
											" ",
											/* @__PURE__ */ jsxDEV("span", { children: opnameDetails.notes || "-" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 375,
												columnNumber: 47
											}, this)
										]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 371,
										columnNumber: 21
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 367,
									columnNumber: 19
								}, this), /* @__PURE__ */ jsxDEV("div", {
									className: "table-wrapper",
									children: /* @__PURE__ */ jsxDEV("table", { children: [/* @__PURE__ */ jsxDEV("thead", { children: /* @__PURE__ */ jsxDEV("tr", { children: [
										/* @__PURE__ */ jsxDEV("th", { children: "Product Name" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 383,
											columnNumber: 27
										}, this),
										/* @__PURE__ */ jsxDEV("th", { children: "SKU" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 384,
											columnNumber: 27
										}, this),
										/* @__PURE__ */ jsxDEV("th", {
											style: { textAlign: "right" },
											children: "System Stock"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 385,
											columnNumber: 27
										}, this),
										/* @__PURE__ */ jsxDEV("th", {
											style: { textAlign: "right" },
											children: "Physical Stock"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 386,
											columnNumber: 27
										}, this),
										/* @__PURE__ */ jsxDEV("th", {
											style: { textAlign: "right" },
											children: "Variance"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 387,
											columnNumber: 27
										}, this)
									] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 382,
										columnNumber: 25
									}, this) }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 381,
										columnNumber: 23
									}, this), /* @__PURE__ */ jsxDEV("tbody", { children: opnameDetails.items && opnameDetails.items.map((item) => {
										const varVal = item.variance;
										const varText = varVal > 0 ? `+${varVal}` : `${varVal}`;
										let varColor = "var(--text-secondary)";
										if (varVal > 0) varColor = "var(--success)";
										if (varVal < 0) varColor = "var(--danger)";
										return /* @__PURE__ */ jsxDEV("tr", { children: [
											/* @__PURE__ */ jsxDEV("td", { children: item.name }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 401,
												columnNumber: 33
											}, this),
											/* @__PURE__ */ jsxDEV("td", { children: /* @__PURE__ */ jsxDEV("span", {
												className: "status-tag info",
												children: item.model
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 402,
												columnNumber: 37
											}, this) }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 402,
												columnNumber: 33
											}, this),
											/* @__PURE__ */ jsxDEV("td", {
												style: { textAlign: "right" },
												children: item.system_stock
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 403,
												columnNumber: 33
											}, this),
											/* @__PURE__ */ jsxDEV("td", {
												style: { textAlign: "right" },
												children: item.physical_stock
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 404,
												columnNumber: 33
											}, this),
											/* @__PURE__ */ jsxDEV("td", {
												style: {
													textAlign: "right",
													fontWeight: 600,
													color: varColor
												},
												children: varText
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 405,
												columnNumber: 33
											}, this)
										] }, item.id || item.product_id, true, {
											fileName: _jsxFileName,
											lineNumber: 400,
											columnNumber: 31
										}, this);
									}) }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 390,
										columnNumber: 23
									}, this)] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 380,
										columnNumber: 21
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 379,
									columnNumber: 19
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 366,
								columnNumber: 17
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 356,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("div", {
							className: "modal-footer",
							children: [/* @__PURE__ */ jsxDEV("button", {
								className: "btn btn-secondary",
								onClick: closeModal,
								children: "Close"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 418,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("button", {
								className: "btn btn-primary",
								onClick: () => window.print(),
								disabled: !opnameDetails,
								children: [/* @__PURE__ */ jsxDEV("svg", {
									viewBox: "0 0 24 24",
									fill: "none",
									stroke: "currentColor",
									children: [/* @__PURE__ */ jsxDEV("path", { d: "M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 421,
										columnNumber: 19
									}, this), /* @__PURE__ */ jsxDEV("path", { d: "M6 14h12v8H6z" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 422,
										columnNumber: 19
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 420,
									columnNumber: 17
								}, this), "Print Report"]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 419,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 417,
							columnNumber: 13
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 351,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 350,
				columnNumber: 9
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 207,
		columnNumber: 5
	}, this);
}
//#endregion
//#region app/routes/opname.jsx?tsr-split=component
var SplitComponent = Opname;
//#endregion
export { SplitComponent as component };
