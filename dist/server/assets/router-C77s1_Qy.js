import { n as useAuth, t as AuthProvider } from "./AuthContext-DG3cR4qU.js";
import { n as useWebSocket, t as WebSocketProvider } from "./WebSocketContext-H05AamCP.js";
import { useCallback, useEffect, useState } from "react";
import { HeadContent, Link, Outlet, Scripts, ScrollRestoration, createFileRoute, createRootRoute, createRouter as createRouter$1, lazyRouteComponent, useLocation } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { jsxDEV } from "react/jsx-dev-runtime";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { sign, verify } from "hono/jwt";
import { AsyncLocalStorage } from "async_hooks";
import crypto from "crypto";
import "ws";
import path from "path";
import { fileURLToPath } from "url";
import initSqlJs from "sql.js";
//#region app/components/Layout.jsx
var _jsxFileName$2 = "/data/data/com.termux/files/home/stock-manager/app/components/Layout.jsx";
var pageTitles = {
	"/": "Dashboard",
	"/products": "Products",
	"/import": "Import Excel",
	"/review": "Pending Review",
	"/stock-history": "Stock History",
	"/opname": "Stock Opname",
	"/settings": "Settings"
};
function Layout({ children }) {
	const { currentUser, logout } = useAuth();
	const { onlineCount, isConnected, addWsListener } = useWebSocket();
	const location = useLocation();
	const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem("sidebar-collapsed") === "true");
	const [isMobileVisible, setIsMobileVisible] = useState(false);
	const [pendingCount, setPendingCount] = useState(0);
	const fetchPendingCount = useCallback(async () => {
		try {
			const res = await fetch("/api/dashboard/stats");
			if (res.ok) setPendingCount((await res.json()).pending_review_count || 0);
		} catch (err) {
			console.error("Failed to fetch pending count:", err);
		}
	}, []);
	useEffect(() => {
		fetchPendingCount();
		window.addEventListener("resync-data", fetchPendingCount);
		return () => window.removeEventListener("resync-data", fetchPendingCount);
	}, [fetchPendingCount]);
	useEffect(() => {
		const unsubscribe = addWsListener(() => {
			fetchPendingCount();
		});
		return () => unsubscribe();
	}, [addWsListener, fetchPendingCount]);
	useEffect(() => {
		const handleOutsideClick = (e) => {
			if (isMobileVisible && !e.target.closest(".sidebar") && !e.target.closest("#sidebar-toggle")) setIsMobileVisible(false);
		};
		document.addEventListener("click", handleOutsideClick);
		return () => document.removeEventListener("click", handleOutsideClick);
	}, [isMobileVisible]);
	useEffect(() => {
		setIsMobileVisible(false);
	}, [location.pathname]);
	const pageTitle = pageTitles[location.pathname] || "Not Found";
	return /* @__PURE__ */ jsxDEV("div", {
		className: "app-layout",
		children: [/* @__PURE__ */ jsxDEV("aside", {
			className: `sidebar ${isCollapsed ? "collapsed" : ""} ${isMobileVisible ? "visible" : ""}`,
			children: [
				/* @__PURE__ */ jsxDEV("div", {
					className: "sidebar-header",
					children: [/* @__PURE__ */ jsxDEV("div", {
						className: "logo-wrapper",
						children: [/* @__PURE__ */ jsxDEV("span", {
							className: "logo-icon",
							children: /* @__PURE__ */ jsxDEV("svg", {
								xmlns: "http://www.w3.org/2000/svg",
								width: "24",
								height: "24",
								viewBox: "0 0 24 24",
								fill: "none",
								stroke: "currentColor",
								strokeWidth: "2.5",
								strokeLinecap: "round",
								strokeLinejoin: "round",
								style: {
									width: "20px",
									height: "20px",
									color: "var(--text-primary)"
								},
								children: /* @__PURE__ */ jsxDEV("path", { d: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" }, void 0, false, {
									fileName: _jsxFileName$2,
									lineNumber: 76,
									columnNumber: 17
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName$2,
								lineNumber: 75,
								columnNumber: 15
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName$2,
							lineNumber: 74,
							columnNumber: 13
						}, this), /* @__PURE__ */ jsxDEV("span", {
							className: "logo-text",
							children: "StockManager"
						}, void 0, false, {
							fileName: _jsxFileName$2,
							lineNumber: 79,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName$2,
						lineNumber: 73,
						columnNumber: 11
					}, this), /* @__PURE__ */ jsxDEV("button", {
						id: "desktop-sidebar-toggle",
						className: "desktop-toggle-btn",
						"aria-label": "Collapse Sidebar",
						onClick: () => {
							setIsCollapsed((prev) => {
								const next = !prev;
								localStorage.setItem("sidebar-collapsed", next);
								return next;
							});
						},
						children: /* @__PURE__ */ jsxDEV("span", {
							className: "toggle-icon",
							children: "◀"
						}, void 0, false, {
							fileName: _jsxFileName$2,
							lineNumber: 93,
							columnNumber: 13
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName$2,
						lineNumber: 81,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$2,
					lineNumber: 72,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ jsxDEV("nav", {
					className: "sidebar-nav",
					children: [
						/* @__PURE__ */ jsxDEV(Link, {
							to: "/",
							className: "nav-item",
							activeProps: { className: "nav-item active" },
							activeOptions: { exact: true },
							title: "Dashboard",
							children: [/* @__PURE__ */ jsxDEV("span", {
								className: "nav-icon",
								children: /* @__PURE__ */ jsxDEV("svg", {
									viewBox: "0 0 24 24",
									children: [
										/* @__PURE__ */ jsxDEV("rect", {
											width: "7",
											height: "9",
											x: "3",
											y: "3",
											rx: "1"
										}, void 0, false, {
											fileName: _jsxFileName$2,
											lineNumber: 100,
											columnNumber: 40
										}, this),
										/* @__PURE__ */ jsxDEV("rect", {
											width: "7",
											height: "5",
											x: "14",
											y: "3",
											rx: "1"
										}, void 0, false, {
											fileName: _jsxFileName$2,
											lineNumber: 100,
											columnNumber: 87
										}, this),
										/* @__PURE__ */ jsxDEV("rect", {
											width: "7",
											height: "9",
											x: "14",
											y: "10",
											rx: "1"
										}, void 0, false, {
											fileName: _jsxFileName$2,
											lineNumber: 100,
											columnNumber: 135
										}, this),
										/* @__PURE__ */ jsxDEV("rect", {
											width: "7",
											height: "5",
											x: "3",
											y: "15",
											rx: "1"
										}, void 0, false, {
											fileName: _jsxFileName$2,
											lineNumber: 100,
											columnNumber: 184
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName$2,
									lineNumber: 100,
									columnNumber: 15
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName$2,
								lineNumber: 99,
								columnNumber: 13
							}, this), /* @__PURE__ */ jsxDEV("span", {
								className: "nav-text",
								children: "Dashboard"
							}, void 0, false, {
								fileName: _jsxFileName$2,
								lineNumber: 102,
								columnNumber: 13
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$2,
							lineNumber: 98,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ jsxDEV(Link, {
							to: "/products",
							className: "nav-item",
							activeProps: { className: "nav-item active" },
							title: "Products",
							children: [/* @__PURE__ */ jsxDEV("span", {
								className: "nav-icon",
								children: /* @__PURE__ */ jsxDEV("svg", {
									viewBox: "0 0 24 24",
									children: [
										/* @__PURE__ */ jsxDEV("path", { d: "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" }, void 0, false, {
											fileName: _jsxFileName$2,
											lineNumber: 106,
											columnNumber: 40
										}, this),
										/* @__PURE__ */ jsxDEV("path", { d: "m3.3 7 8.7 5 8.7-5" }, void 0, false, {
											fileName: _jsxFileName$2,
											lineNumber: 106,
											columnNumber: 170
										}, this),
										/* @__PURE__ */ jsxDEV("path", { d: "M12 22V12" }, void 0, false, {
											fileName: _jsxFileName$2,
											lineNumber: 106,
											columnNumber: 200
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName$2,
									lineNumber: 106,
									columnNumber: 15
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName$2,
								lineNumber: 105,
								columnNumber: 13
							}, this), /* @__PURE__ */ jsxDEV("span", {
								className: "nav-text",
								children: "Products"
							}, void 0, false, {
								fileName: _jsxFileName$2,
								lineNumber: 108,
								columnNumber: 13
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$2,
							lineNumber: 104,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ jsxDEV(Link, {
							to: "/import",
							className: "nav-item",
							activeProps: { className: "nav-item active" },
							title: "Import Excel",
							children: [/* @__PURE__ */ jsxDEV("span", {
								className: "nav-icon",
								children: /* @__PURE__ */ jsxDEV("svg", {
									viewBox: "0 0 24 24",
									children: [
										/* @__PURE__ */ jsxDEV("path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }, void 0, false, {
											fileName: _jsxFileName$2,
											lineNumber: 112,
											columnNumber: 40
										}, this),
										/* @__PURE__ */ jsxDEV("path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }, void 0, false, {
											fileName: _jsxFileName$2,
											lineNumber: 112,
											columnNumber: 110
										}, this),
										/* @__PURE__ */ jsxDEV("path", { d: "M8 13h8" }, void 0, false, {
											fileName: _jsxFileName$2,
											lineNumber: 112,
											columnNumber: 145
										}, this),
										/* @__PURE__ */ jsxDEV("path", { d: "M8 17h8" }, void 0, false, {
											fileName: _jsxFileName$2,
											lineNumber: 112,
											columnNumber: 164
										}, this),
										/* @__PURE__ */ jsxDEV("path", { d: "M10 9H8v8" }, void 0, false, {
											fileName: _jsxFileName$2,
											lineNumber: 112,
											columnNumber: 183
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName$2,
									lineNumber: 112,
									columnNumber: 15
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName$2,
								lineNumber: 111,
								columnNumber: 13
							}, this), /* @__PURE__ */ jsxDEV("span", {
								className: "nav-text",
								children: "Import Excel"
							}, void 0, false, {
								fileName: _jsxFileName$2,
								lineNumber: 114,
								columnNumber: 13
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$2,
							lineNumber: 110,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ jsxDEV(Link, {
							to: "/review",
							className: "nav-item",
							activeProps: { className: "nav-item active" },
							title: "Pending Review",
							children: [
								/* @__PURE__ */ jsxDEV("span", {
									className: "nav-icon",
									children: /* @__PURE__ */ jsxDEV("svg", {
										viewBox: "0 0 24 24",
										children: [
											/* @__PURE__ */ jsxDEV("path", { d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" }, void 0, false, {
												fileName: _jsxFileName$2,
												lineNumber: 118,
												columnNumber: 40
											}, this),
											/* @__PURE__ */ jsxDEV("line", {
												x1: "12",
												y1: "9",
												x2: "12",
												y2: "13"
											}, void 0, false, {
												fileName: _jsxFileName$2,
												lineNumber: 118,
												columnNumber: 125
											}, this),
											/* @__PURE__ */ jsxDEV("line", {
												x1: "12",
												y1: "17",
												x2: "12.01",
												y2: "17"
											}, void 0, false, {
												fileName: _jsxFileName$2,
												lineNumber: 118,
												columnNumber: 163
											}, this)
										]
									}, void 0, true, {
										fileName: _jsxFileName$2,
										lineNumber: 118,
										columnNumber: 15
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName$2,
									lineNumber: 117,
									columnNumber: 13
								}, this),
								/* @__PURE__ */ jsxDEV("span", {
									className: "nav-text",
									children: "Pending Review"
								}, void 0, false, {
									fileName: _jsxFileName$2,
									lineNumber: 120,
									columnNumber: 13
								}, this),
								pendingCount > 0 && /* @__PURE__ */ jsxDEV("span", {
									id: "badge-pending",
									className: "badge",
									children: pendingCount
								}, void 0, false, {
									fileName: _jsxFileName$2,
									lineNumber: 121,
									columnNumber: 34
								}, this)
							]
						}, void 0, true, {
							fileName: _jsxFileName$2,
							lineNumber: 116,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ jsxDEV(Link, {
							to: "/stock-history",
							className: "nav-item",
							activeProps: { className: "nav-item active" },
							title: "Stock History",
							children: [/* @__PURE__ */ jsxDEV("span", {
								className: "nav-icon",
								children: /* @__PURE__ */ jsxDEV("svg", {
									viewBox: "0 0 24 24",
									children: [
										/* @__PURE__ */ jsxDEV("path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }, void 0, false, {
											fileName: _jsxFileName$2,
											lineNumber: 125,
											columnNumber: 40
										}, this),
										/* @__PURE__ */ jsxDEV("path", { d: "M3 3v5h5" }, void 0, false, {
											fileName: _jsxFileName$2,
											lineNumber: 125,
											columnNumber: 101
										}, this),
										/* @__PURE__ */ jsxDEV("path", { d: "M12 7v5l4 2" }, void 0, false, {
											fileName: _jsxFileName$2,
											lineNumber: 125,
											columnNumber: 121
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName$2,
									lineNumber: 125,
									columnNumber: 15
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName$2,
								lineNumber: 124,
								columnNumber: 13
							}, this), /* @__PURE__ */ jsxDEV("span", {
								className: "nav-text",
								children: "Stock History"
							}, void 0, false, {
								fileName: _jsxFileName$2,
								lineNumber: 127,
								columnNumber: 13
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$2,
							lineNumber: 123,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ jsxDEV(Link, {
							to: "/opname",
							className: "nav-item",
							activeProps: { className: "nav-item active" },
							title: "Stock Opname",
							children: [/* @__PURE__ */ jsxDEV("span", {
								className: "nav-icon",
								children: /* @__PURE__ */ jsxDEV("svg", {
									viewBox: "0 0 24 24",
									children: [
										/* @__PURE__ */ jsxDEV("rect", {
											width: "8",
											height: "4",
											x: "8",
											y: "2",
											rx: "1",
											ry: "1"
										}, void 0, false, {
											fileName: _jsxFileName$2,
											lineNumber: 131,
											columnNumber: 40
										}, this),
										/* @__PURE__ */ jsxDEV("path", { d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" }, void 0, false, {
											fileName: _jsxFileName$2,
											lineNumber: 131,
											columnNumber: 94
										}, this),
										/* @__PURE__ */ jsxDEV("path", { d: "m9 14 2 2 4-4" }, void 0, false, {
											fileName: _jsxFileName$2,
											lineNumber: 131,
											columnNumber: 178
										}, this)
									]
								}, void 0, true, {
									fileName: _jsxFileName$2,
									lineNumber: 131,
									columnNumber: 15
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName$2,
								lineNumber: 130,
								columnNumber: 13
							}, this), /* @__PURE__ */ jsxDEV("span", {
								className: "nav-text",
								children: "Stock Opname"
							}, void 0, false, {
								fileName: _jsxFileName$2,
								lineNumber: 133,
								columnNumber: 13
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$2,
							lineNumber: 129,
							columnNumber: 11
						}, this),
						/* @__PURE__ */ jsxDEV(Link, {
							to: "/settings",
							className: "nav-item",
							activeProps: { className: "nav-item active" },
							title: "Settings",
							children: [/* @__PURE__ */ jsxDEV("span", {
								className: "nav-icon",
								children: /* @__PURE__ */ jsxDEV("svg", {
									viewBox: "0 0 24 24",
									children: [/* @__PURE__ */ jsxDEV("path", { d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" }, void 0, false, {
										fileName: _jsxFileName$2,
										lineNumber: 137,
										columnNumber: 40
									}, this), /* @__PURE__ */ jsxDEV("circle", {
										cx: "12",
										cy: "12",
										r: "3"
									}, void 0, false, {
										fileName: _jsxFileName$2,
										lineNumber: 137,
										columnNumber: 616
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName$2,
									lineNumber: 137,
									columnNumber: 15
								}, this)
							}, void 0, false, {
								fileName: _jsxFileName$2,
								lineNumber: 136,
								columnNumber: 13
							}, this), /* @__PURE__ */ jsxDEV("span", {
								className: "nav-text",
								children: "Settings"
							}, void 0, false, {
								fileName: _jsxFileName$2,
								lineNumber: 139,
								columnNumber: 13
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$2,
							lineNumber: 135,
							columnNumber: 11
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName$2,
					lineNumber: 97,
					columnNumber: 9
				}, this),
				/* @__PURE__ */ jsxDEV("div", {
					className: "sidebar-footer",
					children: [/* @__PURE__ */ jsxDEV("div", {
						className: "user-profile",
						title: "User Profile",
						children: [/* @__PURE__ */ jsxDEV("span", {
							className: "user-avatar",
							children: /* @__PURE__ */ jsxDEV("svg", {
								viewBox: "0 0 24 24",
								children: [/* @__PURE__ */ jsxDEV("path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" }, void 0, false, {
									fileName: _jsxFileName$2,
									lineNumber: 146,
									columnNumber: 40
								}, this), /* @__PURE__ */ jsxDEV("circle", {
									cx: "12",
									cy: "7",
									r: "4"
								}, void 0, false, {
									fileName: _jsxFileName$2,
									lineNumber: 146,
									columnNumber: 93
								}, this)]
							}, void 0, true, {
								fileName: _jsxFileName$2,
								lineNumber: 146,
								columnNumber: 15
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName$2,
							lineNumber: 145,
							columnNumber: 13
						}, this), /* @__PURE__ */ jsxDEV("div", {
							className: "user-info",
							children: [/* @__PURE__ */ jsxDEV("div", {
								id: "user-display-name",
								className: "user-name",
								children: currentUser?.username || "Guest"
							}, void 0, false, {
								fileName: _jsxFileName$2,
								lineNumber: 149,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("div", {
								id: "user-display-role",
								className: "user-role",
								children: currentUser?.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) : ""
							}, void 0, false, {
								fileName: _jsxFileName$2,
								lineNumber: 152,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName$2,
							lineNumber: 148,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName$2,
						lineNumber: 144,
						columnNumber: 11
					}, this), /* @__PURE__ */ jsxDEV("button", {
						className: "btn-logout",
						title: "Logout",
						onClick: logout,
						children: [/* @__PURE__ */ jsxDEV("span", {
							className: "nav-icon",
							children: /* @__PURE__ */ jsxDEV("svg", {
								viewBox: "0 0 24 24",
								children: [
									/* @__PURE__ */ jsxDEV("path", { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" }, void 0, false, {
										fileName: _jsxFileName$2,
										lineNumber: 159,
										columnNumber: 40
									}, this),
									/* @__PURE__ */ jsxDEV("polyline", { points: "16 17 21 12 16 7" }, void 0, false, {
										fileName: _jsxFileName$2,
										lineNumber: 159,
										columnNumber: 91
									}, this),
									/* @__PURE__ */ jsxDEV("line", {
										x1: "21",
										y1: "12",
										x2: "9",
										y2: "12"
									}, void 0, false, {
										fileName: _jsxFileName$2,
										lineNumber: 159,
										columnNumber: 128
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName$2,
								lineNumber: 159,
								columnNumber: 15
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName$2,
							lineNumber: 158,
							columnNumber: 13
						}, this), /* @__PURE__ */ jsxDEV("span", {
							className: "logout-text",
							children: "Logout"
						}, void 0, false, {
							fileName: _jsxFileName$2,
							lineNumber: 161,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName$2,
						lineNumber: 157,
						columnNumber: 11
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$2,
					lineNumber: 143,
					columnNumber: 9
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName$2,
			lineNumber: 71,
			columnNumber: 7
		}, this), /* @__PURE__ */ jsxDEV("main", {
			className: "main-content",
			children: [/* @__PURE__ */ jsxDEV("header", {
				className: "content-header",
				children: [/* @__PURE__ */ jsxDEV("div", {
					className: "header-title-container",
					children: [/* @__PURE__ */ jsxDEV("button", {
						id: "sidebar-toggle",
						className: "sidebar-toggle-btn",
						"aria-label": "Toggle Navigation",
						onClick: (e) => {
							e.stopPropagation();
							setIsMobileVisible((prev) => !prev);
						},
						children: [
							/* @__PURE__ */ jsxDEV("span", { className: "bar" }, void 0, false, {
								fileName: _jsxFileName$2,
								lineNumber: 178,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ jsxDEV("span", { className: "bar" }, void 0, false, {
								fileName: _jsxFileName$2,
								lineNumber: 179,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ jsxDEV("span", { className: "bar" }, void 0, false, {
								fileName: _jsxFileName$2,
								lineNumber: 180,
								columnNumber: 15
							}, this)
						]
					}, void 0, true, {
						fileName: _jsxFileName$2,
						lineNumber: 169,
						columnNumber: 13
					}, this), /* @__PURE__ */ jsxDEV("h1", {
						id: "page-title",
						children: pageTitle
					}, void 0, false, {
						fileName: _jsxFileName$2,
						lineNumber: 182,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$2,
					lineNumber: 168,
					columnNumber: 11
				}, this), /* @__PURE__ */ jsxDEV("div", {
					className: "header-actions",
					style: {
						display: "flex",
						alignItems: "center",
						gap: "0.75rem"
					},
					children: [/* @__PURE__ */ jsxDEV("span", {
						id: "online-users",
						className: "status-indicator",
						style: {
							backgroundColor: "var(--accent-light)",
							color: "var(--accent-color)",
							fontWeight: "600",
							fontSize: "0.8rem",
							borderRadius: "9999px",
							padding: "0.25rem 0.6rem",
							display: "flex",
							alignItems: "center",
							gap: "0.35rem",
							border: "1px solid var(--border-color)"
						},
						children: [
							/* @__PURE__ */ jsxDEV("svg", {
								xmlns: "http://www.w3.org/2000/svg",
								width: "14",
								height: "14",
								viewBox: "0 0 24 24",
								fill: "none",
								stroke: "currentColor",
								strokeWidth: "2.5",
								strokeLinecap: "round",
								strokeLinejoin: "round",
								style: {
									width: "14px",
									height: "14px",
									color: "var(--accent-color)"
								},
								children: [
									/* @__PURE__ */ jsxDEV("path", { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }, void 0, false, {
										fileName: _jsxFileName$2,
										lineNumber: 186,
										columnNumber: 265
									}, this),
									/* @__PURE__ */ jsxDEV("circle", {
										cx: "9",
										cy: "7",
										r: "4"
									}, void 0, false, {
										fileName: _jsxFileName$2,
										lineNumber: 186,
										columnNumber: 318
									}, this),
									/* @__PURE__ */ jsxDEV("path", { d: "M23 21v-2a4 4 0 0 0-3-3.87" }, void 0, false, {
										fileName: _jsxFileName$2,
										lineNumber: 186,
										columnNumber: 347
									}, this),
									/* @__PURE__ */ jsxDEV("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" }, void 0, false, {
										fileName: _jsxFileName$2,
										lineNumber: 186,
										columnNumber: 385
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName$2,
								lineNumber: 186,
								columnNumber: 15
							}, this),
							/* @__PURE__ */ jsxDEV("span", {
								id: "online-users-count",
								children: onlineCount
							}, void 0, false, {
								fileName: _jsxFileName$2,
								lineNumber: 187,
								columnNumber: 15
							}, this),
							" online"
						]
					}, void 0, true, {
						fileName: _jsxFileName$2,
						lineNumber: 185,
						columnNumber: 13
					}, this), /* @__PURE__ */ jsxDEV("span", {
						id: "connection-status",
						className: `status-indicator ${isConnected ? "online" : "danger"}`,
						children: isConnected ? "Online" : "Offline"
					}, void 0, false, {
						fileName: _jsxFileName$2,
						lineNumber: 189,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName$2,
					lineNumber: 184,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName$2,
				lineNumber: 167,
				columnNumber: 9
			}, this), /* @__PURE__ */ jsxDEV("div", {
				className: "content-body",
				children
			}, void 0, false, {
				fileName: _jsxFileName$2,
				lineNumber: 195,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName$2,
			lineNumber: 166,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName$2,
		lineNumber: 70,
		columnNumber: 5
	}, this);
}
//#endregion
//#region app/components/Login.jsx
var _jsxFileName$1 = "/data/data/com.termux/files/home/stock-manager/app/components/Login.jsx";
function Login() {
	const { login } = useAuth();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");
		setLoading(true);
		try {
			await login(username, password);
		} catch (err) {
			setError(err.message || "Login failed. Please check your credentials.");
		} finally {
			setLoading(false);
		}
	};
	return /* @__PURE__ */ jsxDEV("div", {
		className: "login-layout",
		children: /* @__PURE__ */ jsxDEV("div", {
			className: "login-card",
			children: [/* @__PURE__ */ jsxDEV("div", {
				className: "login-header",
				children: [
					/* @__PURE__ */ jsxDEV("span", {
						className: "login-logo",
						children: /* @__PURE__ */ jsxDEV("svg", {
							xmlns: "http://www.w3.org/2000/svg",
							width: "48",
							height: "48",
							viewBox: "0 0 24 24",
							fill: "none",
							stroke: "currentColor",
							strokeWidth: "2.5",
							strokeLinecap: "round",
							strokeLinejoin: "round",
							style: {
								width: "44px",
								height: "44px",
								margin: "0 auto",
								color: "var(--text-primary)",
								display: "block",
								marginBottom: "1rem"
							},
							children: /* @__PURE__ */ jsxDEV("path", { d: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" }, void 0, false, {
								fileName: _jsxFileName$1,
								lineNumber: 48,
								columnNumber: 15
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName$1,
							lineNumber: 29,
							columnNumber: 13
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName$1,
						lineNumber: 28,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ jsxDEV("h2", { children: "Stock Manager" }, void 0, false, {
						fileName: _jsxFileName$1,
						lineNumber: 51,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ jsxDEV("p", { children: "Please log in to manage your stock" }, void 0, false, {
						fileName: _jsxFileName$1,
						lineNumber: 52,
						columnNumber: 11
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName$1,
				lineNumber: 27,
				columnNumber: 9
			}, this), /* @__PURE__ */ jsxDEV("form", {
				onSubmit: handleSubmit,
				className: "login-form",
				children: [
					/* @__PURE__ */ jsxDEV("div", {
						className: "form-group",
						children: [/* @__PURE__ */ jsxDEV("label", {
							htmlFor: "username",
							children: "Username"
						}, void 0, false, {
							fileName: _jsxFileName$1,
							lineNumber: 56,
							columnNumber: 13
						}, this), /* @__PURE__ */ jsxDEV("input", {
							type: "text",
							id: "username",
							required: true,
							placeholder: "Enter username",
							autoComplete: "username",
							value: username,
							onChange: (e) => setUsername(e.target.value)
						}, void 0, false, {
							fileName: _jsxFileName$1,
							lineNumber: 57,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName$1,
						lineNumber: 55,
						columnNumber: 11
					}, this),
					/* @__PURE__ */ jsxDEV("div", {
						className: "form-group",
						children: [/* @__PURE__ */ jsxDEV("label", {
							htmlFor: "password",
							children: "Password"
						}, void 0, false, {
							fileName: _jsxFileName$1,
							lineNumber: 68,
							columnNumber: 13
						}, this), /* @__PURE__ */ jsxDEV("input", {
							type: "password",
							id: "password",
							required: true,
							placeholder: "Enter password",
							autoComplete: "current-password",
							value: password,
							onChange: (e) => setPassword(e.target.value)
						}, void 0, false, {
							fileName: _jsxFileName$1,
							lineNumber: 69,
							columnNumber: 13
						}, this)]
					}, void 0, true, {
						fileName: _jsxFileName$1,
						lineNumber: 67,
						columnNumber: 11
					}, this),
					error && /* @__PURE__ */ jsxDEV("div", {
						className: "login-error-message",
						children: error
					}, void 0, false, {
						fileName: _jsxFileName$1,
						lineNumber: 79,
						columnNumber: 21
					}, this),
					/* @__PURE__ */ jsxDEV("button", {
						type: "submit",
						className: "btn-submit",
						disabled: loading,
						children: loading ? "Logging In..." : "Log In"
					}, void 0, false, {
						fileName: _jsxFileName$1,
						lineNumber: 80,
						columnNumber: 11
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName$1,
				lineNumber: 54,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName$1,
			lineNumber: 26,
			columnNumber: 7
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName$1,
		lineNumber: 25,
		columnNumber: 5
	}, this);
}
//#endregion
//#region app/routes/__root.jsx
var _jsxFileName = "/data/data/com.termux/files/home/stock-manager/app/routes/__root.jsx";
var queryClient = new QueryClient({ defaultOptions: { queries: {
	refetchOnWindowFocus: true,
	retry: false
} } });
function RootComponent() {
	const { currentUser, loading } = useAuth();
	let bodyContent;
	if (loading) bodyContent = /* @__PURE__ */ jsxDEV("div", {
		style: {
			display: "flex",
			height: "100vh",
			width: "100vw",
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: "var(--bg-primary)"
		},
		children: /* @__PURE__ */ jsxDEV("div", {
			className: "loading-spinner",
			style: {
				width: "2rem",
				height: "2rem",
				borderWidth: "3px"
			}
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 27,
			columnNumber: 9
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 26,
		columnNumber: 7
	}, this);
	else if (!currentUser) bodyContent = /* @__PURE__ */ jsxDEV(Login, {}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 31,
		columnNumber: 19
	}, this);
	else bodyContent = /* @__PURE__ */ jsxDEV(Layout, { children: /* @__PURE__ */ jsxDEV(Outlet, {}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 35,
		columnNumber: 9
	}, this) }, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 34,
		columnNumber: 7
	}, this);
	return /* @__PURE__ */ jsxDEV("html", {
		lang: "en",
		children: [/* @__PURE__ */ jsxDEV("head", { children: [
			/* @__PURE__ */ jsxDEV("meta", { charSet: "UTF-8" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 43,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ jsxDEV("link", {
				rel: "icon",
				type: "image/svg+xml",
				href: "/assets/favicon.ico"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 44,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ jsxDEV("meta", {
				name: "viewport",
				content: "width=device-width, initial-scale=1.0"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 45,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ jsxDEV("title", { children: "Stock Manager" }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 46,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ jsxDEV(HeadContent, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 47,
				columnNumber: 9
			}, this)
		] }, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 42,
			columnNumber: 7
		}, this), /* @__PURE__ */ jsxDEV("body", { children: [
			bodyContent,
			/* @__PURE__ */ jsxDEV(ScrollRestoration, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 51,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ jsxDEV(Scripts, {}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 52,
				columnNumber: 9
			}, this)
		] }, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 49,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 41,
		columnNumber: 5
	}, this);
}
function AppWithProviders() {
	return /* @__PURE__ */ jsxDEV(QueryClientProvider, {
		client: queryClient,
		children: /* @__PURE__ */ jsxDEV(AuthProvider, { children: /* @__PURE__ */ jsxDEV(WebSocketProvider, { children: /* @__PURE__ */ jsxDEV(RootComponent, {}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 63,
			columnNumber: 11
		}, this) }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 62,
			columnNumber: 9
		}, this) }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 61,
			columnNumber: 7
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 60,
		columnNumber: 5
	}, this);
}
var Route$8 = createRootRoute({ component: AppWithProviders });
//#endregion
//#region app/routes/stock-history.jsx
var $$splitComponentImporter$6 = () => import("./stock-history-lp3p2T4h.js");
var Route$7 = createFileRoute("/stock-history")({ component: lazyRouteComponent($$splitComponentImporter$6, "component") });
//#endregion
//#region app/routes/settings.jsx
var $$splitComponentImporter$5 = () => import("./settings-T4IZFLxM.js");
var Route$6 = createFileRoute("/settings")({ component: lazyRouteComponent($$splitComponentImporter$5, "component") });
//#endregion
//#region app/routes/review.jsx
var $$splitComponentImporter$4 = () => import("./review-DYpmFA5u.js");
var Route$5 = createFileRoute("/review")({ component: lazyRouteComponent($$splitComponentImporter$4, "component") });
//#endregion
//#region app/routes/products.jsx
var $$splitComponentImporter$3 = () => import("./products-Aw-iRUHP.js");
var Route$4 = createFileRoute("/products")({ component: lazyRouteComponent($$splitComponentImporter$3, "component") });
//#endregion
//#region app/routes/opname.jsx
var $$splitComponentImporter$2 = () => import("./opname-BTjC8CKH.js");
var Route$3 = createFileRoute("/opname")({ component: lazyRouteComponent($$splitComponentImporter$2, "component") });
//#endregion
//#region app/routes/import.jsx
var $$splitComponentImporter$1 = () => import("./import-PW7q6oG5.js");
var Route$2 = createFileRoute("/import")({ component: lazyRouteComponent($$splitComponentImporter$1, "component") });
//#endregion
//#region app/routes/index.jsx
var $$splitComponentImporter = () => import("./routes-CCWzkzLU.js");
var Route$1 = createFileRoute("/")({ component: lazyRouteComponent($$splitComponentImporter, "component") });
//#endregion
//#region src/db/context.js
var storageContext = new AsyncLocalStorage();
function getActiveStorage() {
	const store = storageContext.getStore();
	if (!store) throw new Error("Storage context not initialized. Ensure request or test runs inside storageContext.run()");
	return store.storage;
}
function getActiveEnv() {
	const store = storageContext.getStore();
	return store ? store.env : null;
}
//#endregion
//#region src/utils/crypto.js
function hashPassword(password) {
	const salt = crypto.randomBytes(16).toString("hex");
	return `${salt}:${crypto.pbkdf2Sync(password, salt, 1e3, 64, "sha512").toString("hex")}`;
}
function verifyPassword(password, storedPassword) {
	if (!storedPassword || !storedPassword.includes(":")) return false;
	const [salt, hash] = storedPassword.split(":");
	return hash === crypto.pbkdf2Sync(password, salt, 1e3, 64, "sha512").toString("hex");
}
//#endregion
//#region src/ws/broker.js
var localClients = /* @__PURE__ */ new Set();
/**
* Broadcasts a message to all connected clients.
* Isomorphic: handles both local Node.js clients and Durable Object WebSockets.
*/
function broadcast(message, excludeWs = null) {
	const payload = typeof message === "string" ? message : JSON.stringify(message);
	for (const client of localClients) {
		if (client === excludeWs) continue;
		if (client.readyState === 1) try {
			client.send(payload);
		} catch (err) {
			console.error("Error broadcasting to local client:", err);
			localClients.delete(client);
		}
	}
	try {
		const env = getActiveEnv();
		if (env && env.STOCK_ROOM) {
			const id = env.STOCK_ROOM.idFromName("global");
			env.STOCK_ROOM.get(id).broadcast(payload);
		}
	} catch (err) {}
}
//#endregion
//#region src/db/connection.js
var __filename = "";
try {
	__filename = fileURLToPath(import.meta.url);
	path.dirname(__filename);
} catch (e) {}
async function seedIfNeeded(storage) {
	const existingUsers = await storage.query("SELECT * FROM users WHERE id = 1");
	const now = (/* @__PURE__ */ new Date()).toISOString();
	let wasEmpty = false;
	if (!existingUsers || existingUsers.length === 0) {
		wasEmpty = true;
		const adminHash = hashPassword("admin123");
		const staffHash = hashPassword("staff123");
		await storage.execute("INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)", [
			1,
			"admin",
			adminHash,
			"admin",
			now
		]);
		await storage.execute("INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)", [
			2,
			"staff",
			staffHash,
			"staff",
			now
		]);
	}
	const existingProducts = await storage.query("SELECT * FROM products LIMIT 1");
	if (!(existingProducts && existingProducts.length > 0)) {
		if (wasEmpty) {
			console.log("Database empty. Seeding initial data...");
			let products = [];
			products = [
				{
					name: "Korek Api Model A",
					model: "Model A",
					current_stock: 100,
					low_stock_threshold: 20
				},
				{
					name: "Korek Api Model B",
					model: "Model B",
					current_stock: 80,
					low_stock_threshold: 15
				},
				{
					name: "Korek Api Model C",
					model: "Model C",
					current_stock: 50,
					low_stock_threshold: 10
				},
				{
					name: "Korek Api Model D",
					model: "Model D",
					current_stock: 3,
					low_stock_threshold: 10
				}
			];
			for (const p of products) {
				const productId = (await storage.execute("INSERT INTO products (name, model, master_sku, description, current_stock, low_stock_threshold, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
					p.name,
					p.model,
					p.master_sku || null,
					null,
					p.current_stock,
					p.low_stock_threshold,
					now,
					now
				])).lastInsertRowid;
				await storage.execute("INSERT INTO stock_movements (product_id, quantity_change, movement_type, reference, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)", [
					productId,
					p.current_stock,
					"initial",
					"Initial seeding",
					1,
					now
				]);
			}
			const shopeeMapping = {
				order_id: "No. Pesanan",
				resi_number: "No. Resi",
				product_name_raw: "Nama Produk",
				quantity: "Jumlah",
				order_status: "Status Pesanan",
				customer_name: "Username Pembeli",
				expedition: "Opsi Pengiriman",
				order_date: "Waktu Pembayaran",
				price: "Total Pembayaran",
				sku_ref: "Nomor Referensi SKU"
			};
			const tokopediaMapping = {
				order_id: "Nomor Invoice",
				resi_number: "Nomor Resi",
				product_name_raw: "Nama Produk",
				quantity: "Jumlah Produk",
				order_status: "Status Terakhir",
				customer_name: "Nama Pembeli",
				expedition: "Kurir",
				order_date: "Tanggal Transaksi",
				price: "Nilai Transaksi",
				sku_ref: "Nomor Referensi SKU"
			};
			await storage.execute("INSERT OR IGNORE INTO import_templates (id, name, column_mapping, created_at) VALUES (?, ?, ?, ?)", [
				1,
				"Shopee",
				JSON.stringify(shopeeMapping),
				now
			]);
			await storage.execute("INSERT OR IGNORE INTO import_templates (id, name, column_mapping, created_at) VALUES (?, ?, ?, ?)", [
				2,
				"Tokopedia",
				JSON.stringify(tokopediaMapping),
				now
			]);
			console.log("Database seeded successfully.");
		}
	}
	try {
		const { BUNDLE_MAPPINGS } = await import("./ambiguous-parser-D4x5Bat-.js");
		for (const [skuCode, items] of Object.entries(BUNDLE_MAPPINGS)) for (const item of items) {
			const prodRows = await storage.query("SELECT id FROM products WHERE LOWER(name) = ? OR LOWER(model) = ?", [item.name.toLowerCase(), item.name.toLowerCase()]);
			if (prodRows && prodRows[0]) await storage.execute("INSERT OR IGNORE INTO sku_mappings (sku_code, product_id, quantity) VALUES (?, ?, ?)", [
				skuCode.toLowerCase(),
				prodRows[0].id,
				item.qty
			]);
		}
	} catch (err) {
		console.error("Error seeding SKU mappings:", err);
	}
}
var db = {
	aliases: {
		async get(cleanText) {
			const rows = await getActiveStorage().query("SELECT product_id FROM product_aliases WHERE clean_text = ?", [cleanText.toLowerCase()]);
			return rows[0] ? rows[0].product_id : void 0;
		},
		async set(cleanText, productId) {
			await getActiveStorage().execute("INSERT OR REPLACE INTO product_aliases (clean_text, product_id) VALUES (?, ?)", [cleanText.toLowerCase(), parseInt(productId, 10)]);
		}
	},
	skuMappings: {
		async list() {
			return await getActiveStorage().query("SELECT sm.*, p.name as product_name, p.model as product_model FROM sku_mappings sm JOIN products p ON sm.product_id = p.id");
		},
		async getBySku(skuCode) {
			return await getActiveStorage().query("SELECT sm.*, p.name as product_name, p.model as product_model FROM sku_mappings sm JOIN products p ON sm.product_id = p.id WHERE LOWER(sm.sku_code) = LOWER(?)", [skuCode]);
		},
		async insert(mapping) {
			await getActiveStorage().execute("INSERT OR REPLACE INTO sku_mappings (sku_code, product_id, quantity) VALUES (?, ?, ?)", [
				mapping.sku_code.toLowerCase(),
				parseInt(mapping.product_id, 10),
				parseInt(mapping.quantity, 10)
			]);
			return true;
		},
		async delete(skuCode, productId) {
			await getActiveStorage().execute("DELETE FROM sku_mappings WHERE LOWER(sku_code) = LOWER(?) AND product_id = ?", [skuCode, parseInt(productId, 10)]);
			return true;
		}
	},
	users: {
		async list() {
			return await getActiveStorage().query("SELECT * FROM users");
		},
		async get(id) {
			return (await getActiveStorage().query("SELECT * FROM users WHERE id = ?", [id]))[0] || null;
		},
		async getByUsername(username) {
			return (await getActiveStorage().query("SELECT * FROM users WHERE username = ?", [username]))[0] || null;
		},
		async insert(user) {
			const result = await getActiveStorage().execute("INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, datetime('now', 'localtime'))", [
				user.username,
				user.password_hash,
				user.role
			]);
			return await this.get(result.lastInsertRowid);
		},
		async delete(id) {
			await getActiveStorage().execute("DELETE FROM users WHERE id = ?", [id]);
			return true;
		}
	},
	products: {
		async list() {
			return await getActiveStorage().query("SELECT * FROM products");
		},
		async get(id) {
			return (await getActiveStorage().query("SELECT * FROM products WHERE id = ?", [id]))[0] || null;
		},
		async getByName(name) {
			return (await getActiveStorage().query("SELECT * FROM products WHERE LOWER(name) = LOWER(?)", [name]))[0] || null;
		},
		async insert(product) {
			const result = await getActiveStorage().execute("INSERT INTO products (name, model, master_sku, description, current_stock, low_stock_threshold, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))", [
				product.name,
				product.model,
				product.master_sku || null,
				product.description || null,
				product.current_stock || 0,
				product.low_stock_threshold || 10
			]);
			const newProduct = await this.get(result.lastInsertRowid);
			broadcast({
				type: "PRODUCT_CREATED",
				payload: newProduct
			});
			return newProduct;
		},
		async update(id, updates) {
			const storage = getActiveStorage();
			const existing = await this.get(id);
			if (!existing) return null;
			const merged = {
				...existing,
				...updates
			};
			await storage.execute("UPDATE products SET name = ?, model = ?, master_sku = ?, description = ?, current_stock = ?, low_stock_threshold = ?, updated_at = datetime('now', 'localtime') WHERE id = ?", [
				merged.name,
				merged.model,
				merged.master_sku,
				merged.description,
				merged.current_stock,
				merged.low_stock_threshold,
				id
			]);
			const updated = await this.get(id);
			broadcast({
				type: "PRODUCT_UPDATED",
				payload: updated
			});
			return updated;
		},
		async delete(id) {
			const storage = getActiveStorage();
			await storage.execute("DELETE FROM order_items WHERE product_id = ?", [id]);
			await storage.execute("DELETE FROM stock_movements WHERE product_id = ?", [id]);
			await storage.execute("DELETE FROM product_aliases WHERE product_id = ?", [id]);
			await storage.execute("DELETE FROM products WHERE id = ?", [id]);
			broadcast({
				type: "PRODUCT_DELETED",
				payload: { id }
			});
			return true;
		}
	},
	movements: {
		async list() {
			return await getActiveStorage().query("SELECT * FROM stock_movements");
		},
		async get(id) {
			return (await getActiveStorage().query("SELECT * FROM stock_movements WHERE id = ?", [id]))[0] || null;
		},
		async insert(movement) {
			const result = await getActiveStorage().execute("INSERT INTO stock_movements (product_id, quantity_change, movement_type, reference, user_id, created_at) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))", [
				parseInt(movement.product_id, 10),
				parseInt(movement.quantity_change, 10),
				movement.movement_type,
				movement.reference || null,
				movement.user_id ? parseInt(movement.user_id, 10) : null
			]);
			const newMovement = await this.get(result.lastInsertRowid);
			broadcast({
				type: "MOVEMENT_CREATED",
				payload: newMovement
			});
			return newMovement;
		}
	},
	templates: {
		async list() {
			return await getActiveStorage().query("SELECT * FROM import_templates");
		},
		async get(id) {
			return (await getActiveStorage().query("SELECT * FROM import_templates WHERE id = ?", [id]))[0] || null;
		},
		async getByName(name) {
			return (await getActiveStorage().query("SELECT * FROM import_templates WHERE LOWER(name) = LOWER(?)", [name]))[0] || null;
		},
		async insert(template) {
			const result = await getActiveStorage().execute("INSERT INTO import_templates (name, column_mapping, created_at) VALUES (?, ?, datetime('now', 'localtime'))", [template.name, template.column_mapping]);
			return await this.get(result.lastInsertRowid);
		},
		async update(id, updates) {
			const storage = getActiveStorage();
			const existing = await this.get(id);
			if (!existing) return null;
			const merged = {
				...existing,
				...updates
			};
			await storage.execute("UPDATE import_templates SET name = ?, column_mapping = ? WHERE id = ?", [
				merged.name,
				merged.column_mapping,
				id
			]);
			return await this.get(id);
		},
		async delete(id) {
			await getActiveStorage().execute("DELETE FROM import_templates WHERE id = ?", [id]);
			return true;
		}
	},
	sessions: {
		async list() {
			return await getActiveStorage().query("SELECT * FROM import_sessions");
		},
		async get(id) {
			return (await getActiveStorage().query("SELECT * FROM import_sessions WHERE id = ?", [id]))[0] || null;
		},
		async insert(session) {
			const result = await getActiveStorage().execute("INSERT INTO import_sessions (template_id, user_id, filename, status, total_rows, applied_rows, flagged_rows, orders_data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))", [
				session.template_id ? parseInt(session.template_id, 10) : null,
				session.user_id ? parseInt(session.user_id, 10) : null,
				session.filename,
				session.status || "pending",
				parseInt(session.total_rows, 10) || 0,
				parseInt(session.applied_rows, 10) || 0,
				parseInt(session.flagged_rows, 10) || 0,
				session.orders_data || null
			]);
			return await this.get(result.lastInsertRowid);
		},
		async update(id, updates) {
			const storage = getActiveStorage();
			const existing = await this.get(id);
			if (!existing) return null;
			const merged = {
				...existing,
				...updates
			};
			await storage.execute("UPDATE import_sessions SET template_id = ?, user_id = ?, filename = ?, status = ?, total_rows = ?, applied_rows = ?, flagged_rows = ?, orders_data = ? WHERE id = ?", [
				merged.template_id ? parseInt(merged.template_id, 10) : null,
				merged.user_id ? parseInt(merged.user_id, 10) : null,
				merged.filename,
				merged.status,
				parseInt(merged.total_rows, 10) || 0,
				parseInt(merged.applied_rows, 10) || 0,
				parseInt(merged.flagged_rows, 10) || 0,
				merged.orders_data || null,
				id
			]);
			const updated = await this.get(id);
			broadcast({
				type: "SESSION_UPDATED",
				payload: updated
			});
			return updated;
		}
	},
	orders: {
		async list() {
			return await getActiveStorage().query("SELECT * FROM orders");
		},
		async get(id) {
			return (await getActiveStorage().query("SELECT * FROM orders WHERE id = ?", [id]))[0] || null;
		},
		async getByOrderId(orderId) {
			return (await getActiveStorage().query("SELECT * FROM orders WHERE order_id = ?", [orderId]))[0] || null;
		},
		async insert(order) {
			const result = await getActiveStorage().execute("INSERT INTO orders (import_session_id, order_id, resi_number, product_name_raw, quantity, order_status, customer_name, expedition, order_date, price, system_status, resolution, resolution_notes, resolved_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))", [
				parseInt(order.import_session_id, 10),
				order.order_id,
				order.resi_number || null,
				order.product_name_raw,
				parseInt(order.quantity, 10),
				order.order_status,
				order.customer_name || null,
				order.expedition || null,
				order.order_date || null,
				parseFloat(order.price) || 0,
				order.system_status || "normal",
				order.resolution || null,
				order.resolution_notes || null,
				order.resolved_at || null
			]);
			const newOrder = await this.get(result.lastInsertRowid);
			broadcast({
				type: "ORDER_CREATED",
				payload: newOrder
			});
			return newOrder;
		},
		async update(id, updates) {
			const storage = getActiveStorage();
			const existing = await this.get(id);
			if (!existing) return null;
			const merged = {
				...existing,
				...updates
			};
			await storage.execute("UPDATE orders SET import_session_id = ?, order_id = ?, resi_number = ?, product_name_raw = ?, quantity = ?, order_status = ?, customer_name = ?, expedition = ?, order_date = ?, price = ?, system_status = ?, resolution = ?, resolution_notes = ?, resolved_at = ? WHERE id = ?", [
				parseInt(merged.import_session_id, 10),
				merged.order_id,
				merged.resi_number || null,
				merged.product_name_raw,
				parseInt(merged.quantity, 10),
				merged.order_status,
				merged.customer_name || null,
				merged.expedition || null,
				merged.order_date || null,
				parseFloat(merged.price) || 0,
				merged.system_status,
				merged.resolution || null,
				merged.resolution_notes || null,
				merged.resolved_at || null,
				id
			]);
			const updated = await this.get(id);
			broadcast({
				type: "ORDER_UPDATED",
				payload: updated
			});
			return updated;
		}
	},
	orderItems: {
		async list() {
			return await getActiveStorage().query("SELECT * FROM order_items");
		},
		async get(id) {
			return (await getActiveStorage().query("SELECT * FROM order_items WHERE id = ?", [id]))[0] || null;
		},
		async getByOrderId(orderId) {
			return await getActiveStorage().query("SELECT * FROM order_items WHERE order_id = ?", [parseInt(orderId, 10)]);
		},
		async insert(item) {
			const result = await getActiveStorage().execute("INSERT INTO order_items (order_id, product_id, quantity, parse_source, original_text, is_confirmed) VALUES (?, ?, ?, ?, ?, ?)", [
				parseInt(item.order_id, 10),
				item.product_id ? parseInt(item.product_id, 10) : null,
				parseInt(item.quantity, 10),
				item.parse_source || "direct",
				item.original_text || null,
				item.is_confirmed !== void 0 ? item.is_confirmed ? 1 : 0 : 1
			]);
			return await this.get(result.lastInsertRowid);
		},
		async update(id, updates) {
			const storage = getActiveStorage();
			const existing = await this.get(id);
			if (!existing) return null;
			const merged = {
				...existing,
				...updates
			};
			await storage.execute("UPDATE order_items SET order_id = ?, product_id = ?, quantity = ?, parse_source = ?, original_text = ?, is_confirmed = ? WHERE id = ?", [
				parseInt(merged.order_id, 10),
				merged.product_id ? parseInt(merged.product_id, 10) : null,
				parseInt(merged.quantity, 10),
				merged.parse_source,
				merged.original_text || null,
				merged.is_confirmed !== void 0 ? merged.is_confirmed ? 1 : 0 : 1,
				id
			]);
			const updated = await this.get(id);
			broadcast({
				type: "ORDER_ITEM_UPDATED",
				payload: updated
			});
			return updated;
		}
	},
	opnames: {
		async list() {
			return await getActiveStorage().query("SELECT * FROM stock_opnames");
		},
		async get(id) {
			return (await getActiveStorage().query("SELECT * FROM stock_opnames WHERE id = ?", [id]))[0] || null;
		},
		async insert(opname) {
			const result = await getActiveStorage().execute("INSERT INTO stock_opnames (user_id, notes, created_at) VALUES (?, ?, datetime('now', 'localtime'))", [parseInt(opname.user_id, 10), opname.notes || null]);
			const newOpname = await this.get(result.lastInsertRowid);
			broadcast({
				type: "OPNAME_CREATED",
				payload: newOpname
			});
			return newOpname;
		}
	},
	opnameItems: {
		async list() {
			return await getActiveStorage().query("SELECT * FROM stock_opname_items");
		},
		async getByOpnameId(opnameId) {
			return await getActiveStorage().query("SELECT * FROM stock_opname_items WHERE opname_id = ?", [parseInt(opnameId, 10)]);
		},
		async insert(item) {
			const storage = getActiveStorage();
			const result = await storage.execute("INSERT INTO stock_opname_items (opname_id, product_id, system_stock, physical_stock, variance) VALUES (?, ?, ?, ?, ?)", [
				parseInt(item.opname_id, 10),
				parseInt(item.product_id, 10),
				parseInt(item.system_stock, 10),
				parseInt(item.physical_stock, 10),
				parseInt(item.variance, 10)
			]);
			return (await storage.query("SELECT * FROM stock_opname_items WHERE id = ?", [result.lastInsertRowid]))[0] || null;
		}
	}
};
//#endregion
//#region src/middleware/auth.js
var JWT_SECRET$1 = process.env.JWT_SECRET || "dev_secret_key";
async function requireAuth(c, next) {
	const token = getCookie(c, "token");
	if (!token) return c.json({ message: "Unauthorized. Please log in." }, 401);
	try {
		const payload = await verify(token, JWT_SECRET$1, "HS256");
		c.set("user", payload);
		await next();
	} catch (err) {
		deleteCookie(c, "token");
		return c.json({ message: "Unauthorized. Session expired." }, 401);
	}
}
//#endregion
//#region src/middleware/roles.js
function requireRole(role) {
	return async (c, next) => {
		const user = c.get("user");
		if (!user || user.role !== role) return c.json({ message: "Forbidden. Insufficient permissions." }, 403);
		await next();
	};
}
//#endregion
//#region src/routes/auth.js
var auth = new Hono();
var JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";
auth.post("/login", async (c) => {
	try {
		const { username, password } = await c.req.json();
		if (!username || !password) return c.json({ message: "Username and password are required" }, 400);
		const user = await db.users.getByUsername(username);
		if (!user || !verifyPassword(password, user.password_hash)) return c.json({ message: "Invalid username or password" }, 401);
		setCookie(c, "token", await sign({
			id: user.id,
			username: user.username,
			role: user.role,
			exp: Math.floor(Date.now() / 1e3) + 3600 * 24
		}, JWT_SECRET), {
			httpOnly: true,
			secure: false,
			path: "/",
			maxAge: 3600 * 24
		});
		return c.json({
			id: user.id,
			username: user.username,
			role: user.role
		});
	} catch (err) {
		console.error("Login route error:", err);
		return c.json({ message: "Internal server error" }, 500);
	}
});
auth.post("/logout", (c) => {
	deleteCookie(c, "token");
	return c.json({ success: true });
});
auth.get("/me", async (c) => {
	const token = getCookie(c, "token");
	console.log("DEBUG: token from getCookie:", token);
	console.log("DEBUG: Cookie header:", c.req.header("cookie") || c.req.header("Cookie"));
	if (!token) return c.json({ message: "Not logged in" }, 401);
	try {
		const payload = await verify(token, JWT_SECRET, "HS256");
		return c.json({
			id: payload.id,
			username: payload.username,
			role: payload.role
		});
	} catch (err) {
		console.error("DEBUG: verification failed with error:", err);
		deleteCookie(c, "token");
		return c.json({ message: "Invalid or expired session" }, 401);
	}
});
auth.get("/users", requireAuth, requireRole("admin"), async (c) => {
	try {
		const list = await db.users.list();
		list.sort((a, b) => a.username.localeCompare(b.username));
		const stripped = list.map((u) => ({
			id: u.id,
			username: u.username,
			role: u.role,
			created_at: u.created_at
		}));
		return c.json(stripped);
	} catch (err) {
		console.error("List users error:", err);
		return c.json({ message: "Failed to retrieve users" }, 500);
	}
});
auth.post("/users", requireAuth, requireRole("admin"), async (c) => {
	try {
		const { username, password, role } = await c.req.json();
		if (!username || !password || !role) return c.json({ message: "Username, password and role are required" }, 400);
		if (role !== "admin" && role !== "staff") return c.json({ message: "Role must be admin or staff" }, 400);
		if (await db.users.getByUsername(username)) return c.json({ message: "Username already exists" }, 400);
		const hashedPassword = hashPassword(password);
		const inserted = await db.users.insert({
			username,
			password_hash: hashedPassword,
			role
		});
		return c.json({
			success: true,
			id: inserted.id
		}, 201);
	} catch (err) {
		console.error("Create user error:", err);
		return c.json({ message: "Failed to create user" }, 500);
	}
});
auth.delete("/users/:id", requireAuth, requireRole("admin"), async (c) => {
	try {
		const id = parseInt(c.req.param("id"), 10);
		const currentUser = c.get("user");
		if (id === 1 || id === currentUser.id) return c.json({ message: "Cannot delete the main admin or your own current logged-in user account" }, 400);
		if (!await db.users.get(id)) return c.json({ message: "User not found" }, 404);
		await db.users.delete(id);
		return c.json({ success: true });
	} catch (err) {
		console.error("Delete user error:", err);
		return c.json({ message: "Failed to delete user" }, 500);
	}
});
//#endregion
//#region src/routes/products.js
var products = new Hono();
products.use("*", requireAuth);
products.get("/", async (c) => {
	try {
		const list = await db.products.list();
		list.sort((a, b) => a.name.localeCompare(b.name));
		return c.json(list);
	} catch (err) {
		console.error("List products error:", err);
		return c.json({ message: "Failed to retrieve products" }, 500);
	}
});
products.get("/ledger", async (c) => {
	try {
		const movements = await db.movements.list();
		const productsList = await db.products.list();
		const usersList = await db.users.list();
		const productMap = new Map(productsList.map((p) => [p.id, p]));
		const userMap = new Map(usersList.map((u) => [u.id, u]));
		const joined = movements.map((m) => {
			const prod = productMap.get(m.product_id);
			const user = m.user_id ? userMap.get(m.user_id) : null;
			return {
				...m,
				name: prod ? prod.name : null,
				model: prod ? prod.model : null,
				username: user ? user.username : null
			};
		});
		joined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
		return c.json(joined);
	} catch (err) {
		console.error("List ledger error:", err);
		return c.json({ message: "Failed to retrieve stock ledger" }, 500);
	}
});
products.post("/", requireRole("admin"), async (c) => {
	try {
		const { name, model, master_sku, description, initial_stock, low_stock_threshold } = await c.req.json();
		if (!name || !model) return c.json({ message: "Product name and model are required" }, 400);
		const user = c.get("user");
		const threshold = low_stock_threshold !== void 0 ? parseInt(low_stock_threshold, 10) : 10;
		const stock = initial_stock !== void 0 ? parseInt(initial_stock, 10) : 0;
		if (await db.products.getByName(name)) return c.json({ message: "Product name already exists" }, 400);
		const inserted = await db.products.insert({
			name,
			model,
			master_sku: master_sku || null,
			description: description || "",
			current_stock: stock,
			low_stock_threshold: threshold
		});
		if (stock !== 0) await db.movements.insert({
			product_id: inserted.id,
			quantity_change: stock,
			movement_type: "initial",
			reference: "Initial product creation stock",
			user_id: user.id
		});
		return c.json({
			success: true,
			id: inserted.id
		}, 201);
	} catch (err) {
		console.error("Add product error:", err);
		return c.json({ message: "Failed to create product" }, 500);
	}
});
products.put("/:id", requireRole("admin"), async (c) => {
	try {
		const id = parseInt(c.req.param("id"), 10);
		const { name, model, master_sku, description, low_stock_threshold } = await c.req.json();
		if (!name || !model) return c.json({ message: "Product name and model are required" }, 400);
		const existing = await db.products.getByName(name);
		if (existing && existing.id !== id) return c.json({ message: "Product name already exists" }, 400);
		const threshold = low_stock_threshold !== void 0 ? parseInt(low_stock_threshold, 10) : 10;
		await db.products.update(id, {
			name,
			model,
			master_sku: master_sku || null,
			description: description || "",
			low_stock_threshold: threshold
		});
		return c.json({ success: true });
	} catch (err) {
		console.error("Edit product error:", err);
		return c.json({ message: "Failed to update product" }, 500);
	}
});
products.post("/:id/adjust-stock", async (c) => {
	try {
		const id = parseInt(c.req.param("id"), 10);
		const { quantity_change, movement_type, reference } = await c.req.json();
		if (quantity_change === void 0 || isNaN(parseInt(quantity_change, 10))) return c.json({ message: "Valid quantity change is required" }, 400);
		const change = parseInt(quantity_change, 10);
		const type = movement_type || "manual_adjust";
		const ref = reference || "Manual stock adjustment";
		const user = c.get("user");
		const product = await db.products.get(id);
		if (!product) return c.json({ message: "Product not found" }, 404);
		await db.movements.insert({
			product_id: id,
			quantity_change: change,
			movement_type: type,
			reference: ref,
			user_id: user.id
		});
		const newStock = product.current_stock + change;
		await db.products.update(id, { current_stock: newStock });
		return c.json({
			success: true,
			current_stock: newStock
		});
	} catch (err) {
		console.error("Adjust stock error:", err);
		return c.json({ message: "Failed to adjust stock" }, 500);
	}
});
products.get("/:id/ledger", async (c) => {
	try {
		const id = parseInt(c.req.param("id"), 10);
		const { getActiveStorage } = await import("./context-zpTCAUKM.js");
		const activeStorage = getActiveStorage();
		const movements = await activeStorage.query(`SELECT * FROM stock_movements WHERE product_id = ? ORDER BY created_at ASC`, [id]);
		if (!movements || movements.length === 0) return c.json([]);
		const orderIdSet = /* @__PURE__ */ new Set();
		for (const m of movements) if (m.reference) {
			const match = m.reference.match(/Order ID:\s*([^\s,]+)/i);
			if (match) orderIdSet.add(match[1]);
		}
		const platformMap = /* @__PURE__ */ new Map();
		if (orderIdSet.size > 0) {
			const orderIds = Array.from(orderIdSet);
			const CHUNK_SIZE = 999;
			for (let i = 0; i < orderIds.length; i += CHUNK_SIZE) {
				const chunk = orderIds.slice(i, i + CHUNK_SIZE);
				const placeholders = chunk.map(() => "?").join(",");
				const orderRows = await activeStorage.query(`SELECT o.order_id, t.name AS platform_name
           FROM orders o
           JOIN import_sessions s ON o.import_session_id = s.id
           JOIN import_templates t ON s.template_id = t.id
           WHERE o.order_id IN (${placeholders})`, chunk);
				for (const row of orderRows) platformMap.set(row.order_id, row.platform_name);
			}
		}
		const result = movements.map((m) => {
			let platform_name = null;
			if (m.reference) {
				const match = m.reference.match(/Order ID:\s*([^\s,]+)/i);
				if (match) platform_name = platformMap.get(match[1]) || null;
			}
			return {
				...m,
				platform_name
			};
		});
		return c.json(result);
	} catch (err) {
		console.error("Get product ledger history error:", err);
		return c.json({ message: "Failed to retrieve product ledger history" }, 500);
	}
});
products.delete("/:id", requireRole("admin"), async (c) => {
	try {
		const id = parseInt(c.req.param("id"), 10);
		if (!await db.products.get(id)) return c.json({ message: "Product not found" }, 404);
		await db.products.delete(id);
		return c.json({ success: true });
	} catch (err) {
		console.error("Delete product error:", err);
		return c.json({ message: "Failed to delete product" }, 500);
	}
});
//#endregion
//#region src/services/excel-parser.js
/**
* Parses an Excel file buffer and maps its headers to system keys based on a template mapping configuration.
* @param {Buffer} fileBuffer - The binary Excel file buffer.
* @param {Object} columnMapping - Object mapping system keys to Excel column headers.
* @returns {Array<Object>} Mapped orders.
*/
async function parseExcel(fileBuffer, columnMapping) {
	if (!fileBuffer) throw new Error("File buffer is required");
	if (!columnMapping) throw new Error("Column mapping template is required");
	let imported;
	try {
		imported = await import("xlsx");
	} catch (err) {
		throw new Error("XLSX library not available in this environment: " + err.message);
	}
	const xlsxLib = imported.read ? imported : imported.default || imported;
	const workbook = xlsxLib.read(fileBuffer, { type: "buffer" });
	const firstSheetName = workbook.SheetNames[0];
	const worksheet = workbook.Sheets[firstSheetName];
	return xlsxLib.utils.sheet_to_json(worksheet, { defval: "" }).map((row, index) => {
		const mappedOrder = {};
		for (const [systemKey, excelHeader] of Object.entries(columnMapping)) {
			const rawValue = row[excelHeader];
			if (excelHeader && rawValue !== void 0 && rawValue !== null) {
				let value = String(rawValue).trim();
				if (systemKey === "quantity") mappedOrder[systemKey] = parseInt(value, 10) || 1;
				else if (systemKey === "price") {
					let cleanPrice = value.replace(/Rp\.?|rp\.?|\s+/g, "");
					if (cleanPrice.includes(",") && cleanPrice.includes(".")) cleanPrice = cleanPrice.replace(/\./g, "").replace(/,/g, ".");
					else if (cleanPrice.includes(",")) if (cleanPrice.split(",")[1].length === 3) cleanPrice = cleanPrice.replace(/,/g, "");
					else cleanPrice = cleanPrice.replace(/,/g, ".");
					else if (cleanPrice.includes(".")) {
						if (cleanPrice.split(".")[1].length === 3) cleanPrice = cleanPrice.replace(/\./g, "");
					}
					mappedOrder[systemKey] = parseFloat(cleanPrice) || 0;
				} else mappedOrder[systemKey] = value;
			} else if (systemKey === "quantity") mappedOrder[systemKey] = 1;
			else if (systemKey === "price") mappedOrder[systemKey] = 0;
			else mappedOrder[systemKey] = "";
		}
		mappedOrder._rowIndex = index + 2;
		return mappedOrder;
	});
}
//#endregion
//#region src/services/ambiguous-parser.js
/**
* Core parsing service for ambiguous product names, bundles, and promotional strings.
*/
var PRODUCT_ALIASES = {
	"c.ori": "CROCKIE ORIGINAL",
	"c.m.super": "CROCKIE MAGNET SUPER",
	"c.b.turbo": "CROCKIE BARA TURBO",
	"h.gomax": "HIMUJI GOMAX",
	"h.magsoft": "HIMUJI MAGSOFT",
	"h.d.aroma": "HIMUJI DELUXE AROMA",
	"h. barajet se": "HIMMUJI BARAJET SE",
	"h.barajet se": "HIMMUJI BARAJET SE",
	"icq orie": "ICQ ORIE",
	"icq magnet": "ICQ MAGNET",
	"icq b.turbo": "ICQ BARA TURBO",
	"icq classie": "ICQ CLASSIE",
	"icq minie": "ICQ MINIE",
	"c.idea": "CROCKIE IDEA",
	"c.superjet": "CROCKIE SUPER JET - Blue",
	"c.flexie": "CROCKIE FLEXIE - Blue",
	"c.flexie.w": "CROCKIE FLEXIE WINDPROOF",
	"c.powerjet": "CROCKIE POWER JET - Blue",
	"g.butane": "CROCKIE GAS BUTANE - Blue",
	"gas butane": "CROCKIE GAS BUTANE - Blue",
	"crokie original": "CROCKIE ORIGINAL",
	"crokie magnet super": "CROCKIE MAGNET SUPER",
	"crokie bara turbo": "CROCKIE BARA TURBO",
	"crokie super jet": "CROCKIE SUPER JET - Blue",
	"crokie flexie": "CROCKIE FLEXIE - Blue",
	"crokie flexie windproof": "CROCKIE FLEXIE WINDPROOF",
	"crokie idea": "CROCKIE IDEA",
	"crokie power jet": "CROCKIE POWER JET - Blue",
	"crokie gas butane": "CROCKIE GAS BUTANE - Blue",
	"crockie original": "CROCKIE ORIGINAL",
	"crockie magnet super": "CROCKIE MAGNET SUPER",
	"crockie bara turbo": "CROCKIE BARA TURBO",
	"cricket original": "CRICKET MINI PUTIH PRINT UV",
	"cricket orignal": "CRICKET MINI PUTIH PRINT UV",
	"cricket orignal mini": "CRICKET MINI PUTIH PRINT UV",
	"hitam": "CRICKET HITAM PRINT UV",
	"plain putih": "CRICKET MINI PUTIH PRINT UV",
	"putih cap putih": "CRICKET MINI PUTIH PRINT UV",
	"c.m.s p.black": "CROCKIE MAGNET SUPER PLAIN BLACK",
	"c.m.s p.white": "CROCKIE MAGNET SUPER PLAIN WHITE",
	"oldenlandia": "OLDENLANDIA",
	"cable ties 2,0 x 100": "CABLE TIES 2,0 X 100",
	"cable ties 2,5 x 150": "CABLE TIES 2,5 X 150",
	"cable ties 3,6 x 200": "CABLE TIES 3,6 X 200",
	"cable ties 3,6 x 250": "CABLE TIES 3,6 X 250",
	"cable ties 3,6 x 300": "CABLE TIES 3,6 X 300",
	"cable ties 7,2 x 300": "CABLE TIES 7,2 X 300"
};
var BUNDLE_MAPPINGS = {
	"croor_5s": [{
		name: "CROCKIE ORIGINAL",
		qty: 5
	}],
	"cromag_5s": [{
		name: "CROCKIE MAGNET SUPER",
		qty: 5
	}],
	"crobar_5s": [{
		name: "CROCKIE BARA TURBO",
		qty: 5
	}],
	"crosup_4s": [{
		name: "CROCKIE SUPER JET - Blue",
		qty: 4
	}],
	"croflex_4s": [{
		name: "CROCKIE FLEXIE - Blue",
		qty: 4
	}],
	"croflexiew_4s": [{
		name: "CROCKIE FLEXIE WINDPROOF",
		qty: 4
	}],
	"crojet_4s": [{
		name: "CROCKIE POWER JET - Blue",
		qty: 4
	}],
	"crogas_5s": [{
		name: "CROCKIE GAS BUTANE - Blue",
		qty: 5
	}],
	"cro50s": [{
		name: "CROCKIE ORIGINAL",
		qty: 50
	}],
	"cromag_box": [{
		name: "CROCKIE MAGNET SUPER",
		qty: 50
	}],
	"crob25s": [{
		name: "CROCKIE BARA TURBO",
		qty: 25
	}],
	"crog25s": [{
		name: "CROCKIE GAS BUTANE - Blue",
		qty: 25
	}],
	"croid16s": [{
		name: "CROCKIE IDEA",
		qty: 16
	}],
	"cbh(box)": [{
		name: "CROCKIE BARA TURBO",
		qty: 25
	}],
	"cc01": [{
		name: "CROCKIE ORIGINAL",
		qty: 500
	}],
	"cc02": [{
		name: "CROCKIE MAGNET SUPER",
		qty: 500
	}],
	"cc03": [{
		name: "CROCKIE MAGNET SUPER PLAIN BLACK",
		qty: 500
	}],
	"cc04": [{
		name: "CROCKIE MAGNET SUPER PLAIN WHITE",
		qty: 500
	}],
	"cc05": [{
		name: "CROCKIE BARA TURBO",
		qty: 500
	}],
	"cc06": [{
		name: "CROCKIE GAS BUTANE - Blue",
		qty: 300
	}],
	"cropak_ori5": [{
		name: "CROCKIE ORIGINAL",
		qty: 6
	}],
	"cropak_super5": [{
		name: "CROCKIE MAGNET SUPER",
		qty: 6
	}],
	"cropak_turbo5": [{
		name: "CROCKIE BARA TURBO",
		qty: 6
	}],
	"cromix001": [
		{
			name: "CROCKIE ORIGINAL",
			qty: 3
		},
		{
			name: "CROCKIE MAGNET SUPER",
			qty: 2
		},
		{
			name: "CROCKIE BARA TURBO",
			qty: 1
		}
	],
	"cromix002": [{
		name: "CROCKIE ORIGINAL",
		qty: 3
	}, {
		name: "CROCKIE MAGNET SUPER",
		qty: 3
	}],
	"cromix003": [{
		name: "CROCKIE MAGNET SUPER",
		qty: 3
	}, {
		name: "CROCKIE BARA TURBO",
		qty: 3
	}],
	"cromix_idea1": [{
		name: "CROCKIE IDEA",
		qty: 3
	}, {
		name: "CROCKIE ORIGINAL",
		qty: 3
	}],
	"cromix_idea2": [{
		name: "CROCKIE IDEA",
		qty: 3
	}, {
		name: "CROCKIE MAGNET SUPER",
		qty: 3
	}],
	"cromix_idea3": [{
		name: "CROCKIE IDEA",
		qty: 3
	}, {
		name: "CROCKIE BARA TURBO",
		qty: 3
	}],
	"cromix_idea4": [{
		name: "CROCKIE IDEA",
		qty: 5
	}, {
		name: "CROCKIE GAS BUTANE - Blue",
		qty: 1
	}],
	"cromix_superjet1": [
		{
			name: "CROCKIE SUPER JET - Blue",
			qty: 2
		},
		{
			name: "CROCKIE FLEXIE - Blue",
			qty: 2
		},
		{
			name: "CROCKIE GAS BUTANE - Blue",
			qty: 1
		}
	],
	"cromix_superjet2": [
		{
			name: "CROCKIE SUPER JET - Blue",
			qty: 2
		},
		{
			name: "CROCKIE FLEXIE WINDPROOF",
			qty: 2
		},
		{
			name: "CROCKIE GAS BUTANE - Blue",
			qty: 1
		}
	],
	"cromix_superjet3": [
		{
			name: "CROCKIE SUPER JET - Blue",
			qty: 2
		},
		{
			name: "CROCKIE IDEA",
			qty: 2
		},
		{
			name: "CROCKIE GAS BUTANE - Blue",
			qty: 1
		}
	],
	"crocset_idea": [{
		name: "CROCKIE IDEA",
		qty: 4
	}, {
		name: "CROCKIE GAS BUTANE - Blue",
		qty: 1
	}],
	"crocbox_super": [{
		name: "CROCKIE MAGNET SUPER",
		qty: 55
	}],
	"crocbox_turbo": [{
		name: "CROCKIE BARA TURBO",
		qty: 25
	}, {
		name: "CROCKIE GAS BUTANE - Blue",
		qty: 2
	}],
	"crocset_powerjet": [{
		name: "CROCKIE POWER JET - Blue",
		qty: 4
	}, {
		name: "CROCKIE GAS BUTANE - Blue",
		qty: 1
	}],
	"crocset_flexie": [{
		name: "CROCKIE FLEXIE - Blue",
		qty: 4
	}, {
		name: "CROCKIE GAS BUTANE - Blue",
		qty: 1
	}],
	"crocset_flexiew": [{
		name: "CROCKIE FLEXIE WINDPROOF",
		qty: 4
	}, {
		name: "CROCKIE GAS BUTANE - Blue",
		qty: 1
	}],
	"crocbox_black": [{
		name: "CROCKIE MAGNET SUPER PLAIN BLACK",
		qty: 55
	}],
	"crocbox_superwhite": [{
		name: "CROCKIE MAGNET SUPER PLAIN WHITE",
		qty: 55
	}],
	"csuper1": [{
		name: "CROCKIE SUPER JET - Blue",
		qty: 1
	}, {
		name: "CROCKIE GAS BUTANE - Blue",
		qty: 1
	}],
	"ic001_5ps": [{
		name: "ICQ ORIE",
		qty: 5
	}],
	"ic002_5ps": [{
		name: "ICQ MAGNET",
		qty: 5
	}],
	"ic003_5ps": [{
		name: "ICQ BARA TURBO",
		qty: 5
	}],
	"ic004_5ps": [{
		name: "ICQ MINIE",
		qty: 5
	}],
	"ic005_4ps": [{
		name: "ICQ CLASSIE",
		qty: 4
	}],
	"ic001(box)": [{
		name: "ICQ ORIE",
		qty: 50
	}],
	"ic002(box)": [{
		name: "ICQ MAGNET",
		qty: 50
	}],
	"ic003(box)": [{
		name: "ICQ BARA TURBO",
		qty: 25
	}],
	"ic004(box)": [{
		name: "ICQ CLASSIE",
		qty: 50
	}],
	"ic006": [{
		name: "ICQ ORIE",
		qty: 55
	}],
	"ic007": [{
		name: "ICQ MAGNET",
		qty: 55
	}],
	"ic008": [{
		name: "ICQ BARA TURBO",
		qty: 55
	}],
	"ic009": [{
		name: "ICQ CLASSIE",
		qty: 55
	}],
	"icqpak_orie5": [{
		name: "ICQ ORIE",
		qty: 6
	}],
	"icqpak_magnet5": [{
		name: "ICQ MAGNET",
		qty: 6
	}],
	"icqpak_turbo5": [{
		name: "ICQ BARA TURBO",
		qty: 6
	}],
	"icqmix001": [{
		name: "ICQ MAGNET",
		qty: 3
	}, {
		name: "ICQ ORIE",
		qty: 3
	}],
	"icqmix002": [{
		name: "ICQ BARA TURBO",
		qty: 3
	}, {
		name: "ICQ MAGNET",
		qty: 3
	}],
	"icqmix_minie1": [{
		name: "ICQ MINIE",
		qty: 3
	}, {
		name: "ICQ ORIE",
		qty: 3
	}],
	"icqmix_minie2": [{
		name: "ICQ MINIE",
		qty: 3
	}, {
		name: "ICQ MAGNET",
		qty: 3
	}],
	"icqmix_minie3": [{
		name: "ICQ CLASSIE",
		qty: 3
	}, {
		name: "ICQ MINIE",
		qty: 3
	}],
	"icqset_minie": [{
		name: "ICQ MINIE",
		qty: 4
	}, {
		name: "ICQ MAGNET",
		qty: 1
	}],
	"icqset_classie": [{
		name: "ICQ CLASSIE",
		qty: 4
	}, {
		name: "ICQ BARA TURBO",
		qty: 1
	}],
	"icqgas1": [{
		name: "ICQ BARA TURBO",
		qty: 5
	}, {
		name: "CROCKIE GAS BUTANE - Blue",
		qty: 1
	}],
	"icqcl4": [{
		name: "ICQ CLASSIE",
		qty: 4
	}],
	"hi001_5ps": [{
		name: "HIMUJI GOMAX",
		qty: 5
	}],
	"hi002_5ps": [{
		name: "HIMUJI MAGSOFT",
		qty: 5
	}],
	"hi003_5ps": [{
		name: "HIMMUJI BARAJET SE",
		qty: 5
	}],
	"hi004_5ps": [{
		name: "HIMUJI DELUXE GRANDE",
		qty: 5
	}],
	"hi005_5ps": [{
		name: "HIMUJI DELUXE AROMA",
		qty: 5
	}],
	"hi006_5ps": [{
		name: "HIMUJI BARAJET ULTIMATE",
		qty: 5
	}],
	"hi007_5ps": [{
		name: "HIMUJI ICONIX",
		qty: 5
	}],
	"hi008_5ps": [{
		name: "HIMUJI ICONIX SP",
		qty: 5
	}],
	"hi009_4ps": [{
		name: "HIMUJI ONIX SM",
		qty: 4
	}],
	"hi010_4ps": [{
		name: "HIMUJI ONIX XL",
		qty: 4
	}],
	"hi003(box)": [{
		name: "HIMMUJI BARAJET SE",
		qty: 25
	}],
	"hi011(box)": [{
		name: "HIMUJI GOMAX POLOS HITAM",
		qty: 50
	}],
	"hi012(box)": [{
		name: "HIMUJI GOMAX POLOS PUTIH",
		qty: 50
	}],
	"hi11": [{
		name: "HIMUJI GOMAX",
		qty: 50
	}],
	"hi007(box)": [{
		name: "HIMUJI ICONIX",
		qty: 50
	}],
	"himag(box)": [{
		name: "HIMUJI MAGSOFT",
		qty: 50
	}],
	"hipak_gomax5": [{
		name: "HIMUJI GOMAX",
		qty: 6
	}],
	"hipak_magsoft5": [{
		name: "HIMUJI MAGSOFT",
		qty: 6
	}],
	"hipak_aroma5": [{
		name: "HIMUJI DELUXE AROMA",
		qty: 6
	}],
	"hipak_bara5": [{
		name: "HIMMUJI BARAJET SE",
		qty: 6
	}],
	"himix001": [{
		name: "HIMUJI GOMAX",
		qty: 3
	}, {
		name: "HIMUJI MAGSOFT",
		qty: 3
	}],
	"himix002": [{
		name: "HIMUJI DELUXE AROMA",
		qty: 3
	}, {
		name: "HIMUJI GOMAX",
		qty: 3
	}],
	"himix_iconix1": [{
		name: "HIMUJI ICONIX",
		qty: 3
	}, {
		name: "HIMUJI GOMAX",
		qty: 3
	}],
	"himix_onixsm1": [{
		name: "HIMUJI ONIX SM",
		qty: 3
	}, {
		name: "HIMUJI MAGSOFT",
		qty: 3
	}],
	"hipak_gomax10": [{
		name: "HIMUJI GOMAX",
		qty: 12
	}],
	"hipak_magsoft10": [{
		name: "HIMUJI MAGSOFT",
		qty: 12
	}],
	"hipak_aroma10": [{
		name: "HIMUJI DELUXE AROMA",
		qty: 10
	}, {
		name: "HIMUJI GOMAX",
		qty: 2
	}],
	"hiset_iconix5": [{
		name: "HIMUJI ICONIX",
		qty: 5
	}, {
		name: "HIMUJI GOMAX",
		qty: 1
	}],
	"hiset_iconixsm5": [{
		name: "HIMUJI ICONIX SP",
		qty: 5
	}, {
		name: "HIMUJI ICONIX",
		qty: 1
	}],
	"hiset_onixsm": [{
		name: "HIMUJI ONIX SM",
		qty: 4
	}, {
		name: "HIMUJI MAGSOFT",
		qty: 2
	}],
	"hiset_onixxl": [{
		name: "HIMUJI ONIX XL",
		qty: 5
	}, {
		name: "HIMUJI MAGSOFT",
		qty: 2
	}],
	"hi013": [{
		name: "HIMUJI ONIX XL",
		qty: 4
	}],
	"hig1": [{
		name: "HIMUJI GOMAX",
		qty: 5
	}, {
		name: "CROCKIE GAS BUTANE - Blue",
		qty: 1
	}]
};
/**
* Resolves a promotional bundle product to its base constituent products and quantities.
* @param {string} skuRef - Product SKU code.
* @param {string} productNameRaw - Raw product name from Excel.
* @param {number} orderQty - The quantity of the line item ordered.
* @param {Array<Object>} catalog - The database product catalog.
* @param {Array<Object>} [dbMappings] - Optional SKU mappings retrieved from DB.
* @returns {Array<Object>|null} Resolved splits or null if not a bundle.
*/
function resolvePromoProductToBaseItems(skuRef, productNameRaw, orderQty, catalog, dbMappings) {
	const cleanSku = skuRef ? String(skuRef).trim().toLowerCase() : "";
	const cleanName = productNameRaw ? String(productNameRaw).trim().toLowerCase() : "";
	if (dbMappings && dbMappings.length > 0) {
		let matchedDb = dbMappings.filter((m) => m.sku_code.toLowerCase() === cleanSku);
		if (matchedDb.length === 0) {
			const bestMatchKey = dbMappings.map((m) => m.sku_code.toLowerCase()).find((key) => {
				return cleanName === key || key.length >= 4 && cleanName.includes(key);
			});
			if (bestMatchKey) matchedDb = dbMappings.filter((m) => m.sku_code.toLowerCase() === bestMatchKey);
		}
		if (matchedDb.length > 0) return matchedDb.map((item) => {
			const catalogProd = catalog.find((p) => p.id === item.product_id);
			return {
				product_id: item.product_id,
				product_name: catalogProd ? catalogProd.name : item.product_name,
				model: catalogProd ? catalogProd.model : item.product_model,
				quantity: item.quantity * orderQty,
				parse_source: "auto_split",
				original_text: productNameRaw
			};
		});
	}
	let mapping = BUNDLE_MAPPINGS[cleanSku];
	if (!mapping) {
		const matchingKey = Object.keys(BUNDLE_MAPPINGS).find((key) => {
			return cleanName === key || key.length >= 4 && cleanName.includes(key);
		});
		if (matchingKey) mapping = BUNDLE_MAPPINGS[matchingKey];
	}
	if (!mapping && catalog) {
		const matchedCatalogProduct = catalog.find((p) => p.name.toLowerCase() === cleanName || p.model.toLowerCase() === cleanSku);
		if (matchedCatalogProduct) {
			const modelLower = matchedCatalogProduct.model.toLowerCase();
			if (BUNDLE_MAPPINGS[modelLower]) mapping = BUNDLE_MAPPINGS[modelLower];
		}
	}
	if (mapping) return mapping.map((item) => {
		const catalogProd = catalog.find((p) => p.name.toLowerCase() === item.name.toLowerCase());
		return {
			product_id: catalogProd ? catalogProd.id : null,
			product_name: catalogProd ? catalogProd.name : item.name,
			model: catalogProd ? catalogProd.model : "",
			quantity: item.qty * orderQty,
			parse_source: "auto_split",
			original_text: productNameRaw
		};
	});
	return null;
}
/**
* Extracts same-product promo multipliers (e.g. BUY 1 GET 1, B1G1, Beli 1 Gratis 1)
* and returns the cleaned text and the promo multiplier.
*/
function extractSameProductPromo(text) {
	let tempText = text;
	let promoMultiplier = 1;
	for (const regex of [
		/\[?buy\s+(\d+)\s+get\s+(\d+)(?:\s+free)?\]?/i,
		/\[?beli\s+(\d+)\s+gratis\s+(\d+)\]?/i,
		/\[?buy\s+(\d+)\s+free\s+(\d+)\]?/i,
		/\[?b(\d+)g(\d+)\]?/i,
		/(\d+)\s*(?:pcs|buah|pc|pack|pak|box)?\s+(?:gratis|free)\s+(\d+)\s*(?:pcs|buah|pc|pack|pak|box)?/i
	]) {
		const match = tempText.match(regex);
		if (match) {
			promoMultiplier = parseInt(match[1], 10) + parseInt(match[2], 10);
			tempText = tempText.replace(regex, "").trim();
			break;
		}
	}
	return {
		cleanText: tempText,
		promoMultiplier
	};
}
/**
* Extracts pack size multipliers (e.g. (10 pcs), - 5 Buah, 5's)
* and returns the cleaned text and the pack multiplier.
*/
function extractPackMultiplier(text) {
	let tempText = text;
	let packMultiplier = 1;
	for (const regex of [
		/\(\s*(\d+)\s*(?:pcs|buah|pc|pack|pak|item|items|btg|batang|sachet|bks|bungkus)\s*\)\s*$/i,
		/\s+-\s*(\d+)\s*(?:pcs|buah|pc|pack|pak|item|items|btg|batang|sachet|bks|bungkus)\s*$/i,
		/\s+(\d+)'s\s*$/i,
		/\s+(\d+)\s*(?:pcs|buah|pc|pack|pak|item|items|btg|batang|sachet|bks|bungkus)\s*$/i
	]) {
		const match = tempText.match(regex);
		if (match) {
			packMultiplier = parseInt(match[1], 10);
			tempText = tempText.replace(regex, "").trim();
			break;
		}
	}
	return {
		cleanText: tempText,
		packMultiplier
	};
}
/**
* Tries to find a product in the catalog that is a substring of the query,
* or vice versa, focusing on the longest matching product name.
* @param {string} text - Text to search.
* @param {Array<Object>} catalog - Products catalog (id, name, model).
* @returns {Object|null} Matching product or null.
*/
function findProductInCatalog(text, catalog) {
	const normalizedText = text.toLowerCase().trim().replace(/\s+/g, " ");
	if (PRODUCT_ALIASES[normalizedText]) {
		const targetName = PRODUCT_ALIASES[normalizedText].toLowerCase();
		const matched = catalog.find((p) => p.name.toLowerCase() === targetName);
		if (matched) return matched;
	}
	let bestMatch = null;
	let longestMatchLength = 0;
	for (const product of catalog) {
		const pName = product.name.toLowerCase();
		const pModel = product.model.toLowerCase();
		if (normalizedText === pName || normalizedText === pModel) return product;
		if (normalizedText.includes(pName)) {
			if (pName.length > longestMatchLength) {
				bestMatch = product;
				longestMatchLength = pName.length;
			}
		} else if (normalizedText.includes(pModel)) {
			if (pModel.length > longestMatchLength) {
				bestMatch = product;
				longestMatchLength = pModel.length;
			}
		}
	}
	return bestMatch;
}
/**
* Calculates Sorensen-Dice similarity coefficient (0 to 1) between two strings using character bigrams.
*/
function getSorensenDiceSimilarity(s1, s2) {
	if (!s1 || !s2) return 0;
	s1 = s1.toLowerCase().trim().replace(/\s+/g, " ");
	s2 = s2.toLowerCase().trim().replace(/\s+/g, " ");
	if (s1 === s2) return 1;
	const getBigrams = (str) => {
		const bigrams = /* @__PURE__ */ new Set();
		for (let i = 0; i < str.length - 1; i++) bigrams.add(str.substring(i, i + 2));
		return bigrams;
	};
	const b1 = getBigrams(s1);
	const b2 = getBigrams(s2);
	if (b1.size === 0 || b2.size === 0) return 0;
	let intersection = 0;
	for (const item of b1) if (b2.has(item)) intersection++;
	return 2 * intersection / (b1.size + b2.size);
}
/**
* Finds the product in catalog with highest Sorensen-Dice similarity.
*/
function findFuzzyProductInCatalog(text, catalog) {
	let bestProduct = null;
	let maxSimilarity = 0;
	for (const p of catalog) {
		const similarity = getSorensenDiceSimilarity(text, p.name);
		if (similarity > maxSimilarity) {
			maxSimilarity = similarity;
			bestProduct = p;
		}
	}
	return {
		product: bestProduct,
		similarity: maxSimilarity
	};
}
/**
* Parses an order item line from Excel and returns a list of suggested product splits.
* @param {string} rawText - Raw product text from Excel.
* @param {number} orderQty - The overall quantity of the line item ordered.
* @param {Array<Object>} catalog - Registered products catalog.
* @returns {Array<Object>} Suggested splits containing { product_id, product_name, quantity, parse_source, original_text, fuzzy_suggestion }
*/
function parseAmbiguousDescription(rawText, orderQty, catalog) {
	const text = rawText.trim();
	const splits = [];
	const addSplit = (product, qty, source, orig) => {
		let finalProduct = product;
		let finalSource = source;
		let fuzzySuggestion = null;
		if (!finalProduct && orig) {
			const fuzzyRes = findFuzzyProductInCatalog(orig, catalog);
			if (fuzzyRes.similarity >= .75) {
				finalProduct = fuzzyRes.product;
				finalSource = "fuzzy_auto";
			} else if (fuzzyRes.similarity >= .4) fuzzySuggestion = {
				product: {
					id: fuzzyRes.product.id,
					name: fuzzyRes.product.name
				},
				similarity: Math.round(fuzzyRes.similarity * 100)
			};
		}
		splits.push({
			product_id: finalProduct ? finalProduct.id : null,
			product_name: finalProduct ? finalProduct.name : "Unknown Product (Awaiting Selection)",
			model: finalProduct ? finalProduct.model : "",
			quantity: qty,
			parse_source: finalSource,
			original_text: orig,
			fuzzy_suggestion: fuzzySuggestion
		});
	};
	const promoRes = extractSameProductPromo(text);
	const packRes = extractPackMultiplier(promoRes.cleanText);
	const cleanedText = packRes.cleanText;
	const baseMultiplier = promoRes.promoMultiplier * packRes.packMultiplier;
	const normalizedCleaned = cleanedText.toLowerCase();
	const isPromo = normalizedCleaned.includes("gratis") || normalizedCleaned.includes("paket") || normalizedCleaned.includes("bundle") || normalizedCleaned.includes("+") || normalizedCleaned.includes("&") || normalizedCleaned.includes("dan") || normalizedCleaned.includes("free");
	const directProduct = findProductInCatalog(cleanedText, catalog);
	if (directProduct && !isPromo) if (normalizedCleaned.match(/(?:^|\s)(\d+)\s*[xX]\s*(.+)$/) || normalizedCleaned.match(/(.+)\s*[xX]\s*(\d+)(?:\s|$)/)) {} else {
		addSplit(directProduct, baseMultiplier * orderQty, "direct", text);
		return splits;
	}
	const buyFreeMatch = cleanedText.match(/beli\s+(\d+)\s+(.*?)\s+gratis\s+(\d+)\s+(.*)/i);
	if (buyFreeMatch) {
		const buyQty = parseInt(buyFreeMatch[1], 10);
		const buyItemText = buyFreeMatch[2];
		const freeQty = parseInt(buyFreeMatch[3], 10);
		const freeItemText = buyFreeMatch[4];
		const buyProduct = findProductInCatalog(buyItemText, catalog);
		const freeProduct = findProductInCatalog(freeItemText, catalog);
		addSplit(buyProduct, baseMultiplier * buyQty * orderQty, "auto_split", buyItemText);
		addSplit(freeProduct, baseMultiplier * freeQty * orderQty, "auto_split", freeItemText);
		return splits;
	}
	const buyFreeEngMatch = cleanedText.match(/buy\s+(\d+)\s+(.*?)\s+get\s+(\d+)\s+(.*?)(?:\s+free)?$/i);
	if (buyFreeEngMatch) {
		const buyQty = parseInt(buyFreeEngMatch[1], 10);
		const buyItemText = buyFreeEngMatch[2];
		const freeQty = parseInt(buyFreeEngMatch[3], 10);
		const freeItemText = buyFreeEngMatch[4];
		const buyProduct = findProductInCatalog(buyItemText, catalog);
		const freeProduct = findProductInCatalog(freeItemText, catalog);
		addSplit(buyProduct, baseMultiplier * buyQty * orderQty, "auto_split", buyItemText);
		addSplit(freeProduct, baseMultiplier * freeQty * orderQty, "auto_split", freeItemText);
		return splits;
	}
	const leadingMultiplierRegex = /^(?:paket\s+)?(\d+)\s*[xX]\s*(.+)$/i;
	const trailingMultiplierRegex = /^(.+?)\s*[xX]\s*(\d+)$/i;
	const leadMatch = cleanedText.match(leadingMultiplierRegex);
	const trailMatch = cleanedText.match(trailingMultiplierRegex);
	if (leadMatch) {
		const mult = parseInt(leadMatch[1], 10);
		const itemText = leadMatch[2];
		addSplit(findProductInCatalog(itemText, catalog), baseMultiplier * mult * orderQty, "auto_split", itemText);
		return splits;
	} else if (trailMatch) {
		const itemText = trailMatch[1];
		const mult = parseInt(trailMatch[2], 10);
		addSplit(findProductInCatalog(itemText, catalog), baseMultiplier * mult * orderQty, "auto_split", itemText);
		return splits;
	}
	if (normalizedCleaned.includes("+") || normalizedCleaned.includes("&") || normalizedCleaned.includes(" dan ") || normalizedCleaned.includes(" and ")) {
		const parts = cleanedText.replace(/paket/i, "").trim().split(/\s*(?:\+|\&|dan|and)\s*/i);
		if (parts.length > 1) {
			parts.forEach((part) => {
				const partMatch = part.match(/^(\d+)\s*[xX]\s*(.+)$/i);
				if (partMatch) {
					const partMult = parseInt(partMatch[1], 10);
					const partItem = partMatch[2];
					addSplit(findProductInCatalog(partItem, catalog), baseMultiplier * partMult * orderQty, "auto_split", partItem);
				} else addSplit(findProductInCatalog(part, catalog), baseMultiplier * 1 * orderQty, "auto_split", part);
			});
			return splits;
		}
	}
	addSplit(findProductInCatalog(cleanedText, catalog), baseMultiplier * orderQty, "direct", cleanedText);
	return splits;
}
//#endregion
//#region src/routes/import.js
var imports = new Hono();
imports.use("*", requireAuth);
imports.get("/templates", async (c) => {
	try {
		const result = (await db.templates.list()).map((t) => ({
			...t,
			column_mapping: JSON.parse(t.column_mapping)
		}));
		result.sort((a, b) => a.name.localeCompare(b.name));
		return c.json(result);
	} catch (err) {
		console.error("List templates error:", err);
		return c.json({ message: "Failed to retrieve templates" }, 500);
	}
});
imports.post("/templates", requireRole("admin"), async (c) => {
	try {
		const { id, name, column_mapping } = await c.req.json();
		if (!name || !column_mapping) return c.json({ message: "Template name and column mapping are required" }, 400);
		const mappingStr = JSON.stringify(column_mapping);
		if (id) {
			await db.templates.update(parseInt(id, 10), {
				name,
				column_mapping: mappingStr
			});
			return c.json({
				success: true,
				id: parseInt(id, 10)
			});
		} else {
			if (await db.templates.getByName(name)) return c.json({ message: "Template name already exists" }, 400);
			const inserted = await db.templates.insert({
				name,
				column_mapping: mappingStr
			});
			return c.json({
				success: true,
				id: inserted.id
			}, 201);
		}
	} catch (err) {
		console.error("Save template error:", err);
		return c.json({ message: "Failed to save template" }, 500);
	}
});
imports.delete("/templates/:id", requireRole("admin"), async (c) => {
	try {
		const id = parseInt(c.req.param("id"), 10);
		if (!await db.templates.get(id)) return c.json({ message: "Template not found" }, 404);
		await db.templates.delete(id);
		return c.json({ success: true });
	} catch (err) {
		console.error("Delete template error:", err);
		return c.json({ message: "Failed to delete template" }, 500);
	}
});
imports.post("/upload", async (c) => {
	try {
		const body = await c.req.parseBody();
		const file = body.file;
		const templateId = parseInt(body.template_id, 10);
		if (!file || !templateId) return c.json({ message: "Excel file and template selection are required" }, 400);
		const template = await db.templates.get(templateId);
		if (!template) return c.json({ message: "Template not found" }, 404);
		const mapping = JSON.parse(template.column_mapping);
		const catalog = await db.products.list();
		const skuMappings = await db.skuMappings.list();
		const arrayBuffer = await file.arrayBuffer();
		const parsedRows = await parseExcel(Buffer.from(arrayBuffer), mapping);
		const previewOrders = [];
		let flaggedRowsCount = 0;
		for (const row of parsedRows) {
			if (!row.order_id) continue;
			const isDuplicate = !!await db.orders.getByOrderId(row.order_id);
			const orderStatusNorm = String(row.order_status).toLowerCase();
			const needsReview = orderStatusNorm.includes("batal") || orderStatusNorm.includes("cancel");
			const systemStatus = needsReview ? "needs_review" : "normal";
			if (needsReview) flaggedRowsCount++;
			const promoRes = extractSameProductPromo(row.product_name_raw);
			const packRes = extractPackMultiplier(promoRes.cleanText);
			const cleanedText = packRes.cleanText;
			const baseMultiplier = promoRes.promoMultiplier * packRes.packMultiplier;
			const totalQuantity = row.quantity * baseMultiplier;
			let suggestedSplits = [];
			let resolvedDirectly = false;
			const promoSplits = resolvePromoProductToBaseItems(row.sku_ref, row.product_name_raw, row.quantity, catalog, skuMappings);
			if (promoSplits) {
				suggestedSplits = promoSplits;
				resolvedDirectly = true;
			}
			if (!resolvedDirectly && row.sku_ref && String(row.sku_ref).trim() !== "") {
				const refSku = String(row.sku_ref).trim().toLowerCase();
				const matchedProduct = catalog.find((p) => p.model.toLowerCase() === refSku);
				if (matchedProduct) {
					suggestedSplits.push({
						product_id: matchedProduct.id,
						product_name: matchedProduct.name,
						model: matchedProduct.model,
						quantity: totalQuantity,
						parse_source: "direct",
						original_text: row.product_name_raw
					});
					resolvedDirectly = true;
				}
			}
			if (!resolvedDirectly) {
				const aliasProductId = await db.aliases.get(cleanedText);
				if (aliasProductId) {
					const matchedProduct = catalog.find((p) => p.id === aliasProductId);
					if (matchedProduct) {
						suggestedSplits.push({
							product_id: matchedProduct.id,
							product_name: matchedProduct.name,
							model: matchedProduct.model,
							quantity: totalQuantity,
							parse_source: "alias",
							original_text: row.product_name_raw
						});
						resolvedDirectly = true;
					}
				}
			}
			if (!resolvedDirectly) suggestedSplits = parseAmbiguousDescription(row.product_name_raw, row.quantity, catalog);
			const hasAmbiguous = suggestedSplits.some((s) => s.product_id === null) || suggestedSplits.length > 1;
			previewOrders.push({
				order_id: row.order_id,
				resi_number: row.resi_number || "",
				product_name_raw: row.product_name_raw,
				sku_ref: row.sku_ref || "",
				quantity: row.quantity,
				order_status: row.order_status,
				customer_name: row.customer_name || "",
				expedition: row.expedition || "",
				order_date: row.order_date || "",
				price: row.price || 0,
				system_status: systemStatus,
				is_duplicate: isDuplicate,
				has_ambiguous: hasAmbiguous,
				splits: suggestedSplits
			});
		}
		if (previewOrders.length === 0) return c.json({ message: "No valid orders found in the uploaded file" }, 400);
		const user = c.get("user");
		const oldSessions = await db.sessions.list();
		for (const s of oldSessions) if (s.status === "previewing") await db.sessions.update(s.id, {
			status: "cancelled",
			orders_data: null
		});
		const insertedSession = await db.sessions.insert({
			template_id: templateId,
			user_id: user.id,
			filename: file.name,
			status: "previewing",
			total_rows: previewOrders.length,
			flagged_rows: flaggedRowsCount,
			orders_data: JSON.stringify(previewOrders)
		});
		return c.json({
			session_id: insertedSession.id,
			filename: file.name,
			total_rows: previewOrders.length,
			flagged_rows: flaggedRowsCount,
			orders: previewOrders
		});
	} catch (err) {
		console.error("Excel upload error:", err);
		return c.json({ message: "Failed to process Excel file" }, 500);
	}
});
imports.post("/confirm", async (c) => {
	try {
		const { session_id, orders } = await c.req.json();
		if (!session_id || !orders || !Array.isArray(orders)) return c.json({ message: "Session ID and confirmed orders list are required" }, 400);
		const session = await db.sessions.get(session_id);
		if (!session || session.status !== "previewing") return c.json({ message: "Invalid or expired import session" }, 404);
		const user = c.get("user");
		let appliedCount = 0;
		let flaggedCount = 0;
		for (const order of orders) {
			const orderRecordId = (await db.orders.insert({
				import_session_id: session_id,
				order_id: order.order_id,
				resi_number: order.resi_number || null,
				product_name_raw: order.product_name_raw,
				quantity: order.quantity,
				order_status: order.order_status,
				customer_name: order.customer_name || null,
				expedition: order.expedition || null,
				order_date: order.order_date || null,
				price: order.price,
				system_status: order.system_status
			})).id;
			if (order.system_status === "needs_review") flaggedCount++;
			if (order.splits && Array.isArray(order.splits)) for (const split of order.splits) {
				await db.orderItems.insert({
					order_id: orderRecordId,
					product_id: split.product_id,
					quantity: split.quantity,
					parse_source: split.parse_source || "direct",
					original_text: split.original_text || order.product_name_raw,
					is_confirmed: split.product_id ? 1 : 0
				});
				if (split.parse_source === "manual" && split.product_id && split.original_text) {
					const packRes = extractPackMultiplier(extractSameProductPromo(split.original_text).cleanText);
					await db.aliases.set(packRes.cleanText, split.product_id);
				}
				if (order.system_status === "normal" && split.product_id) {
					await db.movements.insert({
						product_id: split.product_id,
						quantity_change: -split.quantity,
						movement_type: "sale",
						reference: `Order ID: ${order.order_id}`,
						user_id: user.id
					});
					const prod = await db.products.get(split.product_id);
					if (prod) await db.products.update(split.product_id, { current_stock: prod.current_stock - split.quantity });
				}
			}
			appliedCount++;
		}
		await db.sessions.update(session_id, {
			status: "applied",
			applied_rows: appliedCount,
			flagged_rows: flaggedCount,
			orders_data: null
		});
		return c.json({
			success: true,
			applied_rows: appliedCount,
			flagged_rows: flaggedCount
		});
	} catch (err) {
		console.error("Confirm import error:", err);
		return c.json({ message: "Failed to apply import changes" }, 500);
	}
});
imports.post("/cancel", async (c) => {
	try {
		const { session_id } = await c.req.json();
		if (!session_id) return c.json({ message: "Session ID is required" }, 400);
		await db.sessions.update(parseInt(session_id, 10), {
			status: "cancelled",
			orders_data: null
		});
		return c.json({ success: true });
	} catch (err) {
		console.error("Cancel import error:", err);
		return c.json({ message: "Failed to cancel session" }, 500);
	}
});
imports.get("/active-session", async (c) => {
	try {
		const active = (await db.sessions.list()).find((s) => s.status === "previewing");
		if (active) return c.json({
			session_id: active.id,
			filename: active.filename,
			total_rows: active.total_rows,
			flagged_rows: active.flagged_rows,
			orders: JSON.parse(active.orders_data || "[]")
		});
		return c.json(null);
	} catch (err) {
		console.error("Get active session error:", err);
		return c.json({ message: "Failed to retrieve active session" }, 500);
	}
});
imports.post("/active-session/sync", async (c) => {
	try {
		const { session_id, orders } = await c.req.json();
		if (!session_id || !orders) return c.json({ message: "Session ID and orders are required" }, 400);
		await db.sessions.update(parseInt(session_id, 10), { orders_data: JSON.stringify(orders) });
		return c.json({ success: true });
	} catch (err) {
		console.error("Sync active session error:", err);
		return c.json({ message: "Failed to sync session data" }, 500);
	}
});
imports.get("/sessions", async (c) => {
	try {
		const sessionsList = await db.sessions.list();
		const templatesList = await db.templates.list();
		const usersList = await db.users.list();
		const templateMap = new Map(templatesList.map((t) => [t.id, t]));
		const userMap = new Map(usersList.map((u) => [u.id, u]));
		const joined = sessionsList.map((s) => {
			const template = templateMap.get(s.template_id);
			const user = userMap.get(s.user_id);
			return {
				...s,
				template_name: template ? template.name : null,
				username: user ? user.username : null
			};
		});
		joined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
		const limited = joined.slice(0, 10);
		return c.json(limited);
	} catch (err) {
		console.error("Get sessions error:", err);
		return c.json({ message: "Failed to retrieve sessions history" }, 500);
	}
});
imports.get("/sku-mappings", async (c) => {
	try {
		const list = await db.skuMappings.list();
		return c.json(list);
	} catch (err) {
		console.error("Get sku mappings error:", err);
		return c.json({ message: "Failed to retrieve SKU mappings" }, 500);
	}
});
imports.post("/sku-mappings", requireRole("admin"), async (c) => {
	try {
		const { sku_code, product_id, quantity } = await c.req.json();
		if (!sku_code || !product_id || !quantity) return c.json({ message: "sku_code, product_id, and quantity are required" }, 400);
		await db.skuMappings.insert({
			sku_code,
			product_id,
			quantity
		});
		return c.json({ success: true });
	} catch (err) {
		console.error("Save sku mapping error:", err);
		return c.json({ message: "Failed to save SKU mapping" }, 500);
	}
});
imports.delete("/sku-mappings", requireRole("admin"), async (c) => {
	try {
		const { sku_code, product_id } = await c.req.json();
		if (!sku_code || !product_id) return c.json({ message: "sku_code and product_id are required" }, 400);
		await db.skuMappings.delete(sku_code, product_id);
		return c.json({ success: true });
	} catch (err) {
		console.error("Delete sku mapping error:", err);
		return c.json({ message: "Failed to delete SKU mapping" }, 500);
	}
});
//#endregion
//#region src/routes/review.js
var review = new Hono();
review.use("*", requireAuth);
review.get("/orders", async (c) => {
	try {
		const ordersList = await db.orders.list();
		const orderItemsList = await db.orderItems.list();
		const productsList = await db.products.list();
		const productMap = new Map(productsList.map((p) => [p.id, p]));
		const itemsByOrder = /* @__PURE__ */ new Map();
		for (const item of orderItemsList) {
			if (!itemsByOrder.has(item.order_id)) itemsByOrder.set(item.order_id, []);
			const prod = item.product_id ? productMap.get(item.product_id) : null;
			itemsByOrder.get(item.order_id).push({
				id: item.id,
				product_id: item.product_id,
				quantity: item.quantity,
				is_confirmed: item.is_confirmed,
				product_name: prod ? prod.name : "Unmapped Product",
				product_model: prod ? prod.model : ""
			});
		}
		const filtered = ordersList.filter((o) => o.system_status === "needs_review").map((o) => ({
			...o,
			items: itemsByOrder.get(o.id) || []
		}));
		filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
		return c.json(filtered);
	} catch (err) {
		console.error("Get review orders error:", err);
		return c.json({ message: "Failed to retrieve orders needing review" }, 500);
	}
});
review.post("/resolve", async (c) => {
	try {
		const { order_id, resolution, resolution_notes } = await c.req.json();
		if (!order_id || !resolution) return c.json({ message: "Order ID and resolution selection are required" }, 400);
		if (![
			"returned",
			"lost",
			"investigating"
		].includes(resolution)) return c.json({ message: "Invalid resolution option" }, 400);
		const orderIdNum = parseInt(order_id, 10);
		const order = await db.orders.get(orderIdNum);
		if (!order || order.system_status !== "needs_review") return c.json({ message: "Order not found or already resolved" }, 404);
		const user = c.get("user");
		if (resolution === "investigating") {
			await db.orders.update(orderIdNum, {
				resolution: "investigating",
				resolution_notes: resolution_notes || ""
			});
			return c.json({
				success: true,
				status: "needs_review"
			});
		}
		const items = await db.orderItems.getByOrderId(orderIdNum);
		if (resolution === "lost") {
			for (const item of items) if (item.product_id) {
				await db.movements.insert({
					product_id: item.product_id,
					quantity_change: -item.quantity,
					movement_type: "write_off",
					reference: `Lost Order ID: ${order.order_id}`,
					user_id: user.id
				});
				const prod = await db.products.get(item.product_id);
				if (prod) await db.products.update(item.product_id, { current_stock: prod.current_stock - item.quantity });
			}
		} else if (resolution === "returned") {
			for (const item of items) if (item.product_id) await db.movements.insert({
				product_id: item.product_id,
				quantity_change: 0,
				movement_type: "return",
				reference: `Returned Order ID: ${order.order_id} (No stock adjustment needed)`,
				user_id: user.id
			});
		}
		await db.orders.update(orderIdNum, {
			system_status: "resolved",
			resolution,
			resolution_notes: resolution_notes || "",
			resolved_at: (/* @__PURE__ */ new Date()).toISOString()
		});
		return c.json({
			success: true,
			status: "resolved"
		});
	} catch (err) {
		console.error("Resolve order error:", err);
		return c.json({ message: "Failed to resolve order" }, 500);
	}
});
review.get("/ambiguous", async (c) => {
	try {
		const orderItemsList = await db.orderItems.list();
		const ordersList = await db.orders.list();
		const orderMap = new Map(ordersList.map((o) => [o.id, o]));
		const filtered = orderItemsList.filter((oi) => oi.is_confirmed === 0).map((oi) => {
			const order = orderMap.get(oi.order_id);
			return {
				...oi,
				order_id: order ? order.order_id : null,
				product_name_raw: order ? order.product_name_raw : null,
				order_qty: order ? order.quantity : null,
				customer_name: order ? order.customer_name : null,
				order_date: order ? order.order_date : null,
				created_at: order ? order.created_at : oi.created_at
			};
		});
		filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
		return c.json(filtered);
	} catch (err) {
		console.error("Get ambiguous items error:", err);
		return c.json({ message: "Failed to retrieve ambiguous items" }, 500);
	}
});
review.post("/confirm-split", async (c) => {
	try {
		const { item_id, product_id, quantity } = await c.req.json();
		if (!item_id || !product_id || !quantity) return c.json({ message: "Item ID, product selection, and quantity are required" }, 400);
		const itemIdNum = parseInt(item_id, 10);
		const productIdNum = parseInt(product_id, 10);
		const qty = parseInt(quantity, 10);
		const item = await db.orderItems.get(itemIdNum);
		if (!item || item.is_confirmed === 1) return c.json({ message: "Item not found or already confirmed" }, 404);
		const order = await db.orders.get(item.order_id);
		if (!order) return c.json({ message: "Order not found" }, 404);
		const user = c.get("user");
		await db.orderItems.update(itemIdNum, {
			product_id: productIdNum,
			quantity: qty,
			is_confirmed: 1
		});
		if (order.system_status === "normal") {
			await db.movements.insert({
				product_id: productIdNum,
				quantity_change: -qty,
				movement_type: "sale",
				reference: `Confirmed Split Order: ${order.order_id}`,
				user_id: user.id
			});
			const prod = await db.products.get(productIdNum);
			if (prod) await db.products.update(productIdNum, { current_stock: prod.current_stock - qty });
		}
		return c.json({ success: true });
	} catch (err) {
		console.error("Confirm split error:", err);
		return c.json({ message: "Failed to confirm split mapping" }, 500);
	}
});
//#endregion
//#region src/routes/dashboard.js
var dashboard = new Hono();
dashboard.use("*", requireAuth);
dashboard.get("/stats", async (c) => {
	try {
		const storage = getActiveStorage();
		const totalProducts = (await storage.query("SELECT COUNT(*) AS count FROM products"))[0]?.count || 0;
		const lowStockCount = (await storage.query("SELECT COUNT(*) AS count FROM products WHERE current_stock <= low_stock_threshold"))[0]?.count || 0;
		const pendingReviewCount = (await storage.query("SELECT COUNT(*) AS count FROM orders WHERE system_status = 'needs_review'"))[0]?.count || 0;
		const ambiguousCount = (await storage.query("SELECT COUNT(*) AS count FROM order_items WHERE is_confirmed = 0"))[0]?.count || 0;
		const recentReviews = await storage.query(`SELECT id, order_id, product_name_raw, quantity, expedition 
       FROM orders 
       WHERE system_status = 'needs_review' 
       ORDER BY created_at DESC 
       LIMIT 5`);
		const recentImports = await storage.query(`SELECT s.id, s.template_id, s.user_id, s.filename, s.status, s.total_rows, s.applied_rows, s.flagged_rows, s.orders_data, s.created_at, t.name AS template_name 
       FROM import_sessions s 
       LEFT JOIN import_templates t ON s.template_id = t.id 
       ORDER BY s.created_at DESC 
       LIMIT 5`);
		return c.json({
			total_products: totalProducts,
			low_stock_count: lowStockCount,
			pending_review_count: pendingReviewCount,
			ambiguous_count: ambiguousCount,
			recent_reviews: recentReviews,
			recent_imports: recentImports
		});
	} catch (err) {
		console.error("Dashboard stats retrieval error:", err);
		return c.json({ message: "Failed to retrieve dashboard statistics" }, 500);
	}
});
//#endregion
//#region src/routes/opname.js
var opname = new Hono();
opname.use("*", requireAuth);
opname.get("/", async (c) => {
	try {
		const opnamesList = await db.opnames.list();
		const usersList = await db.users.list();
		const itemsList = await db.opnameItems.list();
		const userMap = new Map(usersList.map((u) => [u.id, u]));
		const countMap = /* @__PURE__ */ new Map();
		for (const item of itemsList) countMap.set(item.opname_id, (countMap.get(item.opname_id) || 0) + 1);
		const joined = opnamesList.map((so) => {
			const user = userMap.get(so.user_id);
			return {
				...so,
				username: user ? user.username : null,
				items_count: countMap.get(so.id) || 0
			};
		});
		joined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
		return c.json(joined);
	} catch (err) {
		console.error("List stock opnames error:", err);
		return c.json({ message: "Failed to retrieve stock opnames" }, 500);
	}
});
opname.get("/:id", async (c) => {
	try {
		const id = parseInt(c.req.param("id"), 10);
		if (isNaN(id)) return c.json({ message: "Invalid opname ID" }, 400);
		const report = await db.opnames.get(id);
		if (!report) return c.json({ message: "Stock opname report not found" }, 404);
		const user = await db.users.get(report.user_id);
		const opnameItemsList = await db.opnameItems.getByOpnameId(id);
		const productsList = await db.products.list();
		const productMap = new Map(productsList.map((p) => [p.id, p]));
		const joinedItems = opnameItemsList.map((soi) => {
			const prod = productMap.get(soi.product_id);
			return {
				...soi,
				name: prod ? prod.name : null,
				model: prod ? prod.model : null
			};
		});
		return c.json({
			...report,
			username: user ? user.username : null,
			items: joinedItems
		});
	} catch (err) {
		console.error("Get stock opname report error:", err);
		return c.json({ message: "Failed to retrieve stock opname report" }, 500);
	}
});
opname.post("/", async (c) => {
	try {
		const { notes, items } = await c.req.json();
		const user = c.get("user");
		if (!items || !Array.isArray(items) || items.length === 0) return c.json({ message: "Items are required" }, 400);
		for (const item of items) {
			const { product_id, physical_stock } = item;
			const prodId = parseInt(product_id, 10);
			const physStock = parseInt(physical_stock, 10);
			if (isNaN(prodId) || isNaN(physStock) || physStock < 0) return c.json({ message: "Invalid product_id or physical_stock" }, 400);
		}
		const opnameId = (await db.opnames.insert({
			user_id: user.id,
			notes: notes || ""
		})).id;
		for (const item of items) {
			const { product_id, physical_stock } = item;
			const prodId = parseInt(product_id, 10);
			const physStock = parseInt(physical_stock, 10);
			const product = await db.products.get(prodId);
			if (!product) throw new Error(`Product not found with ID ${prodId}`);
			const systemStock = product.current_stock;
			const variance = physStock - systemStock;
			await db.opnameItems.insert({
				opname_id: opnameId,
				product_id: prodId,
				system_stock: systemStock,
				physical_stock: physStock,
				variance
			});
			await db.products.update(prodId, { current_stock: physStock });
			await db.movements.insert({
				product_id: prodId,
				quantity_change: variance,
				movement_type: "manual_adjust",
				reference: `Stock Opname #${opnameId}`,
				user_id: user.id
			});
		}
		return c.json({
			success: true,
			id: opnameId
		}, 201);
	} catch (err) {
		console.error("Create stock opname error:", err);
		return c.json({ message: err.message || "Failed to create stock opname" }, 500);
	}
});
//#endregion
//#region src/db/schema.sql.js
var schemaSql = `
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'staff')),
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    model TEXT NOT NULL,
    master_sku TEXT,
    description TEXT,
    current_stock INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 10,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS product_aliases (
    clean_text TEXT PRIMARY KEY,
    product_id INTEGER NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS import_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    column_mapping TEXT NOT NULL, -- JSON string
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS import_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER,
    user_id INTEGER,
    filename TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'previewing', 'applied', 'cancelled')),
    total_rows INTEGER DEFAULT 0,
    applied_rows INTEGER DEFAULT 0,
    flagged_rows INTEGER DEFAULT 0,
    orders_data TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (template_id) REFERENCES import_templates(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    import_session_id INTEGER NOT NULL,
    order_id TEXT NOT NULL,
    resi_number TEXT,
    product_name_raw TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    order_status TEXT NOT NULL,
    customer_name TEXT,
    expedition TEXT,
    order_date TEXT,
    price REAL DEFAULT 0,
    system_status TEXT NOT NULL CHECK(system_status IN ('normal', 'needs_review', 'resolved')),
    resolution TEXT CHECK(resolution IN ('returned', 'lost', 'investigating')),
    resolution_notes TEXT,
    resolved_at TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (import_session_id) REFERENCES import_sessions(id)
);

CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER,
    quantity INTEGER NOT NULL,
    parse_source TEXT NOT NULL CHECK(parse_source IN ('direct', 'auto_split')),
    original_text TEXT,
    is_confirmed INTEGER DEFAULT 1, -- 0 = pending review, 1 = confirmed
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    quantity_change INTEGER NOT NULL, -- negative for sales/loss, positive for returns/adjustments
    movement_type TEXT NOT NULL CHECK(movement_type IN ('sale', 'return', 'write_off', 'manual_adjust', 'initial')),
    reference TEXT, -- order_id, import_session_id, or description
    user_id INTEGER,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS stock_opnames (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS stock_opname_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    opname_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    system_stock INTEGER NOT NULL,
    physical_stock INTEGER NOT NULL,
    variance INTEGER NOT NULL,
    FOREIGN KEY (opname_id) REFERENCES stock_opnames(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS sku_mappings (
    sku_code TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    PRIMARY KEY (sku_code, product_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
`;
//#endregion
//#region src/db/local_sqlite.js
var localSqliteDb = null;
async function getLocalSqliteDb() {
	if (localSqliteDb) return localSqliteDb;
	localSqliteDb = new (await (initSqlJs())).Database();
	localSqliteDb.run(schemaSql);
	return localSqliteDb;
}
var localSqliteStore = {
	type: "local",
	async query(sql, params = []) {
		const stmt = (await getLocalSqliteDb()).prepare(sql);
		stmt.bind(params);
		const rows = [];
		while (stmt.step()) rows.push(stmt.getAsObject());
		stmt.free();
		return rows;
	},
	async execute(sql, params = []) {
		const db = await getLocalSqliteDb();
		db.run(sql, params);
		const stmt = db.prepare("SELECT last_insert_rowid() AS id");
		stmt.step();
		const result = stmt.getAsObject();
		stmt.free();
		return { lastInsertRowid: result ? result.id : null };
	},
	async executeTransaction(queries) {
		const db = await getLocalSqliteDb();
		db.run("BEGIN TRANSACTION");
		const results = [];
		try {
			for (const q of queries) {
				db.run(q.sql, q.params || []);
				const stmt = db.prepare("SELECT last_insert_rowid() AS id");
				stmt.step();
				const res = stmt.getAsObject();
				stmt.free();
				results.push(res);
			}
			db.run("COMMIT");
		} catch (err) {
			db.run("ROLLBACK");
			throw err;
		}
		return results;
	},
	async clearDb() {
		localSqliteDb = null;
	},
	async deleteAll() {
		await this.clearDb();
	}
};
function getLocalStore() {
	return localSqliteStore;
}
//#endregion
//#region src/app.js
var app = new Hono();
app.use("*", async (c, next) => {
	c.header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
	c.header("Pragma", "no-cache");
	c.header("Expires", "0");
	await next();
});
app.use("*", async (c, next) => {
	let store;
	let isCloudflare = false;
	try {
		if (c.env && c.env.STOCK_ROOM) isCloudflare = true;
	} catch (e) {}
	if (isCloudflare) {
		const id = c.env.STOCK_ROOM.idFromName("global");
		const stub = c.env.STOCK_ROOM.get(id);
		store = {
			type: "cloudflare",
			storage: {
				async query(sql, params) {
					return await stub.query(sql, params);
				},
				async execute(sql, params) {
					return await stub.execute(sql, params);
				},
				async executeTransaction(queries) {
					return await stub.executeTransaction(queries);
				}
			},
			env: c.env
		};
	} else store = {
		type: "local",
		storage: getLocalStore(),
		env: c.env
	};
	return storageContext.run(store, async () => {
		await seedIfNeeded(store.storage);
		return await next();
	});
});
app.route("/api/auth", auth);
app.route("/api/products", products);
app.route("/api/import", imports);
app.route("/api/review", review);
app.route("/api/dashboard", dashboard);
app.route("/api/stock/opname", opname);
app.get("/api/health", (c) => {
	return c.json({
		status: "ok",
		time: (/* @__PURE__ */ new Date()).toISOString()
	});
});
//#endregion
//#region app/routes/api/$.jsx
var serve = async ({ request }) => {
	return app.fetch(request);
};
var Route = createFileRoute("/api/$")({ server: { handlers: {
	GET: serve,
	POST: serve,
	PUT: serve,
	DELETE: serve,
	PATCH: serve,
	OPTIONS: serve,
	HEAD: serve
} } });
//#endregion
//#region app/routeTree.gen.ts
var StockHistoryRoute = Route$7.update({
	id: "/stock-history",
	path: "/stock-history",
	getParentRoute: () => Route$8
});
var SettingsRoute = Route$6.update({
	id: "/settings",
	path: "/settings",
	getParentRoute: () => Route$8
});
var ReviewRoute = Route$5.update({
	id: "/review",
	path: "/review",
	getParentRoute: () => Route$8
});
var ProductsRoute = Route$4.update({
	id: "/products",
	path: "/products",
	getParentRoute: () => Route$8
});
var OpnameRoute = Route$3.update({
	id: "/opname",
	path: "/opname",
	getParentRoute: () => Route$8
});
var ImportRoute = Route$2.update({
	id: "/import",
	path: "/import",
	getParentRoute: () => Route$8
});
var rootRouteChildren = {
	IndexRoute: Route$1.update({
		id: "/",
		path: "/",
		getParentRoute: () => Route$8
	}),
	ImportRoute,
	OpnameRoute,
	ProductsRoute,
	ReviewRoute,
	SettingsRoute,
	StockHistoryRoute,
	ApiSplatRoute: Route.update({
		id: "/api/$",
		path: "/api/$",
		getParentRoute: () => Route$8
	})
};
var routeTree = Route$8._addFileChildren(rootRouteChildren)._addFileTypes();
//#endregion
//#region app/router.jsx
function createRouter() {
	return createRouter$1({
		routeTree,
		scrollRestoration: true
	});
}
var getRouter = createRouter;
//#endregion
export { findFuzzyProductInCatalog as a, parseAmbiguousDescription as c, createRouter, getActiveStorage as d, storageContext as f, getRouter, extractSameProductPromo as i, resolvePromoProductToBaseItems as l, PRODUCT_ALIASES as n, findProductInCatalog as o, extractPackMultiplier as r, getSorensenDiceSimilarity as s, BUNDLE_MAPPINGS as t, getActiveEnv as u };
