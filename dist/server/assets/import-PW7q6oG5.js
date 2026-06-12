import { t as showToast } from "./toast-kJrtdafl.js";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, jsxDEV } from "react/jsx-dev-runtime";
//#region app/pages/Import.jsx
var _jsxFileName = "/data/data/com.termux/files/home/stock-manager/app/pages/Import.jsx";
function SearchableSelect({ selectedId, products, onChange }) {
	const [isOpen, setIsOpen] = useState(false);
	const [filterText, setFilterText] = useState("");
	const containerRef = useRef(null);
	const selectedProd = products.find((p) => p.id === selectedId);
	const displayValue = selectedProd ? `${selectedProd.name} (${selectedProd.model})` : "";
	useEffect(() => {
		const handleClickOutside = (e) => {
			if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);
	const filtered = products.filter((p) => p.name.toLowerCase().includes(filterText.toLowerCase()) || p.model.toLowerCase().includes(filterText.toLowerCase()));
	return /* @__PURE__ */ jsxDEV("div", {
		ref: containerRef,
		className: "searchable-select-container",
		style: {
			position: "relative",
			width: "220px"
		},
		children: [/* @__PURE__ */ jsxDEV("input", {
			type: "text",
			className: "searchable-select-input",
			placeholder: "-- Map Product (Search...) --",
			style: !selectedId ? {
				borderColor: "var(--warning)",
				backgroundColor: "var(--warning-light)",
				width: "100%"
			} : { width: "100%" },
			value: isOpen ? filterText : displayValue,
			onChange: (e) => setFilterText(e.target.value),
			onFocus: () => {
				setFilterText("");
				setIsOpen(true);
			}
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 32,
			columnNumber: 7
		}, this), isOpen && /* @__PURE__ */ jsxDEV("div", {
			className: "searchable-select-dropdown",
			style: {
				display: "block",
				position: "absolute",
				top: "100%",
				left: 0,
				width: "100%",
				maxHeight: "200px",
				overflowY: "auto",
				zIndex: 1e3,
				background: "var(--bg-secondary)",
				border: "1px solid var(--border-color)",
				borderRadius: "var(--border-radius-sm)",
				boxShadow: "var(--shadow-md)"
			},
			children: filtered.length === 0 ? /* @__PURE__ */ jsxDEV("div", {
				className: "searchable-select-item",
				style: {
					padding: "0.5rem",
					color: "var(--text-muted)"
				},
				children: "No matching products"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 67,
				columnNumber: 13
			}, this) : filtered.map((p) => /* @__PURE__ */ jsxDEV("div", {
				className: `searchable-select-item ${p.id === selectedId ? "selected" : ""}`,
				style: {
					padding: "0.4rem 0.6rem",
					cursor: "pointer",
					fontSize: "0.8rem"
				},
				onMouseDown: () => {
					onChange(p.id);
					setIsOpen(false);
				},
				children: [
					p.name,
					" (",
					p.model,
					")"
				]
			}, p.id, true, {
				fileName: _jsxFileName,
				lineNumber: 72,
				columnNumber: 15
			}, this))
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 49,
			columnNumber: 9
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 31,
		columnNumber: 5
	}, this);
}
function Import() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [selectedTemplate, setSelectedTemplate] = useState("");
	const [file, setFile] = useState(null);
	const [isUploading, setIsUploading] = useState(false);
	const [currentSessionId, setCurrentSessionId] = useState(null);
	const [currentOrders, setCurrentOrders] = useState([]);
	const [totalRows, setTotalRows] = useState(0);
	const [flaggedRows, setFlaggedRows] = useState(0);
	const [filterMode, setFilterMode] = useState("all");
	const [sortUnmappedToTop, setSortUnmappedToTop] = useState(false);
	const { data: templates = [] } = useQuery({
		queryKey: ["templates"],
		queryFn: async () => {
			const res = await fetch("/api/import/templates");
			if (!res.ok) throw new Error();
			return res.json();
		}
	});
	const { data: products = [] } = useQuery({
		queryKey: ["products"],
		queryFn: async () => {
			const res = await fetch("/api/products");
			if (!res.ok) throw new Error();
			return res.json();
		}
	});
	useEffect(() => {
		fetch("/api/import/active-session").then((res) => {
			if (res.ok) return res.json();
			return null;
		}).then((data) => {
			if (data) {
				setCurrentSessionId(data.session_id);
				setCurrentOrders(data.orders || []);
				setTotalRows(data.total_rows || 0);
				setFlaggedRows(data.flagged_rows || 0);
			}
		}).catch((err) => console.error("Failed to load active session:", err));
	}, []);
	const syncSession = async (updatedOrders) => {
		if (!currentSessionId) return;
		try {
			await fetch("/api/import/active-session/sync", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					session_id: currentSessionId,
					orders: updatedOrders
				})
			});
		} catch (err) {
			console.error("Sync preview orders failed:", err);
		}
	};
	const handleUploadSubmit = async (e) => {
		e.preventDefault();
		if (!selectedTemplate || !file) {
			showToast("Warning", "Please select a template and Excel file", "warning");
			return;
		}
		const formData = new FormData();
		formData.append("template_id", selectedTemplate);
		formData.append("file", file);
		setIsUploading(true);
		try {
			const res = await fetch("/api/import/upload", {
				method: "POST",
				body: formData
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.message || "Failed to parse file");
			}
			const data = await res.json();
			setCurrentSessionId(data.session_id);
			setCurrentOrders((data.orders || []).map((o) => ({
				...o,
				is_selected: !o.is_duplicate
			})));
			setTotalRows(data.total_rows);
			setFlaggedRows(data.flagged_rows);
			showToast("Parsed", "Excel parsed. Review the preview below.", "success");
		} catch (err) {
			console.error(err);
			showToast("Upload Failed", err.message, "error");
		} finally {
			setIsUploading(false);
		}
	};
	const handleDiscard = async () => {
		if (!currentSessionId) return;
		if (!window.confirm("Are you sure you want to discard this preview and cancel the import?")) return;
		try {
			await fetch("/api/import/cancel", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ session_id: currentSessionId })
			});
			setCurrentSessionId(null);
			setCurrentOrders([]);
			setTotalRows(0);
			setFlaggedRows(0);
			setFile(null);
			setSelectedTemplate("");
			showToast("Discarded", "Import session cancelled", "info");
		} catch (err) {
			console.error(err);
		}
	};
	const handleConfirm = async () => {
		if (!currentSessionId) return;
		const selectedOrders = currentOrders.filter((o) => o.is_selected);
		if (selectedOrders.length === 0) {
			showToast("Warning", "No orders selected to import", "warning");
			return;
		}
		let hasUnmapped = false;
		let hasInvalidQty = false;
		for (const o of selectedOrders) {
			if (!o.splits || o.splits.length === 0) {
				hasUnmapped = true;
				break;
			}
			for (const s of o.splits) {
				if (!s.product_id) hasUnmapped = true;
				const qty = parseInt(s.quantity, 10);
				if (isNaN(qty) || qty <= 0) hasInvalidQty = true;
			}
		}
		if (hasUnmapped) {
			showToast("Error", "Please resolve all highlighted yellow dropdowns to map products before importing", "error");
			return;
		}
		if (hasInvalidQty) {
			showToast("Error", "Please enter a valid positive quantity for all split items", "error");
			return;
		}
		try {
			const res = await fetch("/api/import/confirm", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					session_id: currentSessionId,
					orders: selectedOrders
				})
			});
			if (res.ok) {
				const result = await res.json();
				showToast("Import Complete", `Applied ${result.applied_rows} orders. ${result.flagged_rows} need review.`, "success");
				setCurrentSessionId(null);
				setCurrentOrders([]);
				setTotalRows(0);
				setFlaggedRows(0);
				setFile(null);
				setSelectedTemplate("");
				queryClient.invalidateQueries({ queryKey: ["products"] });
				if (result.flagged_rows > 0) navigate({ to: "/review" });
				else navigate({ to: "/" });
			} else showToast("Import Failed", (await res.json()).message, "error");
		} catch (err) {
			console.error(err);
			showToast("Error", "Connection error", "error");
		}
	};
	const handleSplitQtyChange = (orderIdx, splitIdx, newQty) => {
		const nextOrders = currentOrders.map((order, oIdx) => {
			if (oIdx !== orderIdx) return order;
			return {
				...order,
				splits: order.splits.map((split, sIdx) => {
					if (sIdx !== splitIdx) return split;
					return {
						...split,
						quantity: newQty
					};
				})
			};
		});
		setCurrentOrders(nextOrders);
		syncSession(nextOrders);
	};
	const handleSplitProductChange = (orderIdx, splitIdx, productId) => {
		const selectedProd = products.find((p) => p.id === productId);
		const nextOrders = currentOrders.map((order, oIdx) => {
			if (oIdx !== orderIdx) return order;
			return {
				...order,
				splits: order.splits.map((split, sIdx) => {
					if (sIdx !== splitIdx) return split;
					return {
						...split,
						product_id: productId,
						product_name: selectedProd ? selectedProd.name : "",
						parse_source: "manual"
					};
				})
			};
		});
		setCurrentOrders(nextOrders);
		syncSession(nextOrders);
	};
	const handleAddSplit = (orderIdx, rawText) => {
		const nextOrders = currentOrders.map((order, oIdx) => {
			if (oIdx !== orderIdx) return order;
			return {
				...order,
				splits: [...order.splits, {
					product_id: null,
					product_name: "",
					quantity: 1,
					parse_source: "auto_split",
					original_text: rawText
				}]
			};
		});
		setCurrentOrders(nextOrders);
		syncSession(nextOrders);
	};
	const handleDeleteSplit = (orderIdx, splitIdx) => {
		const nextOrders = currentOrders.map((order, oIdx) => {
			if (oIdx !== orderIdx) return order;
			return {
				...order,
				splits: order.splits.filter((_, sIdx) => sIdx !== splitIdx)
			};
		});
		setCurrentOrders(nextOrders);
		syncSession(nextOrders);
	};
	const handleOrderSelectToggle = (orderIdx, checked) => {
		const nextOrders = currentOrders.map((order, oIdx) => {
			if (oIdx !== orderIdx) return order;
			return {
				...order,
				is_selected: checked
			};
		});
		setCurrentOrders(nextOrders);
		syncSession(nextOrders);
	};
	const handleAcceptSuggestion = (orderIdx, splitIdx, product) => {
		const nextOrders = currentOrders.map((order, oIdx) => {
			if (oIdx !== orderIdx) return order;
			return {
				...order,
				splits: order.splits.map((split, sIdx) => {
					if (sIdx !== splitIdx) return split;
					return {
						...split,
						product_id: product.id,
						product_name: product.name,
						parse_source: "manual"
					};
				})
			};
		});
		setCurrentOrders(nextOrders);
		syncSession(nextOrders);
	};
	const unmappedCount = currentOrders.filter((o) => o.splits && o.splits.some((s) => s.product_id === null)).length;
	const processedOrders = (() => {
		let list = [...currentOrders];
		if (filterMode === "unmapped") list = list.filter((o) => o.splits && o.splits.some((s) => s.product_id === null));
		if (sortUnmappedToTop) list.sort((a, b) => {
			const aNeeds = a.splits && a.splits.some((s) => s.product_id === null);
			const bNeeds = b.splits && b.splits.some((s) => s.product_id === null);
			if (aNeeds && !bNeeds) return -1;
			if (!aNeeds && bNeeds) return 1;
			return 0;
		});
		return list;
	})();
	const duplicateCount = currentOrders.filter((o) => o.is_duplicate).length;
	return /* @__PURE__ */ jsxDEV("div", {
		style: {
			display: "flex",
			flexDirection: "column",
			gap: "2rem"
		},
		children: [/* @__PURE__ */ jsxDEV("div", {
			className: "section-card",
			id: "upload-section",
			children: [/* @__PURE__ */ jsxDEV("div", {
				className: "section-header",
				children: /* @__PURE__ */ jsxDEV("h2", { children: "Upload Sales Excel" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 435,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 434,
				columnNumber: 9
			}, this), /* @__PURE__ */ jsxDEV("form", {
				onSubmit: handleUploadSubmit,
				style: {
					display: "flex",
					flexDirection: "column",
					gap: "1.25rem",
					maxWidth: "500px"
				},
				children: [
					/* @__PURE__ */ jsxDEV("div", {
						className: "form-group",
						children: [/* @__PURE__ */ jsxDEV("label", {
							htmlFor: "import-template-select",
							children: "Select E-commerce Template"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 439,
							columnNumber: 13
						}, this), /* @__PURE__ */ jsxDEV("select", {
							id: "import-template-select",
							required: true,
							value: selectedTemplate,
							onChange: (e) => setSelectedTemplate(e.target.value),
							children: [/* @__PURE__ */ jsxDEV("option", {
								value: "",
								children: "-- Select template --"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 446,
								columnNumber: 15
							}, this), templates.map((t) => /* @__PURE__ */ jsxDEV("option", {
								value: t.id,
								children: t.name
							}, t.id, false, {
								fileName: _jsxFileName,
								lineNumber: 448,
								columnNumber: 17
							}, this))]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 440,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 438,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ jsxDEV("div", {
						className: "form-group",
						children: [/* @__PURE__ */ jsxDEV("label", {
							htmlFor: "excel-file-input",
							children: "Select Excel File (.xlsx, .xls)"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 456,
							columnNumber: 13
						}, this), /* @__PURE__ */ jsxDEV("input", {
							type: "file",
							id: "excel-file-input",
							accept: ".xlsx, .xls",
							required: true,
							onChange: (e) => setFile(e.target.files ? e.target.files[0] : null)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 457,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 455,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ jsxDEV("button", {
						type: "submit",
						className: "btn btn-primary",
						style: {
							justifyContent: "center",
							alignSelf: "flex-start"
						},
						disabled: isUploading,
						children: [/* @__PURE__ */ jsxDEV("svg", {
							viewBox: "0 0 24 24",
							fill: "none",
							stroke: "currentColor",
							children: /* @__PURE__ */ jsxDEV("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 473,
								columnNumber: 15
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 472,
							columnNumber: 13
						}, this), isUploading ? "⌛ Parsing file..." : "Upload and Preview"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 466,
						columnNumber: 11
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 437,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 433,
			columnNumber: 7
		}, this), currentSessionId && /* @__PURE__ */ jsxDEV("div", {
			id: "import-preview-section",
			className: "section-card",
			children: [
				/* @__PURE__ */ jsxDEV("div", {
					className: "section-header",
					children: [/* @__PURE__ */ jsxDEV("h2", { children: "Import Preview" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 484,
						columnNumber: 13
					}, this), /* @__PURE__ */ jsxDEV("div", {
						className: "actions-cell",
						children: [/* @__PURE__ */ jsxDEV("button", {
							id: "btn-discard-import",
							className: "btn btn-secondary",
							onClick: handleDiscard,
							children: "Discard"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 486,
							columnNumber: 15
						}, this), /* @__PURE__ */ jsxDEV("button", {
							id: "btn-confirm-import",
							className: "btn btn-primary",
							onClick: handleConfirm,
							children: "Confirm & Apply Stock"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 489,
							columnNumber: 15
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 485,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 483,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ jsxDEV("div", {
					className: "dashboard-grid",
					style: {
						gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
						marginBottom: "1.5rem",
						gap: "1rem"
					},
					children: [
						/* @__PURE__ */ jsxDEV("div", {
							className: "card",
							style: { padding: "1rem" },
							children: [/* @__PURE__ */ jsxDEV("div", {
								className: "card-title",
								style: { fontSize: "0.75rem" },
								children: "Total Orders"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 498,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("div", {
								className: "card-value",
								style: { fontSize: "1.5rem" },
								children: totalRows
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 499,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 497,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("div", {
							className: "card",
							style: { padding: "1rem" },
							children: [/* @__PURE__ */ jsxDEV("div", {
								className: "card-title",
								style: { fontSize: "0.75rem" },
								children: "Cancelled (Flags Review)"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 502,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("div", {
								className: "card-value",
								style: {
									fontSize: "1.5rem",
									color: "var(--warning)"
								},
								children: flaggedRows
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 503,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 501,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("div", {
							className: "card",
							style: { padding: "1rem" },
							children: [/* @__PURE__ */ jsxDEV("div", {
								className: "card-title",
								style: { fontSize: "0.75rem" },
								children: "Duplicates Found"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 506,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("div", {
								className: "card-value",
								style: {
									fontSize: "1.5rem",
									color: "var(--danger)"
								},
								children: duplicateCount
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 507,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 505,
							columnNumber: 13
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 496,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ jsxDEV("div", {
					style: {
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: "1rem",
						marginBottom: "1.5rem",
						background: "var(--bg-primary)",
						padding: "0.75rem 1rem",
						borderRadius: "var(--border-radius-md)",
						border: "1px solid var(--border-color)",
						flexWrap: "wrap"
					},
					children: [/* @__PURE__ */ jsxDEV("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: "0.75rem",
							flexWrap: "wrap"
						},
						children: [/* @__PURE__ */ jsxDEV("span", {
							style: {
								fontSize: "0.85rem",
								fontWeight: 600,
								color: "var(--text-secondary)"
							},
							children: "Filter:"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 527,
							columnNumber: 15
						}, this), /* @__PURE__ */ jsxDEV("div", {
							style: {
								display: "inline-flex",
								background: "var(--border-color)",
								padding: "3px",
								borderRadius: "var(--border-radius-sm)",
								gap: "2px"
							},
							children: [/* @__PURE__ */ jsxDEV("button", {
								className: "btn-segmented",
								style: {
									border: "none",
									background: filterMode === "all" ? "var(--bg-secondary)" : "transparent",
									color: filterMode === "all" ? "var(--text-primary)" : "var(--text-secondary)",
									padding: "0.35rem 0.75rem",
									borderRadius: "4px",
									fontSize: "0.8rem",
									fontWeight: "500",
									cursor: "pointer",
									boxShadow: filterMode === "all" ? "var(--shadow-sm)" : "none"
								},
								onClick: () => setFilterMode("all"),
								children: "All Orders"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 529,
								columnNumber: 17
							}, this), /* @__PURE__ */ jsxDEV("button", {
								className: "btn-segmented",
								style: {
									border: "none",
									background: filterMode === "unmapped" ? "var(--bg-secondary)" : "transparent",
									color: filterMode === "unmapped" ? "var(--text-primary)" : "var(--text-secondary)",
									padding: "0.35rem 0.75rem",
									borderRadius: "4px",
									fontSize: "0.8rem",
									fontWeight: "500",
									cursor: "pointer",
									boxShadow: filterMode === "unmapped" ? "var(--shadow-sm)" : "none"
								},
								onClick: () => setFilterMode("unmapped"),
								children: [
									"⚠️ Needs Mapping (",
									/* @__PURE__ */ jsxDEV("span", { children: unmappedCount }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 561,
										columnNumber: 37
									}, this),
									")"
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 546,
								columnNumber: 17
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 528,
							columnNumber: 15
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 526,
						columnNumber: 13
					}, this), /* @__PURE__ */ jsxDEV("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: "0.75rem"
						},
						children: /* @__PURE__ */ jsxDEV("label", {
							style: {
								display: "inline-flex",
								alignItems: "center",
								gap: "0.5rem",
								fontSize: "0.85rem",
								fontWeight: 600,
								color: "var(--text-secondary)",
								cursor: "pointer",
								userSelect: "none"
							},
							children: [/* @__PURE__ */ jsxDEV("input", {
								type: "checkbox",
								checked: sortUnmappedToTop,
								onChange: (e) => setSortUnmappedToTop(e.target.checked),
								style: {
									width: "16px",
									height: "16px",
									cursor: "pointer",
									accentColor: "var(--accent-color)"
								}
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 567,
								columnNumber: 17
							}, this), "Sort Unmapped to Top"]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 566,
							columnNumber: 15
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 565,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 512,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ jsxDEV("div", {
					className: "table-wrapper",
					children: /* @__PURE__ */ jsxDEV("table", { children: [/* @__PURE__ */ jsxDEV("thead", { children: /* @__PURE__ */ jsxDEV("tr", { children: [
						/* @__PURE__ */ jsxDEV("th", {
							style: { width: "50px" },
							children: "Apply"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 583,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ jsxDEV("th", { children: "Order ID" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 584,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ jsxDEV("th", { children: "Raw Product Name" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 585,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ jsxDEV("th", { children: "Qty" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 586,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ jsxDEV("th", { children: "Status" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 587,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ jsxDEV("th", { children: "Expedition" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 588,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ jsxDEV("th", { children: "Suggested Product Split & Mapping" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 589,
							columnNumber: 19
						}, this)
					] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 582,
						columnNumber: 17
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 581,
						columnNumber: 15
					}, this), /* @__PURE__ */ jsxDEV("tbody", {
						id: "preview-table-body",
						children: processedOrders.length === 0 ? /* @__PURE__ */ jsxDEV("tr", { children: /* @__PURE__ */ jsxDEV("td", {
							colSpan: 7,
							style: {
								textAlign: "center",
								color: "var(--text-muted)",
								padding: "2rem"
							},
							children: "No orders match the current filter."
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 595,
							columnNumber: 21
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 594,
							columnNumber: 19
						}, this) : processedOrders.map((order) => {
							const originalIndex = currentOrders.findIndex((o) => o.order_id === order.order_id);
							const isRowDuplicate = order.is_duplicate;
							let statusTagClass = "info";
							let statusText = order.order_status;
							if (order.system_status === "needs_review") {
								statusTagClass = "warning";
								statusText = `${order.order_status} (Cancel Flag)`;
							}
							return /* @__PURE__ */ jsxDEV("tr", {
								style: isRowDuplicate ? { backgroundColor: "var(--danger-light)" } : {},
								children: [
									/* @__PURE__ */ jsxDEV("td", {
										style: {
											textAlign: "center",
											verticalAlign: "top"
										},
										children: /* @__PURE__ */ jsxDEV("input", {
											type: "checkbox",
											checked: !!order.is_selected,
											onChange: (e) => handleOrderSelectToggle(originalIndex, e.target.checked)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 614,
											columnNumber: 27
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 613,
										columnNumber: 25
									}, this),
									/* @__PURE__ */ jsxDEV("td", {
										style: {
											verticalAlign: "top",
											fontFamily: "monospace",
											fontSize: "0.8rem"
										},
										children: [order.order_id, isRowDuplicate && /* @__PURE__ */ jsxDEV(Fragment, { children: [/* @__PURE__ */ jsxDEV("br", {}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 624,
											columnNumber: 31
										}, this), /* @__PURE__ */ jsxDEV("span", {
											className: "status-tag danger",
											style: {
												fontSize: "0.65rem",
												marginTop: "0.25rem"
											},
											children: "Duplicate"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 625,
											columnNumber: 31
										}, this)] }, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 623,
											columnNumber: 29
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 620,
										columnNumber: 25
									}, this),
									/* @__PURE__ */ jsxDEV("td", {
										style: {
											verticalAlign: "top",
											fontSize: "0.85rem"
										},
										children: order.product_name_raw
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 631,
										columnNumber: 25
									}, this),
									/* @__PURE__ */ jsxDEV("td", {
										style: {
											verticalAlign: "top",
											fontWeight: 600
										},
										children: order.quantity
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 632,
										columnNumber: 25
									}, this),
									/* @__PURE__ */ jsxDEV("td", {
										style: { verticalAlign: "top" },
										children: /* @__PURE__ */ jsxDEV("span", {
											className: `status-tag ${statusTagClass}`,
											children: statusText
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 634,
											columnNumber: 27
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 633,
										columnNumber: 25
									}, this),
									/* @__PURE__ */ jsxDEV("td", {
										style: {
											verticalAlign: "top",
											fontSize: "0.85rem"
										},
										children: order.expedition
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 636,
										columnNumber: 25
									}, this),
									/* @__PURE__ */ jsxDEV("td", {
										style: { verticalAlign: "top" },
										children: !order.splits || order.splits.length === 0 ? /* @__PURE__ */ jsxDEV("span", {
											style: {
												color: "var(--danger)",
												fontSize: "0.8rem"
											},
											children: "No items mapped!"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 639,
											columnNumber: 29
										}, this) : /* @__PURE__ */ jsxDEV("div", {
											style: {
												display: "flex",
												flexDirection: "column",
												gap: "0.5rem"
											},
											children: [order.splits.map((split, splitIdx) => {
												const fuzzySuggestion = !split.product_id ? split.fuzzy_suggestion : null;
												return /* @__PURE__ */ jsxDEV("div", {
													style: {
														display: "flex",
														flexDirection: "column",
														gap: "0.25rem"
													},
													children: [/* @__PURE__ */ jsxDEV("div", {
														style: {
															display: "flex",
															alignItems: "center",
															gap: "0.5rem"
														},
														children: [
															/* @__PURE__ */ jsxDEV("input", {
																type: "number",
																value: split.quantity,
																min: "1",
																style: {
																	width: "60px",
																	padding: "0.2rem",
																	fontSize: "0.8rem"
																},
																onChange: (e) => handleSplitQtyChange(originalIndex, splitIdx, parseInt(e.target.value, 10) || 1)
															}, void 0, false, {
																fileName: _jsxFileName,
																lineNumber: 647,
																columnNumber: 39
															}, this),
															/* @__PURE__ */ jsxDEV(SearchableSelect, {
																selectedId: split.product_id,
																products,
																onChange: (pId) => handleSplitProductChange(originalIndex, splitIdx, pId)
															}, void 0, false, {
																fileName: _jsxFileName,
																lineNumber: 654,
																columnNumber: 39
															}, this),
															order.splits.length > 1 && /* @__PURE__ */ jsxDEV("button", {
																type: "button",
																className: "btn btn-danger btn-sm",
																style: { padding: "0.15rem 0.3rem" },
																onClick: () => handleDeleteSplit(originalIndex, splitIdx),
																children: /* @__PURE__ */ jsxDEV("svg", {
																	viewBox: "0 0 24 24",
																	fill: "none",
																	stroke: "currentColor",
																	style: {
																		width: "12px",
																		height: "12px"
																	},
																	children: /* @__PURE__ */ jsxDEV("path", { d: "M18 6 6 18M6 6l12 12" }, void 0, false, {
																		fileName: _jsxFileName,
																		lineNumber: 667,
																		columnNumber: 45
																	}, this)
																}, void 0, false, {
																	fileName: _jsxFileName,
																	lineNumber: 666,
																	columnNumber: 43
																}, this)
															}, void 0, false, {
																fileName: _jsxFileName,
																lineNumber: 660,
																columnNumber: 41
															}, this)
														]
													}, void 0, true, {
														fileName: _jsxFileName,
														lineNumber: 646,
														columnNumber: 37
													}, this), fuzzySuggestion && /* @__PURE__ */ jsxDEV("div", {
														style: {
															fontSize: "0.75rem",
															color: "var(--text-secondary)",
															marginTop: "0.25rem",
															display: "flex",
															alignItems: "center",
															gap: "0.5rem"
														},
														children: [/* @__PURE__ */ jsxDEV("span", { children: [
															"💡 Suggest: ",
															fuzzySuggestion.product.name,
															" (",
															fuzzySuggestion.similarity,
															"%)"
														] }, void 0, true, {
															fileName: _jsxFileName,
															lineNumber: 674,
															columnNumber: 41
														}, this), /* @__PURE__ */ jsxDEV("button", {
															type: "button",
															className: "btn btn-secondary btn-sm",
															style: {
																padding: "0.05rem 0.25rem",
																fontSize: "0.7rem"
															},
															onClick: () => handleAcceptSuggestion(originalIndex, splitIdx, fuzzySuggestion.product),
															children: "Accept"
														}, void 0, false, {
															fileName: _jsxFileName,
															lineNumber: 675,
															columnNumber: 41
														}, this)]
													}, void 0, true, {
														fileName: _jsxFileName,
														lineNumber: 673,
														columnNumber: 39
													}, this)]
												}, splitIdx, true, {
													fileName: _jsxFileName,
													lineNumber: 645,
													columnNumber: 35
												}, this);
											}), /* @__PURE__ */ jsxDEV("a", {
												href: "#",
												style: {
													fontSize: "0.75rem",
													color: "var(--accent-color)",
													textDecoration: "none",
													fontWeight: "500",
													display: "inline-block",
													marginTop: "0.25rem"
												},
												onClick: (e) => {
													e.preventDefault();
													handleAddSplit(originalIndex, order.product_name_raw);
												},
												children: "➕ Add another split item"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 688,
												columnNumber: 31
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 641,
											columnNumber: 29
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 637,
										columnNumber: 25
									}, this)
								]
							}, order.order_id, true, {
								fileName: _jsxFileName,
								lineNumber: 612,
								columnNumber: 23
							}, this);
						})
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 592,
						columnNumber: 15
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 580,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 579,
					columnNumber: 11
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 482,
			columnNumber: 9
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 431,
		columnNumber: 5
	}, this);
}
//#endregion
//#region app/routes/import.jsx?tsr-split=component
var SplitComponent = Import;
//#endregion
export { SplitComponent as component };
