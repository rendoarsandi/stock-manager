import { n as useAuth } from "./AuthContext-DG3cR4qU.js";
import { t as showToast } from "./toast-kJrtdafl.js";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { jsxDEV } from "react/jsx-dev-runtime";
//#region app/pages/Settings.jsx
var _jsxFileName = "/data/data/com.termux/files/home/stock-manager/app/pages/Settings.jsx";
function Settings() {
	const queryClient = useQueryClient();
	const { currentUser } = useAuth();
	const isAdmin = currentUser?.role === "admin";
	const [activeModal, setActiveModal] = useState(null);
	const [modalTarget, setModalTarget] = useState(null);
	const [templateName, setTemplateName] = useState("");
	const [colOrderId, setColOrderId] = useState("");
	const [colResiNumber, setColResiNumber] = useState("");
	const [colProductName, setColProductName] = useState("");
	const [colQuantity, setColQuantity] = useState("");
	const [colOrderStatus, setColOrderStatus] = useState("");
	const [colCustomerName, setColCustomerName] = useState("");
	const [colExpedition, setColExpedition] = useState("");
	const [colOrderDate, setColOrderDate] = useState("");
	const [colPrice, setColPrice] = useState("");
	const [colSkuRef, setColSkuRef] = useState("");
	const [userUsername, setUserUsername] = useState("");
	const [userPassword, setUserPassword] = useState("");
	const [userRole, setUserRole] = useState("staff");
	const [skuCode, setSkuCode] = useState("");
	const [skuProductId, setSkuProductId] = useState("");
	const [skuQuantity, setSkuQuantity] = useState(1);
	const { data: templates = [], isLoading: isLoadingTemplates } = useQuery({
		queryKey: ["settingsTemplates"],
		queryFn: async () => {
			const res = await fetch("/api/import/templates");
			if (!res.ok) throw new Error("Failed to fetch templates");
			return res.json();
		}
	});
	const { data: skuMappings = [], isLoading: isLoadingSkuMappings } = useQuery({
		queryKey: ["settingsSkuMappings"],
		queryFn: async () => {
			const res = await fetch("/api/import/sku-mappings");
			if (!res.ok) throw new Error("Failed to fetch SKU mappings");
			return res.json();
		}
	});
	const { data: users = [], isLoading: isLoadingUsers } = useQuery({
		queryKey: ["settingsUsers"],
		queryFn: async () => {
			const res = await fetch("/api/auth/users");
			if (!res.ok) throw new Error("Failed to fetch users");
			return res.json();
		},
		enabled: isAdmin
	});
	const { data: products = [] } = useQuery({
		queryKey: ["settingsProducts"],
		queryFn: async () => {
			const res = await fetch("/api/products");
			if (!res.ok) throw new Error("Failed to fetch products");
			return res.json();
		}
	});
	const saveTemplateMutation = useMutation({
		mutationFn: async (payload) => {
			const res = await fetch("/api/import/templates", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload)
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.message || "Failed to save template");
			}
			return res.json();
		},
		onSuccess: () => {
			showToast("Success", "Template saved successfully", "success");
			queryClient.invalidateQueries({ queryKey: ["settingsTemplates"] });
			closeModal();
		},
		onError: (err) => {
			showToast("Error", err.message, "error");
		}
	});
	const deleteTemplateMutation = useMutation({
		mutationFn: async (id) => {
			const res = await fetch(`/api/import/templates/${id}`, { method: "DELETE" });
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.message || "Failed to delete template");
			}
			return res.json();
		},
		onSuccess: () => {
			showToast("Success", "Template deleted successfully", "success");
			queryClient.invalidateQueries({ queryKey: ["settingsTemplates"] });
		},
		onError: (err) => {
			showToast("Error", err.message, "error");
		}
	});
	const createUserMutation = useMutation({
		mutationFn: async (payload) => {
			const res = await fetch("/api/auth/users", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload)
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.message || "Failed to create user account");
			}
			return res.json();
		},
		onSuccess: () => {
			showToast("Success", "User account created successfully", "success");
			queryClient.invalidateQueries({ queryKey: ["settingsUsers"] });
			closeModal();
		},
		onError: (err) => {
			showToast("Error", err.message, "error");
		}
	});
	const deleteUserMutation = useMutation({
		mutationFn: async (id) => {
			const res = await fetch(`/api/auth/users/${id}`, { method: "DELETE" });
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.message || "Failed to delete user account");
			}
			return res.json();
		},
		onSuccess: () => {
			showToast("Success", "User account deleted successfully", "success");
			queryClient.invalidateQueries({ queryKey: ["settingsUsers"] });
		},
		onError: (err) => {
			showToast("Error", err.message, "error");
		}
	});
	const saveSkuMappingMutation = useMutation({
		mutationFn: async (payload) => {
			const res = await fetch("/api/import/sku-mappings", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload)
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.message || "Failed to save SKU mapping");
			}
			return res.json();
		},
		onSuccess: () => {
			showToast("Success", "SKU mapping saved successfully", "success");
			queryClient.invalidateQueries({ queryKey: ["settingsSkuMappings"] });
			closeModal();
		},
		onError: (err) => {
			showToast("Error", err.message, "error");
		}
	});
	const deleteSkuMappingMutation = useMutation({
		mutationFn: async (payload) => {
			const res = await fetch("/api/import/sku-mappings", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload)
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.message || "Failed to delete SKU mapping");
			}
			return res.json();
		},
		onSuccess: () => {
			showToast("Success", "SKU mapping deleted successfully", "success");
			queryClient.invalidateQueries({ queryKey: ["settingsSkuMappings"] });
		},
		onError: (err) => {
			showToast("Error", err.message, "error");
		}
	});
	const openTemplateModal = (template = null) => {
		if (!isAdmin) {
			showToast("Error", "Only admins can modify templates", "error");
			return;
		}
		setModalTarget(template);
		if (template) {
			setTemplateName(template.name || "");
			const mapping = template.column_mapping || {};
			setColOrderId(mapping.order_id || "");
			setColResiNumber(mapping.resi_number || "");
			setColProductName(mapping.product_name_raw || "");
			setColQuantity(mapping.quantity || "");
			setColOrderStatus(mapping.order_status || "");
			setColCustomerName(mapping.customer_name || "");
			setColExpedition(mapping.expedition || "");
			setColOrderDate(mapping.order_date || "");
			setColPrice(mapping.price || "");
			setColSkuRef(mapping.sku_ref || "");
		} else {
			setTemplateName("");
			setColOrderId("");
			setColResiNumber("");
			setColProductName("");
			setColQuantity("");
			setColOrderStatus("");
			setColCustomerName("");
			setColExpedition("");
			setColOrderDate("");
			setColPrice("");
			setColSkuRef("");
		}
		setActiveModal("template");
	};
	const openUserModal = () => {
		setUserUsername("");
		setUserPassword("");
		setUserRole("staff");
		setActiveModal("user");
	};
	const openSkuModal = () => {
		setSkuCode("");
		setSkuProductId("");
		setSkuQuantity(1);
		setActiveModal("sku");
	};
	const closeModal = () => {
		setActiveModal(null);
		setModalTarget(null);
	};
	const handleTemplateSubmit = (e) => {
		e.preventDefault();
		const payload = {
			name: templateName.trim(),
			column_mapping: {
				order_id: colOrderId.trim(),
				resi_number: colResiNumber.trim(),
				product_name_raw: colProductName.trim(),
				quantity: colQuantity.trim(),
				order_status: colOrderStatus.trim(),
				customer_name: colCustomerName.trim(),
				expedition: colExpedition.trim(),
				order_date: colOrderDate.trim(),
				price: colPrice.trim(),
				sku_ref: colSkuRef.trim()
			}
		};
		if (modalTarget) payload.id = modalTarget.id;
		saveTemplateMutation.mutate(payload);
	};
	const handleUserSubmit = (e) => {
		e.preventDefault();
		createUserMutation.mutate({
			username: userUsername.trim(),
			password: userPassword,
			role: userRole
		});
	};
	const handleSkuSubmit = (e) => {
		e.preventDefault();
		saveSkuMappingMutation.mutate({
			sku_code: skuCode.trim(),
			product_id: parseInt(skuProductId, 10),
			quantity: parseInt(skuQuantity, 10)
		});
	};
	const handleDeleteTemplate = (id) => {
		if (window.confirm("Are you sure you want to delete this template?")) deleteTemplateMutation.mutate(id);
	};
	const handleDeleteUser = (user) => {
		if (window.confirm(`Are you sure you want to delete user account "${user.username}"?`)) deleteUserMutation.mutate(user.id);
	};
	const handleDeleteSku = (mapping) => {
		if (window.confirm(`Are you sure you want to delete mapping for "${mapping.sku_code.toUpperCase()}"?`)) deleteSkuMappingMutation.mutate({
			sku_code: mapping.sku_code,
			product_id: mapping.product_id
		});
	};
	return /* @__PURE__ */ jsxDEV("div", {
		style: {
			display: "flex",
			flexDirection: "column",
			gap: "2rem"
		},
		children: [
			/* @__PURE__ */ jsxDEV("div", {
				className: "section-card",
				children: [/* @__PURE__ */ jsxDEV("div", {
					className: "section-header",
					children: [/* @__PURE__ */ jsxDEV("h2", { children: "Import Templates Mapping" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 335,
						columnNumber: 11
					}, this), isAdmin && /* @__PURE__ */ jsxDEV("button", {
						className: "btn btn-primary",
						onClick: () => openTemplateModal(),
						children: [/* @__PURE__ */ jsxDEV("svg", {
							viewBox: "0 0 24 24",
							fill: "none",
							stroke: "currentColor",
							children: /* @__PURE__ */ jsxDEV("path", { d: "M5 12h14M12 5v14" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 339,
								columnNumber: 17
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 338,
							columnNumber: 15
						}, this), "Create Template"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 337,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 334,
					columnNumber: 9
				}, this), /* @__PURE__ */ jsxDEV("div", {
					className: "table-wrapper",
					children: /* @__PURE__ */ jsxDEV("table", { children: [/* @__PURE__ */ jsxDEV("thead", { children: /* @__PURE__ */ jsxDEV("tr", { children: [
						/* @__PURE__ */ jsxDEV("th", { children: "ID" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 349,
							columnNumber: 17
						}, this),
						/* @__PURE__ */ jsxDEV("th", { children: "Template Name" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 350,
							columnNumber: 17
						}, this),
						/* @__PURE__ */ jsxDEV("th", { children: "Columns Mapped" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 351,
							columnNumber: 17
						}, this),
						isAdmin && /* @__PURE__ */ jsxDEV("th", { children: "Actions" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 352,
							columnNumber: 29
						}, this)
					] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 348,
						columnNumber: 15
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 347,
						columnNumber: 13
					}, this), /* @__PURE__ */ jsxDEV("tbody", {
						id: "templates-table-body",
						children: isLoadingTemplates ? /* @__PURE__ */ jsxDEV("tr", { children: /* @__PURE__ */ jsxDEV("td", {
							colSpan: isAdmin ? 4 : 3,
							style: {
								textAlign: "center",
								color: "var(--text-muted)"
							},
							children: "Loading templates..."
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 358,
							columnNumber: 19
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 357,
							columnNumber: 17
						}, this) : templates.length === 0 ? /* @__PURE__ */ jsxDEV("tr", { children: /* @__PURE__ */ jsxDEV("td", {
							colSpan: isAdmin ? 4 : 3,
							style: {
								textAlign: "center",
								color: "var(--text-muted)"
							},
							children: "No templates found."
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 364,
							columnNumber: 19
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 363,
							columnNumber: 17
						}, this) : templates.map((t) => {
							const mappingKeys = Object.entries(t.column_mapping).map(([k, v]) => `${k} → ${v}`).join(", ");
							return /* @__PURE__ */ jsxDEV("tr", { children: [
								/* @__PURE__ */ jsxDEV("td", { children: t.id }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 376,
									columnNumber: 23
								}, this),
								/* @__PURE__ */ jsxDEV("td", { children: /* @__PURE__ */ jsxDEV("strong", { children: t.name }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 377,
									columnNumber: 27
								}, this) }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 377,
									columnNumber: 23
								}, this),
								/* @__PURE__ */ jsxDEV("td", {
									style: {
										fontSize: "0.85rem",
										maxWidth: "400px",
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap"
									},
									title: JSON.stringify(t.column_mapping),
									children: mappingKeys
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 378,
									columnNumber: 23
								}, this),
								isAdmin && /* @__PURE__ */ jsxDEV("td", { children: /* @__PURE__ */ jsxDEV("div", {
									style: {
										display: "flex",
										gap: "0.5rem"
									},
									children: [/* @__PURE__ */ jsxDEV("button", {
										className: "btn btn-secondary btn-sm btn-edit-template",
										onClick: () => openTemplateModal(t),
										children: [/* @__PURE__ */ jsxDEV("svg", {
											viewBox: "0 0 24 24",
											fill: "none",
											stroke: "currentColor",
											children: /* @__PURE__ */ jsxDEV("path", { d: "M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 389,
												columnNumber: 33
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 388,
											columnNumber: 31
										}, this), "Edit"]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 387,
										columnNumber: 29
									}, this), /* @__PURE__ */ jsxDEV("button", {
										className: "btn btn-danger btn-sm btn-delete-template",
										onClick: () => handleDeleteTemplate(t.id),
										children: [/* @__PURE__ */ jsxDEV("svg", {
											viewBox: "0 0 24 24",
											fill: "none",
											stroke: "currentColor",
											children: /* @__PURE__ */ jsxDEV("path", { d: "M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" }, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 395,
												columnNumber: 33
											}, this)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 394,
											columnNumber: 31
										}, this), "Delete"]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 393,
										columnNumber: 29
									}, this)]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 386,
									columnNumber: 27
								}, this) }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 385,
									columnNumber: 25
								}, this)
							] }, t.id, true, {
								fileName: _jsxFileName,
								lineNumber: 375,
								columnNumber: 21
							}, this);
						})
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 355,
						columnNumber: 13
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 346,
						columnNumber: 11
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 345,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 333,
				columnNumber: 7
			}, this),
			isAdmin && /* @__PURE__ */ jsxDEV("div", {
				className: "section-card",
				id: "user-management-section",
				children: [/* @__PURE__ */ jsxDEV("div", {
					className: "section-header",
					children: [/* @__PURE__ */ jsxDEV("h2", { children: "User Accounts Management" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 415,
						columnNumber: 13
					}, this), /* @__PURE__ */ jsxDEV("button", {
						className: "btn btn-primary",
						onClick: openUserModal,
						children: [/* @__PURE__ */ jsxDEV("svg", {
							viewBox: "0 0 24 24",
							fill: "none",
							stroke: "currentColor",
							children: /* @__PURE__ */ jsxDEV("path", { d: "M5 12h14M12 5v14" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 418,
								columnNumber: 17
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 417,
							columnNumber: 15
						}, this), "Create Account"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 416,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 414,
					columnNumber: 11
				}, this), /* @__PURE__ */ jsxDEV("div", {
					className: "table-wrapper",
					children: /* @__PURE__ */ jsxDEV("table", { children: [/* @__PURE__ */ jsxDEV("thead", { children: /* @__PURE__ */ jsxDEV("tr", { children: [
						/* @__PURE__ */ jsxDEV("th", { children: "ID" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 427,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ jsxDEV("th", { children: "Username" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 428,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ jsxDEV("th", { children: "Role" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 429,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ jsxDEV("th", { children: "Created At" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 430,
							columnNumber: 19
						}, this),
						/* @__PURE__ */ jsxDEV("th", { children: "Actions" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 431,
							columnNumber: 19
						}, this)
					] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 426,
						columnNumber: 17
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 425,
						columnNumber: 15
					}, this), /* @__PURE__ */ jsxDEV("tbody", {
						id: "users-table-body",
						children: isLoadingUsers ? /* @__PURE__ */ jsxDEV("tr", { children: /* @__PURE__ */ jsxDEV("td", {
							colSpan: 5,
							style: {
								textAlign: "center",
								color: "var(--text-muted)"
							},
							children: "Loading users..."
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 437,
							columnNumber: 21
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 436,
							columnNumber: 19
						}, this) : users.map((u) => {
							const cleanStr = typeof u.created_at === "string" && !u.created_at.includes("T") ? u.created_at.replace(/-/g, "/") : u.created_at;
							const createdDate = new Date(cleanStr).toLocaleString();
							const isSelfOrMainAdmin = u.id === 1 || u.id === currentUser?.id;
							return /* @__PURE__ */ jsxDEV("tr", { children: [
								/* @__PURE__ */ jsxDEV("td", { children: u.id }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 449,
									columnNumber: 25
								}, this),
								/* @__PURE__ */ jsxDEV("td", { children: /* @__PURE__ */ jsxDEV("strong", { children: u.username }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 450,
									columnNumber: 29
								}, this) }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 450,
									columnNumber: 25
								}, this),
								/* @__PURE__ */ jsxDEV("td", { children: /* @__PURE__ */ jsxDEV("span", {
									className: `status-tag ${u.role === "admin" ? "info" : "success"}`,
									children: u.role.toUpperCase()
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 452,
									columnNumber: 27
								}, this) }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 451,
									columnNumber: 25
								}, this),
								/* @__PURE__ */ jsxDEV("td", { children: createdDate }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 456,
									columnNumber: 25
								}, this),
								/* @__PURE__ */ jsxDEV("td", { children: isSelfOrMainAdmin ? /* @__PURE__ */ jsxDEV("span", {
									style: {
										fontSize: "0.85rem",
										color: "var(--text-muted)"
									},
									children: "Protected"
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 459,
									columnNumber: 29
								}, this) : /* @__PURE__ */ jsxDEV("button", {
									className: "btn btn-danger btn-sm btn-delete-user",
									onClick: () => handleDeleteUser(u),
									children: [/* @__PURE__ */ jsxDEV("svg", {
										viewBox: "0 0 24 24",
										fill: "none",
										stroke: "currentColor",
										children: /* @__PURE__ */ jsxDEV("path", { d: "M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" }, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 463,
											columnNumber: 33
										}, this)
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 462,
										columnNumber: 31
									}, this), "Delete"]
								}, void 0, true, {
									fileName: _jsxFileName,
									lineNumber: 461,
									columnNumber: 29
								}, this) }, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 457,
									columnNumber: 25
								}, this)
							] }, u.id, true, {
								fileName: _jsxFileName,
								lineNumber: 448,
								columnNumber: 23
							}, this);
						})
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 434,
						columnNumber: 15
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 424,
						columnNumber: 13
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 423,
					columnNumber: 11
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 413,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ jsxDEV("div", {
				className: "section-card",
				children: [/* @__PURE__ */ jsxDEV("div", {
					className: "section-header",
					children: [/* @__PURE__ */ jsxDEV("h2", { children: "SKU & Bundle Mappings Master" }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 482,
						columnNumber: 11
					}, this), isAdmin && /* @__PURE__ */ jsxDEV("button", {
						className: "btn btn-primary",
						onClick: openSkuModal,
						children: [/* @__PURE__ */ jsxDEV("svg", {
							viewBox: "0 0 24 24",
							fill: "none",
							stroke: "currentColor",
							children: /* @__PURE__ */ jsxDEV("path", { d: "M5 12h14M12 5v14" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 486,
								columnNumber: 17
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 485,
							columnNumber: 15
						}, this), "Add SKU Mapping"]
					}, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 484,
						columnNumber: 13
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 481,
					columnNumber: 9
				}, this), /* @__PURE__ */ jsxDEV("div", {
					className: "table-wrapper",
					children: /* @__PURE__ */ jsxDEV("table", { children: [/* @__PURE__ */ jsxDEV("thead", { children: /* @__PURE__ */ jsxDEV("tr", { children: [
						/* @__PURE__ */ jsxDEV("th", { children: "SKU Code" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 496,
							columnNumber: 17
						}, this),
						/* @__PURE__ */ jsxDEV("th", { children: "Target Product" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 497,
							columnNumber: 17
						}, this),
						/* @__PURE__ */ jsxDEV("th", { children: "Model" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 498,
							columnNumber: 17
						}, this),
						/* @__PURE__ */ jsxDEV("th", { children: "Quantity" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 499,
							columnNumber: 17
						}, this),
						/* @__PURE__ */ jsxDEV("th", { children: "Actions" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 500,
							columnNumber: 17
						}, this)
					] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 495,
						columnNumber: 15
					}, this) }, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 494,
						columnNumber: 13
					}, this), /* @__PURE__ */ jsxDEV("tbody", {
						id: "sku-mappings-table-body",
						children: isLoadingSkuMappings ? /* @__PURE__ */ jsxDEV("tr", { children: /* @__PURE__ */ jsxDEV("td", {
							colSpan: 5,
							style: {
								textAlign: "center",
								color: "var(--text-muted)"
							},
							children: "Loading mappings..."
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 506,
							columnNumber: 19
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 505,
							columnNumber: 17
						}, this) : skuMappings.length === 0 ? /* @__PURE__ */ jsxDEV("tr", { children: /* @__PURE__ */ jsxDEV("td", {
							colSpan: 5,
							style: {
								textAlign: "center",
								color: "var(--text-muted)"
							},
							children: "No custom SKU mappings defined."
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 512,
							columnNumber: 19
						}, this) }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 511,
							columnNumber: 17
						}, this) : skuMappings.map((m, idx) => /* @__PURE__ */ jsxDEV("tr", { children: [
							/* @__PURE__ */ jsxDEV("td", { children: /* @__PURE__ */ jsxDEV("strong", { children: m.sku_code.toUpperCase() }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 519,
								columnNumber: 25
							}, this) }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 519,
								columnNumber: 21
							}, this),
							/* @__PURE__ */ jsxDEV("td", { children: m.product_name }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 520,
								columnNumber: 21
							}, this),
							/* @__PURE__ */ jsxDEV("td", { children: /* @__PURE__ */ jsxDEV("code", {
								className: "code-badge",
								children: m.product_model
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 521,
								columnNumber: 25
							}, this) }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 521,
								columnNumber: 21
							}, this),
							/* @__PURE__ */ jsxDEV("td", { children: [m.quantity, " Pcs"] }, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 522,
								columnNumber: 21
							}, this),
							/* @__PURE__ */ jsxDEV("td", { children: isAdmin ? /* @__PURE__ */ jsxDEV("button", {
								className: "btn btn-danger btn-sm btn-delete-sku",
								onClick: () => handleDeleteSku(m),
								children: [/* @__PURE__ */ jsxDEV("svg", {
									viewBox: "0 0 24 24",
									fill: "none",
									stroke: "currentColor",
									children: /* @__PURE__ */ jsxDEV("path", { d: "M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" }, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 527,
										columnNumber: 29
									}, this)
								}, void 0, false, {
									fileName: _jsxFileName,
									lineNumber: 526,
									columnNumber: 27
								}, this), "Delete"]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 525,
								columnNumber: 25
							}, this) : /* @__PURE__ */ jsxDEV("span", {
								style: {
									fontSize: "0.85rem",
									color: "var(--text-muted)"
								},
								children: "Protected"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 532,
								columnNumber: 25
							}, this) }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 523,
								columnNumber: 21
							}, this)
						] }, m.sku_code + "-" + m.product_id + "-" + idx, true, {
							fileName: _jsxFileName,
							lineNumber: 518,
							columnNumber: 19
						}, this))
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 503,
						columnNumber: 13
					}, this)] }, void 0, true, {
						fileName: _jsxFileName,
						lineNumber: 493,
						columnNumber: 11
					}, this)
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 492,
					columnNumber: 9
				}, this)]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 480,
				columnNumber: 7
			}, this),
			activeModal === "template" && /* @__PURE__ */ jsxDEV("div", {
				className: "modal-overlay",
				children: /* @__PURE__ */ jsxDEV("div", {
					className: "modal",
					style: { maxWidth: "550px" },
					children: [
						/* @__PURE__ */ jsxDEV("div", {
							className: "modal-header",
							children: [/* @__PURE__ */ jsxDEV("h3", { children: modalTarget ? "Edit Import Template" : "Create Import Template" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 548,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("button", {
								className: "modal-close",
								onClick: closeModal,
								children: "×"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 549,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 547,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("div", {
							className: "modal-body",
							children: /* @__PURE__ */ jsxDEV("form", {
								id: "modal-template-form",
								style: {
									display: "flex",
									flexDirection: "column",
									gap: "1rem",
									maxHeight: "60vh",
									overflowY: "auto",
									paddingRight: "0.5rem"
								},
								onSubmit: handleTemplateSubmit,
								children: [
									/* @__PURE__ */ jsxDEV("div", {
										className: "form-group",
										children: [/* @__PURE__ */ jsxDEV("label", {
											htmlFor: "t-name",
											children: "Template Name"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 554,
											columnNumber: 19
										}, this), /* @__PURE__ */ jsxDEV("input", {
											type: "text",
											id: "t-name",
											required: true,
											placeholder: "e.g. Shopee / Tokopedia",
											value: templateName,
											onChange: (e) => setTemplateName(e.target.value)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 555,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 553,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("h4", {
										style: {
											marginTop: "1rem",
											borderBottom: "1px solid var(--border-color)",
											paddingBottom: "0.5rem",
											color: "var(--accent-color)"
										},
										children: "Column Mapping Configuration"
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 565,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("p", {
										style: {
											fontSize: "0.8rem",
											color: "var(--text-muted)",
											marginBottom: "0.5rem"
										},
										children: "Enter the exact column names (headers) from your Excel spreadsheet mapping to the system fields."
									}, void 0, false, {
										fileName: _jsxFileName,
										lineNumber: 568,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("div", {
										className: "form-group",
										children: [/* @__PURE__ */ jsxDEV("label", {
											htmlFor: "m-order-id",
											children: "Order ID Column (Required)"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 573,
											columnNumber: 19
										}, this), /* @__PURE__ */ jsxDEV("input", {
											type: "text",
											id: "m-order-id",
											required: true,
											placeholder: "e.g. No. Pesanan or Nomor Invoice",
											value: colOrderId,
											onChange: (e) => setColOrderId(e.target.value)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 574,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 572,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("div", {
										className: "form-group",
										children: [/* @__PURE__ */ jsxDEV("label", {
											htmlFor: "m-resi-number",
											children: "Resi / Tracking Number Column"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 585,
											columnNumber: 19
										}, this), /* @__PURE__ */ jsxDEV("input", {
											type: "text",
											id: "m-resi-number",
											placeholder: "e.g. No. Resi or Nomor Resi",
											value: colResiNumber,
											onChange: (e) => setColResiNumber(e.target.value)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 586,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 584,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("div", {
										className: "form-group",
										children: [/* @__PURE__ */ jsxDEV("label", {
											htmlFor: "m-product-name",
											children: "Product Name / Description Column (Required)"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 596,
											columnNumber: 19
										}, this), /* @__PURE__ */ jsxDEV("input", {
											type: "text",
											id: "m-product-name",
											required: true,
											placeholder: "e.g. Nama Produk",
											value: colProductName,
											onChange: (e) => setColProductName(e.target.value)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 597,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 595,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("div", {
										className: "form-group",
										children: [/* @__PURE__ */ jsxDEV("label", {
											htmlFor: "m-quantity",
											children: "Quantity Column (Required)"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 608,
											columnNumber: 19
										}, this), /* @__PURE__ */ jsxDEV("input", {
											type: "text",
											id: "m-quantity",
											required: true,
											placeholder: "e.g. Jumlah or Jumlah Produk",
											value: colQuantity,
											onChange: (e) => setColQuantity(e.target.value)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 609,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 607,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("div", {
										className: "form-group",
										children: [/* @__PURE__ */ jsxDEV("label", {
											htmlFor: "m-order-status",
											children: "Order Status Column (Required)"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 620,
											columnNumber: 19
										}, this), /* @__PURE__ */ jsxDEV("input", {
											type: "text",
											id: "m-order-status",
											required: true,
											placeholder: "e.g. Status Pesanan or Status Terakhir",
											value: colOrderStatus,
											onChange: (e) => setColOrderStatus(e.target.value)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 621,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 619,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("div", {
										className: "form-group",
										children: [/* @__PURE__ */ jsxDEV("label", {
											htmlFor: "m-customer-name",
											children: "Customer Username / Name Column"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 632,
											columnNumber: 19
										}, this), /* @__PURE__ */ jsxDEV("input", {
											type: "text",
											id: "m-customer-name",
											placeholder: "e.g. Username Pembeli or Nama Pembeli",
											value: colCustomerName,
											onChange: (e) => setColCustomerName(e.target.value)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 633,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 631,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("div", {
										className: "form-group",
										children: [/* @__PURE__ */ jsxDEV("label", {
											htmlFor: "m-expedition",
											children: "Expedition / Courier Column"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 643,
											columnNumber: 19
										}, this), /* @__PURE__ */ jsxDEV("input", {
											type: "text",
											id: "m-expedition",
											placeholder: "e.g. Opsi Pengiriman or Kurir",
											value: colExpedition,
											onChange: (e) => setColExpedition(e.target.value)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 644,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 642,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("div", {
										className: "form-group",
										children: [/* @__PURE__ */ jsxDEV("label", {
											htmlFor: "m-order-date",
											children: "Order Date / Time Column"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 654,
											columnNumber: 19
										}, this), /* @__PURE__ */ jsxDEV("input", {
											type: "text",
											id: "m-order-date",
											placeholder: "e.g. Waktu Pembayaran or Tanggal Transaksi",
											value: colOrderDate,
											onChange: (e) => setColOrderDate(e.target.value)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 655,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 653,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("div", {
										className: "form-group",
										children: [/* @__PURE__ */ jsxDEV("label", {
											htmlFor: "m-price",
											children: "Price / Payment Column"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 665,
											columnNumber: 19
										}, this), /* @__PURE__ */ jsxDEV("input", {
											type: "text",
											id: "m-price",
											placeholder: "e.g. Total Pembayaran or Nilai Transaksi",
											value: colPrice,
											onChange: (e) => setColPrice(e.target.value)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 666,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 664,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("div", {
										className: "form-group",
										children: [/* @__PURE__ */ jsxDEV("label", {
											htmlFor: "m-sku-ref",
											children: "SKU Reference Column (Nomor Referensi SKU)"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 676,
											columnNumber: 19
										}, this), /* @__PURE__ */ jsxDEV("input", {
											type: "text",
											id: "m-sku-ref",
											placeholder: "e.g. Nomor Referensi SKU or SKU",
											value: colSkuRef,
											onChange: (e) => setColSkuRef(e.target.value)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 677,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 675,
										columnNumber: 17
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 552,
								columnNumber: 15
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 551,
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
								lineNumber: 688,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("button", {
								type: "submit",
								form: "modal-template-form",
								className: "btn btn-primary",
								disabled: saveTemplateMutation.isPending,
								children: saveTemplateMutation.isPending ? "Saving..." : "Save Template"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 689,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 687,
							columnNumber: 13
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 546,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 545,
				columnNumber: 9
			}, this),
			activeModal === "user" && /* @__PURE__ */ jsxDEV("div", {
				className: "modal-overlay",
				children: /* @__PURE__ */ jsxDEV("div", {
					className: "modal",
					children: [
						/* @__PURE__ */ jsxDEV("div", {
							className: "modal-header",
							children: [/* @__PURE__ */ jsxDEV("h3", { children: "Create New User Account" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 702,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("button", {
								className: "modal-close",
								onClick: closeModal,
								children: "×"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 703,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 701,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("div", {
							className: "modal-body",
							children: /* @__PURE__ */ jsxDEV("form", {
								id: "modal-user-form",
								style: {
									display: "flex",
									flexDirection: "column",
									gap: "1rem"
								},
								onSubmit: handleUserSubmit,
								children: [
									/* @__PURE__ */ jsxDEV("div", {
										className: "form-group",
										children: [/* @__PURE__ */ jsxDEV("label", {
											htmlFor: "u-username",
											children: "Username"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 708,
											columnNumber: 19
										}, this), /* @__PURE__ */ jsxDEV("input", {
											type: "text",
											id: "u-username",
											placeholder: "e.g. staff_john",
											required: true,
											autoComplete: "username",
											value: userUsername,
											onChange: (e) => setUserUsername(e.target.value)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 709,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 707,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("div", {
										className: "form-group",
										children: [/* @__PURE__ */ jsxDEV("label", {
											htmlFor: "u-password",
											children: "Password"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 721,
											columnNumber: 19
										}, this), /* @__PURE__ */ jsxDEV("input", {
											type: "password",
											id: "u-password",
											placeholder: "Enter password",
											required: true,
											autoComplete: "new-password",
											value: userPassword,
											onChange: (e) => setUserPassword(e.target.value)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 722,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 720,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("div", {
										className: "form-group",
										children: [/* @__PURE__ */ jsxDEV("label", {
											htmlFor: "u-role",
											children: "Role"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 734,
											columnNumber: 19
										}, this), /* @__PURE__ */ jsxDEV("select", {
											id: "u-role",
											required: true,
											value: userRole,
											onChange: (e) => setUserRole(e.target.value),
											children: [/* @__PURE__ */ jsxDEV("option", {
												value: "staff",
												children: "Staff"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 741,
												columnNumber: 21
											}, this), /* @__PURE__ */ jsxDEV("option", {
												value: "admin",
												children: "Admin"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 742,
												columnNumber: 21
											}, this)]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 735,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 733,
										columnNumber: 17
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 706,
								columnNumber: 15
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 705,
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
								lineNumber: 748,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("button", {
								type: "submit",
								form: "modal-user-form",
								className: "btn btn-primary",
								disabled: createUserMutation.isPending,
								children: createUserMutation.isPending ? "Creating..." : "Create User"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 749,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 747,
							columnNumber: 13
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 700,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 699,
				columnNumber: 9
			}, this),
			activeModal === "sku" && /* @__PURE__ */ jsxDEV("div", {
				className: "modal-overlay",
				children: /* @__PURE__ */ jsxDEV("div", {
					className: "modal",
					children: [
						/* @__PURE__ */ jsxDEV("div", {
							className: "modal-header",
							children: [/* @__PURE__ */ jsxDEV("h3", { children: "Create SKU / Bundle Mapping" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 762,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("button", {
								className: "modal-close",
								onClick: closeModal,
								children: "×"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 763,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 761,
							columnNumber: 13
						}, this),
						/* @__PURE__ */ jsxDEV("div", {
							className: "modal-body",
							children: /* @__PURE__ */ jsxDEV("form", {
								id: "modal-sku-form",
								style: {
									display: "flex",
									flexDirection: "column",
									gap: "1rem"
								},
								onSubmit: handleSkuSubmit,
								children: [
									/* @__PURE__ */ jsxDEV("div", {
										className: "form-group",
										children: [/* @__PURE__ */ jsxDEV("label", {
											htmlFor: "sku-code",
											children: "SKU Code (e.g. CROOR_5S or CASE_1B)"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 768,
											columnNumber: 19
										}, this), /* @__PURE__ */ jsxDEV("input", {
											type: "text",
											id: "sku-code",
											placeholder: "Enter ecommerce SKU code",
											required: true,
											value: skuCode,
											onChange: (e) => setSkuCode(e.target.value)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 769,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 767,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("div", {
										className: "form-group",
										children: [/* @__PURE__ */ jsxDEV("label", {
											htmlFor: "sku-product-id",
											children: "Target Product"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 780,
											columnNumber: 19
										}, this), /* @__PURE__ */ jsxDEV("select", {
											id: "sku-product-id",
											required: true,
											value: skuProductId,
											onChange: (e) => setSkuProductId(e.target.value),
											children: [/* @__PURE__ */ jsxDEV("option", {
												value: "",
												disabled: true,
												children: "Select target product"
											}, void 0, false, {
												fileName: _jsxFileName,
												lineNumber: 787,
												columnNumber: 21
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
												lineNumber: 789,
												columnNumber: 23
											}, this))]
										}, void 0, true, {
											fileName: _jsxFileName,
											lineNumber: 781,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 779,
										columnNumber: 17
									}, this),
									/* @__PURE__ */ jsxDEV("div", {
										className: "form-group",
										children: [/* @__PURE__ */ jsxDEV("label", {
											htmlFor: "sku-quantity",
											children: "Quantity Multiplier"
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 797,
											columnNumber: 19
										}, this), /* @__PURE__ */ jsxDEV("input", {
											type: "number",
											id: "sku-quantity",
											min: "1",
											required: true,
											value: skuQuantity,
											onChange: (e) => setSkuQuantity(parseInt(e.target.value, 10) || 1)
										}, void 0, false, {
											fileName: _jsxFileName,
											lineNumber: 798,
											columnNumber: 19
										}, this)]
									}, void 0, true, {
										fileName: _jsxFileName,
										lineNumber: 796,
										columnNumber: 17
									}, this)
								]
							}, void 0, true, {
								fileName: _jsxFileName,
								lineNumber: 766,
								columnNumber: 15
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 765,
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
								lineNumber: 810,
								columnNumber: 15
							}, this), /* @__PURE__ */ jsxDEV("button", {
								type: "submit",
								form: "modal-sku-form",
								className: "btn btn-primary",
								disabled: saveSkuMappingMutation.isPending,
								children: saveSkuMappingMutation.isPending ? "Saving..." : "Save Mapping"
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 811,
								columnNumber: 15
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 809,
							columnNumber: 13
						}, this)
					]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 760,
					columnNumber: 11
				}, this)
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 759,
				columnNumber: 9
			}, this)
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 330,
		columnNumber: 5
	}, this);
}
//#endregion
//#region app/routes/settings.jsx?tsr-split=component
var SplitComponent = Settings;
//#endregion
export { SplitComponent as component };
