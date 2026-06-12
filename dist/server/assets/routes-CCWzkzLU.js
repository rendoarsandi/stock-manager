import { n as useWebSocket } from "./WebSocketContext-H05AamCP.js";
import { t as showToast } from "./toast-kJrtdafl.js";
import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { jsxDEV } from "react/jsx-dev-runtime";
//#region app/pages/Dashboard.jsx
var _jsxFileName = "/data/data/com.termux/files/home/stock-manager/app/pages/Dashboard.jsx";
function Dashboard() {
	const queryClient = useQueryClient();
	const { addWsListener } = useWebSocket();
	const { data, isLoading, error } = useQuery({
		queryKey: ["dashboardStats"],
		queryFn: async () => {
			const res = await fetch("/api/dashboard/stats");
			if (!res.ok) throw new Error("Failed to load dashboard statistics");
			return res.json();
		}
	});
	useEffect(() => {
		if (error) {
			console.error("Dashboard data load failed:", error);
			showToast("Error", "Failed to retrieve dashboard stats", "error");
		}
	}, [error]);
	useEffect(() => {
		const unsubscribe = addWsListener((msg) => {
			if (msg.type !== "ONLINE_COUNT") queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
		});
		const handleResync = () => {
			queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
		};
		window.addEventListener("resync-data", handleResync);
		return () => {
			unsubscribe();
			window.removeEventListener("resync-data", handleResync);
		};
	}, [addWsListener, queryClient]);
	if (isLoading) return /* @__PURE__ */ jsxDEV("div", {
		style: {
			padding: "2rem",
			textAlign: "center",
			color: "var(--text-secondary)"
		},
		children: "Loading dashboard..."
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 51,
		columnNumber: 7
	}, this);
	if (error || !data) return /* @__PURE__ */ jsxDEV("div", {
		style: {
			padding: "2rem",
			textAlign: "center",
			color: "var(--danger)"
		},
		children: "Error loading dashboard statistics."
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 59,
		columnNumber: 7
	}, this);
	const lowStockCount = data.low_stock_count || 0;
	const pendingReviewCount = data.pending_review_count || 0;
	const ambiguousCount = data.ambiguous_count || 0;
	return /* @__PURE__ */ jsxDEV("div", { children: [/* @__PURE__ */ jsxDEV("div", {
		className: "dashboard-grid",
		children: [
			/* @__PURE__ */ jsxDEV("div", {
				className: "card",
				id: "card-products",
				children: [
					/* @__PURE__ */ jsxDEV("div", {
						className: "card-title",
						children: "Total Products"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 75,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ jsxDEV("div", {
						className: "card-value",
						id: "dash-total-products",
						children: data.total_products
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 76,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ jsxDEV("div", {
						className: "card-subtitle",
						children: "Match models registered"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 77,
						columnNumber: 11
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 74,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ jsxDEV("div", {
				className: "card",
				id: "card-low-stock",
				style: lowStockCount > 0 ? { borderLeft: "4px solid var(--danger)" } : {},
				children: [
					/* @__PURE__ */ jsxDEV("div", {
						className: "card-title",
						children: "Low Stock Alert"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 86,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ jsxDEV("div", {
						className: "card-value",
						id: "dash-low-stock",
						children: lowStockCount
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 87,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ jsxDEV("div", {
						className: "card-subtitle",
						id: "dash-low-stock-sub",
						style: lowStockCount > 0 ? {
							color: "var(--danger)",
							fontWeight: "500"
						} : { color: "var(--text-secondary)" },
						children: lowStockCount > 0 ? `⚠️ ${lowStockCount} items below threshold` : "All stock levels healthy"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 88,
						columnNumber: 11
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 81,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ jsxDEV("div", {
				className: "card",
				id: "card-reviews",
				style: pendingReviewCount > 0 ? { borderLeft: "4px solid var(--warning)" } : {},
				children: [
					/* @__PURE__ */ jsxDEV("div", {
						className: "card-title",
						children: "Pending Review"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 109,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ jsxDEV("div", {
						className: "card-value",
						id: "dash-pending-review",
						children: pendingReviewCount
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 110,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ jsxDEV("div", {
						className: "card-subtitle",
						id: "dash-reviews-sub",
						style: pendingReviewCount > 0 ? {
							color: "var(--warning)",
							fontWeight: "500"
						} : { color: "var(--text-secondary)" },
						children: pendingReviewCount > 0 ? `⚠️ ${pendingReviewCount} orders require actions` : "No cancelled orders pending"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 111,
						columnNumber: 11
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 104,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ jsxDEV("div", {
				className: "card",
				id: "card-ambiguous",
				style: ambiguousCount > 0 ? { borderLeft: "4px solid var(--warning)" } : {},
				children: [
					/* @__PURE__ */ jsxDEV("div", {
						className: "card-title",
						children: "Ambiguous Items"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 132,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ jsxDEV("div", {
						className: "card-value",
						id: "dash-ambiguous",
						children: ambiguousCount
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 133,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ jsxDEV("div", {
						className: "card-subtitle",
						id: "dash-ambiguous-sub",
						style: ambiguousCount > 0 ? {
							color: "var(--warning)",
							fontWeight: "500"
						} : { color: "var(--text-secondary)" },
						children: ambiguousCount > 0 ? `⚠️ ${ambiguousCount} items need mapping` : "Descriptions clean"
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 134,
						columnNumber: 11
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 127,
				columnNumber: 9
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 72,
		columnNumber: 7
	}, this), /* @__PURE__ */ jsxDEV("div", {
		className: "dashboard-sections",
		children: [/* @__PURE__ */ jsxDEV("div", {
			className: "section-card",
			children: [/* @__PURE__ */ jsxDEV("div", {
				className: "section-header",
				children: [/* @__PURE__ */ jsxDEV("h2", { children: "Recent Orders Awaiting Review" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 154,
					columnNumber: 13
				}, this), /* @__PURE__ */ jsxDEV(Link, {
					to: "/review",
					className: "btn btn-secondary btn-sm",
					children: "View All"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 155,
					columnNumber: 13
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 153,
				columnNumber: 11
			}, this), /* @__PURE__ */ jsxDEV("div", {
				className: "table-wrapper",
				children: /* @__PURE__ */ jsxDEV("table", { children: [/* @__PURE__ */ jsxDEV("thead", { children: /* @__PURE__ */ jsxDEV("tr", { children: [
					/* @__PURE__ */ jsxDEV("th", { children: "Order ID" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 161,
						columnNumber: 19
					}, this),
					/* @__PURE__ */ jsxDEV("th", { children: "Product Raw" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 162,
						columnNumber: 19
					}, this),
					/* @__PURE__ */ jsxDEV("th", { children: "Qty" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 163,
						columnNumber: 19
					}, this),
					/* @__PURE__ */ jsxDEV("th", { children: "Expedition" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 164,
						columnNumber: 19
					}, this),
					/* @__PURE__ */ jsxDEV("th", { children: "Action" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 165,
						columnNumber: 19
					}, this)
				] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 160,
					columnNumber: 17
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 159,
					columnNumber: 15
				}, this), /* @__PURE__ */ jsxDEV("tbody", {
					id: "dash-recent-reviews",
					children: !data.recent_reviews || data.recent_reviews.length === 0 ? /* @__PURE__ */ jsxDEV("tr", { children: /* @__PURE__ */ jsxDEV("td", {
						colSpan: 5,
						style: {
							textAlign: "center",
							color: "var(--text-muted)",
							padding: "1.5rem"
						},
						children: "No flagged orders needing review."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 171,
						columnNumber: 21
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 170,
						columnNumber: 19
					}, this) : data.recent_reviews.map((o) => /* @__PURE__ */ jsxDEV("tr", { children: [
						/* @__PURE__ */ jsxDEV("td", {
							style: {
								fontFamily: "monospace",
								fontSize: "0.8rem",
								fontWeight: 500
							},
							children: o.order_id
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 178,
							columnNumber: 23
						}, this),
						/* @__PURE__ */ jsxDEV("td", {
							style: {
								fontSize: "0.85rem",
								maxWidth: "150px",
								overflow: "hidden",
								textOverflow: "ellipsis",
								whiteSpace: "nowrap"
							},
							title: o.product_name_raw,
							children: o.product_name_raw
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 181,
							columnNumber: 23
						}, this),
						/* @__PURE__ */ jsxDEV("td", {
							style: { fontWeight: 600 },
							children: o.quantity
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 193,
							columnNumber: 23
						}, this),
						/* @__PURE__ */ jsxDEV("td", {
							style: {
								fontSize: "0.8rem",
								color: "var(--text-secondary)"
							},
							children: o.expedition || "-"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 194,
							columnNumber: 23
						}, this),
						/* @__PURE__ */ jsxDEV("td", { children: /* @__PURE__ */ jsxDEV(Link, {
							to: "/review",
							className: "btn btn-secondary btn-sm",
							style: {
								padding: "0.15rem 0.4rem",
								fontSize: "0.75rem"
							},
							children: "Review"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 198,
							columnNumber: 25
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 197,
							columnNumber: 23
						}, this)
					] }, o.order_id, true, {
						fileName: _jsxFileName,
						lineNumber: 177,
						columnNumber: 21
					}, this))
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 168,
					columnNumber: 15
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 158,
					columnNumber: 13
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 157,
				columnNumber: 11
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 152,
			columnNumber: 9
		}, this), /* @__PURE__ */ jsxDEV("div", {
			className: "section-card",
			children: [/* @__PURE__ */ jsxDEV("div", {
				className: "section-header",
				children: [/* @__PURE__ */ jsxDEV("h2", { children: "Recent Imports History" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 217,
					columnNumber: 13
				}, this), /* @__PURE__ */ jsxDEV(Link, {
					to: "/import",
					className: "btn btn-secondary btn-sm",
					children: "New Import"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 218,
					columnNumber: 13
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 216,
				columnNumber: 11
			}, this), /* @__PURE__ */ jsxDEV("div", {
				className: "table-wrapper",
				children: /* @__PURE__ */ jsxDEV("table", { children: [/* @__PURE__ */ jsxDEV("thead", { children: /* @__PURE__ */ jsxDEV("tr", { children: [
					/* @__PURE__ */ jsxDEV("th", { children: "Date" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 224,
						columnNumber: 19
					}, this),
					/* @__PURE__ */ jsxDEV("th", { children: "Source" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 225,
						columnNumber: 19
					}, this),
					/* @__PURE__ */ jsxDEV("th", { children: "Filename" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 226,
						columnNumber: 19
					}, this),
					/* @__PURE__ */ jsxDEV("th", { children: "Rows" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 227,
						columnNumber: 19
					}, this)
				] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 223,
					columnNumber: 17
				}, this) }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 222,
					columnNumber: 15
				}, this), /* @__PURE__ */ jsxDEV("tbody", {
					id: "dash-recent-imports",
					children: !data.recent_imports || data.recent_imports.length === 0 ? /* @__PURE__ */ jsxDEV("tr", { children: /* @__PURE__ */ jsxDEV("td", {
						colSpan: 4,
						style: {
							textAlign: "center",
							color: "var(--text-muted)",
							padding: "1.5rem"
						},
						children: "No import history found."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 233,
						columnNumber: 21
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 232,
						columnNumber: 19
					}, this) : data.recent_imports.map((s) => {
						let statusTag = "info";
						if (s.status === "applied") statusTag = "success";
						if (s.status === "cancelled") statusTag = "danger";
						return /* @__PURE__ */ jsxDEV("tr", { children: [
							/* @__PURE__ */ jsxDEV("td", {
								style: {
									fontSize: "0.8rem",
									color: "var(--text-secondary)"
								},
								children: s.created_at ? new Date(s.created_at.replace(/-/g, "/")).toLocaleDateString("en-US", {
									month: "short",
									day: "numeric",
									hour: "2-digit",
									minute: "2-digit"
								}) : "-"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 254,
								columnNumber: 25
							}, this),
							/* @__PURE__ */ jsxDEV("td", { children: /* @__PURE__ */ jsxDEV("span", {
								className: "status-tag info",
								style: { fontSize: "0.7rem" },
								children: s.template_name
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 258,
								columnNumber: 27
							}, this) }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 257,
								columnNumber: 25
							}, this),
							/* @__PURE__ */ jsxDEV("td", {
								style: {
									fontSize: "0.85rem",
									maxWidth: "130px",
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap"
								},
								title: s.filename,
								children: s.filename
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 262,
								columnNumber: 25
							}, this),
							/* @__PURE__ */ jsxDEV("td", {
								style: {
									fontSize: "0.85rem",
									fontWeight: 500
								},
								children: [
									s.total_rows,
									" rows",
									" ",
									/* @__PURE__ */ jsxDEV("span", {
										className: `status-tag ${statusTag}`,
										style: {
											fontSize: "0.65rem",
											marginLeft: "0.25rem"
										},
										children: s.status
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 276,
										columnNumber: 27
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 274,
								columnNumber: 25
							}, this)
						] }, s.id || s.created_at, true, {
							fileName: _jsxFileName,
							lineNumber: 253,
							columnNumber: 23
						}, this);
					})
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 230,
					columnNumber: 15
				}, this)] }, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 221,
					columnNumber: 13
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 220,
				columnNumber: 11
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 215,
			columnNumber: 9
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 150,
		columnNumber: 7
	}, this)] }, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 71,
		columnNumber: 5
	}, this);
}
//#endregion
//#region app/routes/index.jsx?tsr-split=component
var SplitComponent = Dashboard;
//#endregion
export { SplitComponent as component };
