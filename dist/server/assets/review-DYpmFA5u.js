import { n as useWebSocket } from "./WebSocketContext-H05AamCP.js";
import { t as showToast } from "./toast-kJrtdafl.js";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { jsxDEV } from "react/jsx-dev-runtime";
//#region app/pages/Review.jsx
var _jsxFileName = "/data/data/com.termux/files/home/stock-manager/app/pages/Review.jsx";
function Review() {
	const queryClient = useQueryClient();
	const { addWsListener } = useWebSocket();
	const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
	const [resolveTargetOrder, setResolveTargetOrder] = useState(null);
	const [resolveType, setResolveType] = useState("");
	const [resolveNotes, setResolveNotes] = useState("");
	const [ambiguousSelections, setAmbiguousSelections] = useState({});
	const { data: products = [] } = useQuery({
		queryKey: ["products"],
		queryFn: async () => {
			const res = await fetch("/api/products");
			if (!res.ok) throw new Error("Failed to fetch products");
			return res.json();
		}
	});
	const { data: reviewOrders = [], isLoading: isLoadingOrders, error: errorOrders } = useQuery({
		queryKey: ["reviewOrders"],
		queryFn: async () => {
			const res = await fetch("/api/review/orders");
			if (!res.ok) throw new Error("Failed to fetch review orders");
			return res.json();
		}
	});
	const { data: ambiguousItems = [], isLoading: isLoadingAmbiguous, error: errorAmbiguous } = useQuery({
		queryKey: ["ambiguousItems"],
		queryFn: async () => {
			const res = await fetch("/api/review/ambiguous");
			if (!res.ok) throw new Error("Failed to fetch ambiguous items");
			return res.json();
		}
	});
	useEffect(() => {
		if (errorOrders || errorAmbiguous) showToast("Error", "Failed to load review data", "error");
	}, [errorOrders, errorAmbiguous]);
	useEffect(() => {
		const targetEvents = [
			"SESSION_UPDATED",
			"ORDER_CREATED",
			"ORDER_UPDATED",
			"ORDER_ITEM_UPDATED",
			"PRODUCT_UPDATED",
			"PRODUCT_CREATED",
			"MOVEMENT_CREATED"
		];
		const unsubscribe = addWsListener((msg) => {
			if (targetEvents.includes(msg.type)) {
				queryClient.invalidateQueries({ queryKey: ["reviewOrders"] });
				queryClient.invalidateQueries({ queryKey: ["ambiguousItems"] });
			}
		});
		const handleResync = () => {
			queryClient.invalidateQueries({ queryKey: ["reviewOrders"] });
			queryClient.invalidateQueries({ queryKey: ["ambiguousItems"] });
		};
		window.addEventListener("resync-data", handleResync);
		return () => {
			unsubscribe();
			window.removeEventListener("resync-data", handleResync);
		};
	}, [addWsListener, queryClient]);
	const resolveOrderMutation = useMutation({
		mutationFn: async ({ order_id, resolution, resolution_notes }) => {
			const res = await fetch("/api/review/resolve", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					order_id,
					resolution,
					resolution_notes
				})
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.message || "Failed to resolve order");
			}
			return res.json();
		},
		onSuccess: () => {
			showToast("Resolved", "Order status resolved successfully", "success");
			queryClient.invalidateQueries({ queryKey: ["reviewOrders"] });
			closeResolveModal();
		},
		onError: (err) => {
			showToast("Error", err.message, "error");
		}
	});
	const confirmSplitMutation = useMutation({
		mutationFn: async ({ item_id, product_id, quantity }) => {
			const res = await fetch("/api/review/confirm-split", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					item_id,
					product_id,
					quantity
				})
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.message || "Mapping failed");
			}
			return res.json();
		},
		onSuccess: () => {
			showToast("Mapped", "Item mapped and stock movement registered", "success");
			queryClient.invalidateQueries({ queryKey: ["ambiguousItems"] });
		},
		onError: (err) => {
			showToast("Error", err.message, "error");
		}
	});
	const openResolveModal = (order) => {
		setResolveTargetOrder(order);
		setResolveType("");
		setResolveNotes("");
		setIsResolveModalOpen(true);
	};
	const closeResolveModal = () => {
		setIsResolveModalOpen(false);
		setResolveTargetOrder(null);
	};
	const handleResolveSubmit = (e) => {
		e.preventDefault();
		if (!resolveType || !resolveNotes) {
			showToast("Warning", "Please enter all fields", "warning");
			return;
		}
		resolveOrderMutation.mutate({
			order_id: resolveTargetOrder.id,
			resolution: resolveType,
			resolution_notes: resolveNotes
		});
	};
	const handleAmbSelectChange = (itemId, productId) => {
		setAmbiguousSelections((prev) => ({
			...prev,
			[itemId]: {
				...prev[itemId],
				productId
			}
		}));
	};
	const handleAmbQtyChange = (itemId, quantity) => {
		setAmbiguousSelections((prev) => ({
			...prev,
			[itemId]: {
				...prev[itemId],
				quantity
			}
		}));
	};
	const handleConfirmSplit = (item) => {
		const selection = ambiguousSelections[item.id];
		const productId = selection?.productId;
		const quantity = selection?.quantity ?? item.quantity;
		if (!productId) {
			showToast("Warning", "Please select a catalog product first", "warning");
			return;
		}
		confirmSplitMutation.mutate({
			item_id: item.id,
			product_id: parseInt(productId, 10),
			quantity: parseInt(quantity, 10) || 1
		});
	};
	const handleRefresh = () => {
		queryClient.invalidateQueries({ queryKey: ["reviewOrders"] });
		queryClient.invalidateQueries({ queryKey: ["ambiguousItems"] });
	};
	return /* @__PURE__ */ jsxDEV("div", {
		style: {
			display: "flex",
			flexDirection: "column",
			gap: "2.5rem"
		},
		children: [
			/* @__PURE__ */ jsxDEV("div", {
				className: "section-card",
				children: [/* @__PURE__ */ jsxDEV("div", {
					className: "section-header",
					children: [/* @__PURE__ */ jsxDEV("h2", { children: "Cancelled & Stuck Orders (Needs Review)" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 208,
						columnNumber: 11
					}, this), /* @__PURE__ */ jsxDEV("button", {
						id: "btn-refresh-review",
						className: "btn btn-secondary btn-sm",
						onClick: handleRefresh,
						children: [/* @__PURE__ */ jsxDEV("svg", {
							viewBox: "0 0 24 24",
							fill: "none",
							stroke: "currentColor",
							children: /* @__PURE__ */ jsxDEV("path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16m0 0V21m0-5h5M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8m0 0V3m0 5h-5" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 211,
								columnNumber: 15
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 210,
							columnNumber: 13
						}, this), "Refresh"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 209,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 207,
					columnNumber: 9
				}, this), /* @__PURE__ */ jsxDEV("div", {
					className: "table-wrapper",
					children: /* @__PURE__ */ jsxDEV("table", { children: [/* @__PURE__ */ jsxDEV("thead", { children: /* @__PURE__ */ jsxDEV("tr", { children: [
						/* @__PURE__ */ jsxDEV("th", { children: "Order ID" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 220,
							columnNumber: 17
						}, this),
						/* @__PURE__ */ jsxDEV("th", { children: "Buyer & Expedition" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 221,
							columnNumber: 17
						}, this),
						/* @__PURE__ */ jsxDEV("th", { children: "Raw Product Name" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 222,
							columnNumber: 17
						}, this),
						/* @__PURE__ */ jsxDEV("th", { children: "Qty" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 223,
							columnNumber: 17
						}, this),
						/* @__PURE__ */ jsxDEV("th", { children: "Courier Status" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 224,
							columnNumber: 17
						}, this),
						/* @__PURE__ */ jsxDEV("th", { children: "Seeded Items Split" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 225,
							columnNumber: 17
						}, this),
						/* @__PURE__ */ jsxDEV("th", { children: "Action" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 226,
							columnNumber: 17
						}, this)
					] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 219,
						columnNumber: 15
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 218,
						columnNumber: 13
					}, this), /* @__PURE__ */ jsxDEV("tbody", {
						id: "cancelled-orders-table-body",
						children: isLoadingOrders ? /* @__PURE__ */ jsxDEV("tr", { children: /* @__PURE__ */ jsxDEV("td", {
							colSpan: 7,
							style: {
								textAlign: "center",
								color: "var(--text-muted)"
							},
							children: "Loading flagged orders..."
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 232,
							columnNumber: 19
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 231,
							columnNumber: 17
						}, this) : reviewOrders.length === 0 ? /* @__PURE__ */ jsxDEV("tr", { children: /* @__PURE__ */ jsxDEV("td", {
							colSpan: 7,
							style: {
								textAlign: "center",
								color: "var(--text-muted)"
							},
							children: "No flagged orders require review. Good job!"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 238,
							columnNumber: 19
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 237,
							columnNumber: 17
						}, this) : reviewOrders.map((o) => {
							const splitsHtml = o.items ? o.items.map((item, idx) => /* @__PURE__ */ jsxDEV("div", {
								style: {
									fontSize: "0.8rem",
									marginBottom: "0.25rem"
								},
								children: [
									/* @__PURE__ */ jsxDEV("strong", { children: [item.quantity, "x"] }, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 247,
										columnNumber: 25
									}, this),
									" ",
									item.product_name,
									" ",
									item.is_confirmed === 0 && /* @__PURE__ */ jsxDEV("span", {
										className: "status-tag warning",
										style: {
											fontSize: "0.6rem",
											padding: "0.1rem 0.25rem"
										},
										children: "Unmapped"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 249,
										columnNumber: 27
									}, this)
								]
							}, item.id || idx, true, {
								fileName: _jsxFileName,
								lineNumber: 246,
								columnNumber: 23
							}, this)) : /* @__PURE__ */ jsxDEV("span", {
								style: {
									color: "var(--danger)",
									fontSize: "0.8rem"
								},
								children: "No items mapped!"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 256,
								columnNumber: 21
							}, this);
							return /* @__PURE__ */ jsxDEV("tr", { children: [
								/* @__PURE__ */ jsxDEV("td", {
									style: {
										fontFamily: "monospace",
										fontSize: "0.85rem",
										fontWeight: 600
									},
									children: o.order_id
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 261,
									columnNumber: 23
								}, this),
								/* @__PURE__ */ jsxDEV("td", { children: [/* @__PURE__ */ jsxDEV("div", {
									style: {
										fontSize: "0.85rem",
										fontWeight: 500
									},
									children: o.customer_name || "Anonymous"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 263,
									columnNumber: 25
								}, this), /* @__PURE__ */ jsxDEV("div", {
									style: {
										fontSize: "0.75rem",
										color: "var(--text-secondary)"
									},
									children: o.expedition || "Unknown Courier"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 264,
									columnNumber: 25
								}, this)] }, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 262,
									columnNumber: 23
								}, this),
								/* @__PURE__ */ jsxDEV("td", {
									style: {
										fontSize: "0.85rem",
										maxWidth: "200px",
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap"
									},
									title: o.product_name_raw,
									children: o.product_name_raw
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 266,
									columnNumber: 23
								}, this),
								/* @__PURE__ */ jsxDEV("td", {
									style: { fontWeight: 600 },
									children: o.quantity
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 278,
									columnNumber: 23
								}, this),
								/* @__PURE__ */ jsxDEV("td", { children: /* @__PURE__ */ jsxDEV("span", {
									className: "status-tag warning",
									children: o.order_status
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 280,
									columnNumber: 25
								}, this) }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 279,
									columnNumber: 23
								}, this),
								/* @__PURE__ */ jsxDEV("td", { children: splitsHtml }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 282,
									columnNumber: 23
								}, this),
								/* @__PURE__ */ jsxDEV("td", { children: /* @__PURE__ */ jsxDEV("button", {
									className: "btn btn-primary btn-sm btn-resolve-order",
									onClick: () => openResolveModal(o),
									children: [/* @__PURE__ */ jsxDEV("svg", {
										viewBox: "0 0 24 24",
										fill: "none",
										stroke: "currentColor",
										children: [
											/* @__PURE__ */ jsxDEV("path", { d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 286,
												columnNumber: 29
											}, this),
											/* @__PURE__ */ jsxDEV("line", {
												x1: "12",
												y1: "9",
												x2: "12",
												y2: "13"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 287,
												columnNumber: 29
											}, this),
											/* @__PURE__ */ jsxDEV("line", {
												x1: "12",
												y1: "17",
												x2: "12.01",
												y2: "17"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 288,
												columnNumber: 29
											}, this)
										]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 285,
										columnNumber: 27
									}, this), "Resolve"]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 284,
									columnNumber: 25
								}, this) }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 283,
									columnNumber: 23
								}, this)
							] }, o.id, true, {
								fileName: _jsxFileName,
								lineNumber: 260,
								columnNumber: 21
							}, this);
						})
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 229,
						columnNumber: 13
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 217,
						columnNumber: 11
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 216,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 206,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ jsxDEV("div", {
				className: "section-card",
				children: [/* @__PURE__ */ jsxDEV("div", {
					className: "section-header",
					children: /* @__PURE__ */ jsxDEV("h2", { children: "Ambiguous Product Names (Awaiting Mapping)" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 305,
						columnNumber: 11
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 304,
					columnNumber: 9
				}, this), /* @__PURE__ */ jsxDEV("div", {
					className: "table-wrapper",
					children: /* @__PURE__ */ jsxDEV("table", { children: [/* @__PURE__ */ jsxDEV("thead", { children: /* @__PURE__ */ jsxDEV("tr", { children: [
						/* @__PURE__ */ jsxDEV("th", { children: "Order ID" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 311,
							columnNumber: 17
						}, this),
						/* @__PURE__ */ jsxDEV("th", { children: "Raw Name from Excel" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 312,
							columnNumber: 17
						}, this),
						/* @__PURE__ */ jsxDEV("th", { children: "Order Date" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 313,
							columnNumber: 17
						}, this),
						/* @__PURE__ */ jsxDEV("th", { children: "Suggest Quantity" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 314,
							columnNumber: 17
						}, this),
						/* @__PURE__ */ jsxDEV("th", { children: "Select Catalog Mapping" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 315,
							columnNumber: 17
						}, this),
						/* @__PURE__ */ jsxDEV("th", { children: "Action" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 316,
							columnNumber: 17
						}, this)
					] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 310,
						columnNumber: 15
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 309,
						columnNumber: 13
					}, this), /* @__PURE__ */ jsxDEV("tbody", {
						id: "ambiguous-orders-table-body",
						children: isLoadingAmbiguous ? /* @__PURE__ */ jsxDEV("tr", { children: /* @__PURE__ */ jsxDEV("td", {
							colSpan: 6,
							style: {
								textAlign: "center",
								color: "var(--text-muted)"
							},
							children: "Loading ambiguous items..."
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 322,
							columnNumber: 19
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 321,
							columnNumber: 17
						}, this) : ambiguousItems.length === 0 ? /* @__PURE__ */ jsxDEV("tr", { children: /* @__PURE__ */ jsxDEV("td", {
							colSpan: 6,
							style: {
								textAlign: "center",
								color: "var(--text-muted)"
							},
							children: "No ambiguous items require mapping. Excellent!"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 328,
							columnNumber: 19
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 327,
							columnNumber: 17
						}, this) : ambiguousItems.map((item) => {
							const currentSelection = ambiguousSelections[item.id] || {};
							const currentProductId = currentSelection.productId || "";
							const currentQty = currentSelection.quantity ?? item.quantity;
							return /* @__PURE__ */ jsxDEV("tr", { children: [
								/* @__PURE__ */ jsxDEV("td", {
									style: {
										fontFamily: "monospace",
										fontSize: "0.85rem"
									},
									children: item.order_id
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 340,
									columnNumber: 23
								}, this),
								/* @__PURE__ */ jsxDEV("td", {
									style: {
										fontSize: "0.85rem",
										fontWeight: 500,
										maxWidth: "250px"
									},
									children: item.original_text || item.product_name_raw
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 341,
									columnNumber: 23
								}, this),
								/* @__PURE__ */ jsxDEV("td", {
									style: {
										fontSize: "0.8rem",
										color: "var(--text-secondary)"
									},
									children: item.order_date
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 344,
									columnNumber: 23
								}, this),
								/* @__PURE__ */ jsxDEV("td", { children: /* @__PURE__ */ jsxDEV("input", {
									type: "number",
									className: "amb-qty-input",
									value: currentQty,
									min: "1",
									style: {
										width: "70px",
										padding: "0.25rem",
										fontSize: "0.85rem"
									},
									onChange: (e) => handleAmbQtyChange(item.id, parseInt(e.target.value, 10) || 1)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 346,
									columnNumber: 25
								}, this) }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 345,
									columnNumber: 23
								}, this),
								/* @__PURE__ */ jsxDEV("td", { children: /* @__PURE__ */ jsxDEV("select", {
									className: "amb-product-select",
									style: {
										width: "100%",
										maxWidth: "250px",
										padding: "0.25rem",
										fontSize: "0.85rem",
										borderColor: currentProductId ? "" : "var(--warning)",
										backgroundColor: currentProductId ? "" : "var(--warning-light)"
									},
									value: currentProductId,
									onChange: (e) => handleAmbSelectChange(item.id, e.target.value),
									children: [/* @__PURE__ */ jsxDEV("option", {
										value: "",
										children: "-- Choose matching product --"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 369,
										columnNumber: 27
									}, this), products.map((p) => /* @__PURE__ */ jsxDEV("option", {
										value: p.id,
										children: [
											p.name,
											" (",
											p.model,
											")"
										]
									}, p.id, true, {
										fileName: _jsxFileName,
										lineNumber: 371,
										columnNumber: 29
									}, this))]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 356,
									columnNumber: 25
								}, this) }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 355,
									columnNumber: 23
								}, this),
								/* @__PURE__ */ jsxDEV("td", { children: /* @__PURE__ */ jsxDEV("button", {
									className: "btn btn-primary btn-sm btn-confirm-split",
									onClick: () => handleConfirmSplit(item),
									disabled: confirmSplitMutation.isPending,
									children: confirmSplitMutation.isPending && confirmSplitMutation.variables?.item_id === item.id ? "⌛..." : "Confirm"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 378,
									columnNumber: 25
								}, this) }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 377,
									columnNumber: 23
								}, this)
							] }, item.id, true, {
								fileName: _jsxFileName,
								lineNumber: 339,
								columnNumber: 21
							}, this);
						})
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 319,
						columnNumber: 13
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 308,
						columnNumber: 11
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 307,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 303,
				columnNumber: 7
			}, this),
			isResolveModalOpen && resolveTargetOrder && /* @__PURE__ */ jsxDEV("div", {
				className: "modal-overlay",
				children: /* @__PURE__ */ jsxDEV("div", {
					className: "modal",
					children: [
						/* @__PURE__ */ jsxDEV("div", {
							className: "modal-header",
							children: [/* @__PURE__ */ jsxDEV("h3", { children: "Resolve Flagged Order" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 400,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("button", {
								className: "modal-close",
								onClick: closeResolveModal,
								children: "×"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 401,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 399,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("div", {
							className: "modal-body",
							children: /* @__PURE__ */ jsxDEV("form", {
								id: "modal-resolve-form",
								className: "login-form",
								style: { gap: "1.25rem" },
								onSubmit: handleResolveSubmit,
								children: [
									/* @__PURE__ */ jsxDEV("div", {
										style: {
											fontSize: "0.9rem",
											padding: "0.75rem",
											backgroundColor: "var(--warning-light)",
											color: "var(--warning)",
											borderRadius: "var(--border-radius-sm)",
											border: "1px solid rgba(245, 158, 11, 0.2)",
											fontWeight: 500
										},
										children: ["⚠️ Resolving cancelled order: ", /* @__PURE__ */ jsxDEV("strong", { children: resolveTargetOrder.order_id }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 416,
											columnNumber: 49
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 405,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("div", {
										className: "form-group",
										children: [/* @__PURE__ */ jsxDEV("label", {
											htmlFor: "resolve-type",
											children: "Select Resolution Type"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 419,
											columnNumber: 19
										}, this), /* @__PURE__ */ jsxDEV("select", {
											id: "resolve-type",
											required: true,
											value: resolveType,
											onChange: (e) => setResolveType(e.target.value),
											children: [
												/* @__PURE__ */ jsxDEV("option", {
													value: "",
													children: "-- Choose resolution --"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 426,
													columnNumber: 21
												}, this),
												/* @__PURE__ */ jsxDEV("option", {
													value: "returned",
													children: "🔄 Returned (Items back in warehouse, no stock changes needed)"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 427,
													columnNumber: 21
												}, this),
												/* @__PURE__ */ jsxDEV("option", {
													value: "lost",
													children: "❌ Lost / Gone (Items lost in transit, deduct stock permanent write-off)"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 428,
													columnNumber: 21
												}, this),
												/* @__PURE__ */ jsxDEV("option", {
													value: "investigating",
													children: "⌛ Investigating (Keep flagged, update notes only)"
												}, void 0, false, {
													fileName: _jsxFileName,
													lineNumber: 429,
													columnNumber: 21
												}, this)
											]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 420,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 418,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("div", {
										className: "form-group",
										children: [/* @__PURE__ */ jsxDEV("label", {
											htmlFor: "resolve-notes",
											children: "Resolution Notes / Reason"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 433,
											columnNumber: 19
										}, this), /* @__PURE__ */ jsxDEV("textarea", {
											id: "resolve-notes",
											required: true,
											placeholder: "e.g. Package returned damaged, customer request, lost at J&T warehouse...",
											style: { height: "100px" },
											value: resolveNotes,
											onChange: (e) => setResolveNotes(e.target.value)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 434,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 432,
										columnNumber: 17
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 404,
								columnNumber: 15
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 403,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("div", {
							className: "modal-footer",
							children: [/* @__PURE__ */ jsxDEV("button", {
								className: "btn btn-secondary",
								onClick: closeResolveModal,
								children: "Cancel"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 446,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("button", {
								type: "submit",
								form: "modal-resolve-form",
								className: "btn btn-primary",
								disabled: resolveOrderMutation.isPending,
								children: resolveOrderMutation.isPending ? "Submitting..." : "Submit Resolution"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 447,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 445,
							columnNumber: 13
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 398,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 397,
				columnNumber: 9
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 204,
		columnNumber: 5
	}, this);
}
//#endregion
//#region app/routes/review.jsx?tsr-split=component
var SplitComponent = Review;
//#endregion
export { SplitComponent as component };
