// app/routes/index.jsx
import { createFileRoute } from "@tanstack/react-router";

// app/pages/Dashboard.jsx
import React, { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

// app/utils/toast.js
function showToast(title, message, type = "info", duration = 3e3) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <div class="toast-title">${escapeHtml(title)}</div>
      <div class="toast-message">${escapeHtml(message)}</div>
    </div>
    <button class="toast-close">&times;</button>
  `;
  toast.querySelector(".toast-close").addEventListener("click", () => {
    toast.remove();
  });
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = "slideIn 0.3s ease reverse forwards";
    toast.addEventListener("animationend", () => toast.remove());
  }, duration);
}
function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// app/utils/api.js
import { createServerFn } from "@tanstack/react-start";
var fetchApi = createServerFn({ method: "GET" }).validator((path) => {
  if (typeof path !== "string") {
    throw new Error("Path must be a string");
  }
  return path;
}).handler(async ({ data: path }) => {
  const { app } = await import("../../src/app.js");
  let cookie = "";
  try {
    const { getEvent } = await import("vinxi/http");
    const event = getEvent();
    cookie = event?.node?.req?.headers?.cookie || "";
  } catch (e) {
    if (e && e.message && !e.message.includes("vinxi/http")) {
      console.error("Vinxi getEvent fail in fetchApi:", e);
    }
  }
  const res = await app.request(path, {
    method: "GET",
    headers: {
      "Cookie": cookie,
      "Content-Type": "application/json"
    }
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || `API error: ${res.status}`);
  }
  return res.json();
});
var dashboardStatsQueryOptions = {
  queryKey: ["dashboardStats"],
  queryFn: () => fetchApi({ data: "/api/dashboard/stats" })
};
var productsQueryOptions = {
  queryKey: ["products"],
  queryFn: () => fetchApi({ data: "/api/products" })
};
var opnamesQueryOptions = {
  queryKey: ["opnames"],
  queryFn: () => fetchApi({ data: "/api/stock/opname" })
};
var opnameDetailsQueryOptions = (opnameId) => ({
  queryKey: ["opnameDetails", opnameId],
  queryFn: () => fetchApi({ data: `/api/stock/opname/${opnameId}` }),
  enabled: !!opnameId
});
var returnedOrdersQueryOptions = {
  queryKey: ["returnedOrders"],
  queryFn: () => fetchApi({ data: "/api/review/returned" })
};
var reviewOrdersQueryOptions = {
  queryKey: ["reviewOrders"],
  queryFn: () => fetchApi({ data: "/api/review/orders" })
};
var reviewAmbiguousQueryOptions = {
  queryKey: ["ambiguousItems"],
  queryFn: () => fetchApi({ data: "/api/review/ambiguous" })
};
var ledgerQueryOptions = {
  queryKey: ["ledgerHistory"],
  queryFn: () => fetchApi({ data: "/api/products/ledger" })
};
var settingsTemplatesQueryOptions = {
  queryKey: ["settingsTemplates"],
  queryFn: () => fetchApi({ data: "/api/import/templates" })
};
var settingsSkuMappingsQueryOptions = {
  queryKey: ["settingsSkuMappings"],
  queryFn: () => fetchApi({ data: "/api/import/sku-mappings" })
};
var settingsUsersQueryOptions = {
  queryKey: ["settingsUsers"],
  queryFn: () => fetchApi({ data: "/api/auth/users" })
};
var settingsProductsQueryOptions = {
  queryKey: ["settingsProducts"],
  queryFn: () => fetchApi({ data: "/api/products" })
};
var settingsCredentialsQueryOptions = {
  queryKey: ["settingsCredentials"],
  queryFn: () => fetchApi({ data: "/api/ecommerce/credentials" })
};

// app/pages/Dashboard.jsx
function Dashboard() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery(dashboardStatsQueryOptions);
  useEffect(() => {
    if (error) {
      console.error("Dashboard data load failed:", error);
      showToast("Error", "Failed to retrieve dashboard stats", "error");
    }
  }, [error]);
  useEffect(() => {
    const handleResync = () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    };
    window.addEventListener("resync-data", handleResync);
    return () => {
      window.removeEventListener("resync-data", handleResync);
    };
  }, [queryClient]);
  if (isLoading) {
    return /* @__PURE__ */ React.createElement("div", { style: { padding: "2rem", textAlign: "center", color: "var(--text-secondary)" } }, "Loading dashboard...");
  }
  if (error || !data) {
    return /* @__PURE__ */ React.createElement("div", { style: { padding: "2rem", textAlign: "center", color: "var(--danger)" } }, "Error loading dashboard statistics.");
  }
  const lowStockCount = data.low_stock_count || 0;
  const pendingReviewCount = data.pending_review_count || 0;
  const ambiguousCount = data.ambiguous_count || 0;
  return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "2rem" } }, /* @__PURE__ */ React.createElement("div", { className: "dashboard-grid" }, /* @__PURE__ */ React.createElement("div", { className: "card", id: "card-products" }, /* @__PURE__ */ React.createElement("div", { className: "card-title" }, "Total Products"), /* @__PURE__ */ React.createElement("div", { className: "card-value", id: "dash-total-products" }, data.total_products), /* @__PURE__ */ React.createElement("div", { className: "card-subtitle" }, "Match models registered")), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "card",
      id: "card-low-stock",
      style: lowStockCount > 0 ? { borderLeft: "4px solid var(--danger)" } : {}
    },
    /* @__PURE__ */ React.createElement("div", { className: "card-title" }, "Low Stock Alert"),
    /* @__PURE__ */ React.createElement("div", { className: "card-value", id: "dash-low-stock" }, lowStockCount),
    /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "card-subtitle",
        id: "dash-low-stock-sub",
        style: lowStockCount > 0 ? { color: "var(--danger)", fontWeight: "500" } : { color: "var(--text-secondary)" }
      },
      lowStockCount > 0 ? `\u26A0\uFE0F ${lowStockCount} items below threshold` : "All stock levels healthy"
    )
  ), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "card",
      id: "card-reviews",
      style: pendingReviewCount > 0 ? { borderLeft: "4px solid var(--warning)" } : {}
    },
    /* @__PURE__ */ React.createElement("div", { className: "card-title" }, "Pending Review"),
    /* @__PURE__ */ React.createElement("div", { className: "card-value", id: "dash-pending-review" }, pendingReviewCount),
    /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "card-subtitle",
        id: "dash-reviews-sub",
        style: pendingReviewCount > 0 ? { color: "var(--warning)", fontWeight: "500" } : { color: "var(--text-secondary)" }
      },
      pendingReviewCount > 0 ? `\u26A0\uFE0F ${pendingReviewCount} orders require actions` : "No cancelled orders pending"
    )
  ), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "card",
      id: "card-ambiguous",
      style: ambiguousCount > 0 ? { borderLeft: "4px solid var(--warning)" } : {}
    },
    /* @__PURE__ */ React.createElement("div", { className: "card-title" }, "Ambiguous Items"),
    /* @__PURE__ */ React.createElement("div", { className: "card-value", id: "dash-ambiguous" }, ambiguousCount),
    /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "card-subtitle",
        id: "dash-ambiguous-sub",
        style: ambiguousCount > 0 ? { color: "var(--warning)", fontWeight: "500" } : { color: "var(--text-secondary)" }
      },
      ambiguousCount > 0 ? `\u26A0\uFE0F ${ambiguousCount} items need mapping` : "Descriptions clean"
    )
  )), /* @__PURE__ */ React.createElement("div", { className: "dashboard-sections" }, /* @__PURE__ */ React.createElement("div", { className: "section-card" }, /* @__PURE__ */ React.createElement("div", { className: "section-header" }, /* @__PURE__ */ React.createElement("h2", null, "Recent Orders Awaiting Review"), /* @__PURE__ */ React.createElement(Link, { to: "/review", className: "btn btn-secondary btn-sm" }, "View All")), /* @__PURE__ */ React.createElement("div", { className: "table-wrapper" }, /* @__PURE__ */ React.createElement("table", null, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Order ID"), /* @__PURE__ */ React.createElement("th", null, "Product Raw"), /* @__PURE__ */ React.createElement("th", null, "Qty"), /* @__PURE__ */ React.createElement("th", null, "Expedition"), /* @__PURE__ */ React.createElement("th", null, "Action"))), /* @__PURE__ */ React.createElement("tbody", { id: "dash-recent-reviews" }, !data.recent_reviews || data.recent_reviews.length === 0 ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 5, style: { textAlign: "center", color: "var(--text-muted)", padding: "1.5rem" } }, "No flagged orders needing review.")) : data.recent_reviews.map((o) => /* @__PURE__ */ React.createElement("tr", { key: o.order_id }, /* @__PURE__ */ React.createElement("td", { style: { fontFamily: "monospace", fontSize: "0.8rem", fontWeight: 500 } }, o.order_id), /* @__PURE__ */ React.createElement(
    "td",
    {
      style: {
        fontSize: "0.85rem",
        maxWidth: "150px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      },
      title: o.product_name_raw
    },
    o.product_name_raw
  ), /* @__PURE__ */ React.createElement("td", { style: { fontWeight: 600 } }, o.quantity), /* @__PURE__ */ React.createElement("td", { style: { fontSize: "0.8rem", color: "var(--text-secondary)" } }, o.expedition || "-"), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement(
    Link,
    {
      to: "/review",
      className: "btn btn-secondary btn-sm",
      style: { padding: "0.15rem 0.4rem", fontSize: "0.75rem" }
    },
    "Review"
  )))))))), /* @__PURE__ */ React.createElement("div", { className: "section-card" }, /* @__PURE__ */ React.createElement("div", { className: "section-header" }, /* @__PURE__ */ React.createElement("h2", null, "Recent Imports History"), /* @__PURE__ */ React.createElement(Link, { to: "/import", className: "btn btn-secondary btn-sm" }, "New Import")), /* @__PURE__ */ React.createElement("div", { className: "table-wrapper" }, /* @__PURE__ */ React.createElement("table", null, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Date"), /* @__PURE__ */ React.createElement("th", null, "Source"), /* @__PURE__ */ React.createElement("th", null, "Filename"), /* @__PURE__ */ React.createElement("th", null, "Rows"))), /* @__PURE__ */ React.createElement("tbody", { id: "dash-recent-imports" }, !data.recent_imports || data.recent_imports.length === 0 ? /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 4, style: { textAlign: "center", color: "var(--text-muted)", padding: "1.5rem" } }, "No import history found.")) : data.recent_imports.map((s) => {
    let statusTag = "info";
    if (s.status === "applied") statusTag = "success";
    if (s.status === "cancelled") statusTag = "danger";
    const dateStr = s.created_at ? new Date(typeof s.created_at === "string" ? s.created_at.replace(/-/g, "/") : s.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }) : "-";
    return /* @__PURE__ */ React.createElement("tr", { key: s.id || s.created_at }, /* @__PURE__ */ React.createElement("td", { style: { fontSize: "0.8rem", color: "var(--text-secondary)" } }, dateStr), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("span", { className: "status-tag info", style: { fontSize: "0.7rem" } }, s.template_name)), /* @__PURE__ */ React.createElement(
      "td",
      {
        style: {
          fontSize: "0.85rem",
          maxWidth: "130px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        },
        title: s.filename
      },
      s.filename
    ), /* @__PURE__ */ React.createElement("td", { style: { fontSize: "0.85rem", fontWeight: 500 } }, s.total_rows, " rows", " ", /* @__PURE__ */ React.createElement("span", { className: `status-tag ${statusTag}`, style: { fontSize: "0.65rem", marginLeft: "0.25rem" } }, s.status)));
  })))))));
}

// app/routes/index.jsx
var Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardStatsQueryOptions),
  component: Dashboard
});

// app/routes/products/index.jsx
import { createFileRoute as createFileRoute2 } from "@tanstack/react-router";

// app/pages/Products.jsx
import React3, { useState as useState2, useEffect as useEffect2, useRef, useMemo } from "react";
import { useQuery as useQuery2, useMutation, useQueryClient as useQueryClient2 } from "@tanstack/react-query";

// node_modules/@tanstack/react-table/build/lib/index.mjs
import * as React2 from "react";

// node_modules/@tanstack/table-core/build/lib/index.mjs
function functionalUpdate(updater, input) {
  return typeof updater === "function" ? updater(input) : updater;
}
function makeStateUpdater(key, instance) {
  return (updater) => {
    instance.setState((old) => {
      return {
        ...old,
        [key]: functionalUpdate(updater, old[key])
      };
    });
  };
}
function isFunction(d) {
  return d instanceof Function;
}
function isNumberArray(d) {
  return Array.isArray(d) && d.every((val) => typeof val === "number");
}
function flattenBy(arr, getChildren) {
  const flat = [];
  const recurse = (subArr) => {
    subArr.forEach((item) => {
      flat.push(item);
      const children = getChildren(item);
      if (children != null && children.length) {
        recurse(children);
      }
    });
  };
  recurse(arr);
  return flat;
}
function memo(getDeps, fn, opts) {
  let deps = [];
  let result;
  return (depArgs) => {
    let depTime;
    if (opts.key && opts.debug) depTime = Date.now();
    const newDeps = getDeps(depArgs);
    const depsChanged = newDeps.length !== deps.length || newDeps.some((dep, index) => deps[index] !== dep);
    if (!depsChanged) {
      return result;
    }
    deps = newDeps;
    let resultTime;
    if (opts.key && opts.debug) resultTime = Date.now();
    result = fn(...newDeps);
    opts == null || opts.onChange == null || opts.onChange(result);
    if (opts.key && opts.debug) {
      if (opts != null && opts.debug()) {
        const depEndTime = Math.round((Date.now() - depTime) * 100) / 100;
        const resultEndTime = Math.round((Date.now() - resultTime) * 100) / 100;
        const resultFpsPercentage = resultEndTime / 16;
        const pad = (str, num) => {
          str = String(str);
          while (str.length < num) {
            str = " " + str;
          }
          return str;
        };
        console.info(`%c\u23F1 ${pad(resultEndTime, 5)} /${pad(depEndTime, 5)} ms`, `
            font-size: .6rem;
            font-weight: bold;
            color: hsl(${Math.max(0, Math.min(120 - 120 * resultFpsPercentage, 120))}deg 100% 31%);`, opts == null ? void 0 : opts.key);
      }
    }
    return result;
  };
}
function getMemoOptions(tableOptions, debugLevel, key, onChange) {
  return {
    debug: () => {
      var _tableOptions$debugAl;
      return (_tableOptions$debugAl = tableOptions == null ? void 0 : tableOptions.debugAll) != null ? _tableOptions$debugAl : tableOptions[debugLevel];
    },
    key: process.env.NODE_ENV === "development" && key,
    onChange
  };
}
function createCell(table, row, column, columnId) {
  const getRenderValue = () => {
    var _cell$getValue;
    return (_cell$getValue = cell.getValue()) != null ? _cell$getValue : table.options.renderFallbackValue;
  };
  const cell = {
    id: `${row.id}_${column.id}`,
    row,
    column,
    getValue: () => row.getValue(columnId),
    renderValue: getRenderValue,
    getContext: memo(() => [table, column, row, cell], (table2, column2, row2, cell2) => ({
      table: table2,
      column: column2,
      row: row2,
      cell: cell2,
      getValue: cell2.getValue,
      renderValue: cell2.renderValue
    }), getMemoOptions(table.options, "debugCells", "cell.getContext"))
  };
  table._features.forEach((feature) => {
    feature.createCell == null || feature.createCell(cell, column, row, table);
  }, {});
  return cell;
}
function createColumn(table, columnDef, depth, parent) {
  var _ref, _resolvedColumnDef$id;
  const defaultColumn = table._getDefaultColumnDef();
  const resolvedColumnDef = {
    ...defaultColumn,
    ...columnDef
  };
  const accessorKey = resolvedColumnDef.accessorKey;
  let id = (_ref = (_resolvedColumnDef$id = resolvedColumnDef.id) != null ? _resolvedColumnDef$id : accessorKey ? typeof String.prototype.replaceAll === "function" ? accessorKey.replaceAll(".", "_") : accessorKey.replace(/\./g, "_") : void 0) != null ? _ref : typeof resolvedColumnDef.header === "string" ? resolvedColumnDef.header : void 0;
  let accessorFn;
  if (resolvedColumnDef.accessorFn) {
    accessorFn = resolvedColumnDef.accessorFn;
  } else if (accessorKey) {
    if (accessorKey.includes(".")) {
      accessorFn = (originalRow) => {
        let result = originalRow;
        for (const key of accessorKey.split(".")) {
          var _result;
          result = (_result = result) == null ? void 0 : _result[key];
          if (process.env.NODE_ENV !== "production" && result === void 0) {
            console.warn(`"${key}" in deeply nested key "${accessorKey}" returned undefined.`);
          }
        }
        return result;
      };
    } else {
      accessorFn = (originalRow) => originalRow[resolvedColumnDef.accessorKey];
    }
  }
  if (!id) {
    if (process.env.NODE_ENV !== "production") {
      throw new Error(resolvedColumnDef.accessorFn ? `Columns require an id when using an accessorFn` : `Columns require an id when using a non-string header`);
    }
    throw new Error();
  }
  let column = {
    id: `${String(id)}`,
    accessorFn,
    parent,
    depth,
    columnDef: resolvedColumnDef,
    columns: [],
    getFlatColumns: memo(() => [true], () => {
      var _column$columns;
      return [column, ...(_column$columns = column.columns) == null ? void 0 : _column$columns.flatMap((d) => d.getFlatColumns())];
    }, getMemoOptions(table.options, "debugColumns", "column.getFlatColumns")),
    getLeafColumns: memo(() => [table._getOrderColumnsFn()], (orderColumns2) => {
      var _column$columns2;
      if ((_column$columns2 = column.columns) != null && _column$columns2.length) {
        let leafColumns = column.columns.flatMap((column2) => column2.getLeafColumns());
        return orderColumns2(leafColumns);
      }
      return [column];
    }, getMemoOptions(table.options, "debugColumns", "column.getLeafColumns"))
  };
  for (const feature of table._features) {
    feature.createColumn == null || feature.createColumn(column, table);
  }
  return column;
}
var debug = "debugHeaders";
function createHeader(table, column, options) {
  var _options$id;
  const id = (_options$id = options.id) != null ? _options$id : column.id;
  let header = {
    id,
    column,
    index: options.index,
    isPlaceholder: !!options.isPlaceholder,
    placeholderId: options.placeholderId,
    depth: options.depth,
    subHeaders: [],
    colSpan: 0,
    rowSpan: 0,
    headerGroup: null,
    getLeafHeaders: () => {
      const leafHeaders = [];
      const recurseHeader = (h) => {
        if (h.subHeaders && h.subHeaders.length) {
          h.subHeaders.map(recurseHeader);
        }
        leafHeaders.push(h);
      };
      recurseHeader(header);
      return leafHeaders;
    },
    getContext: () => ({
      table,
      header,
      column
    })
  };
  table._features.forEach((feature) => {
    feature.createHeader == null || feature.createHeader(header, table);
  });
  return header;
}
var Headers = {
  createTable: (table) => {
    table.getHeaderGroups = memo(() => [table.getAllColumns(), table.getVisibleLeafColumns(), table.getState().columnPinning.left, table.getState().columnPinning.right], (allColumns, leafColumns, left, right) => {
      var _left$map$filter, _right$map$filter;
      const leftColumns = (_left$map$filter = left == null ? void 0 : left.map((columnId) => leafColumns.find((d) => d.id === columnId)).filter(Boolean)) != null ? _left$map$filter : [];
      const rightColumns = (_right$map$filter = right == null ? void 0 : right.map((columnId) => leafColumns.find((d) => d.id === columnId)).filter(Boolean)) != null ? _right$map$filter : [];
      const centerColumns = leafColumns.filter((column) => !(left != null && left.includes(column.id)) && !(right != null && right.includes(column.id)));
      const headerGroups = buildHeaderGroups(allColumns, [...leftColumns, ...centerColumns, ...rightColumns], table);
      return headerGroups;
    }, getMemoOptions(table.options, debug, "getHeaderGroups"));
    table.getCenterHeaderGroups = memo(() => [table.getAllColumns(), table.getVisibleLeafColumns(), table.getState().columnPinning.left, table.getState().columnPinning.right], (allColumns, leafColumns, left, right) => {
      leafColumns = leafColumns.filter((column) => !(left != null && left.includes(column.id)) && !(right != null && right.includes(column.id)));
      return buildHeaderGroups(allColumns, leafColumns, table, "center");
    }, getMemoOptions(table.options, debug, "getCenterHeaderGroups"));
    table.getLeftHeaderGroups = memo(() => [table.getAllColumns(), table.getVisibleLeafColumns(), table.getState().columnPinning.left], (allColumns, leafColumns, left) => {
      var _left$map$filter2;
      const orderedLeafColumns = (_left$map$filter2 = left == null ? void 0 : left.map((columnId) => leafColumns.find((d) => d.id === columnId)).filter(Boolean)) != null ? _left$map$filter2 : [];
      return buildHeaderGroups(allColumns, orderedLeafColumns, table, "left");
    }, getMemoOptions(table.options, debug, "getLeftHeaderGroups"));
    table.getRightHeaderGroups = memo(() => [table.getAllColumns(), table.getVisibleLeafColumns(), table.getState().columnPinning.right], (allColumns, leafColumns, right) => {
      var _right$map$filter2;
      const orderedLeafColumns = (_right$map$filter2 = right == null ? void 0 : right.map((columnId) => leafColumns.find((d) => d.id === columnId)).filter(Boolean)) != null ? _right$map$filter2 : [];
      return buildHeaderGroups(allColumns, orderedLeafColumns, table, "right");
    }, getMemoOptions(table.options, debug, "getRightHeaderGroups"));
    table.getFooterGroups = memo(() => [table.getHeaderGroups()], (headerGroups) => {
      return [...headerGroups].reverse();
    }, getMemoOptions(table.options, debug, "getFooterGroups"));
    table.getLeftFooterGroups = memo(() => [table.getLeftHeaderGroups()], (headerGroups) => {
      return [...headerGroups].reverse();
    }, getMemoOptions(table.options, debug, "getLeftFooterGroups"));
    table.getCenterFooterGroups = memo(() => [table.getCenterHeaderGroups()], (headerGroups) => {
      return [...headerGroups].reverse();
    }, getMemoOptions(table.options, debug, "getCenterFooterGroups"));
    table.getRightFooterGroups = memo(() => [table.getRightHeaderGroups()], (headerGroups) => {
      return [...headerGroups].reverse();
    }, getMemoOptions(table.options, debug, "getRightFooterGroups"));
    table.getFlatHeaders = memo(() => [table.getHeaderGroups()], (headerGroups) => {
      return headerGroups.map((headerGroup) => {
        return headerGroup.headers;
      }).flat();
    }, getMemoOptions(table.options, debug, "getFlatHeaders"));
    table.getLeftFlatHeaders = memo(() => [table.getLeftHeaderGroups()], (left) => {
      return left.map((headerGroup) => {
        return headerGroup.headers;
      }).flat();
    }, getMemoOptions(table.options, debug, "getLeftFlatHeaders"));
    table.getCenterFlatHeaders = memo(() => [table.getCenterHeaderGroups()], (left) => {
      return left.map((headerGroup) => {
        return headerGroup.headers;
      }).flat();
    }, getMemoOptions(table.options, debug, "getCenterFlatHeaders"));
    table.getRightFlatHeaders = memo(() => [table.getRightHeaderGroups()], (left) => {
      return left.map((headerGroup) => {
        return headerGroup.headers;
      }).flat();
    }, getMemoOptions(table.options, debug, "getRightFlatHeaders"));
    table.getCenterLeafHeaders = memo(() => [table.getCenterFlatHeaders()], (flatHeaders) => {
      return flatHeaders.filter((header) => {
        var _header$subHeaders;
        return !((_header$subHeaders = header.subHeaders) != null && _header$subHeaders.length);
      });
    }, getMemoOptions(table.options, debug, "getCenterLeafHeaders"));
    table.getLeftLeafHeaders = memo(() => [table.getLeftFlatHeaders()], (flatHeaders) => {
      return flatHeaders.filter((header) => {
        var _header$subHeaders2;
        return !((_header$subHeaders2 = header.subHeaders) != null && _header$subHeaders2.length);
      });
    }, getMemoOptions(table.options, debug, "getLeftLeafHeaders"));
    table.getRightLeafHeaders = memo(() => [table.getRightFlatHeaders()], (flatHeaders) => {
      return flatHeaders.filter((header) => {
        var _header$subHeaders3;
        return !((_header$subHeaders3 = header.subHeaders) != null && _header$subHeaders3.length);
      });
    }, getMemoOptions(table.options, debug, "getRightLeafHeaders"));
    table.getLeafHeaders = memo(() => [table.getLeftHeaderGroups(), table.getCenterHeaderGroups(), table.getRightHeaderGroups()], (left, center, right) => {
      var _left$0$headers, _left$, _center$0$headers, _center$, _right$0$headers, _right$;
      return [...(_left$0$headers = (_left$ = left[0]) == null ? void 0 : _left$.headers) != null ? _left$0$headers : [], ...(_center$0$headers = (_center$ = center[0]) == null ? void 0 : _center$.headers) != null ? _center$0$headers : [], ...(_right$0$headers = (_right$ = right[0]) == null ? void 0 : _right$.headers) != null ? _right$0$headers : []].map((header) => {
        return header.getLeafHeaders();
      }).flat();
    }, getMemoOptions(table.options, debug, "getLeafHeaders"));
  }
};
function buildHeaderGroups(allColumns, columnsToGroup, table, headerFamily) {
  var _headerGroups$0$heade, _headerGroups$;
  let maxDepth = 0;
  const findMaxDepth = function(columns, depth) {
    if (depth === void 0) {
      depth = 1;
    }
    maxDepth = Math.max(maxDepth, depth);
    columns.filter((column) => column.getIsVisible()).forEach((column) => {
      var _column$columns;
      if ((_column$columns = column.columns) != null && _column$columns.length) {
        findMaxDepth(column.columns, depth + 1);
      }
    }, 0);
  };
  findMaxDepth(allColumns);
  let headerGroups = [];
  const createHeaderGroup = (headersToGroup, depth) => {
    const headerGroup = {
      depth,
      id: [headerFamily, `${depth}`].filter(Boolean).join("_"),
      headers: []
    };
    const pendingParentHeaders = [];
    headersToGroup.forEach((headerToGroup) => {
      const latestPendingParentHeader = [...pendingParentHeaders].reverse()[0];
      const isLeafHeader = headerToGroup.column.depth === headerGroup.depth;
      let column;
      let isPlaceholder = false;
      if (isLeafHeader && headerToGroup.column.parent) {
        column = headerToGroup.column.parent;
      } else {
        column = headerToGroup.column;
        isPlaceholder = true;
      }
      if (latestPendingParentHeader && (latestPendingParentHeader == null ? void 0 : latestPendingParentHeader.column) === column) {
        latestPendingParentHeader.subHeaders.push(headerToGroup);
      } else {
        const header = createHeader(table, column, {
          id: [headerFamily, depth, column.id, headerToGroup == null ? void 0 : headerToGroup.id].filter(Boolean).join("_"),
          isPlaceholder,
          placeholderId: isPlaceholder ? `${pendingParentHeaders.filter((d) => d.column === column).length}` : void 0,
          depth,
          index: pendingParentHeaders.length
        });
        header.subHeaders.push(headerToGroup);
        pendingParentHeaders.push(header);
      }
      headerGroup.headers.push(headerToGroup);
      headerToGroup.headerGroup = headerGroup;
    });
    headerGroups.push(headerGroup);
    if (depth > 0) {
      createHeaderGroup(pendingParentHeaders, depth - 1);
    }
  };
  const bottomHeaders = columnsToGroup.map((column, index) => createHeader(table, column, {
    depth: maxDepth,
    index
  }));
  createHeaderGroup(bottomHeaders, maxDepth - 1);
  headerGroups.reverse();
  const recurseHeadersForSpans = (headers) => {
    const filteredHeaders = headers.filter((header) => header.column.getIsVisible());
    return filteredHeaders.map((header) => {
      let colSpan = 0;
      let rowSpan = 0;
      let childRowSpans = [0];
      if (header.subHeaders && header.subHeaders.length) {
        childRowSpans = [];
        recurseHeadersForSpans(header.subHeaders).forEach((_ref) => {
          let {
            colSpan: childColSpan,
            rowSpan: childRowSpan
          } = _ref;
          colSpan += childColSpan;
          childRowSpans.push(childRowSpan);
        });
      } else {
        colSpan = 1;
      }
      const minChildRowSpan = Math.min(...childRowSpans);
      rowSpan = rowSpan + minChildRowSpan;
      header.colSpan = colSpan;
      header.rowSpan = rowSpan;
      return {
        colSpan,
        rowSpan
      };
    });
  };
  recurseHeadersForSpans((_headerGroups$0$heade = (_headerGroups$ = headerGroups[0]) == null ? void 0 : _headerGroups$.headers) != null ? _headerGroups$0$heade : []);
  return headerGroups;
}
var createRow = (table, id, original, rowIndex, depth, subRows, parentId) => {
  let row = {
    id,
    index: rowIndex,
    original,
    depth,
    parentId,
    _valuesCache: {},
    _uniqueValuesCache: {},
    getValue: (columnId) => {
      if (row._valuesCache.hasOwnProperty(columnId)) {
        return row._valuesCache[columnId];
      }
      const column = table.getColumn(columnId);
      if (!(column != null && column.accessorFn)) {
        return void 0;
      }
      row._valuesCache[columnId] = column.accessorFn(row.original, rowIndex);
      return row._valuesCache[columnId];
    },
    getUniqueValues: (columnId) => {
      if (row._uniqueValuesCache.hasOwnProperty(columnId)) {
        return row._uniqueValuesCache[columnId];
      }
      const column = table.getColumn(columnId);
      if (!(column != null && column.accessorFn)) {
        return void 0;
      }
      if (!column.columnDef.getUniqueValues) {
        row._uniqueValuesCache[columnId] = [row.getValue(columnId)];
        return row._uniqueValuesCache[columnId];
      }
      row._uniqueValuesCache[columnId] = column.columnDef.getUniqueValues(row.original, rowIndex);
      return row._uniqueValuesCache[columnId];
    },
    renderValue: (columnId) => {
      var _row$getValue;
      return (_row$getValue = row.getValue(columnId)) != null ? _row$getValue : table.options.renderFallbackValue;
    },
    subRows: subRows != null ? subRows : [],
    getLeafRows: () => flattenBy(row.subRows, (d) => d.subRows),
    getParentRow: () => row.parentId ? table.getRow(row.parentId, true) : void 0,
    getParentRows: () => {
      let parentRows = [];
      let currentRow = row;
      while (true) {
        const parentRow = currentRow.getParentRow();
        if (!parentRow) break;
        parentRows.push(parentRow);
        currentRow = parentRow;
      }
      return parentRows.reverse();
    },
    getAllCells: memo(() => [table.getAllLeafColumns()], (leafColumns) => {
      return leafColumns.map((column) => {
        return createCell(table, row, column, column.id);
      });
    }, getMemoOptions(table.options, "debugRows", "getAllCells")),
    _getAllCellsByColumnId: memo(() => [row.getAllCells()], (allCells) => {
      return allCells.reduce((acc, cell) => {
        acc[cell.column.id] = cell;
        return acc;
      }, {});
    }, getMemoOptions(table.options, "debugRows", "getAllCellsByColumnId"))
  };
  for (let i = 0; i < table._features.length; i++) {
    const feature = table._features[i];
    feature == null || feature.createRow == null || feature.createRow(row, table);
  }
  return row;
};
var ColumnFaceting = {
  createColumn: (column, table) => {
    column._getFacetedRowModel = table.options.getFacetedRowModel && table.options.getFacetedRowModel(table, column.id);
    column.getFacetedRowModel = () => {
      if (!column._getFacetedRowModel) {
        return table.getPreFilteredRowModel();
      }
      return column._getFacetedRowModel();
    };
    column._getFacetedUniqueValues = table.options.getFacetedUniqueValues && table.options.getFacetedUniqueValues(table, column.id);
    column.getFacetedUniqueValues = () => {
      if (!column._getFacetedUniqueValues) {
        return /* @__PURE__ */ new Map();
      }
      return column._getFacetedUniqueValues();
    };
    column._getFacetedMinMaxValues = table.options.getFacetedMinMaxValues && table.options.getFacetedMinMaxValues(table, column.id);
    column.getFacetedMinMaxValues = () => {
      if (!column._getFacetedMinMaxValues) {
        return void 0;
      }
      return column._getFacetedMinMaxValues();
    };
  }
};
var includesString = (row, columnId, filterValue) => {
  var _filterValue$toString, _row$getValue;
  const search = filterValue == null || (_filterValue$toString = filterValue.toString()) == null ? void 0 : _filterValue$toString.toLowerCase();
  return Boolean((_row$getValue = row.getValue(columnId)) == null || (_row$getValue = _row$getValue.toString()) == null || (_row$getValue = _row$getValue.toLowerCase()) == null ? void 0 : _row$getValue.includes(search));
};
includesString.autoRemove = (val) => testFalsey(val);
var includesStringSensitive = (row, columnId, filterValue) => {
  var _row$getValue2;
  return Boolean((_row$getValue2 = row.getValue(columnId)) == null || (_row$getValue2 = _row$getValue2.toString()) == null ? void 0 : _row$getValue2.includes(filterValue));
};
includesStringSensitive.autoRemove = (val) => testFalsey(val);
var equalsString = (row, columnId, filterValue) => {
  var _row$getValue3;
  return ((_row$getValue3 = row.getValue(columnId)) == null || (_row$getValue3 = _row$getValue3.toString()) == null ? void 0 : _row$getValue3.toLowerCase()) === (filterValue == null ? void 0 : filterValue.toLowerCase());
};
equalsString.autoRemove = (val) => testFalsey(val);
var arrIncludes = (row, columnId, filterValue) => {
  var _row$getValue4;
  return (_row$getValue4 = row.getValue(columnId)) == null ? void 0 : _row$getValue4.includes(filterValue);
};
arrIncludes.autoRemove = (val) => testFalsey(val);
var arrIncludesAll = (row, columnId, filterValue) => {
  return !filterValue.some((val) => {
    var _row$getValue5;
    return !((_row$getValue5 = row.getValue(columnId)) != null && _row$getValue5.includes(val));
  });
};
arrIncludesAll.autoRemove = (val) => testFalsey(val) || !(val != null && val.length);
var arrIncludesSome = (row, columnId, filterValue) => {
  return filterValue.some((val) => {
    var _row$getValue6;
    return (_row$getValue6 = row.getValue(columnId)) == null ? void 0 : _row$getValue6.includes(val);
  });
};
arrIncludesSome.autoRemove = (val) => testFalsey(val) || !(val != null && val.length);
var equals = (row, columnId, filterValue) => {
  return row.getValue(columnId) === filterValue;
};
equals.autoRemove = (val) => testFalsey(val);
var weakEquals = (row, columnId, filterValue) => {
  return row.getValue(columnId) == filterValue;
};
weakEquals.autoRemove = (val) => testFalsey(val);
var inNumberRange = (row, columnId, filterValue) => {
  let [min2, max2] = filterValue;
  const rowValue = row.getValue(columnId);
  return rowValue >= min2 && rowValue <= max2;
};
inNumberRange.resolveFilterValue = (val) => {
  let [unsafeMin, unsafeMax] = val;
  let parsedMin = typeof unsafeMin !== "number" ? parseFloat(unsafeMin) : unsafeMin;
  let parsedMax = typeof unsafeMax !== "number" ? parseFloat(unsafeMax) : unsafeMax;
  let min2 = unsafeMin === null || Number.isNaN(parsedMin) ? -Infinity : parsedMin;
  let max2 = unsafeMax === null || Number.isNaN(parsedMax) ? Infinity : parsedMax;
  if (min2 > max2) {
    const temp = min2;
    min2 = max2;
    max2 = temp;
  }
  return [min2, max2];
};
inNumberRange.autoRemove = (val) => testFalsey(val) || testFalsey(val[0]) && testFalsey(val[1]);
var filterFns = {
  includesString,
  includesStringSensitive,
  equalsString,
  arrIncludes,
  arrIncludesAll,
  arrIncludesSome,
  equals,
  weakEquals,
  inNumberRange
};
function testFalsey(val) {
  return val === void 0 || val === null || val === "";
}
var ColumnFiltering = {
  getDefaultColumnDef: () => {
    return {
      filterFn: "auto"
    };
  },
  getInitialState: (state) => {
    return {
      columnFilters: [],
      ...state
    };
  },
  getDefaultOptions: (table) => {
    return {
      onColumnFiltersChange: makeStateUpdater("columnFilters", table),
      filterFromLeafRows: false,
      maxLeafRowFilterDepth: 100
    };
  },
  createColumn: (column, table) => {
    column.getAutoFilterFn = () => {
      const firstRow = table.getCoreRowModel().flatRows[0];
      const value = firstRow == null ? void 0 : firstRow.getValue(column.id);
      if (typeof value === "string") {
        return filterFns.includesString;
      }
      if (typeof value === "number") {
        return filterFns.inNumberRange;
      }
      if (typeof value === "boolean") {
        return filterFns.equals;
      }
      if (value !== null && typeof value === "object") {
        return filterFns.equals;
      }
      if (Array.isArray(value)) {
        return filterFns.arrIncludes;
      }
      return filterFns.weakEquals;
    };
    column.getFilterFn = () => {
      var _table$options$filter, _table$options$filter2;
      return isFunction(column.columnDef.filterFn) ? column.columnDef.filterFn : column.columnDef.filterFn === "auto" ? column.getAutoFilterFn() : (
        // @ts-ignore
        (_table$options$filter = (_table$options$filter2 = table.options.filterFns) == null ? void 0 : _table$options$filter2[column.columnDef.filterFn]) != null ? _table$options$filter : filterFns[column.columnDef.filterFn]
      );
    };
    column.getCanFilter = () => {
      var _column$columnDef$ena, _table$options$enable, _table$options$enable2;
      return ((_column$columnDef$ena = column.columnDef.enableColumnFilter) != null ? _column$columnDef$ena : true) && ((_table$options$enable = table.options.enableColumnFilters) != null ? _table$options$enable : true) && ((_table$options$enable2 = table.options.enableFilters) != null ? _table$options$enable2 : true) && !!column.accessorFn;
    };
    column.getIsFiltered = () => column.getFilterIndex() > -1;
    column.getFilterValue = () => {
      var _table$getState$colum;
      return (_table$getState$colum = table.getState().columnFilters) == null || (_table$getState$colum = _table$getState$colum.find((d) => d.id === column.id)) == null ? void 0 : _table$getState$colum.value;
    };
    column.getFilterIndex = () => {
      var _table$getState$colum2, _table$getState$colum3;
      return (_table$getState$colum2 = (_table$getState$colum3 = table.getState().columnFilters) == null ? void 0 : _table$getState$colum3.findIndex((d) => d.id === column.id)) != null ? _table$getState$colum2 : -1;
    };
    column.setFilterValue = (value) => {
      table.setColumnFilters((old) => {
        const filterFn = column.getFilterFn();
        const previousFilter = old == null ? void 0 : old.find((d) => d.id === column.id);
        const newFilter = functionalUpdate(value, previousFilter ? previousFilter.value : void 0);
        if (shouldAutoRemoveFilter(filterFn, newFilter, column)) {
          var _old$filter;
          return (_old$filter = old == null ? void 0 : old.filter((d) => d.id !== column.id)) != null ? _old$filter : [];
        }
        const newFilterObj = {
          id: column.id,
          value: newFilter
        };
        if (previousFilter) {
          var _old$map;
          return (_old$map = old == null ? void 0 : old.map((d) => {
            if (d.id === column.id) {
              return newFilterObj;
            }
            return d;
          })) != null ? _old$map : [];
        }
        if (old != null && old.length) {
          return [...old, newFilterObj];
        }
        return [newFilterObj];
      });
    };
  },
  createRow: (row, _table) => {
    row.columnFilters = {};
    row.columnFiltersMeta = {};
  },
  createTable: (table) => {
    table.setColumnFilters = (updater) => {
      const leafColumns = table.getAllLeafColumns();
      const updateFn = (old) => {
        var _functionalUpdate;
        return (_functionalUpdate = functionalUpdate(updater, old)) == null ? void 0 : _functionalUpdate.filter((filter) => {
          const column = leafColumns.find((d) => d.id === filter.id);
          if (column) {
            const filterFn = column.getFilterFn();
            if (shouldAutoRemoveFilter(filterFn, filter.value, column)) {
              return false;
            }
          }
          return true;
        });
      };
      table.options.onColumnFiltersChange == null || table.options.onColumnFiltersChange(updateFn);
    };
    table.resetColumnFilters = (defaultState) => {
      var _table$initialState$c, _table$initialState;
      table.setColumnFilters(defaultState ? [] : (_table$initialState$c = (_table$initialState = table.initialState) == null ? void 0 : _table$initialState.columnFilters) != null ? _table$initialState$c : []);
    };
    table.getPreFilteredRowModel = () => table.getCoreRowModel();
    table.getFilteredRowModel = () => {
      if (!table._getFilteredRowModel && table.options.getFilteredRowModel) {
        table._getFilteredRowModel = table.options.getFilteredRowModel(table);
      }
      if (table.options.manualFiltering || !table._getFilteredRowModel) {
        return table.getPreFilteredRowModel();
      }
      return table._getFilteredRowModel();
    };
  }
};
function shouldAutoRemoveFilter(filterFn, value, column) {
  return (filterFn && filterFn.autoRemove ? filterFn.autoRemove(value, column) : false) || typeof value === "undefined" || typeof value === "string" && !value;
}
var sum = (columnId, _leafRows, childRows) => {
  return childRows.reduce((sum2, next) => {
    const nextValue = next.getValue(columnId);
    return sum2 + (typeof nextValue === "number" ? nextValue : 0);
  }, 0);
};
var min = (columnId, _leafRows, childRows) => {
  let min2;
  childRows.forEach((row) => {
    const value = row.getValue(columnId);
    if (value != null && (min2 > value || min2 === void 0 && value >= value)) {
      min2 = value;
    }
  });
  return min2;
};
var max = (columnId, _leafRows, childRows) => {
  let max2;
  childRows.forEach((row) => {
    const value = row.getValue(columnId);
    if (value != null && (max2 < value || max2 === void 0 && value >= value)) {
      max2 = value;
    }
  });
  return max2;
};
var extent = (columnId, _leafRows, childRows) => {
  let min2;
  let max2;
  childRows.forEach((row) => {
    const value = row.getValue(columnId);
    if (value != null) {
      if (min2 === void 0) {
        if (value >= value) min2 = max2 = value;
      } else {
        if (min2 > value) min2 = value;
        if (max2 < value) max2 = value;
      }
    }
  });
  return [min2, max2];
};
var mean = (columnId, leafRows) => {
  let count2 = 0;
  let sum2 = 0;
  leafRows.forEach((row) => {
    let value = row.getValue(columnId);
    if (value != null && (value = +value) >= value) {
      ++count2, sum2 += value;
    }
  });
  if (count2) return sum2 / count2;
  return;
};
var median = (columnId, leafRows) => {
  if (!leafRows.length) {
    return;
  }
  const values = leafRows.map((row) => row.getValue(columnId));
  if (!isNumberArray(values)) {
    return;
  }
  if (values.length === 1) {
    return values[0];
  }
  const mid = Math.floor(values.length / 2);
  const nums = values.sort((a, b) => a - b);
  return values.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
};
var unique = (columnId, leafRows) => {
  return Array.from(new Set(leafRows.map((d) => d.getValue(columnId))).values());
};
var uniqueCount = (columnId, leafRows) => {
  return new Set(leafRows.map((d) => d.getValue(columnId))).size;
};
var count = (_columnId, leafRows) => {
  return leafRows.length;
};
var aggregationFns = {
  sum,
  min,
  max,
  extent,
  mean,
  median,
  unique,
  uniqueCount,
  count
};
var ColumnGrouping = {
  getDefaultColumnDef: () => {
    return {
      aggregatedCell: (props) => {
        var _toString, _props$getValue;
        return (_toString = (_props$getValue = props.getValue()) == null || _props$getValue.toString == null ? void 0 : _props$getValue.toString()) != null ? _toString : null;
      },
      aggregationFn: "auto"
    };
  },
  getInitialState: (state) => {
    return {
      grouping: [],
      ...state
    };
  },
  getDefaultOptions: (table) => {
    return {
      onGroupingChange: makeStateUpdater("grouping", table),
      groupedColumnMode: "reorder"
    };
  },
  createColumn: (column, table) => {
    column.toggleGrouping = () => {
      table.setGrouping((old) => {
        if (old != null && old.includes(column.id)) {
          return old.filter((d) => d !== column.id);
        }
        return [...old != null ? old : [], column.id];
      });
    };
    column.getCanGroup = () => {
      var _column$columnDef$ena, _table$options$enable;
      return ((_column$columnDef$ena = column.columnDef.enableGrouping) != null ? _column$columnDef$ena : true) && ((_table$options$enable = table.options.enableGrouping) != null ? _table$options$enable : true) && (!!column.accessorFn || !!column.columnDef.getGroupingValue);
    };
    column.getIsGrouped = () => {
      var _table$getState$group;
      return (_table$getState$group = table.getState().grouping) == null ? void 0 : _table$getState$group.includes(column.id);
    };
    column.getGroupedIndex = () => {
      var _table$getState$group2;
      return (_table$getState$group2 = table.getState().grouping) == null ? void 0 : _table$getState$group2.indexOf(column.id);
    };
    column.getToggleGroupingHandler = () => {
      const canGroup = column.getCanGroup();
      return () => {
        if (!canGroup) return;
        column.toggleGrouping();
      };
    };
    column.getAutoAggregationFn = () => {
      const firstRow = table.getCoreRowModel().flatRows[0];
      const value = firstRow == null ? void 0 : firstRow.getValue(column.id);
      if (typeof value === "number") {
        return aggregationFns.sum;
      }
      if (Object.prototype.toString.call(value) === "[object Date]") {
        return aggregationFns.extent;
      }
    };
    column.getAggregationFn = () => {
      var _table$options$aggreg, _table$options$aggreg2;
      if (!column) {
        throw new Error();
      }
      return isFunction(column.columnDef.aggregationFn) ? column.columnDef.aggregationFn : column.columnDef.aggregationFn === "auto" ? column.getAutoAggregationFn() : (_table$options$aggreg = (_table$options$aggreg2 = table.options.aggregationFns) == null ? void 0 : _table$options$aggreg2[column.columnDef.aggregationFn]) != null ? _table$options$aggreg : aggregationFns[column.columnDef.aggregationFn];
    };
  },
  createTable: (table) => {
    table.setGrouping = (updater) => table.options.onGroupingChange == null ? void 0 : table.options.onGroupingChange(updater);
    table.resetGrouping = (defaultState) => {
      var _table$initialState$g, _table$initialState;
      table.setGrouping(defaultState ? [] : (_table$initialState$g = (_table$initialState = table.initialState) == null ? void 0 : _table$initialState.grouping) != null ? _table$initialState$g : []);
    };
    table.getPreGroupedRowModel = () => table.getFilteredRowModel();
    table.getGroupedRowModel = () => {
      if (!table._getGroupedRowModel && table.options.getGroupedRowModel) {
        table._getGroupedRowModel = table.options.getGroupedRowModel(table);
      }
      if (table.options.manualGrouping || !table._getGroupedRowModel) {
        return table.getPreGroupedRowModel();
      }
      return table._getGroupedRowModel();
    };
  },
  createRow: (row, table) => {
    row.getIsGrouped = () => !!row.groupingColumnId;
    row.getGroupingValue = (columnId) => {
      if (row._groupingValuesCache.hasOwnProperty(columnId)) {
        return row._groupingValuesCache[columnId];
      }
      const column = table.getColumn(columnId);
      if (!(column != null && column.columnDef.getGroupingValue)) {
        return row.getValue(columnId);
      }
      row._groupingValuesCache[columnId] = column.columnDef.getGroupingValue(row.original);
      return row._groupingValuesCache[columnId];
    };
    row._groupingValuesCache = {};
  },
  createCell: (cell, column, row, table) => {
    cell.getIsGrouped = () => column.getIsGrouped() && column.id === row.groupingColumnId;
    cell.getIsPlaceholder = () => !cell.getIsGrouped() && column.getIsGrouped();
    cell.getIsAggregated = () => {
      var _row$subRows;
      return !cell.getIsGrouped() && !cell.getIsPlaceholder() && !!((_row$subRows = row.subRows) != null && _row$subRows.length);
    };
  }
};
function orderColumns(leafColumns, grouping, groupedColumnMode) {
  if (!(grouping != null && grouping.length) || !groupedColumnMode) {
    return leafColumns;
  }
  const nonGroupingColumns = leafColumns.filter((col) => !grouping.includes(col.id));
  if (groupedColumnMode === "remove") {
    return nonGroupingColumns;
  }
  const groupingColumns = grouping.map((g) => leafColumns.find((col) => col.id === g)).filter(Boolean);
  return [...groupingColumns, ...nonGroupingColumns];
}
var ColumnOrdering = {
  getInitialState: (state) => {
    return {
      columnOrder: [],
      ...state
    };
  },
  getDefaultOptions: (table) => {
    return {
      onColumnOrderChange: makeStateUpdater("columnOrder", table)
    };
  },
  createColumn: (column, table) => {
    column.getIndex = memo((position) => [_getVisibleLeafColumns(table, position)], (columns) => columns.findIndex((d) => d.id === column.id), getMemoOptions(table.options, "debugColumns", "getIndex"));
    column.getIsFirstColumn = (position) => {
      var _columns$;
      const columns = _getVisibleLeafColumns(table, position);
      return ((_columns$ = columns[0]) == null ? void 0 : _columns$.id) === column.id;
    };
    column.getIsLastColumn = (position) => {
      var _columns;
      const columns = _getVisibleLeafColumns(table, position);
      return ((_columns = columns[columns.length - 1]) == null ? void 0 : _columns.id) === column.id;
    };
  },
  createTable: (table) => {
    table.setColumnOrder = (updater) => table.options.onColumnOrderChange == null ? void 0 : table.options.onColumnOrderChange(updater);
    table.resetColumnOrder = (defaultState) => {
      var _table$initialState$c;
      table.setColumnOrder(defaultState ? [] : (_table$initialState$c = table.initialState.columnOrder) != null ? _table$initialState$c : []);
    };
    table._getOrderColumnsFn = memo(() => [table.getState().columnOrder, table.getState().grouping, table.options.groupedColumnMode], (columnOrder, grouping, groupedColumnMode) => (columns) => {
      let orderedColumns = [];
      if (!(columnOrder != null && columnOrder.length)) {
        orderedColumns = columns;
      } else {
        const columnOrderCopy = [...columnOrder];
        const columnsCopy = [...columns];
        while (columnsCopy.length && columnOrderCopy.length) {
          const targetColumnId = columnOrderCopy.shift();
          const foundIndex = columnsCopy.findIndex((d) => d.id === targetColumnId);
          if (foundIndex > -1) {
            orderedColumns.push(columnsCopy.splice(foundIndex, 1)[0]);
          }
        }
        orderedColumns = [...orderedColumns, ...columnsCopy];
      }
      return orderColumns(orderedColumns, grouping, groupedColumnMode);
    }, getMemoOptions(table.options, "debugTable", "_getOrderColumnsFn"));
  }
};
var getDefaultColumnPinningState = () => ({
  left: [],
  right: []
});
var ColumnPinning = {
  getInitialState: (state) => {
    return {
      columnPinning: getDefaultColumnPinningState(),
      ...state
    };
  },
  getDefaultOptions: (table) => {
    return {
      onColumnPinningChange: makeStateUpdater("columnPinning", table)
    };
  },
  createColumn: (column, table) => {
    column.pin = (position) => {
      const columnIds = column.getLeafColumns().map((d) => d.id).filter(Boolean);
      table.setColumnPinning((old) => {
        var _old$left3, _old$right3;
        if (position === "right") {
          var _old$left, _old$right;
          return {
            left: ((_old$left = old == null ? void 0 : old.left) != null ? _old$left : []).filter((d) => !(columnIds != null && columnIds.includes(d))),
            right: [...((_old$right = old == null ? void 0 : old.right) != null ? _old$right : []).filter((d) => !(columnIds != null && columnIds.includes(d))), ...columnIds]
          };
        }
        if (position === "left") {
          var _old$left2, _old$right2;
          return {
            left: [...((_old$left2 = old == null ? void 0 : old.left) != null ? _old$left2 : []).filter((d) => !(columnIds != null && columnIds.includes(d))), ...columnIds],
            right: ((_old$right2 = old == null ? void 0 : old.right) != null ? _old$right2 : []).filter((d) => !(columnIds != null && columnIds.includes(d)))
          };
        }
        return {
          left: ((_old$left3 = old == null ? void 0 : old.left) != null ? _old$left3 : []).filter((d) => !(columnIds != null && columnIds.includes(d))),
          right: ((_old$right3 = old == null ? void 0 : old.right) != null ? _old$right3 : []).filter((d) => !(columnIds != null && columnIds.includes(d)))
        };
      });
    };
    column.getCanPin = () => {
      const leafColumns = column.getLeafColumns();
      return leafColumns.some((d) => {
        var _d$columnDef$enablePi, _ref, _table$options$enable;
        return ((_d$columnDef$enablePi = d.columnDef.enablePinning) != null ? _d$columnDef$enablePi : true) && ((_ref = (_table$options$enable = table.options.enableColumnPinning) != null ? _table$options$enable : table.options.enablePinning) != null ? _ref : true);
      });
    };
    column.getIsPinned = () => {
      const leafColumnIds = column.getLeafColumns().map((d) => d.id);
      const {
        left,
        right
      } = table.getState().columnPinning;
      const isLeft = leafColumnIds.some((d) => left == null ? void 0 : left.includes(d));
      const isRight = leafColumnIds.some((d) => right == null ? void 0 : right.includes(d));
      return isLeft ? "left" : isRight ? "right" : false;
    };
    column.getPinnedIndex = () => {
      var _table$getState$colum, _table$getState$colum2;
      const position = column.getIsPinned();
      return position ? (_table$getState$colum = (_table$getState$colum2 = table.getState().columnPinning) == null || (_table$getState$colum2 = _table$getState$colum2[position]) == null ? void 0 : _table$getState$colum2.indexOf(column.id)) != null ? _table$getState$colum : -1 : 0;
    };
  },
  createRow: (row, table) => {
    row.getCenterVisibleCells = memo(() => [row._getAllVisibleCells(), table.getState().columnPinning.left, table.getState().columnPinning.right], (allCells, left, right) => {
      const leftAndRight = [...left != null ? left : [], ...right != null ? right : []];
      return allCells.filter((d) => !leftAndRight.includes(d.column.id));
    }, getMemoOptions(table.options, "debugRows", "getCenterVisibleCells"));
    row.getLeftVisibleCells = memo(() => [row._getAllVisibleCells(), table.getState().columnPinning.left], (allCells, left) => {
      const cells = (left != null ? left : []).map((columnId) => allCells.find((cell) => cell.column.id === columnId)).filter(Boolean).map((d) => ({
        ...d,
        position: "left"
      }));
      return cells;
    }, getMemoOptions(table.options, "debugRows", "getLeftVisibleCells"));
    row.getRightVisibleCells = memo(() => [row._getAllVisibleCells(), table.getState().columnPinning.right], (allCells, right) => {
      const cells = (right != null ? right : []).map((columnId) => allCells.find((cell) => cell.column.id === columnId)).filter(Boolean).map((d) => ({
        ...d,
        position: "right"
      }));
      return cells;
    }, getMemoOptions(table.options, "debugRows", "getRightVisibleCells"));
  },
  createTable: (table) => {
    table.setColumnPinning = (updater) => table.options.onColumnPinningChange == null ? void 0 : table.options.onColumnPinningChange(updater);
    table.resetColumnPinning = (defaultState) => {
      var _table$initialState$c, _table$initialState;
      return table.setColumnPinning(defaultState ? getDefaultColumnPinningState() : (_table$initialState$c = (_table$initialState = table.initialState) == null ? void 0 : _table$initialState.columnPinning) != null ? _table$initialState$c : getDefaultColumnPinningState());
    };
    table.getIsSomeColumnsPinned = (position) => {
      var _pinningState$positio;
      const pinningState = table.getState().columnPinning;
      if (!position) {
        var _pinningState$left, _pinningState$right;
        return Boolean(((_pinningState$left = pinningState.left) == null ? void 0 : _pinningState$left.length) || ((_pinningState$right = pinningState.right) == null ? void 0 : _pinningState$right.length));
      }
      return Boolean((_pinningState$positio = pinningState[position]) == null ? void 0 : _pinningState$positio.length);
    };
    table.getLeftLeafColumns = memo(() => [table.getAllLeafColumns(), table.getState().columnPinning.left], (allColumns, left) => {
      return (left != null ? left : []).map((columnId) => allColumns.find((column) => column.id === columnId)).filter(Boolean);
    }, getMemoOptions(table.options, "debugColumns", "getLeftLeafColumns"));
    table.getRightLeafColumns = memo(() => [table.getAllLeafColumns(), table.getState().columnPinning.right], (allColumns, right) => {
      return (right != null ? right : []).map((columnId) => allColumns.find((column) => column.id === columnId)).filter(Boolean);
    }, getMemoOptions(table.options, "debugColumns", "getRightLeafColumns"));
    table.getCenterLeafColumns = memo(() => [table.getAllLeafColumns(), table.getState().columnPinning.left, table.getState().columnPinning.right], (allColumns, left, right) => {
      const leftAndRight = [...left != null ? left : [], ...right != null ? right : []];
      return allColumns.filter((d) => !leftAndRight.includes(d.id));
    }, getMemoOptions(table.options, "debugColumns", "getCenterLeafColumns"));
  }
};
function safelyAccessDocument(_document) {
  return _document || (typeof document !== "undefined" ? document : null);
}
var defaultColumnSizing = {
  size: 150,
  minSize: 20,
  maxSize: Number.MAX_SAFE_INTEGER
};
var getDefaultColumnSizingInfoState = () => ({
  startOffset: null,
  startSize: null,
  deltaOffset: null,
  deltaPercentage: null,
  isResizingColumn: false,
  columnSizingStart: []
});
var ColumnSizing = {
  getDefaultColumnDef: () => {
    return defaultColumnSizing;
  },
  getInitialState: (state) => {
    return {
      columnSizing: {},
      columnSizingInfo: getDefaultColumnSizingInfoState(),
      ...state
    };
  },
  getDefaultOptions: (table) => {
    return {
      columnResizeMode: "onEnd",
      columnResizeDirection: "ltr",
      onColumnSizingChange: makeStateUpdater("columnSizing", table),
      onColumnSizingInfoChange: makeStateUpdater("columnSizingInfo", table)
    };
  },
  createColumn: (column, table) => {
    column.getSize = () => {
      var _column$columnDef$min, _ref, _column$columnDef$max;
      const columnSize = table.getState().columnSizing[column.id];
      return Math.min(Math.max((_column$columnDef$min = column.columnDef.minSize) != null ? _column$columnDef$min : defaultColumnSizing.minSize, (_ref = columnSize != null ? columnSize : column.columnDef.size) != null ? _ref : defaultColumnSizing.size), (_column$columnDef$max = column.columnDef.maxSize) != null ? _column$columnDef$max : defaultColumnSizing.maxSize);
    };
    column.getStart = memo((position) => [position, _getVisibleLeafColumns(table, position), table.getState().columnSizing], (position, columns) => columns.slice(0, column.getIndex(position)).reduce((sum2, column2) => sum2 + column2.getSize(), 0), getMemoOptions(table.options, "debugColumns", "getStart"));
    column.getAfter = memo((position) => [position, _getVisibleLeafColumns(table, position), table.getState().columnSizing], (position, columns) => columns.slice(column.getIndex(position) + 1).reduce((sum2, column2) => sum2 + column2.getSize(), 0), getMemoOptions(table.options, "debugColumns", "getAfter"));
    column.resetSize = () => {
      table.setColumnSizing((_ref2) => {
        let {
          [column.id]: _,
          ...rest
        } = _ref2;
        return rest;
      });
    };
    column.getCanResize = () => {
      var _column$columnDef$ena, _table$options$enable;
      return ((_column$columnDef$ena = column.columnDef.enableResizing) != null ? _column$columnDef$ena : true) && ((_table$options$enable = table.options.enableColumnResizing) != null ? _table$options$enable : true);
    };
    column.getIsResizing = () => {
      return table.getState().columnSizingInfo.isResizingColumn === column.id;
    };
  },
  createHeader: (header, table) => {
    header.getSize = () => {
      let sum2 = 0;
      const recurse = (header2) => {
        if (header2.subHeaders.length) {
          header2.subHeaders.forEach(recurse);
        } else {
          var _header$column$getSiz;
          sum2 += (_header$column$getSiz = header2.column.getSize()) != null ? _header$column$getSiz : 0;
        }
      };
      recurse(header);
      return sum2;
    };
    header.getStart = () => {
      if (header.index > 0) {
        const prevSiblingHeader = header.headerGroup.headers[header.index - 1];
        return prevSiblingHeader.getStart() + prevSiblingHeader.getSize();
      }
      return 0;
    };
    header.getResizeHandler = (_contextDocument) => {
      const column = table.getColumn(header.column.id);
      const canResize = column == null ? void 0 : column.getCanResize();
      return (e) => {
        if (!column || !canResize) {
          return;
        }
        e.persist == null || e.persist();
        if (isTouchStartEvent(e)) {
          if (e.touches && e.touches.length > 1) {
            return;
          }
        }
        const startSize = header.getSize();
        const columnSizingStart = header ? header.getLeafHeaders().map((d) => [d.column.id, d.column.getSize()]) : [[column.id, column.getSize()]];
        const clientX = isTouchStartEvent(e) ? Math.round(e.touches[0].clientX) : e.clientX;
        const newColumnSizing = {};
        const updateOffset = (eventType, clientXPos) => {
          if (typeof clientXPos !== "number") {
            return;
          }
          table.setColumnSizingInfo((old) => {
            var _old$startOffset, _old$startSize;
            const deltaDirection = table.options.columnResizeDirection === "rtl" ? -1 : 1;
            const deltaOffset = (clientXPos - ((_old$startOffset = old == null ? void 0 : old.startOffset) != null ? _old$startOffset : 0)) * deltaDirection;
            const deltaPercentage = Math.max(deltaOffset / ((_old$startSize = old == null ? void 0 : old.startSize) != null ? _old$startSize : 0), -0.999999);
            old.columnSizingStart.forEach((_ref3) => {
              let [columnId, headerSize] = _ref3;
              newColumnSizing[columnId] = Math.round(Math.max(headerSize + headerSize * deltaPercentage, 0) * 100) / 100;
            });
            return {
              ...old,
              deltaOffset,
              deltaPercentage
            };
          });
          if (table.options.columnResizeMode === "onChange" || eventType === "end") {
            table.setColumnSizing((old) => ({
              ...old,
              ...newColumnSizing
            }));
          }
        };
        const onMove = (clientXPos) => updateOffset("move", clientXPos);
        const onEnd = (clientXPos) => {
          updateOffset("end", clientXPos);
          table.setColumnSizingInfo((old) => ({
            ...old,
            isResizingColumn: false,
            startOffset: null,
            startSize: null,
            deltaOffset: null,
            deltaPercentage: null,
            columnSizingStart: []
          }));
        };
        const contextDocument = safelyAccessDocument(_contextDocument);
        const mouseEvents = {
          moveHandler: (e2) => onMove(e2.clientX),
          upHandler: (e2) => {
            contextDocument == null || contextDocument.removeEventListener("mousemove", mouseEvents.moveHandler);
            contextDocument == null || contextDocument.removeEventListener("mouseup", mouseEvents.upHandler);
            onEnd(e2.clientX);
          }
        };
        const touchEvents = {
          moveHandler: (e2) => {
            if (e2.cancelable) {
              e2.preventDefault();
              e2.stopPropagation();
            }
            onMove(e2.touches[0].clientX);
            return false;
          },
          upHandler: (e2) => {
            var _e$touches$;
            contextDocument == null || contextDocument.removeEventListener("touchmove", touchEvents.moveHandler);
            contextDocument == null || contextDocument.removeEventListener("touchend", touchEvents.upHandler);
            if (e2.cancelable) {
              e2.preventDefault();
              e2.stopPropagation();
            }
            onEnd((_e$touches$ = e2.touches[0]) == null ? void 0 : _e$touches$.clientX);
          }
        };
        const passiveIfSupported = passiveEventSupported() ? {
          passive: false
        } : false;
        if (isTouchStartEvent(e)) {
          contextDocument == null || contextDocument.addEventListener("touchmove", touchEvents.moveHandler, passiveIfSupported);
          contextDocument == null || contextDocument.addEventListener("touchend", touchEvents.upHandler, passiveIfSupported);
        } else {
          contextDocument == null || contextDocument.addEventListener("mousemove", mouseEvents.moveHandler, passiveIfSupported);
          contextDocument == null || contextDocument.addEventListener("mouseup", mouseEvents.upHandler, passiveIfSupported);
        }
        table.setColumnSizingInfo((old) => ({
          ...old,
          startOffset: clientX,
          startSize,
          deltaOffset: 0,
          deltaPercentage: 0,
          columnSizingStart,
          isResizingColumn: column.id
        }));
      };
    };
  },
  createTable: (table) => {
    table.setColumnSizing = (updater) => table.options.onColumnSizingChange == null ? void 0 : table.options.onColumnSizingChange(updater);
    table.setColumnSizingInfo = (updater) => table.options.onColumnSizingInfoChange == null ? void 0 : table.options.onColumnSizingInfoChange(updater);
    table.resetColumnSizing = (defaultState) => {
      var _table$initialState$c;
      table.setColumnSizing(defaultState ? {} : (_table$initialState$c = table.initialState.columnSizing) != null ? _table$initialState$c : {});
    };
    table.resetHeaderSizeInfo = (defaultState) => {
      var _table$initialState$c2;
      table.setColumnSizingInfo(defaultState ? getDefaultColumnSizingInfoState() : (_table$initialState$c2 = table.initialState.columnSizingInfo) != null ? _table$initialState$c2 : getDefaultColumnSizingInfoState());
    };
    table.getTotalSize = () => {
      var _table$getHeaderGroup, _table$getHeaderGroup2;
      return (_table$getHeaderGroup = (_table$getHeaderGroup2 = table.getHeaderGroups()[0]) == null ? void 0 : _table$getHeaderGroup2.headers.reduce((sum2, header) => {
        return sum2 + header.getSize();
      }, 0)) != null ? _table$getHeaderGroup : 0;
    };
    table.getLeftTotalSize = () => {
      var _table$getLeftHeaderG, _table$getLeftHeaderG2;
      return (_table$getLeftHeaderG = (_table$getLeftHeaderG2 = table.getLeftHeaderGroups()[0]) == null ? void 0 : _table$getLeftHeaderG2.headers.reduce((sum2, header) => {
        return sum2 + header.getSize();
      }, 0)) != null ? _table$getLeftHeaderG : 0;
    };
    table.getCenterTotalSize = () => {
      var _table$getCenterHeade, _table$getCenterHeade2;
      return (_table$getCenterHeade = (_table$getCenterHeade2 = table.getCenterHeaderGroups()[0]) == null ? void 0 : _table$getCenterHeade2.headers.reduce((sum2, header) => {
        return sum2 + header.getSize();
      }, 0)) != null ? _table$getCenterHeade : 0;
    };
    table.getRightTotalSize = () => {
      var _table$getRightHeader, _table$getRightHeader2;
      return (_table$getRightHeader = (_table$getRightHeader2 = table.getRightHeaderGroups()[0]) == null ? void 0 : _table$getRightHeader2.headers.reduce((sum2, header) => {
        return sum2 + header.getSize();
      }, 0)) != null ? _table$getRightHeader : 0;
    };
  }
};
var passiveSupported = null;
function passiveEventSupported() {
  if (typeof passiveSupported === "boolean") return passiveSupported;
  let supported = false;
  try {
    const options = {
      get passive() {
        supported = true;
        return false;
      }
    };
    const noop = () => {
    };
    window.addEventListener("test", noop, options);
    window.removeEventListener("test", noop);
  } catch (err) {
    supported = false;
  }
  passiveSupported = supported;
  return passiveSupported;
}
function isTouchStartEvent(e) {
  return e.type === "touchstart";
}
var ColumnVisibility = {
  getInitialState: (state) => {
    return {
      columnVisibility: {},
      ...state
    };
  },
  getDefaultOptions: (table) => {
    return {
      onColumnVisibilityChange: makeStateUpdater("columnVisibility", table)
    };
  },
  createColumn: (column, table) => {
    column.toggleVisibility = (value) => {
      if (column.getCanHide()) {
        table.setColumnVisibility((old) => ({
          ...old,
          [column.id]: value != null ? value : !column.getIsVisible()
        }));
      }
    };
    column.getIsVisible = () => {
      var _ref, _table$getState$colum;
      const childColumns = column.columns;
      return (_ref = childColumns.length ? childColumns.some((c) => c.getIsVisible()) : (_table$getState$colum = table.getState().columnVisibility) == null ? void 0 : _table$getState$colum[column.id]) != null ? _ref : true;
    };
    column.getCanHide = () => {
      var _column$columnDef$ena, _table$options$enable;
      return ((_column$columnDef$ena = column.columnDef.enableHiding) != null ? _column$columnDef$ena : true) && ((_table$options$enable = table.options.enableHiding) != null ? _table$options$enable : true);
    };
    column.getToggleVisibilityHandler = () => {
      return (e) => {
        column.toggleVisibility == null || column.toggleVisibility(e.target.checked);
      };
    };
  },
  createRow: (row, table) => {
    row._getAllVisibleCells = memo(() => [row.getAllCells(), table.getState().columnVisibility], (cells) => {
      return cells.filter((cell) => cell.column.getIsVisible());
    }, getMemoOptions(table.options, "debugRows", "_getAllVisibleCells"));
    row.getVisibleCells = memo(() => [row.getLeftVisibleCells(), row.getCenterVisibleCells(), row.getRightVisibleCells()], (left, center, right) => [...left, ...center, ...right], getMemoOptions(table.options, "debugRows", "getVisibleCells"));
  },
  createTable: (table) => {
    const makeVisibleColumnsMethod = (key, getColumns) => {
      return memo(() => [getColumns(), getColumns().filter((d) => d.getIsVisible()).map((d) => d.id).join("_")], (columns) => {
        return columns.filter((d) => d.getIsVisible == null ? void 0 : d.getIsVisible());
      }, getMemoOptions(table.options, "debugColumns", key));
    };
    table.getVisibleFlatColumns = makeVisibleColumnsMethod("getVisibleFlatColumns", () => table.getAllFlatColumns());
    table.getVisibleLeafColumns = makeVisibleColumnsMethod("getVisibleLeafColumns", () => table.getAllLeafColumns());
    table.getLeftVisibleLeafColumns = makeVisibleColumnsMethod("getLeftVisibleLeafColumns", () => table.getLeftLeafColumns());
    table.getRightVisibleLeafColumns = makeVisibleColumnsMethod("getRightVisibleLeafColumns", () => table.getRightLeafColumns());
    table.getCenterVisibleLeafColumns = makeVisibleColumnsMethod("getCenterVisibleLeafColumns", () => table.getCenterLeafColumns());
    table.setColumnVisibility = (updater) => table.options.onColumnVisibilityChange == null ? void 0 : table.options.onColumnVisibilityChange(updater);
    table.resetColumnVisibility = (defaultState) => {
      var _table$initialState$c;
      table.setColumnVisibility(defaultState ? {} : (_table$initialState$c = table.initialState.columnVisibility) != null ? _table$initialState$c : {});
    };
    table.toggleAllColumnsVisible = (value) => {
      var _value;
      value = (_value = value) != null ? _value : !table.getIsAllColumnsVisible();
      table.setColumnVisibility(table.getAllLeafColumns().reduce((obj, column) => ({
        ...obj,
        [column.id]: !value ? !(column.getCanHide != null && column.getCanHide()) : value
      }), {}));
    };
    table.getIsAllColumnsVisible = () => !table.getAllLeafColumns().some((column) => !(column.getIsVisible != null && column.getIsVisible()));
    table.getIsSomeColumnsVisible = () => table.getAllLeafColumns().some((column) => column.getIsVisible == null ? void 0 : column.getIsVisible());
    table.getToggleAllColumnsVisibilityHandler = () => {
      return (e) => {
        var _target;
        table.toggleAllColumnsVisible((_target = e.target) == null ? void 0 : _target.checked);
      };
    };
  }
};
function _getVisibleLeafColumns(table, position) {
  return !position ? table.getVisibleLeafColumns() : position === "center" ? table.getCenterVisibleLeafColumns() : position === "left" ? table.getLeftVisibleLeafColumns() : table.getRightVisibleLeafColumns();
}
var GlobalFaceting = {
  createTable: (table) => {
    table._getGlobalFacetedRowModel = table.options.getFacetedRowModel && table.options.getFacetedRowModel(table, "__global__");
    table.getGlobalFacetedRowModel = () => {
      if (table.options.manualFiltering || !table._getGlobalFacetedRowModel) {
        return table.getPreFilteredRowModel();
      }
      return table._getGlobalFacetedRowModel();
    };
    table._getGlobalFacetedUniqueValues = table.options.getFacetedUniqueValues && table.options.getFacetedUniqueValues(table, "__global__");
    table.getGlobalFacetedUniqueValues = () => {
      if (!table._getGlobalFacetedUniqueValues) {
        return /* @__PURE__ */ new Map();
      }
      return table._getGlobalFacetedUniqueValues();
    };
    table._getGlobalFacetedMinMaxValues = table.options.getFacetedMinMaxValues && table.options.getFacetedMinMaxValues(table, "__global__");
    table.getGlobalFacetedMinMaxValues = () => {
      if (!table._getGlobalFacetedMinMaxValues) {
        return;
      }
      return table._getGlobalFacetedMinMaxValues();
    };
  }
};
var GlobalFiltering = {
  getInitialState: (state) => {
    return {
      globalFilter: void 0,
      ...state
    };
  },
  getDefaultOptions: (table) => {
    return {
      onGlobalFilterChange: makeStateUpdater("globalFilter", table),
      globalFilterFn: "auto",
      getColumnCanGlobalFilter: (column) => {
        var _table$getCoreRowMode;
        const value = (_table$getCoreRowMode = table.getCoreRowModel().flatRows[0]) == null || (_table$getCoreRowMode = _table$getCoreRowMode._getAllCellsByColumnId()[column.id]) == null ? void 0 : _table$getCoreRowMode.getValue();
        return typeof value === "string" || typeof value === "number";
      }
    };
  },
  createColumn: (column, table) => {
    column.getCanGlobalFilter = () => {
      var _column$columnDef$ena, _table$options$enable, _table$options$enable2, _table$options$getCol;
      return ((_column$columnDef$ena = column.columnDef.enableGlobalFilter) != null ? _column$columnDef$ena : true) && ((_table$options$enable = table.options.enableGlobalFilter) != null ? _table$options$enable : true) && ((_table$options$enable2 = table.options.enableFilters) != null ? _table$options$enable2 : true) && ((_table$options$getCol = table.options.getColumnCanGlobalFilter == null ? void 0 : table.options.getColumnCanGlobalFilter(column)) != null ? _table$options$getCol : true) && !!column.accessorFn;
    };
  },
  createTable: (table) => {
    table.getGlobalAutoFilterFn = () => {
      return filterFns.includesString;
    };
    table.getGlobalFilterFn = () => {
      var _table$options$filter, _table$options$filter2;
      const {
        globalFilterFn
      } = table.options;
      return isFunction(globalFilterFn) ? globalFilterFn : globalFilterFn === "auto" ? table.getGlobalAutoFilterFn() : (_table$options$filter = (_table$options$filter2 = table.options.filterFns) == null ? void 0 : _table$options$filter2[globalFilterFn]) != null ? _table$options$filter : filterFns[globalFilterFn];
    };
    table.setGlobalFilter = (updater) => {
      table.options.onGlobalFilterChange == null || table.options.onGlobalFilterChange(updater);
    };
    table.resetGlobalFilter = (defaultState) => {
      table.setGlobalFilter(defaultState ? void 0 : table.initialState.globalFilter);
    };
  }
};
var RowExpanding = {
  getInitialState: (state) => {
    return {
      expanded: {},
      ...state
    };
  },
  getDefaultOptions: (table) => {
    return {
      onExpandedChange: makeStateUpdater("expanded", table),
      paginateExpandedRows: true
    };
  },
  createTable: (table) => {
    let registered = false;
    let queued = false;
    table._autoResetExpanded = () => {
      var _ref, _table$options$autoRe;
      if (!registered) {
        table._queue(() => {
          registered = true;
        });
        return;
      }
      if ((_ref = (_table$options$autoRe = table.options.autoResetAll) != null ? _table$options$autoRe : table.options.autoResetExpanded) != null ? _ref : !table.options.manualExpanding) {
        if (queued) return;
        queued = true;
        table._queue(() => {
          table.resetExpanded();
          queued = false;
        });
      }
    };
    table.setExpanded = (updater) => table.options.onExpandedChange == null ? void 0 : table.options.onExpandedChange(updater);
    table.toggleAllRowsExpanded = (expanded) => {
      if (expanded != null ? expanded : !table.getIsAllRowsExpanded()) {
        table.setExpanded(true);
      } else {
        table.setExpanded({});
      }
    };
    table.resetExpanded = (defaultState) => {
      var _table$initialState$e, _table$initialState;
      table.setExpanded(defaultState ? {} : (_table$initialState$e = (_table$initialState = table.initialState) == null ? void 0 : _table$initialState.expanded) != null ? _table$initialState$e : {});
    };
    table.getCanSomeRowsExpand = () => {
      return table.getPrePaginationRowModel().flatRows.some((row) => row.getCanExpand());
    };
    table.getToggleAllRowsExpandedHandler = () => {
      return (e) => {
        e.persist == null || e.persist();
        table.toggleAllRowsExpanded();
      };
    };
    table.getIsSomeRowsExpanded = () => {
      const expanded = table.getState().expanded;
      return expanded === true || Object.values(expanded).some(Boolean);
    };
    table.getIsAllRowsExpanded = () => {
      const expanded = table.getState().expanded;
      if (typeof expanded === "boolean") {
        return expanded === true;
      }
      if (!Object.keys(expanded).length) {
        return false;
      }
      if (table.getRowModel().flatRows.some((row) => !row.getIsExpanded())) {
        return false;
      }
      return true;
    };
    table.getExpandedDepth = () => {
      let maxDepth = 0;
      const rowIds = table.getState().expanded === true ? Object.keys(table.getRowModel().rowsById) : Object.keys(table.getState().expanded);
      rowIds.forEach((id) => {
        const splitId = id.split(".");
        maxDepth = Math.max(maxDepth, splitId.length);
      });
      return maxDepth;
    };
    table.getPreExpandedRowModel = () => table.getSortedRowModel();
    table.getExpandedRowModel = () => {
      if (!table._getExpandedRowModel && table.options.getExpandedRowModel) {
        table._getExpandedRowModel = table.options.getExpandedRowModel(table);
      }
      if (table.options.manualExpanding || !table._getExpandedRowModel) {
        return table.getPreExpandedRowModel();
      }
      return table._getExpandedRowModel();
    };
  },
  createRow: (row, table) => {
    row.toggleExpanded = (expanded) => {
      table.setExpanded((old) => {
        var _expanded;
        const exists = old === true ? true : !!(old != null && old[row.id]);
        let oldExpanded = {};
        if (old === true) {
          Object.keys(table.getRowModel().rowsById).forEach((rowId) => {
            oldExpanded[rowId] = true;
          });
        } else {
          oldExpanded = old;
        }
        expanded = (_expanded = expanded) != null ? _expanded : !exists;
        if (!exists && expanded) {
          return {
            ...oldExpanded,
            [row.id]: true
          };
        }
        if (exists && !expanded) {
          const {
            [row.id]: _,
            ...rest
          } = oldExpanded;
          return rest;
        }
        return old;
      });
    };
    row.getIsExpanded = () => {
      var _table$options$getIsR;
      const expanded = table.getState().expanded;
      return !!((_table$options$getIsR = table.options.getIsRowExpanded == null ? void 0 : table.options.getIsRowExpanded(row)) != null ? _table$options$getIsR : expanded === true || (expanded == null ? void 0 : expanded[row.id]));
    };
    row.getCanExpand = () => {
      var _table$options$getRow, _table$options$enable, _row$subRows;
      return (_table$options$getRow = table.options.getRowCanExpand == null ? void 0 : table.options.getRowCanExpand(row)) != null ? _table$options$getRow : ((_table$options$enable = table.options.enableExpanding) != null ? _table$options$enable : true) && !!((_row$subRows = row.subRows) != null && _row$subRows.length);
    };
    row.getIsAllParentsExpanded = () => {
      let isFullyExpanded = true;
      let currentRow = row;
      while (isFullyExpanded && currentRow.parentId) {
        currentRow = table.getRow(currentRow.parentId, true);
        isFullyExpanded = currentRow.getIsExpanded();
      }
      return isFullyExpanded;
    };
    row.getToggleExpandedHandler = () => {
      const canExpand = row.getCanExpand();
      return () => {
        if (!canExpand) return;
        row.toggleExpanded();
      };
    };
  }
};
var defaultPageIndex = 0;
var defaultPageSize = 10;
var getDefaultPaginationState = () => ({
  pageIndex: defaultPageIndex,
  pageSize: defaultPageSize
});
var RowPagination = {
  getInitialState: (state) => {
    return {
      ...state,
      pagination: {
        ...getDefaultPaginationState(),
        ...state == null ? void 0 : state.pagination
      }
    };
  },
  getDefaultOptions: (table) => {
    return {
      onPaginationChange: makeStateUpdater("pagination", table)
    };
  },
  createTable: (table) => {
    let registered = false;
    let queued = false;
    table._autoResetPageIndex = () => {
      var _ref, _table$options$autoRe;
      if (!registered) {
        table._queue(() => {
          registered = true;
        });
        return;
      }
      if ((_ref = (_table$options$autoRe = table.options.autoResetAll) != null ? _table$options$autoRe : table.options.autoResetPageIndex) != null ? _ref : !table.options.manualPagination) {
        if (queued) return;
        queued = true;
        table._queue(() => {
          table.resetPageIndex();
          queued = false;
        });
      }
    };
    table.setPagination = (updater) => {
      const safeUpdater = (old) => {
        let newState = functionalUpdate(updater, old);
        return newState;
      };
      return table.options.onPaginationChange == null ? void 0 : table.options.onPaginationChange(safeUpdater);
    };
    table.resetPagination = (defaultState) => {
      var _table$initialState$p;
      table.setPagination(defaultState ? getDefaultPaginationState() : (_table$initialState$p = table.initialState.pagination) != null ? _table$initialState$p : getDefaultPaginationState());
    };
    table.setPageIndex = (updater) => {
      table.setPagination((old) => {
        let pageIndex = functionalUpdate(updater, old.pageIndex);
        const maxPageIndex = typeof table.options.pageCount === "undefined" || table.options.pageCount === -1 ? Number.MAX_SAFE_INTEGER : table.options.pageCount - 1;
        pageIndex = Math.max(0, Math.min(pageIndex, maxPageIndex));
        return {
          ...old,
          pageIndex
        };
      });
    };
    table.resetPageIndex = (defaultState) => {
      var _table$initialState$p2, _table$initialState;
      table.setPageIndex(defaultState ? defaultPageIndex : (_table$initialState$p2 = (_table$initialState = table.initialState) == null || (_table$initialState = _table$initialState.pagination) == null ? void 0 : _table$initialState.pageIndex) != null ? _table$initialState$p2 : defaultPageIndex);
    };
    table.resetPageSize = (defaultState) => {
      var _table$initialState$p3, _table$initialState2;
      table.setPageSize(defaultState ? defaultPageSize : (_table$initialState$p3 = (_table$initialState2 = table.initialState) == null || (_table$initialState2 = _table$initialState2.pagination) == null ? void 0 : _table$initialState2.pageSize) != null ? _table$initialState$p3 : defaultPageSize);
    };
    table.setPageSize = (updater) => {
      table.setPagination((old) => {
        const pageSize = Math.max(1, functionalUpdate(updater, old.pageSize));
        const topRowIndex = old.pageSize * old.pageIndex;
        const pageIndex = Math.floor(topRowIndex / pageSize);
        return {
          ...old,
          pageIndex,
          pageSize
        };
      });
    };
    table.setPageCount = (updater) => table.setPagination((old) => {
      var _table$options$pageCo;
      let newPageCount = functionalUpdate(updater, (_table$options$pageCo = table.options.pageCount) != null ? _table$options$pageCo : -1);
      if (typeof newPageCount === "number") {
        newPageCount = Math.max(-1, newPageCount);
      }
      return {
        ...old,
        pageCount: newPageCount
      };
    });
    table.getPageOptions = memo(() => [table.getPageCount()], (pageCount) => {
      let pageOptions = [];
      if (pageCount && pageCount > 0) {
        pageOptions = [...new Array(pageCount)].fill(null).map((_, i) => i);
      }
      return pageOptions;
    }, getMemoOptions(table.options, "debugTable", "getPageOptions"));
    table.getCanPreviousPage = () => table.getState().pagination.pageIndex > 0;
    table.getCanNextPage = () => {
      const {
        pageIndex
      } = table.getState().pagination;
      const pageCount = table.getPageCount();
      if (pageCount === -1) {
        return true;
      }
      if (pageCount === 0) {
        return false;
      }
      return pageIndex < pageCount - 1;
    };
    table.previousPage = () => {
      return table.setPageIndex((old) => old - 1);
    };
    table.nextPage = () => {
      return table.setPageIndex((old) => {
        return old + 1;
      });
    };
    table.firstPage = () => {
      return table.setPageIndex(0);
    };
    table.lastPage = () => {
      return table.setPageIndex(table.getPageCount() - 1);
    };
    table.getPrePaginationRowModel = () => table.getExpandedRowModel();
    table.getPaginationRowModel = () => {
      if (!table._getPaginationRowModel && table.options.getPaginationRowModel) {
        table._getPaginationRowModel = table.options.getPaginationRowModel(table);
      }
      if (table.options.manualPagination || !table._getPaginationRowModel) {
        return table.getPrePaginationRowModel();
      }
      return table._getPaginationRowModel();
    };
    table.getPageCount = () => {
      var _table$options$pageCo2;
      return (_table$options$pageCo2 = table.options.pageCount) != null ? _table$options$pageCo2 : Math.ceil(table.getRowCount() / table.getState().pagination.pageSize);
    };
    table.getRowCount = () => {
      var _table$options$rowCou;
      return (_table$options$rowCou = table.options.rowCount) != null ? _table$options$rowCou : table.getPrePaginationRowModel().rows.length;
    };
  }
};
var getDefaultRowPinningState = () => ({
  top: [],
  bottom: []
});
var RowPinning = {
  getInitialState: (state) => {
    return {
      rowPinning: getDefaultRowPinningState(),
      ...state
    };
  },
  getDefaultOptions: (table) => {
    return {
      onRowPinningChange: makeStateUpdater("rowPinning", table)
    };
  },
  createRow: (row, table) => {
    row.pin = (position, includeLeafRows, includeParentRows) => {
      const leafRowIds = includeLeafRows ? row.getLeafRows().map((_ref) => {
        let {
          id
        } = _ref;
        return id;
      }) : [];
      const parentRowIds = includeParentRows ? row.getParentRows().map((_ref2) => {
        let {
          id
        } = _ref2;
        return id;
      }) : [];
      const rowIds = /* @__PURE__ */ new Set([...parentRowIds, row.id, ...leafRowIds]);
      table.setRowPinning((old) => {
        var _old$top3, _old$bottom3;
        if (position === "bottom") {
          var _old$top, _old$bottom;
          return {
            top: ((_old$top = old == null ? void 0 : old.top) != null ? _old$top : []).filter((d) => !(rowIds != null && rowIds.has(d))),
            bottom: [...((_old$bottom = old == null ? void 0 : old.bottom) != null ? _old$bottom : []).filter((d) => !(rowIds != null && rowIds.has(d))), ...Array.from(rowIds)]
          };
        }
        if (position === "top") {
          var _old$top2, _old$bottom2;
          return {
            top: [...((_old$top2 = old == null ? void 0 : old.top) != null ? _old$top2 : []).filter((d) => !(rowIds != null && rowIds.has(d))), ...Array.from(rowIds)],
            bottom: ((_old$bottom2 = old == null ? void 0 : old.bottom) != null ? _old$bottom2 : []).filter((d) => !(rowIds != null && rowIds.has(d)))
          };
        }
        return {
          top: ((_old$top3 = old == null ? void 0 : old.top) != null ? _old$top3 : []).filter((d) => !(rowIds != null && rowIds.has(d))),
          bottom: ((_old$bottom3 = old == null ? void 0 : old.bottom) != null ? _old$bottom3 : []).filter((d) => !(rowIds != null && rowIds.has(d)))
        };
      });
    };
    row.getCanPin = () => {
      var _ref3;
      const {
        enableRowPinning,
        enablePinning
      } = table.options;
      if (typeof enableRowPinning === "function") {
        return enableRowPinning(row);
      }
      return (_ref3 = enableRowPinning != null ? enableRowPinning : enablePinning) != null ? _ref3 : true;
    };
    row.getIsPinned = () => {
      const rowIds = [row.id];
      const {
        top,
        bottom
      } = table.getState().rowPinning;
      const isTop = rowIds.some((d) => top == null ? void 0 : top.includes(d));
      const isBottom = rowIds.some((d) => bottom == null ? void 0 : bottom.includes(d));
      return isTop ? "top" : isBottom ? "bottom" : false;
    };
    row.getPinnedIndex = () => {
      var _ref4, _visiblePinnedRowIds$;
      const position = row.getIsPinned();
      if (!position) return -1;
      const visiblePinnedRowIds = (_ref4 = position === "top" ? table.getTopRows() : table.getBottomRows()) == null ? void 0 : _ref4.map((_ref5) => {
        let {
          id
        } = _ref5;
        return id;
      });
      return (_visiblePinnedRowIds$ = visiblePinnedRowIds == null ? void 0 : visiblePinnedRowIds.indexOf(row.id)) != null ? _visiblePinnedRowIds$ : -1;
    };
  },
  createTable: (table) => {
    table.setRowPinning = (updater) => table.options.onRowPinningChange == null ? void 0 : table.options.onRowPinningChange(updater);
    table.resetRowPinning = (defaultState) => {
      var _table$initialState$r, _table$initialState;
      return table.setRowPinning(defaultState ? getDefaultRowPinningState() : (_table$initialState$r = (_table$initialState = table.initialState) == null ? void 0 : _table$initialState.rowPinning) != null ? _table$initialState$r : getDefaultRowPinningState());
    };
    table.getIsSomeRowsPinned = (position) => {
      var _pinningState$positio;
      const pinningState = table.getState().rowPinning;
      if (!position) {
        var _pinningState$top, _pinningState$bottom;
        return Boolean(((_pinningState$top = pinningState.top) == null ? void 0 : _pinningState$top.length) || ((_pinningState$bottom = pinningState.bottom) == null ? void 0 : _pinningState$bottom.length));
      }
      return Boolean((_pinningState$positio = pinningState[position]) == null ? void 0 : _pinningState$positio.length);
    };
    table._getPinnedRows = (visibleRows, pinnedRowIds, position) => {
      var _table$options$keepPi;
      const rows = ((_table$options$keepPi = table.options.keepPinnedRows) != null ? _table$options$keepPi : true) ? (
        //get all rows that are pinned even if they would not be otherwise visible
        //account for expanded parent rows, but not pagination or filtering
        (pinnedRowIds != null ? pinnedRowIds : []).map((rowId) => {
          const row = table.getRow(rowId, true);
          return row.getIsAllParentsExpanded() ? row : null;
        })
      ) : (
        //else get only visible rows that are pinned
        (pinnedRowIds != null ? pinnedRowIds : []).map((rowId) => visibleRows.find((row) => row.id === rowId))
      );
      return rows.filter(Boolean).map((d) => ({
        ...d,
        position
      }));
    };
    table.getTopRows = memo(() => [table.getRowModel().rows, table.getState().rowPinning.top], (allRows, topPinnedRowIds) => table._getPinnedRows(allRows, topPinnedRowIds, "top"), getMemoOptions(table.options, "debugRows", "getTopRows"));
    table.getBottomRows = memo(() => [table.getRowModel().rows, table.getState().rowPinning.bottom], (allRows, bottomPinnedRowIds) => table._getPinnedRows(allRows, bottomPinnedRowIds, "bottom"), getMemoOptions(table.options, "debugRows", "getBottomRows"));
    table.getCenterRows = memo(() => [table.getRowModel().rows, table.getState().rowPinning.top, table.getState().rowPinning.bottom], (allRows, top, bottom) => {
      const topAndBottom = /* @__PURE__ */ new Set([...top != null ? top : [], ...bottom != null ? bottom : []]);
      return allRows.filter((d) => !topAndBottom.has(d.id));
    }, getMemoOptions(table.options, "debugRows", "getCenterRows"));
  }
};
var RowSelection = {
  getInitialState: (state) => {
    return {
      rowSelection: {},
      ...state
    };
  },
  getDefaultOptions: (table) => {
    return {
      onRowSelectionChange: makeStateUpdater("rowSelection", table),
      enableRowSelection: true,
      enableMultiRowSelection: true,
      enableSubRowSelection: true
      // enableGroupingRowSelection: false,
      // isAdditiveSelectEvent: (e: unknown) => !!e.metaKey,
      // isInclusiveSelectEvent: (e: unknown) => !!e.shiftKey,
    };
  },
  createTable: (table) => {
    table.setRowSelection = (updater) => table.options.onRowSelectionChange == null ? void 0 : table.options.onRowSelectionChange(updater);
    table.resetRowSelection = (defaultState) => {
      var _table$initialState$r;
      return table.setRowSelection(defaultState ? {} : (_table$initialState$r = table.initialState.rowSelection) != null ? _table$initialState$r : {});
    };
    table.toggleAllRowsSelected = (value) => {
      table.setRowSelection((old) => {
        value = typeof value !== "undefined" ? value : !table.getIsAllRowsSelected();
        const rowSelection = {
          ...old
        };
        const preGroupedFlatRows = table.getPreGroupedRowModel().flatRows;
        if (value) {
          preGroupedFlatRows.forEach((row) => {
            if (!row.getCanSelect()) {
              return;
            }
            rowSelection[row.id] = true;
          });
        } else {
          preGroupedFlatRows.forEach((row) => {
            delete rowSelection[row.id];
          });
        }
        return rowSelection;
      });
    };
    table.toggleAllPageRowsSelected = (value) => table.setRowSelection((old) => {
      const resolvedValue = typeof value !== "undefined" ? value : !table.getIsAllPageRowsSelected();
      const rowSelection = {
        ...old
      };
      table.getRowModel().rows.forEach((row) => {
        mutateRowIsSelected(rowSelection, row.id, resolvedValue, true, table);
      });
      return rowSelection;
    });
    table.getPreSelectedRowModel = () => table.getCoreRowModel();
    table.getSelectedRowModel = memo(() => [table.getState().rowSelection, table.getCoreRowModel()], (rowSelection, rowModel) => {
      if (!Object.keys(rowSelection).length) {
        return {
          rows: [],
          flatRows: [],
          rowsById: {}
        };
      }
      return selectRowsFn(table, rowModel);
    }, getMemoOptions(table.options, "debugTable", "getSelectedRowModel"));
    table.getFilteredSelectedRowModel = memo(() => [table.getState().rowSelection, table.getFilteredRowModel()], (rowSelection, rowModel) => {
      if (!Object.keys(rowSelection).length) {
        return {
          rows: [],
          flatRows: [],
          rowsById: {}
        };
      }
      return selectRowsFn(table, rowModel);
    }, getMemoOptions(table.options, "debugTable", "getFilteredSelectedRowModel"));
    table.getGroupedSelectedRowModel = memo(() => [table.getState().rowSelection, table.getSortedRowModel()], (rowSelection, rowModel) => {
      if (!Object.keys(rowSelection).length) {
        return {
          rows: [],
          flatRows: [],
          rowsById: {}
        };
      }
      return selectRowsFn(table, rowModel);
    }, getMemoOptions(table.options, "debugTable", "getGroupedSelectedRowModel"));
    table.getIsAllRowsSelected = () => {
      const preGroupedFlatRows = table.getFilteredRowModel().flatRows;
      const {
        rowSelection
      } = table.getState();
      let isAllRowsSelected = Boolean(preGroupedFlatRows.length && Object.keys(rowSelection).length);
      if (isAllRowsSelected) {
        if (preGroupedFlatRows.some((row) => row.getCanSelect() && !rowSelection[row.id])) {
          isAllRowsSelected = false;
        }
      }
      return isAllRowsSelected;
    };
    table.getIsAllPageRowsSelected = () => {
      const paginationFlatRows = table.getPaginationRowModel().flatRows.filter((row) => row.getCanSelect());
      const {
        rowSelection
      } = table.getState();
      let isAllPageRowsSelected = !!paginationFlatRows.length;
      if (isAllPageRowsSelected && paginationFlatRows.some((row) => !rowSelection[row.id])) {
        isAllPageRowsSelected = false;
      }
      return isAllPageRowsSelected;
    };
    table.getIsSomeRowsSelected = () => {
      var _table$getState$rowSe;
      const totalSelected = Object.keys((_table$getState$rowSe = table.getState().rowSelection) != null ? _table$getState$rowSe : {}).length;
      return totalSelected > 0 && totalSelected < table.getFilteredRowModel().flatRows.length;
    };
    table.getIsSomePageRowsSelected = () => {
      const paginationFlatRows = table.getPaginationRowModel().flatRows;
      return table.getIsAllPageRowsSelected() ? false : paginationFlatRows.filter((row) => row.getCanSelect()).some((d) => d.getIsSelected() || d.getIsSomeSelected());
    };
    table.getToggleAllRowsSelectedHandler = () => {
      return (e) => {
        table.toggleAllRowsSelected(e.target.checked);
      };
    };
    table.getToggleAllPageRowsSelectedHandler = () => {
      return (e) => {
        table.toggleAllPageRowsSelected(e.target.checked);
      };
    };
  },
  createRow: (row, table) => {
    row.toggleSelected = (value, opts) => {
      const isSelected = row.getIsSelected();
      table.setRowSelection((old) => {
        var _opts$selectChildren;
        value = typeof value !== "undefined" ? value : !isSelected;
        if (row.getCanSelect() && isSelected === value) {
          return old;
        }
        const selectedRowIds = {
          ...old
        };
        mutateRowIsSelected(selectedRowIds, row.id, value, (_opts$selectChildren = opts == null ? void 0 : opts.selectChildren) != null ? _opts$selectChildren : true, table);
        return selectedRowIds;
      });
    };
    row.getIsSelected = () => {
      const {
        rowSelection
      } = table.getState();
      return isRowSelected(row, rowSelection);
    };
    row.getIsSomeSelected = () => {
      const {
        rowSelection
      } = table.getState();
      return isSubRowSelected(row, rowSelection) === "some";
    };
    row.getIsAllSubRowsSelected = () => {
      const {
        rowSelection
      } = table.getState();
      return isSubRowSelected(row, rowSelection) === "all";
    };
    row.getCanSelect = () => {
      var _table$options$enable;
      if (typeof table.options.enableRowSelection === "function") {
        return table.options.enableRowSelection(row);
      }
      return (_table$options$enable = table.options.enableRowSelection) != null ? _table$options$enable : true;
    };
    row.getCanSelectSubRows = () => {
      var _table$options$enable2;
      if (typeof table.options.enableSubRowSelection === "function") {
        return table.options.enableSubRowSelection(row);
      }
      return (_table$options$enable2 = table.options.enableSubRowSelection) != null ? _table$options$enable2 : true;
    };
    row.getCanMultiSelect = () => {
      var _table$options$enable3;
      if (typeof table.options.enableMultiRowSelection === "function") {
        return table.options.enableMultiRowSelection(row);
      }
      return (_table$options$enable3 = table.options.enableMultiRowSelection) != null ? _table$options$enable3 : true;
    };
    row.getToggleSelectedHandler = () => {
      const canSelect = row.getCanSelect();
      return (e) => {
        var _target;
        if (!canSelect) return;
        row.toggleSelected((_target = e.target) == null ? void 0 : _target.checked);
      };
    };
  }
};
var mutateRowIsSelected = (selectedRowIds, id, value, includeChildren, table) => {
  var _row$subRows;
  const row = table.getRow(id, true);
  if (value) {
    if (!row.getCanMultiSelect()) {
      Object.keys(selectedRowIds).forEach((key) => delete selectedRowIds[key]);
    }
    if (row.getCanSelect()) {
      selectedRowIds[id] = true;
    }
  } else {
    delete selectedRowIds[id];
  }
  if (includeChildren && (_row$subRows = row.subRows) != null && _row$subRows.length && row.getCanSelectSubRows()) {
    row.subRows.forEach((row2) => mutateRowIsSelected(selectedRowIds, row2.id, value, includeChildren, table));
  }
};
function selectRowsFn(table, rowModel) {
  const rowSelection = table.getState().rowSelection;
  const newSelectedFlatRows = [];
  const newSelectedRowsById = {};
  const recurseRows = function(rows, depth) {
    return rows.map((row) => {
      var _row$subRows2;
      const isSelected = isRowSelected(row, rowSelection);
      if (isSelected) {
        newSelectedFlatRows.push(row);
        newSelectedRowsById[row.id] = row;
      }
      if ((_row$subRows2 = row.subRows) != null && _row$subRows2.length) {
        row = {
          ...row,
          subRows: recurseRows(row.subRows)
        };
      }
      if (isSelected) {
        return row;
      }
    }).filter(Boolean);
  };
  return {
    rows: recurseRows(rowModel.rows),
    flatRows: newSelectedFlatRows,
    rowsById: newSelectedRowsById
  };
}
function isRowSelected(row, selection) {
  var _selection$row$id;
  return (_selection$row$id = selection[row.id]) != null ? _selection$row$id : false;
}
function isSubRowSelected(row, selection, table) {
  var _row$subRows3;
  if (!((_row$subRows3 = row.subRows) != null && _row$subRows3.length)) return false;
  let allChildrenSelected = true;
  let someSelected = false;
  row.subRows.forEach((subRow) => {
    if (someSelected && !allChildrenSelected) {
      return;
    }
    if (subRow.getCanSelect()) {
      if (isRowSelected(subRow, selection)) {
        someSelected = true;
      } else {
        allChildrenSelected = false;
      }
    }
    if (subRow.subRows && subRow.subRows.length) {
      const subRowChildrenSelected = isSubRowSelected(subRow, selection);
      if (subRowChildrenSelected === "all") {
        someSelected = true;
      } else if (subRowChildrenSelected === "some") {
        someSelected = true;
        allChildrenSelected = false;
      } else {
        allChildrenSelected = false;
      }
    }
  });
  return allChildrenSelected ? "all" : someSelected ? "some" : false;
}
var reSplitAlphaNumeric = /([0-9]+)/gm;
var alphanumeric = (rowA, rowB, columnId) => {
  return compareAlphanumeric(toString(rowA.getValue(columnId)).toLowerCase(), toString(rowB.getValue(columnId)).toLowerCase());
};
var alphanumericCaseSensitive = (rowA, rowB, columnId) => {
  return compareAlphanumeric(toString(rowA.getValue(columnId)), toString(rowB.getValue(columnId)));
};
var text = (rowA, rowB, columnId) => {
  return compareBasic(toString(rowA.getValue(columnId)).toLowerCase(), toString(rowB.getValue(columnId)).toLowerCase());
};
var textCaseSensitive = (rowA, rowB, columnId) => {
  return compareBasic(toString(rowA.getValue(columnId)), toString(rowB.getValue(columnId)));
};
var datetime = (rowA, rowB, columnId) => {
  const a = rowA.getValue(columnId);
  const b = rowB.getValue(columnId);
  return a > b ? 1 : a < b ? -1 : 0;
};
var basic = (rowA, rowB, columnId) => {
  return compareBasic(rowA.getValue(columnId), rowB.getValue(columnId));
};
function compareBasic(a, b) {
  return a === b ? 0 : a > b ? 1 : -1;
}
function toString(a) {
  if (typeof a === "number") {
    if (isNaN(a) || a === Infinity || a === -Infinity) {
      return "";
    }
    return String(a);
  }
  if (typeof a === "string") {
    return a;
  }
  return "";
}
function compareAlphanumeric(aStr, bStr) {
  const a = aStr.split(reSplitAlphaNumeric).filter(Boolean);
  const b = bStr.split(reSplitAlphaNumeric).filter(Boolean);
  while (a.length && b.length) {
    const aa = a.shift();
    const bb = b.shift();
    const an = parseInt(aa, 10);
    const bn = parseInt(bb, 10);
    const combo = [an, bn].sort();
    if (isNaN(combo[0])) {
      if (aa > bb) {
        return 1;
      }
      if (bb > aa) {
        return -1;
      }
      continue;
    }
    if (isNaN(combo[1])) {
      return isNaN(an) ? -1 : 1;
    }
    if (an > bn) {
      return 1;
    }
    if (bn > an) {
      return -1;
    }
  }
  return a.length - b.length;
}
var sortingFns = {
  alphanumeric,
  alphanumericCaseSensitive,
  text,
  textCaseSensitive,
  datetime,
  basic
};
var RowSorting = {
  getInitialState: (state) => {
    return {
      sorting: [],
      ...state
    };
  },
  getDefaultColumnDef: () => {
    return {
      sortingFn: "auto",
      sortUndefined: 1
    };
  },
  getDefaultOptions: (table) => {
    return {
      onSortingChange: makeStateUpdater("sorting", table),
      isMultiSortEvent: (e) => {
        return e.shiftKey;
      }
    };
  },
  createColumn: (column, table) => {
    column.getAutoSortingFn = () => {
      const firstRows = table.getFilteredRowModel().flatRows.slice(10);
      let isString = false;
      for (const row of firstRows) {
        const value = row == null ? void 0 : row.getValue(column.id);
        if (Object.prototype.toString.call(value) === "[object Date]") {
          return sortingFns.datetime;
        }
        if (typeof value === "string") {
          isString = true;
          if (value.split(reSplitAlphaNumeric).length > 1) {
            return sortingFns.alphanumeric;
          }
        }
      }
      if (isString) {
        return sortingFns.text;
      }
      return sortingFns.basic;
    };
    column.getAutoSortDir = () => {
      const firstRow = table.getFilteredRowModel().flatRows[0];
      const value = firstRow == null ? void 0 : firstRow.getValue(column.id);
      if (typeof value === "string") {
        return "asc";
      }
      return "desc";
    };
    column.getSortingFn = () => {
      var _table$options$sortin, _table$options$sortin2;
      if (!column) {
        throw new Error();
      }
      return isFunction(column.columnDef.sortingFn) ? column.columnDef.sortingFn : column.columnDef.sortingFn === "auto" ? column.getAutoSortingFn() : (_table$options$sortin = (_table$options$sortin2 = table.options.sortingFns) == null ? void 0 : _table$options$sortin2[column.columnDef.sortingFn]) != null ? _table$options$sortin : sortingFns[column.columnDef.sortingFn];
    };
    column.toggleSorting = (desc, multi) => {
      const nextSortingOrder = column.getNextSortingOrder();
      const hasManualValue = typeof desc !== "undefined" && desc !== null;
      table.setSorting((old) => {
        const existingSorting = old == null ? void 0 : old.find((d) => d.id === column.id);
        const existingIndex = old == null ? void 0 : old.findIndex((d) => d.id === column.id);
        let newSorting = [];
        let sortAction;
        let nextDesc = hasManualValue ? desc : nextSortingOrder === "desc";
        if (old != null && old.length && column.getCanMultiSort() && multi) {
          if (existingSorting) {
            sortAction = "toggle";
          } else {
            sortAction = "add";
          }
        } else {
          if (old != null && old.length && existingIndex !== old.length - 1) {
            sortAction = "replace";
          } else if (existingSorting) {
            sortAction = "toggle";
          } else {
            sortAction = "replace";
          }
        }
        if (sortAction === "toggle") {
          if (!hasManualValue) {
            if (!nextSortingOrder) {
              sortAction = "remove";
            }
          }
        }
        if (sortAction === "add") {
          var _table$options$maxMul;
          newSorting = [...old, {
            id: column.id,
            desc: nextDesc
          }];
          newSorting.splice(0, newSorting.length - ((_table$options$maxMul = table.options.maxMultiSortColCount) != null ? _table$options$maxMul : Number.MAX_SAFE_INTEGER));
        } else if (sortAction === "toggle") {
          newSorting = old.map((d) => {
            if (d.id === column.id) {
              return {
                ...d,
                desc: nextDesc
              };
            }
            return d;
          });
        } else if (sortAction === "remove") {
          newSorting = old.filter((d) => d.id !== column.id);
        } else {
          newSorting = [{
            id: column.id,
            desc: nextDesc
          }];
        }
        return newSorting;
      });
    };
    column.getFirstSortDir = () => {
      var _ref, _column$columnDef$sor;
      const sortDescFirst = (_ref = (_column$columnDef$sor = column.columnDef.sortDescFirst) != null ? _column$columnDef$sor : table.options.sortDescFirst) != null ? _ref : column.getAutoSortDir() === "desc";
      return sortDescFirst ? "desc" : "asc";
    };
    column.getNextSortingOrder = (multi) => {
      var _table$options$enable, _table$options$enable2;
      const firstSortDirection = column.getFirstSortDir();
      const isSorted = column.getIsSorted();
      if (!isSorted) {
        return firstSortDirection;
      }
      if (isSorted !== firstSortDirection && ((_table$options$enable = table.options.enableSortingRemoval) != null ? _table$options$enable : true) && // If enableSortRemove, enable in general
      (multi ? (_table$options$enable2 = table.options.enableMultiRemove) != null ? _table$options$enable2 : true : true)) {
        return false;
      }
      return isSorted === "desc" ? "asc" : "desc";
    };
    column.getCanSort = () => {
      var _column$columnDef$ena, _table$options$enable3;
      return ((_column$columnDef$ena = column.columnDef.enableSorting) != null ? _column$columnDef$ena : true) && ((_table$options$enable3 = table.options.enableSorting) != null ? _table$options$enable3 : true) && !!column.accessorFn;
    };
    column.getCanMultiSort = () => {
      var _ref2, _column$columnDef$ena2;
      return (_ref2 = (_column$columnDef$ena2 = column.columnDef.enableMultiSort) != null ? _column$columnDef$ena2 : table.options.enableMultiSort) != null ? _ref2 : !!column.accessorFn;
    };
    column.getIsSorted = () => {
      var _table$getState$sorti;
      const columnSort = (_table$getState$sorti = table.getState().sorting) == null ? void 0 : _table$getState$sorti.find((d) => d.id === column.id);
      return !columnSort ? false : columnSort.desc ? "desc" : "asc";
    };
    column.getSortIndex = () => {
      var _table$getState$sorti2, _table$getState$sorti3;
      return (_table$getState$sorti2 = (_table$getState$sorti3 = table.getState().sorting) == null ? void 0 : _table$getState$sorti3.findIndex((d) => d.id === column.id)) != null ? _table$getState$sorti2 : -1;
    };
    column.clearSorting = () => {
      table.setSorting((old) => old != null && old.length ? old.filter((d) => d.id !== column.id) : []);
    };
    column.getToggleSortingHandler = () => {
      const canSort = column.getCanSort();
      return (e) => {
        if (!canSort) return;
        e.persist == null || e.persist();
        column.toggleSorting == null || column.toggleSorting(void 0, column.getCanMultiSort() ? table.options.isMultiSortEvent == null ? void 0 : table.options.isMultiSortEvent(e) : false);
      };
    };
  },
  createTable: (table) => {
    table.setSorting = (updater) => table.options.onSortingChange == null ? void 0 : table.options.onSortingChange(updater);
    table.resetSorting = (defaultState) => {
      var _table$initialState$s, _table$initialState;
      table.setSorting(defaultState ? [] : (_table$initialState$s = (_table$initialState = table.initialState) == null ? void 0 : _table$initialState.sorting) != null ? _table$initialState$s : []);
    };
    table.getPreSortedRowModel = () => table.getGroupedRowModel();
    table.getSortedRowModel = () => {
      if (!table._getSortedRowModel && table.options.getSortedRowModel) {
        table._getSortedRowModel = table.options.getSortedRowModel(table);
      }
      if (table.options.manualSorting || !table._getSortedRowModel) {
        return table.getPreSortedRowModel();
      }
      return table._getSortedRowModel();
    };
  }
};
var builtInFeatures = [
  Headers,
  ColumnVisibility,
  ColumnOrdering,
  ColumnPinning,
  ColumnFaceting,
  ColumnFiltering,
  GlobalFaceting,
  //depends on ColumnFaceting
  GlobalFiltering,
  //depends on ColumnFiltering
  RowSorting,
  ColumnGrouping,
  //depends on RowSorting
  RowExpanding,
  RowPagination,
  RowPinning,
  RowSelection,
  ColumnSizing
];
function createTable(options) {
  var _options$_features, _options$initialState;
  if (process.env.NODE_ENV !== "production" && (options.debugAll || options.debugTable)) {
    console.info("Creating Table Instance...");
  }
  const _features = [...builtInFeatures, ...(_options$_features = options._features) != null ? _options$_features : []];
  let table = {
    _features
  };
  const defaultOptions = table._features.reduce((obj, feature) => {
    return Object.assign(obj, feature.getDefaultOptions == null ? void 0 : feature.getDefaultOptions(table));
  }, {});
  const mergeOptions = (options2) => {
    if (table.options.mergeOptions) {
      return table.options.mergeOptions(defaultOptions, options2);
    }
    return {
      ...defaultOptions,
      ...options2
    };
  };
  const coreInitialState = {};
  let initialState = {
    ...coreInitialState,
    ...(_options$initialState = options.initialState) != null ? _options$initialState : {}
  };
  table._features.forEach((feature) => {
    var _feature$getInitialSt;
    initialState = (_feature$getInitialSt = feature.getInitialState == null ? void 0 : feature.getInitialState(initialState)) != null ? _feature$getInitialSt : initialState;
  });
  const queued = [];
  let queuedTimeout = false;
  const coreInstance = {
    _features,
    options: {
      ...defaultOptions,
      ...options
    },
    initialState,
    _queue: (cb) => {
      queued.push(cb);
      if (!queuedTimeout) {
        queuedTimeout = true;
        Promise.resolve().then(() => {
          while (queued.length) {
            queued.shift()();
          }
          queuedTimeout = false;
        }).catch((error) => setTimeout(() => {
          throw error;
        }));
      }
    },
    reset: () => {
      table.setState(table.initialState);
    },
    setOptions: (updater) => {
      const newOptions = functionalUpdate(updater, table.options);
      table.options = mergeOptions(newOptions);
    },
    getState: () => {
      return table.options.state;
    },
    setState: (updater) => {
      table.options.onStateChange == null || table.options.onStateChange(updater);
    },
    _getRowId: (row, index, parent) => {
      var _table$options$getRow;
      return (_table$options$getRow = table.options.getRowId == null ? void 0 : table.options.getRowId(row, index, parent)) != null ? _table$options$getRow : `${parent ? [parent.id, index].join(".") : index}`;
    },
    getCoreRowModel: () => {
      if (!table._getCoreRowModel) {
        table._getCoreRowModel = table.options.getCoreRowModel(table);
      }
      return table._getCoreRowModel();
    },
    // The final calls start at the bottom of the model,
    // expanded rows, which then work their way up
    getRowModel: () => {
      return table.getPaginationRowModel();
    },
    //in next version, we should just pass in the row model as the optional 2nd arg
    getRow: (id, searchAll) => {
      let row = (searchAll ? table.getPrePaginationRowModel() : table.getRowModel()).rowsById[id];
      if (!row) {
        row = table.getCoreRowModel().rowsById[id];
        if (!row) {
          if (process.env.NODE_ENV !== "production") {
            throw new Error(`getRow could not find row with ID: ${id}`);
          }
          throw new Error();
        }
      }
      return row;
    },
    _getDefaultColumnDef: memo(() => [table.options.defaultColumn], (defaultColumn) => {
      var _defaultColumn;
      defaultColumn = (_defaultColumn = defaultColumn) != null ? _defaultColumn : {};
      return {
        header: (props) => {
          const resolvedColumnDef = props.header.column.columnDef;
          if (resolvedColumnDef.accessorKey) {
            return resolvedColumnDef.accessorKey;
          }
          if (resolvedColumnDef.accessorFn) {
            return resolvedColumnDef.id;
          }
          return null;
        },
        // footer: props => props.header.column.id,
        cell: (props) => {
          var _props$renderValue$to, _props$renderValue;
          return (_props$renderValue$to = (_props$renderValue = props.renderValue()) == null || _props$renderValue.toString == null ? void 0 : _props$renderValue.toString()) != null ? _props$renderValue$to : null;
        },
        ...table._features.reduce((obj, feature) => {
          return Object.assign(obj, feature.getDefaultColumnDef == null ? void 0 : feature.getDefaultColumnDef());
        }, {}),
        ...defaultColumn
      };
    }, getMemoOptions(options, "debugColumns", "_getDefaultColumnDef")),
    _getColumnDefs: () => table.options.columns,
    getAllColumns: memo(() => [table._getColumnDefs()], (columnDefs) => {
      const recurseColumns = function(columnDefs2, parent, depth) {
        if (depth === void 0) {
          depth = 0;
        }
        return columnDefs2.map((columnDef) => {
          const column = createColumn(table, columnDef, depth, parent);
          const groupingColumnDef = columnDef;
          column.columns = groupingColumnDef.columns ? recurseColumns(groupingColumnDef.columns, column, depth + 1) : [];
          return column;
        });
      };
      return recurseColumns(columnDefs);
    }, getMemoOptions(options, "debugColumns", "getAllColumns")),
    getAllFlatColumns: memo(() => [table.getAllColumns()], (allColumns) => {
      return allColumns.flatMap((column) => {
        return column.getFlatColumns();
      });
    }, getMemoOptions(options, "debugColumns", "getAllFlatColumns")),
    _getAllFlatColumnsById: memo(() => [table.getAllFlatColumns()], (flatColumns) => {
      return flatColumns.reduce((acc, column) => {
        acc[column.id] = column;
        return acc;
      }, {});
    }, getMemoOptions(options, "debugColumns", "getAllFlatColumnsById")),
    getAllLeafColumns: memo(() => [table.getAllColumns(), table._getOrderColumnsFn()], (allColumns, orderColumns2) => {
      let leafColumns = allColumns.flatMap((column) => column.getLeafColumns());
      return orderColumns2(leafColumns);
    }, getMemoOptions(options, "debugColumns", "getAllLeafColumns")),
    getColumn: (columnId) => {
      const column = table._getAllFlatColumnsById()[columnId];
      if (process.env.NODE_ENV !== "production" && !column) {
        console.error(`[Table] Column with id '${columnId}' does not exist.`);
      }
      return column;
    }
  };
  Object.assign(table, coreInstance);
  for (let index = 0; index < table._features.length; index++) {
    const feature = table._features[index];
    feature == null || feature.createTable == null || feature.createTable(table);
  }
  return table;
}
function getCoreRowModel() {
  return (table) => memo(() => [table.options.data], (data) => {
    const rowModel = {
      rows: [],
      flatRows: [],
      rowsById: {}
    };
    const accessRows = function(originalRows, depth, parentRow) {
      if (depth === void 0) {
        depth = 0;
      }
      const rows = [];
      for (let i = 0; i < originalRows.length; i++) {
        const row = createRow(table, table._getRowId(originalRows[i], i, parentRow), originalRows[i], i, depth, void 0, parentRow == null ? void 0 : parentRow.id);
        rowModel.flatRows.push(row);
        rowModel.rowsById[row.id] = row;
        rows.push(row);
        if (table.options.getSubRows) {
          var _row$originalSubRows;
          row.originalSubRows = table.options.getSubRows(originalRows[i], i);
          if ((_row$originalSubRows = row.originalSubRows) != null && _row$originalSubRows.length) {
            row.subRows = accessRows(row.originalSubRows, depth + 1, row);
          }
        }
      }
      return rows;
    };
    rowModel.rows = accessRows(data);
    return rowModel;
  }, getMemoOptions(table.options, "debugTable", "getRowModel", () => table._autoResetPageIndex()));
}
function expandRows(rowModel) {
  const expandedRows = [];
  const handleRow = (row) => {
    var _row$subRows;
    expandedRows.push(row);
    if ((_row$subRows = row.subRows) != null && _row$subRows.length && row.getIsExpanded()) {
      row.subRows.forEach(handleRow);
    }
  };
  rowModel.rows.forEach(handleRow);
  return {
    rows: expandedRows,
    flatRows: rowModel.flatRows,
    rowsById: rowModel.rowsById
  };
}
function filterRows(rows, filterRowImpl, table) {
  if (table.options.filterFromLeafRows) {
    return filterRowModelFromLeafs(rows, filterRowImpl, table);
  }
  return filterRowModelFromRoot(rows, filterRowImpl, table);
}
function filterRowModelFromLeafs(rowsToFilter, filterRow, table) {
  var _table$options$maxLea;
  const newFilteredFlatRows = [];
  const newFilteredRowsById = {};
  const maxDepth = (_table$options$maxLea = table.options.maxLeafRowFilterDepth) != null ? _table$options$maxLea : 100;
  const recurseFilterRows = function(rowsToFilter2, depth) {
    if (depth === void 0) {
      depth = 0;
    }
    const rows = [];
    for (let i = 0; i < rowsToFilter2.length; i++) {
      var _row$subRows;
      let row = rowsToFilter2[i];
      const newRow = createRow(table, row.id, row.original, row.index, row.depth, void 0, row.parentId);
      newRow.columnFilters = row.columnFilters;
      if ((_row$subRows = row.subRows) != null && _row$subRows.length && depth < maxDepth) {
        newRow.subRows = recurseFilterRows(row.subRows, depth + 1);
        row = newRow;
        if (filterRow(row) && !newRow.subRows.length) {
          rows.push(row);
          newFilteredRowsById[row.id] = row;
          newFilteredFlatRows.push(row);
          continue;
        }
        if (filterRow(row) || newRow.subRows.length) {
          rows.push(row);
          newFilteredRowsById[row.id] = row;
          newFilteredFlatRows.push(row);
          continue;
        }
      } else {
        row = newRow;
        if (filterRow(row)) {
          rows.push(row);
          newFilteredRowsById[row.id] = row;
          newFilteredFlatRows.push(row);
        }
      }
    }
    return rows;
  };
  return {
    rows: recurseFilterRows(rowsToFilter),
    flatRows: newFilteredFlatRows,
    rowsById: newFilteredRowsById
  };
}
function filterRowModelFromRoot(rowsToFilter, filterRow, table) {
  var _table$options$maxLea2;
  const newFilteredFlatRows = [];
  const newFilteredRowsById = {};
  const maxDepth = (_table$options$maxLea2 = table.options.maxLeafRowFilterDepth) != null ? _table$options$maxLea2 : 100;
  const recurseFilterRows = function(rowsToFilter2, depth) {
    if (depth === void 0) {
      depth = 0;
    }
    const rows = [];
    for (let i = 0; i < rowsToFilter2.length; i++) {
      let row = rowsToFilter2[i];
      const pass = filterRow(row);
      if (pass) {
        var _row$subRows2;
        if ((_row$subRows2 = row.subRows) != null && _row$subRows2.length && depth < maxDepth) {
          const newRow = createRow(table, row.id, row.original, row.index, row.depth, void 0, row.parentId);
          newRow.subRows = recurseFilterRows(row.subRows, depth + 1);
          row = newRow;
        }
        rows.push(row);
        newFilteredFlatRows.push(row);
        newFilteredRowsById[row.id] = row;
      }
    }
    return rows;
  };
  return {
    rows: recurseFilterRows(rowsToFilter),
    flatRows: newFilteredFlatRows,
    rowsById: newFilteredRowsById
  };
}
function getFilteredRowModel() {
  return (table) => memo(() => [table.getPreFilteredRowModel(), table.getState().columnFilters, table.getState().globalFilter], (rowModel, columnFilters, globalFilter) => {
    if (!rowModel.rows.length || !(columnFilters != null && columnFilters.length) && !globalFilter) {
      for (let i = 0; i < rowModel.flatRows.length; i++) {
        rowModel.flatRows[i].columnFilters = {};
        rowModel.flatRows[i].columnFiltersMeta = {};
      }
      return rowModel;
    }
    const resolvedColumnFilters = [];
    const resolvedGlobalFilters = [];
    (columnFilters != null ? columnFilters : []).forEach((d) => {
      var _filterFn$resolveFilt;
      const column = table.getColumn(d.id);
      if (!column) {
        return;
      }
      const filterFn = column.getFilterFn();
      if (!filterFn) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`Could not find a valid 'column.filterFn' for column with the ID: ${column.id}.`);
        }
        return;
      }
      resolvedColumnFilters.push({
        id: d.id,
        filterFn,
        resolvedValue: (_filterFn$resolveFilt = filterFn.resolveFilterValue == null ? void 0 : filterFn.resolveFilterValue(d.value)) != null ? _filterFn$resolveFilt : d.value
      });
    });
    const filterableIds = (columnFilters != null ? columnFilters : []).map((d) => d.id);
    const globalFilterFn = table.getGlobalFilterFn();
    const globallyFilterableColumns = table.getAllLeafColumns().filter((column) => column.getCanGlobalFilter());
    if (globalFilter && globalFilterFn && globallyFilterableColumns.length) {
      filterableIds.push("__global__");
      globallyFilterableColumns.forEach((column) => {
        var _globalFilterFn$resol;
        resolvedGlobalFilters.push({
          id: column.id,
          filterFn: globalFilterFn,
          resolvedValue: (_globalFilterFn$resol = globalFilterFn.resolveFilterValue == null ? void 0 : globalFilterFn.resolveFilterValue(globalFilter)) != null ? _globalFilterFn$resol : globalFilter
        });
      });
    }
    let currentColumnFilter;
    let currentGlobalFilter;
    for (let j = 0; j < rowModel.flatRows.length; j++) {
      const row = rowModel.flatRows[j];
      row.columnFilters = {};
      if (resolvedColumnFilters.length) {
        for (let i = 0; i < resolvedColumnFilters.length; i++) {
          currentColumnFilter = resolvedColumnFilters[i];
          const id = currentColumnFilter.id;
          row.columnFilters[id] = currentColumnFilter.filterFn(row, id, currentColumnFilter.resolvedValue, (filterMeta) => {
            row.columnFiltersMeta[id] = filterMeta;
          });
        }
      }
      if (resolvedGlobalFilters.length) {
        for (let i = 0; i < resolvedGlobalFilters.length; i++) {
          currentGlobalFilter = resolvedGlobalFilters[i];
          const id = currentGlobalFilter.id;
          if (currentGlobalFilter.filterFn(row, id, currentGlobalFilter.resolvedValue, (filterMeta) => {
            row.columnFiltersMeta[id] = filterMeta;
          })) {
            row.columnFilters.__global__ = true;
            break;
          }
        }
        if (row.columnFilters.__global__ !== true) {
          row.columnFilters.__global__ = false;
        }
      }
    }
    const filterRowsImpl = (row) => {
      for (let i = 0; i < filterableIds.length; i++) {
        if (row.columnFilters[filterableIds[i]] === false) {
          return false;
        }
      }
      return true;
    };
    return filterRows(rowModel.rows, filterRowsImpl, table);
  }, getMemoOptions(table.options, "debugTable", "getFilteredRowModel", () => table._autoResetPageIndex()));
}
function getPaginationRowModel(opts) {
  return (table) => memo(() => [table.getState().pagination, table.getPrePaginationRowModel(), table.options.paginateExpandedRows ? void 0 : table.getState().expanded], (pagination, rowModel) => {
    if (!rowModel.rows.length) {
      return rowModel;
    }
    const {
      pageSize,
      pageIndex
    } = pagination;
    let {
      rows,
      flatRows,
      rowsById
    } = rowModel;
    const pageStart = pageSize * pageIndex;
    const pageEnd = pageStart + pageSize;
    rows = rows.slice(pageStart, pageEnd);
    let paginatedRowModel;
    if (!table.options.paginateExpandedRows) {
      paginatedRowModel = expandRows({
        rows,
        flatRows,
        rowsById
      });
    } else {
      paginatedRowModel = {
        rows,
        flatRows,
        rowsById
      };
    }
    paginatedRowModel.flatRows = [];
    const handleRow = (row) => {
      paginatedRowModel.flatRows.push(row);
      if (row.subRows.length) {
        row.subRows.forEach(handleRow);
      }
    };
    paginatedRowModel.rows.forEach(handleRow);
    return paginatedRowModel;
  }, getMemoOptions(table.options, "debugTable", "getPaginationRowModel"));
}
function getSortedRowModel() {
  return (table) => memo(() => [table.getState().sorting, table.getPreSortedRowModel()], (sorting, rowModel) => {
    if (!rowModel.rows.length || !(sorting != null && sorting.length)) {
      return rowModel;
    }
    const sortingState = table.getState().sorting;
    const sortedFlatRows = [];
    const availableSorting = sortingState.filter((sort) => {
      var _table$getColumn;
      return (_table$getColumn = table.getColumn(sort.id)) == null ? void 0 : _table$getColumn.getCanSort();
    });
    const columnInfoById = {};
    availableSorting.forEach((sortEntry) => {
      const column = table.getColumn(sortEntry.id);
      if (!column) return;
      columnInfoById[sortEntry.id] = {
        sortUndefined: column.columnDef.sortUndefined,
        invertSorting: column.columnDef.invertSorting,
        sortingFn: column.getSortingFn()
      };
    });
    const sortData = (rows) => {
      const sortedData = rows.map((row) => ({
        ...row
      }));
      sortedData.sort((rowA, rowB) => {
        for (let i = 0; i < availableSorting.length; i += 1) {
          var _sortEntry$desc;
          const sortEntry = availableSorting[i];
          const columnInfo = columnInfoById[sortEntry.id];
          const sortUndefined = columnInfo.sortUndefined;
          const isDesc = (_sortEntry$desc = sortEntry == null ? void 0 : sortEntry.desc) != null ? _sortEntry$desc : false;
          let sortInt = 0;
          if (sortUndefined) {
            const aValue = rowA.getValue(sortEntry.id);
            const bValue = rowB.getValue(sortEntry.id);
            const aUndefined = aValue === void 0;
            const bUndefined = bValue === void 0;
            if (aUndefined || bUndefined) {
              if (sortUndefined === "first") return aUndefined ? -1 : 1;
              if (sortUndefined === "last") return aUndefined ? 1 : -1;
              sortInt = aUndefined && bUndefined ? 0 : aUndefined ? sortUndefined : -sortUndefined;
            }
          }
          if (sortInt === 0) {
            sortInt = columnInfo.sortingFn(rowA, rowB, sortEntry.id);
          }
          if (sortInt !== 0) {
            if (isDesc) {
              sortInt *= -1;
            }
            if (columnInfo.invertSorting) {
              sortInt *= -1;
            }
            return sortInt;
          }
        }
        return rowA.index - rowB.index;
      });
      sortedData.forEach((row) => {
        var _row$subRows;
        sortedFlatRows.push(row);
        if ((_row$subRows = row.subRows) != null && _row$subRows.length) {
          row.subRows = sortData(row.subRows);
        }
      });
      return sortedData;
    };
    return {
      rows: sortData(rowModel.rows),
      flatRows: sortedFlatRows,
      rowsById: rowModel.rowsById
    };
  }, getMemoOptions(table.options, "debugTable", "getSortedRowModel", () => table._autoResetPageIndex()));
}

// node_modules/@tanstack/react-table/build/lib/index.mjs
function flexRender(Comp, props) {
  return !Comp ? null : isReactComponent(Comp) ? /* @__PURE__ */ React2.createElement(Comp, props) : Comp;
}
function isReactComponent(component) {
  return isClassComponent(component) || typeof component === "function" || isExoticComponent(component);
}
function isClassComponent(component) {
  return typeof component === "function" && (() => {
    const proto = Object.getPrototypeOf(component);
    return proto.prototype && proto.prototype.isReactComponent;
  })();
}
function isExoticComponent(component) {
  return typeof component === "object" && typeof component.$$typeof === "symbol" && ["react.memo", "react.forward_ref"].includes(component.$$typeof.description);
}
function useReactTable(options) {
  const resolvedOptions = {
    state: {},
    // Dummy state
    onStateChange: () => {
    },
    // noop
    renderFallbackValue: null,
    ...options
  };
  const [tableRef] = React2.useState(() => ({
    current: createTable(resolvedOptions)
  }));
  const [state, setState] = React2.useState(() => tableRef.current.initialState);
  tableRef.current.setOptions((prev) => ({
    ...prev,
    ...options,
    state: {
      ...state,
      ...options.state
    },
    // Similarly, we'll maintain both our internal state and any user-provided
    // state.
    onStateChange: (updater) => {
      setState(updater);
      options.onStateChange == null || options.onStateChange(updater);
    }
  }));
  return tableRef.current;
}

// app/pages/Products.jsx
function Products() {
  const queryClient = useQueryClient2();
  const [globalFilter, setGlobalFilter] = useState2("");
  const [sorting, setSorting] = useState2([{ id: "id", desc: false }]);
  const [pagination, setPagination] = useState2({ pageIndex: 0, pageSize: 10 });
  const [activeModal, setActiveModal] = useState2(null);
  const [selectedProduct, setSelectedProduct] = useState2(null);
  const [formName, setFormName] = useState2("");
  const [formMasterSku, setFormMasterSku] = useState2("");
  const [formModel, setFormModel] = useState2("");
  const [formDesc, setFormDesc] = useState2("");
  const [formStock, setFormStock] = useState2(0);
  const [formThreshold, setFormThreshold] = useState2(10);
  const [adjustQty, setAdjustQty] = useState2("");
  const [adjustType, setAdjustType] = useState2("manual_adjust");
  const [adjustRef, setAdjustRef] = useState2("");
  const [hoverCard, setHoverCard] = useState2({
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
  const hoverTriggerRef = useRef(null);
  const { data: products = [], isLoading, error } = useQuery2(productsQueryOptions);
  useEffect2(() => {
    if (error) {
      showToast("Error", "Failed to load products", "error");
    }
  }, [error]);
  useEffect2(() => {
    const handleResync = () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    };
    window.addEventListener("resync-data", handleResync);
    return () => {
      window.removeEventListener("resync-data", handleResync);
    };
  }, [queryClient]);
  const createProductMutation = useMutation({
    mutationFn: async (newProduct) => {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProduct)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
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
        const err = await res.json().catch(() => ({}));
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
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
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
        const err = await res.json().catch(() => ({}));
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
  useEffect2(() => {
    if (!hoverCard.productId) return;
    let active = true;
    setHoverCard((prev) => ({ ...prev, loading: true, error: false }));
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
      setHoverCard((prev) => ({ ...prev, movements: data, loading: false }));
    }).catch((err) => {
      if (!active) return;
      setHoverCard((prev) => ({ ...prev, loading: false, error: true }));
    });
    return () => {
      active = false;
    };
  }, [hoverCard.productId]);
  useEffect2(() => {
    const handleDocumentClick = (e) => {
      if (hoverCard.visible) {
        const trigger = e.target.closest(".hover-ledger-trigger");
        const card = document.getElementById("hover-ledger-card");
        if (!trigger && (!card || !card.contains(e.target))) {
          setHoverCard((prev) => ({ ...prev, visible: false, productId: null }));
        }
      }
    };
    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, [hoverCard.visible]);
  const triggerHoverCard = (e, product) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const triggerEl = e.currentTarget;
    setHoverCard((prev) => {
      const cardWidth = 580;
      const cardHeight = 250;
      let left = rect.left;
      if (left + cardWidth > window.innerWidth) {
        left = window.innerWidth - cardWidth - 10;
      }
      if (left < 10) left = 10;
      let top = rect.bottom + window.scrollY + 8;
      if (rect.bottom + cardHeight > window.innerHeight) {
        top = rect.top + window.scrollY - cardHeight - 8;
        if (top < window.scrollY) {
          top = rect.bottom + window.scrollY + 8;
        }
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
  const handleCellClick = (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    if (hoverCard.visible && hoverCard.productId === product.id) {
      setHoverCard((prev) => ({ ...prev, visible: false, productId: null }));
    } else {
      triggerHoverCard(e, product);
    }
  };
  const columns = useMemo(() => [
    {
      accessorKey: "id",
      header: "ID"
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const product = row.original;
        return /* @__PURE__ */ React3.createElement(
          "span",
          {
            className: "hover-ledger-trigger",
            style: {
              fontWeight: 500,
              cursor: "pointer",
              textDecoration: "underline dotted var(--text-muted)",
              textUnderlineOffset: "4px"
            },
            onClick: (e) => handleCellClick(e, product)
          },
          product.name
        );
      }
    },
    {
      accessorKey: "master_sku",
      header: "Master SKU",
      cell: ({ getValue }) => {
        const val = getValue();
        return /* @__PURE__ */ React3.createElement(
          "span",
          {
            className: "status-tag info",
            style: {
              backgroundColor: "var(--accent-light)",
              color: "var(--text-secondary)",
              fontWeight: "500"
            }
          },
          val || "-"
        );
      }
    },
    {
      accessorKey: "model",
      header: "SKU",
      cell: ({ getValue }) => /* @__PURE__ */ React3.createElement("span", { className: "status-tag info" }, getValue())
    },
    {
      accessorKey: "current_stock",
      header: "Stock",
      cell: ({ getValue }) => /* @__PURE__ */ React3.createElement("span", { style: { fontWeight: 600, fontSize: "1rem" } }, getValue())
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
        return /* @__PURE__ */ React3.createElement("span", { className: `status-tag ${statusClass}` }, status);
      }
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const product = row.original;
        return /* @__PURE__ */ React3.createElement("div", { className: "actions-cell" }, /* @__PURE__ */ React3.createElement(
          "button",
          {
            className: "btn btn-secondary btn-sm btn-adjust",
            onClick: () => openAdjustModal(product)
          },
          /* @__PURE__ */ React3.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor" }, /* @__PURE__ */ React3.createElement("path", { d: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" })),
          "Adjust"
        ), /* @__PURE__ */ React3.createElement(
          "button",
          {
            className: "btn btn-secondary btn-sm btn-edit",
            onClick: () => openEditModal(product)
          },
          /* @__PURE__ */ React3.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor" }, /* @__PURE__ */ React3.createElement("path", { d: "M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" })),
          "Edit"
        ), /* @__PURE__ */ React3.createElement(
          "button",
          {
            className: "btn btn-danger btn-sm btn-delete",
            onClick: () => openDeleteModal(product)
          },
          /* @__PURE__ */ React3.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor" }, /* @__PURE__ */ React3.createElement("path", { d: "M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" })),
          "Delete"
        ));
      }
    }
  ], [hoverCard.visible, hoverCard.productId]);
  const table = useReactTable({
    data: products,
    columns,
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
  return /* @__PURE__ */ React3.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "2rem" } }, /* @__PURE__ */ React3.createElement("div", { className: "section-card" }, /* @__PURE__ */ React3.createElement("div", { className: "section-header" }, /* @__PURE__ */ React3.createElement("h2", null, "Product List"), /* @__PURE__ */ React3.createElement("button", { id: "btn-add-product", className: "btn btn-primary", onClick: openAddModal }, /* @__PURE__ */ React3.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor" }, /* @__PURE__ */ React3.createElement("path", { d: "M5 12h14M12 5v14" })), "Add Product")), /* @__PURE__ */ React3.createElement(
    "div",
    {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "1.5rem",
        gap: "1rem",
        flexWrap: "wrap"
      }
    },
    /* @__PURE__ */ React3.createElement("div", { className: "search-wrapper" }, /* @__PURE__ */ React3.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor" }, /* @__PURE__ */ React3.createElement("circle", { cx: "11", cy: "11", r: "8" }), /* @__PURE__ */ React3.createElement("path", { d: "m21 21-4.3-4.3" })), /* @__PURE__ */ React3.createElement(
      "input",
      {
        type: "text",
        id: "search-products",
        name: "search-products",
        placeholder: "Search name or SKU...",
        value: globalFilter ?? "",
        onChange: (e) => setGlobalFilter(e.target.value)
      }
    ))
  ), /* @__PURE__ */ React3.createElement("div", { className: "table-wrapper" }, /* @__PURE__ */ React3.createElement("table", null, /* @__PURE__ */ React3.createElement("thead", null, table.getHeaderGroups().map((headerGroup) => /* @__PURE__ */ React3.createElement("tr", { key: headerGroup.id }, headerGroup.headers.map((header) => {
    const isSortable = header.column.getCanSort();
    const sortDir = header.column.getIsSorted();
    return /* @__PURE__ */ React3.createElement(
      "th",
      {
        key: header.id,
        className: isSortable ? "sortable-header" : "",
        style: isSortable ? { cursor: "pointer", userSelect: "none" } : {},
        onClick: header.column.getToggleSortingHandler()
      },
      flexRender(header.column.columnDef.header, header.getContext()),
      isSortable && /* @__PURE__ */ React3.createElement("span", { className: "sort-icon", style: { opacity: sortDir ? 1 : 0.35 } }, sortDir === "asc" ? " \u25B2" : sortDir === "desc" ? " \u25BC" : " \u2195")
    );
  })))), /* @__PURE__ */ React3.createElement("tbody", { id: "products-table-body" }, isLoading ? /* @__PURE__ */ React3.createElement("tr", null, /* @__PURE__ */ React3.createElement("td", { colSpan: 8, style: { textAlign: "center", color: "var(--text-muted)" } }, "Loading products...")) : table.getRowModel().rows.length === 0 ? /* @__PURE__ */ React3.createElement("tr", null, /* @__PURE__ */ React3.createElement("td", { colSpan: 8, style: { textAlign: "center", color: "var(--text-muted)" } }, 'No products registered. Click "Add Product" to create one.')) : table.getRowModel().rows.map((row) => /* @__PURE__ */ React3.createElement("tr", { key: row.id }, row.getVisibleCells().map((cell) => /* @__PURE__ */ React3.createElement("td", { key: cell.id }, flexRender(cell.column.columnDef.cell, cell.getContext())))))))), products.length > 0 && /* @__PURE__ */ React3.createElement(
    "div",
    {
      className: "pagination-controls",
      style: {
        display: "flex",
        gap: "0.5rem",
        alignItems: "center",
        marginTop: "1rem",
        justifyContent: "flex-end"
      }
    },
    /* @__PURE__ */ React3.createElement(
      "button",
      {
        className: "btn btn-secondary btn-sm",
        onClick: () => table.previousPage(),
        disabled: !table.getCanPreviousPage()
      },
      "Prev"
    ),
    /* @__PURE__ */ React3.createElement("span", { style: { fontSize: "0.85rem", color: "var(--text-secondary)" } }, "Page ", table.getState().pagination.pageIndex + 1, " of ", table.getPageCount() || 1),
    /* @__PURE__ */ React3.createElement(
      "button",
      {
        className: "btn btn-secondary btn-sm",
        onClick: () => table.nextPage(),
        disabled: !table.getCanNextPage()
      },
      "Next"
    )
  ), hoverCard.visible && /* @__PURE__ */ React3.createElement(
    "div",
    {
      id: "hover-ledger-card",
      className: "hover-ledger-card visible",
      style: {
        position: "absolute",
        left: `${hoverCard.x}px`,
        top: `${hoverCard.y}px`,
        zIndex: 1e3
      }
    },
    /* @__PURE__ */ React3.createElement("div", { className: "hover-card-header" }, /* @__PURE__ */ React3.createElement("div", { style: { fontWeight: 600, color: "var(--text-primary)", fontSize: "0.9rem" } }, hoverCard.name), /* @__PURE__ */ React3.createElement("div", { style: { fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 500 } }, hoverCard.model)),
    hoverCard.loading ? /* @__PURE__ */ React3.createElement("div", { style: { padding: "1.5rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.8rem" } }, /* @__PURE__ */ React3.createElement("span", { className: "loading-spinner" }), " Loading stock history...") : hoverCard.error ? /* @__PURE__ */ React3.createElement("div", { style: { padding: "1.5rem", color: "var(--danger)", fontSize: "0.8rem", textAlign: "center", fontWeight: 500 } }, "\u26A0\uFE0F Failed to load stock history") : hoverCard.movements.length === 0 ? /* @__PURE__ */ React3.createElement("div", { style: { padding: "1.5rem", color: "var(--text-secondary)", fontSize: "0.8rem", textAlign: "center" } }, "No stock history recorded.") : /* @__PURE__ */ React3.createElement("div", { style: { overflowX: "auto" } }, /* @__PURE__ */ React3.createElement("table", { className: "hover-ledger-table", style: { width: "100%", borderCollapse: "collapse" } }, /* @__PURE__ */ React3.createElement("thead", null, /* @__PURE__ */ React3.createElement("tr", null, /* @__PURE__ */ React3.createElement("th", { rowSpan: 2, style: { textAlign: "center", verticalAlign: "middle" } }, "Tanggal"), /* @__PURE__ */ React3.createElement("th", { rowSpan: 2, style: { textAlign: "center", verticalAlign: "middle" } }, "No. SJ"), /* @__PURE__ */ React3.createElement("th", { rowSpan: 2, style: { textAlign: "center", verticalAlign: "middle" } }, "Keterangan"), /* @__PURE__ */ React3.createElement("th", { colSpan: 2, style: { textAlign: "center" } }, "Mutasi Barang"), /* @__PURE__ */ React3.createElement("th", { rowSpan: 2, style: { textAlign: "center", verticalAlign: "middle" } }, "Stok Akhir")), /* @__PURE__ */ React3.createElement("tr", null, /* @__PURE__ */ React3.createElement("th", { style: { color: "var(--success)", textAlign: "center" } }, "Masuk"), /* @__PURE__ */ React3.createElement("th", { style: { color: "var(--danger)", textAlign: "center" } }, "Keluar"))), /* @__PURE__ */ React3.createElement("tbody", null, (() => {
      let balance = 0;
      return hoverCard.movements.map((m, idx) => {
        const qty = m.quantity_change;
        balance += qty;
        let cleanStr = null;
        if (typeof m.created_at === "string") {
          cleanStr = m.created_at.includes("T") ? m.created_at : m.created_at.replace(/-/g, "/");
        } else if (typeof m.created_at === "number") {
          cleanStr = m.created_at;
        }
        const dateObj = cleanStr ? new Date(cleanStr) : null;
        const dateStr = dateObj && !isNaN(dateObj.getTime()) ? `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}` : m.created_at || "-";
        let noSj = "-";
        if (m.reference) {
          const orderIdMatch = m.reference.match(/(?:Order ID:\s*)([a-zA-Z0-9\/\-]+)/i);
          if (orderIdMatch && orderIdMatch[1]) {
            noSj = orderIdMatch[1];
          } else if (m.reference.startsWith("Opname ID:")) {
            noSj = "-";
          } else {
            noSj = m.reference;
          }
        }
        let keterangan = m.movement_type.toUpperCase();
        if (m.movement_type === "initial") {
          keterangan = "STOCK OPNAME";
        } else if (m.movement_type === "manual_adjust") {
          if (m.reference && m.reference.includes("Opname")) {
            keterangan = "STOCK OPNAME";
          } else if (m.quantity_change > 0) {
            keterangan = "BARANG MASUK";
          } else {
            keterangan = "MANUAL ADJUST";
          }
        } else if (m.movement_type === "sale") {
          keterangan = m.platform_name ? m.platform_name.toUpperCase() : "SHOPEE";
        } else if (m.movement_type === "return") {
          keterangan = "DIRETUR";
        } else if (m.movement_type === "write_off") {
          keterangan = "WRITE OFF";
        }
        const masuk = qty > 0 ? qty : "";
        const keluar = qty < 0 ? Math.abs(qty) : "";
        return /* @__PURE__ */ React3.createElement("tr", { key: m.id || idx }, /* @__PURE__ */ React3.createElement("td", { style: { textAlign: "center" } }, dateStr), /* @__PURE__ */ React3.createElement("td", { style: { fontFamily: "monospace", fontSize: "0.72rem" } }, noSj), /* @__PURE__ */ React3.createElement("td", null, /* @__PURE__ */ React3.createElement("span", { className: "status-tag info", style: { fontSize: "0.65rem", padding: "0.1rem 0.35rem", display: "inline-block" } }, keterangan)), /* @__PURE__ */ React3.createElement("td", { style: { color: "var(--success)", fontWeight: 600, textAlign: "center" } }, masuk), /* @__PURE__ */ React3.createElement("td", { style: { color: "var(--danger)", fontWeight: 600, textAlign: "center" } }, keluar), /* @__PURE__ */ React3.createElement("td", { style: { fontWeight: 600, color: "var(--text-primary)", textAlign: "center" } }, balance));
      });
    })())))
  ), activeModal === "add" && /* @__PURE__ */ React3.createElement("div", { className: "modal-overlay" }, /* @__PURE__ */ React3.createElement("div", { className: "modal" }, /* @__PURE__ */ React3.createElement("div", { className: "modal-header" }, /* @__PURE__ */ React3.createElement("h3", null, "Create New Product"), /* @__PURE__ */ React3.createElement("button", { className: "modal-close", onClick: closeModal }, "\xD7")), /* @__PURE__ */ React3.createElement("div", { className: "modal-body" }, /* @__PURE__ */ React3.createElement("form", { id: "modal-product-form", className: "login-form", style: { gap: "1rem" }, onSubmit: handleAddSubmit }, /* @__PURE__ */ React3.createElement("div", { className: "form-group" }, /* @__PURE__ */ React3.createElement("label", { htmlFor: "p-name" }, "Product Name (Unique)"), /* @__PURE__ */ React3.createElement(
    "input",
    {
      type: "text",
      id: "p-name",
      required: true,
      placeholder: "e.g. Korek Api Model A",
      value: formName,
      onChange: (e) => setFormName(e.target.value)
    }
  )), /* @__PURE__ */ React3.createElement("div", { className: "form-group" }, /* @__PURE__ */ React3.createElement("label", { htmlFor: "p-master-sku" }, "Master SKU (Optional)"), /* @__PURE__ */ React3.createElement(
    "input",
    {
      type: "text",
      id: "p-master-sku",
      placeholder: "e.g. CROSUP_1S",
      value: formMasterSku,
      onChange: (e) => setFormMasterSku(e.target.value)
    }
  )), /* @__PURE__ */ React3.createElement("div", { className: "form-group" }, /* @__PURE__ */ React3.createElement("label", { htmlFor: "p-model" }, "SKU (Reference)"), /* @__PURE__ */ React3.createElement(
    "input",
    {
      type: "text",
      id: "p-model",
      required: true,
      placeholder: "e.g. CROBAR_1S",
      value: formModel,
      onChange: (e) => setFormModel(e.target.value)
    }
  )), /* @__PURE__ */ React3.createElement("div", { className: "form-group" }, /* @__PURE__ */ React3.createElement("label", { htmlFor: "p-desc" }, "Description (Optional)"), /* @__PURE__ */ React3.createElement(
    "textarea",
    {
      id: "p-desc",
      placeholder: "Details about branding, packaging...",
      value: formDesc,
      onChange: (e) => setFormDesc(e.target.value)
    }
  )), /* @__PURE__ */ React3.createElement("div", { className: "form-group" }, /* @__PURE__ */ React3.createElement("label", { htmlFor: "p-stock" }, "Initial Stock Level"), /* @__PURE__ */ React3.createElement(
    "input",
    {
      type: "number",
      id: "p-stock",
      min: "0",
      value: formStock,
      onChange: (e) => setFormStock(parseInt(e.target.value, 10) || 0)
    }
  )), /* @__PURE__ */ React3.createElement("div", { className: "form-group" }, /* @__PURE__ */ React3.createElement("label", { htmlFor: "p-threshold" }, "Low Stock Alert Threshold"), /* @__PURE__ */ React3.createElement(
    "input",
    {
      type: "number",
      id: "p-threshold",
      min: "0",
      value: formThreshold,
      onChange: (e) => setFormThreshold(parseInt(e.target.value, 10) || 0)
    }
  )))), /* @__PURE__ */ React3.createElement("div", { className: "modal-footer" }, /* @__PURE__ */ React3.createElement("button", { className: "btn btn-secondary", onClick: closeModal }, "Cancel"), /* @__PURE__ */ React3.createElement("button", { type: "submit", form: "modal-product-form", className: "btn btn-primary", disabled: createProductMutation.isPending }, createProductMutation.isPending ? "Saving..." : "Save Product")))), activeModal === "edit" && /* @__PURE__ */ React3.createElement("div", { className: "modal-overlay" }, /* @__PURE__ */ React3.createElement("div", { className: "modal" }, /* @__PURE__ */ React3.createElement("div", { className: "modal-header" }, /* @__PURE__ */ React3.createElement("h3", null, "Edit Product Details"), /* @__PURE__ */ React3.createElement("button", { className: "modal-close", onClick: closeModal }, "\xD7")), /* @__PURE__ */ React3.createElement("div", { className: "modal-body" }, /* @__PURE__ */ React3.createElement("form", { id: "modal-product-edit-form", className: "login-form", style: { gap: "1rem" }, onSubmit: handleEditSubmit }, /* @__PURE__ */ React3.createElement("div", { className: "form-group" }, /* @__PURE__ */ React3.createElement("label", { htmlFor: "p-edit-name" }, "Product Name (Unique)"), /* @__PURE__ */ React3.createElement(
    "input",
    {
      type: "text",
      id: "p-edit-name",
      required: true,
      value: formName,
      onChange: (e) => setFormName(e.target.value)
    }
  )), /* @__PURE__ */ React3.createElement("div", { className: "form-group" }, /* @__PURE__ */ React3.createElement("label", { htmlFor: "p-edit-master-sku" }, "Master SKU"), /* @__PURE__ */ React3.createElement(
    "input",
    {
      type: "text",
      id: "p-edit-master-sku",
      placeholder: "e.g. CROSUP_1S",
      value: formMasterSku,
      onChange: (e) => setFormMasterSku(e.target.value)
    }
  )), /* @__PURE__ */ React3.createElement("div", { className: "form-group" }, /* @__PURE__ */ React3.createElement("label", { htmlFor: "p-edit-model" }, "SKU (Reference)"), /* @__PURE__ */ React3.createElement(
    "input",
    {
      type: "text",
      id: "p-edit-model",
      required: true,
      value: formModel,
      onChange: (e) => setFormModel(e.target.value)
    }
  )), /* @__PURE__ */ React3.createElement("div", { className: "form-group" }, /* @__PURE__ */ React3.createElement("label", { htmlFor: "p-edit-desc" }, "Description"), /* @__PURE__ */ React3.createElement(
    "textarea",
    {
      id: "p-edit-desc",
      value: formDesc,
      onChange: (e) => setFormDesc(e.target.value)
    }
  )), /* @__PURE__ */ React3.createElement("div", { className: "form-group" }, /* @__PURE__ */ React3.createElement("label", { htmlFor: "p-edit-threshold" }, "Low Stock Alert Threshold"), /* @__PURE__ */ React3.createElement(
    "input",
    {
      type: "number",
      id: "p-edit-threshold",
      required: true,
      min: "0",
      value: formThreshold,
      onChange: (e) => setFormThreshold(parseInt(e.target.value, 10) || 0)
    }
  )))), /* @__PURE__ */ React3.createElement("div", { className: "modal-footer" }, /* @__PURE__ */ React3.createElement("button", { className: "btn btn-secondary", onClick: closeModal }, "Cancel"), /* @__PURE__ */ React3.createElement("button", { type: "submit", form: "modal-product-edit-form", className: "btn btn-primary", disabled: editProductMutation.isPending }, editProductMutation.isPending ? "Updating..." : "Update Details")))), activeModal === "adjust" && selectedProduct && /* @__PURE__ */ React3.createElement("div", { className: "modal-overlay" }, /* @__PURE__ */ React3.createElement("div", { className: "modal" }, /* @__PURE__ */ React3.createElement("div", { className: "modal-header" }, /* @__PURE__ */ React3.createElement("h3", null, "Adjust Stock: ", selectedProduct.name), /* @__PURE__ */ React3.createElement("button", { className: "modal-close", onClick: closeModal }, "\xD7")), /* @__PURE__ */ React3.createElement("div", { className: "modal-body" }, /* @__PURE__ */ React3.createElement(
    "div",
    {
      style: {
        marginBottom: "1rem",
        padding: "0.5rem",
        backgroundColor: "var(--bg-primary)",
        borderRadius: "var(--border-radius-sm)",
        fontSize: "0.9rem"
      }
    },
    /* @__PURE__ */ React3.createElement("strong", null, "Current Stock:"),
    " ",
    /* @__PURE__ */ React3.createElement("span", { style: { fontWeight: 600 } }, selectedProduct.current_stock),
    " units"
  ), /* @__PURE__ */ React3.createElement("form", { id: "modal-adjust-form", className: "login-form", style: { gap: "1rem" }, onSubmit: handleAdjustSubmit }, /* @__PURE__ */ React3.createElement("div", { className: "form-group" }, /* @__PURE__ */ React3.createElement("label", { htmlFor: "p-adjust-qty" }, "Quantity Change"), /* @__PURE__ */ React3.createElement(
    "input",
    {
      type: "number",
      id: "p-adjust-qty",
      required: true,
      placeholder: "Use negative numbers to subtract (e.g. -5)",
      value: adjustQty,
      onChange: (e) => setAdjustQty(e.target.value)
    }
  )), /* @__PURE__ */ React3.createElement("div", { className: "form-group" }, /* @__PURE__ */ React3.createElement("label", { htmlFor: "p-adjust-type" }, "Movement Type"), /* @__PURE__ */ React3.createElement(
    "select",
    {
      id: "p-adjust-type",
      value: adjustType,
      onChange: (e) => setAdjustType(e.target.value)
    },
    /* @__PURE__ */ React3.createElement("option", { value: "manual_adjust" }, "Manual Adjustment"),
    /* @__PURE__ */ React3.createElement("option", { value: "return" }, "Return"),
    /* @__PURE__ */ React3.createElement("option", { value: "write_off" }, "Write Off (Loss/Damaged)")
  )), /* @__PURE__ */ React3.createElement("div", { className: "form-group" }, /* @__PURE__ */ React3.createElement("label", { htmlFor: "p-adjust-ref" }, "Reference/Reason"), /* @__PURE__ */ React3.createElement(
    "input",
    {
      type: "text",
      id: "p-adjust-ref",
      required: true,
      placeholder: "e.g. Stock count recount, damaged box, return from J&T",
      value: adjustRef,
      onChange: (e) => setAdjustRef(e.target.value)
    }
  )))), /* @__PURE__ */ React3.createElement("div", { className: "modal-footer" }, /* @__PURE__ */ React3.createElement("button", { className: "btn btn-secondary", onClick: closeModal }, "Cancel"), /* @__PURE__ */ React3.createElement("button", { type: "submit", form: "modal-adjust-form", className: "btn btn-primary", disabled: adjustStockMutation.isPending }, adjustStockMutation.isPending ? "Saving..." : "Save Adjustment")))), activeModal === "delete" && selectedProduct && /* @__PURE__ */ React3.createElement("div", { className: "modal-overlay" }, /* @__PURE__ */ React3.createElement("div", { className: "modal" }, /* @__PURE__ */ React3.createElement("div", { className: "modal-header" }, /* @__PURE__ */ React3.createElement("h3", null, "Confirm Delete Product"), /* @__PURE__ */ React3.createElement("button", { className: "modal-close", onClick: closeModal }, "\xD7")), /* @__PURE__ */ React3.createElement("div", { className: "modal-body" }, /* @__PURE__ */ React3.createElement("p", { style: { marginBottom: "1rem", color: "var(--text-primary)" } }, "Are you sure you want to delete product ", /* @__PURE__ */ React3.createElement("strong", null, selectedProduct.name), "?"), /* @__PURE__ */ React3.createElement("p", { style: { color: "var(--danger)", fontSize: "0.85rem", fontWeight: 500, marginBottom: "0.5rem" } }, "\u26A0\uFE0F This action is permanent and will delete all associated order item histories and stock movements!")), /* @__PURE__ */ React3.createElement("div", { className: "modal-footer" }, /* @__PURE__ */ React3.createElement("button", { className: "btn btn-secondary", onClick: closeModal }, "Cancel"), /* @__PURE__ */ React3.createElement("button", { className: "btn btn-danger", onClick: handleDeleteSubmit, disabled: deleteProductMutation.isPending }, deleteProductMutation.isPending ? "Deleting..." : "\u{1F5D1}\uFE0F Delete Product"))))));
}

// app/routes/products/index.jsx
var Route2 = createFileRoute2("/products/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQueryOptions),
  component: Products
});

// app/routes/opname.jsx
import { createFileRoute as createFileRoute3 } from "@tanstack/react-router";

// app/pages/Opname.jsx
import React4, { useState as useState3, useEffect as useEffect3 } from "react";
import { useQuery as useQuery3, useMutation as useMutation2, useQueryClient as useQueryClient3 } from "@tanstack/react-query";
function Opname() {
  const queryClient = useQueryClient3();
  const [activeModal, setActiveModal] = useState3(null);
  const [selectedOpnameId, setSelectedOpnameId] = useState3(null);
  const [isFormInitialized, setIsFormInitialized] = useState3(false);
  const getLocalDatetimeString = () => {
    const now = /* @__PURE__ */ new Date();
    const tzOffset = now.getTimezoneOffset() * 6e4;
    return new Date(now - tzOffset).toISOString().slice(0, 16);
  };
  const [notes, setNotes] = useState3("");
  const [customDate, setCustomDate] = useState3(getLocalDatetimeString());
  const [physicalCounts, setPhysicalCounts] = useState3({});
  const [productSearch, setProductSearch] = useState3("");
  const { data: opnames = [], isLoading, error } = useQuery3(opnamesQueryOptions);
  const { data: products = [] } = useQuery3({
    ...productsQueryOptions,
    enabled: activeModal === "new"
  });
  const { data: opnameDetails, isLoading: isLoadingDetails } = useQuery3({
    ...opnameDetailsQueryOptions(selectedOpnameId),
    enabled: activeModal === "details" && !!selectedOpnameId
  });
  useEffect3(() => {
    if (activeModal === "new" && products.length > 0 && !isFormInitialized) {
      const initialCounts = {};
      products.forEach((p) => {
        initialCounts[p.id] = p.current_stock;
      });
      setPhysicalCounts(initialCounts);
      setIsFormInitialized(true);
    }
  }, [products, activeModal, isFormInitialized]);
  useEffect3(() => {
    if (error) {
      showToast("Error", "Failed to load stock opname history", "error");
    }
  }, [error]);
  useEffect3(() => {
    const handleResync = () => {
      queryClient.invalidateQueries({ queryKey: ["opnames"] });
    };
    window.addEventListener("resync-data", handleResync);
    return () => {
      window.removeEventListener("resync-data", handleResync);
    };
  }, [queryClient]);
  const createOpnameMutation = useMutation2({
    mutationFn: async (payload) => {
      const res = await fetch("/api/stock/opname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
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
    setCustomDate(getLocalDatetimeString());
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
      if (isNaN(physical_stock) || physical_stock < 0) {
        hasError = true;
      } else {
        items.push({
          product_id: p.id,
          physical_stock
        });
      }
    });
    if (hasError) {
      showToast("Error", "Please enter a valid non-negative physical stock count for all products", "error");
      return;
    }
    const formattedCreatedAt = customDate ? customDate.replace("T", " ") + ":00" : void 0;
    createOpnameMutation.mutate({
      notes: notes.trim(),
      created_at: formattedCreatedAt,
      items
    });
  };
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      let cleanStr = null;
      if (typeof dateStr === "string") {
        cleanStr = dateStr.includes("T") ? dateStr : dateStr.replace(/-/g, "/");
      } else if (typeof dateStr === "number") {
        cleanStr = dateStr;
      }
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
  const filteredProducts = products.filter(
    (p) => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.model.toLowerCase().includes(productSearch.toLowerCase())
  );
  return /* @__PURE__ */ React4.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "2rem" } }, /* @__PURE__ */ React4.createElement("div", { className: "section-card" }, /* @__PURE__ */ React4.createElement("div", { className: "section-header" }, /* @__PURE__ */ React4.createElement("h2", null, "Stock Opname (Physical Inventory Audit)"), /* @__PURE__ */ React4.createElement("button", { id: "btn-new-opname", className: "btn btn-primary", onClick: openNewOpnameModal }, /* @__PURE__ */ React4.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor" }, /* @__PURE__ */ React4.createElement("path", { d: "M5 12h14M12 5v14" })), "New Stock Opname")), /* @__PURE__ */ React4.createElement("div", { className: "table-wrapper" }, /* @__PURE__ */ React4.createElement("table", null, /* @__PURE__ */ React4.createElement("thead", null, /* @__PURE__ */ React4.createElement("tr", null, /* @__PURE__ */ React4.createElement("th", null, "Opname ID"), /* @__PURE__ */ React4.createElement("th", null, "Date"), /* @__PURE__ */ React4.createElement("th", null, "User"), /* @__PURE__ */ React4.createElement("th", null, "Notes"), /* @__PURE__ */ React4.createElement("th", null, "Items Counted"), /* @__PURE__ */ React4.createElement("th", null, "Actions"))), /* @__PURE__ */ React4.createElement("tbody", { id: "opname-table-body" }, isLoading ? /* @__PURE__ */ React4.createElement("tr", null, /* @__PURE__ */ React4.createElement("td", { colSpan: 6, style: { textAlign: "center", color: "var(--text-muted)" } }, "Loading reports...")) : opnames.length === 0 ? /* @__PURE__ */ React4.createElement("tr", null, /* @__PURE__ */ React4.createElement("td", { colSpan: 6, style: { textAlign: "center", color: "var(--text-muted)" } }, 'No stock opname records found. Click "New Stock Opname" to start.')) : opnames.map((item) => /* @__PURE__ */ React4.createElement("tr", { key: item.id }, /* @__PURE__ */ React4.createElement("td", null, /* @__PURE__ */ React4.createElement("strong", null, "#", item.id)), /* @__PURE__ */ React4.createElement("td", null, formatDate(item.created_at)), /* @__PURE__ */ React4.createElement("td", null, /* @__PURE__ */ React4.createElement("span", { className: "status-tag info" }, item.username || "Unknown")), /* @__PURE__ */ React4.createElement("td", null, /* @__PURE__ */ React4.createElement("span", { style: { fontSize: "0.9rem", color: "var(--text-secondary)" } }, item.notes || "-")), /* @__PURE__ */ React4.createElement("td", null, /* @__PURE__ */ React4.createElement("span", { className: "status-tag success" }, item.items_count, " products")), /* @__PURE__ */ React4.createElement("td", null, /* @__PURE__ */ React4.createElement("button", { className: "btn btn-secondary btn-sm btn-view-details", onClick: () => openDetailsModal(item.id) }, /* @__PURE__ */ React4.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor" }, /* @__PURE__ */ React4.createElement("path", { d: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" }), /* @__PURE__ */ React4.createElement("circle", { cx: "12", cy: "12", r: "3" })), "View Details"))))))), activeModal === "new" && /* @__PURE__ */ React4.createElement("div", { className: "modal-overlay" }, /* @__PURE__ */ React4.createElement("div", { className: "modal", style: { maxWidth: "650px" } }, /* @__PURE__ */ React4.createElement("div", { className: "modal-header" }, /* @__PURE__ */ React4.createElement("h3", null, "New Stock Opname"), /* @__PURE__ */ React4.createElement("button", { className: "modal-close", onClick: closeModal }, "\xD7")), /* @__PURE__ */ React4.createElement("div", { className: "modal-body" }, /* @__PURE__ */ React4.createElement("form", { id: "new-opname-form", style: { display: "flex", flexDirection: "column", gap: "1.25rem" }, onSubmit: handleNewOpnameSubmit }, /* @__PURE__ */ React4.createElement("div", { className: "form-group" }, /* @__PURE__ */ React4.createElement("label", { htmlFor: "opname-date" }, "Date & Time of Count"), /* @__PURE__ */ React4.createElement(
    "input",
    {
      type: "datetime-local",
      id: "opname-date",
      required: true,
      value: customDate,
      onChange: (e) => setCustomDate(e.target.value),
      style: {
        width: "100%",
        padding: "0.6rem 1rem",
        fontSize: "0.85rem",
        borderRadius: "var(--border-radius-md)",
        border: "1px solid var(--border-color)",
        backgroundColor: "var(--bg-secondary)",
        color: "var(--text-primary)",
        transition: "var(--transition)"
      }
    }
  ), /* @__PURE__ */ React4.createElement("span", { style: { fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" } }, "Specify the exact date and time when the physical inventory count took place.")), /* @__PURE__ */ React4.createElement("div", { className: "form-group" }, /* @__PURE__ */ React4.createElement("label", { htmlFor: "opname-notes" }, "Audit Notes"), /* @__PURE__ */ React4.createElement(
    "textarea",
    {
      id: "opname-notes",
      placeholder: "Enter notes for this audit (e.g. Weekly physical stock count)",
      value: notes,
      onChange: (e) => setNotes(e.target.value)
    }
  )), /* @__PURE__ */ React4.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" } }, /* @__PURE__ */ React4.createElement("div", { style: { fontWeight: 600, fontSize: "0.95rem" } }, "Product Physical Counts"), /* @__PURE__ */ React4.createElement(
    "input",
    {
      type: "text",
      id: "opname-search-input",
      className: "form-input",
      placeholder: "\u{1F50D} Search product name or SKU...",
      style: { maxWidth: "300px", padding: "0.35rem 0.5rem", fontSize: "0.8rem", marginBottom: 0 },
      value: productSearch,
      onChange: (e) => setProductSearch(e.target.value)
    }
  )), /* @__PURE__ */ React4.createElement("div", { className: "table-wrapper", style: { maxHeight: "350px", overflowY: "auto" } }, /* @__PURE__ */ React4.createElement("table", null, /* @__PURE__ */ React4.createElement("thead", null, /* @__PURE__ */ React4.createElement("tr", null, /* @__PURE__ */ React4.createElement("th", null, "Product Name (SKU)"), /* @__PURE__ */ React4.createElement("th", { style: { textAlign: "right", width: "100px" } }, "System"), /* @__PURE__ */ React4.createElement("th", { style: { textAlign: "right", width: "120px" } }, "Physical Count"))), /* @__PURE__ */ React4.createElement("tbody", { id: "opname-modal-table-body" }, filteredProducts.map((p) => {
    const countVal = physicalCounts[p.id] ?? p.current_stock;
    return /* @__PURE__ */ React4.createElement("tr", { key: p.id, className: "opname-product-row" }, /* @__PURE__ */ React4.createElement("td", null, /* @__PURE__ */ React4.createElement("div", { style: { fontWeight: 500 } }, p.name), /* @__PURE__ */ React4.createElement("div", { style: { fontSize: "0.8rem", color: "var(--text-muted)" } }, p.model)), /* @__PURE__ */ React4.createElement("td", { style: { textAlign: "right", fontWeight: 500 } }, p.current_stock), /* @__PURE__ */ React4.createElement("td", { style: { textAlign: "right" } }, /* @__PURE__ */ React4.createElement(
      "input",
      {
        type: "number",
        className: "physical-stock-input form-input",
        style: { width: "100px", padding: "0.25rem 0.5rem", textAlign: "right" },
        min: "0",
        required: true,
        value: countVal,
        onChange: (e) => handlePhysicalCountChange(p.id, e.target.value)
      }
    )));
  })))))), /* @__PURE__ */ React4.createElement("div", { className: "modal-footer" }, /* @__PURE__ */ React4.createElement("button", { className: "btn btn-secondary", onClick: closeModal }, "Cancel"), /* @__PURE__ */ React4.createElement("button", { type: "submit", form: "new-opname-form", className: "btn btn-primary", disabled: createOpnameMutation.isPending }, createOpnameMutation.isPending ? "Saving..." : "Save Opname")))), activeModal === "details" && selectedOpnameId && /* @__PURE__ */ React4.createElement("div", { className: "modal-overlay" }, /* @__PURE__ */ React4.createElement("div", { className: "modal", style: { maxWidth: "750px" } }, /* @__PURE__ */ React4.createElement("div", { className: "modal-header" }, /* @__PURE__ */ React4.createElement("h3", null, "Stock Opname Report #", selectedOpnameId), /* @__PURE__ */ React4.createElement("button", { className: "modal-close", onClick: closeModal }, "\xD7")), /* @__PURE__ */ React4.createElement("div", { className: "modal-body" }, isLoadingDetails ? /* @__PURE__ */ React4.createElement("div", { style: { padding: "1.5rem", textAlign: "center", color: "var(--text-secondary)" } }, "Loading details...") : !opnameDetails ? /* @__PURE__ */ React4.createElement("div", { style: { padding: "1.5rem", textAlign: "center", color: "var(--danger)" } }, "Failed to load report details.") : /* @__PURE__ */ React4.createElement("div", { className: "print-report-container" }, /* @__PURE__ */ React4.createElement("div", { className: "print-header", style: { marginBottom: "1.5rem" } }, /* @__PURE__ */ React4.createElement("h2", { className: "print-only-title", style: { display: "none", marginBottom: "0.5rem", borderBottom: "2px solid var(--text-primary)", paddingBottom: "0.5rem" } }, "STOCK OPNAME REPORT"), /* @__PURE__ */ React4.createElement("div", { style: { display: "grid", gridTemplateColumns: "120px 1fr", gap: "0.5rem", fontSize: "0.95rem" } }, /* @__PURE__ */ React4.createElement("strong", null, "Opname ID:"), " ", /* @__PURE__ */ React4.createElement("span", null, "#", opnameDetails.id), /* @__PURE__ */ React4.createElement("strong", null, "Date:"), " ", /* @__PURE__ */ React4.createElement("span", null, formatDate(opnameDetails.created_at)), /* @__PURE__ */ React4.createElement("strong", null, "User:"), " ", /* @__PURE__ */ React4.createElement("span", null, opnameDetails.username || "Unknown"), /* @__PURE__ */ React4.createElement("strong", null, "Notes:"), " ", /* @__PURE__ */ React4.createElement("span", null, opnameDetails.notes || "-"))), /* @__PURE__ */ React4.createElement("div", { className: "table-wrapper" }, /* @__PURE__ */ React4.createElement("table", null, /* @__PURE__ */ React4.createElement("thead", null, /* @__PURE__ */ React4.createElement("tr", null, /* @__PURE__ */ React4.createElement("th", null, "Product Name"), /* @__PURE__ */ React4.createElement("th", null, "SKU"), /* @__PURE__ */ React4.createElement("th", { style: { textAlign: "right" } }, "System Stock"), /* @__PURE__ */ React4.createElement("th", { style: { textAlign: "right" } }, "Physical Stock"), /* @__PURE__ */ React4.createElement("th", { style: { textAlign: "right" } }, "Variance"))), /* @__PURE__ */ React4.createElement("tbody", null, opnameDetails.items && opnameDetails.items.map((item) => {
    const varVal = item.variance;
    const varText = varVal > 0 ? `+${varVal}` : `${varVal}`;
    let varColor = "var(--text-secondary)";
    if (varVal > 0) varColor = "var(--success)";
    if (varVal < 0) varColor = "var(--danger)";
    return /* @__PURE__ */ React4.createElement("tr", { key: item.id || item.product_id }, /* @__PURE__ */ React4.createElement("td", null, item.name), /* @__PURE__ */ React4.createElement("td", null, /* @__PURE__ */ React4.createElement("span", { className: "status-tag info" }, item.model)), /* @__PURE__ */ React4.createElement("td", { style: { textAlign: "right" } }, item.system_stock), /* @__PURE__ */ React4.createElement("td", { style: { textAlign: "right" } }, item.physical_stock), /* @__PURE__ */ React4.createElement("td", { style: { textAlign: "right", fontWeight: 600, color: varColor } }, varText));
  })))))), /* @__PURE__ */ React4.createElement("div", { className: "modal-footer" }, /* @__PURE__ */ React4.createElement("button", { className: "btn btn-secondary", onClick: closeModal }, "Close"), /* @__PURE__ */ React4.createElement("button", { className: "btn btn-primary", onClick: () => window.print(), disabled: !opnameDetails }, /* @__PURE__ */ React4.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor" }, /* @__PURE__ */ React4.createElement("path", { d: "M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" }), /* @__PURE__ */ React4.createElement("path", { d: "M6 14h12v8H6z" })), "Print Report"))))));
}

// app/routes/opname.jsx
var Route3 = createFileRoute3("/opname")({
  loader: ({ context }) => context.queryClient.ensureQueryData(opnamesQueryOptions),
  component: Opname
});

// app/routes/stock-history.jsx
import { createFileRoute as createFileRoute4 } from "@tanstack/react-router";

// app/pages/StockHistory.jsx
import React5, { useState as useState4, useEffect as useEffect4, useMemo as useMemo2 } from "react";
import { useQuery as useQuery4, useQueryClient as useQueryClient4 } from "@tanstack/react-query";
function StockHistory() {
  const queryClient = useQueryClient4();
  const [sorting, setSorting] = useState4([{ id: "id", desc: true }]);
  const [pagination, setPagination] = useState4({ pageIndex: 0, pageSize: 15 });
  const { data: ledger = [], isLoading, error } = useQuery4(ledgerQueryOptions);
  useEffect4(() => {
    if (error) {
      showToast("Error", "Failed to load stock ledger", "error");
    }
  }, [error]);
  useEffect4(() => {
    const handleResync = () => {
      queryClient.invalidateQueries({ queryKey: ["ledgerHistory"] });
    };
    window.addEventListener("resync-data", handleResync);
    return () => {
      window.removeEventListener("resync-data", handleResync);
    };
  }, [queryClient]);
  const columns = useMemo2(() => [
    {
      accessorKey: "id",
      header: "ID"
    },
    {
      id: "product",
      header: "Product",
      accessorFn: (row) => row.name ? `${row.name} (${row.model || ""})` : `Product #${row.product_id}`,
      cell: ({ getValue }) => /* @__PURE__ */ React5.createElement("strong", null, getValue())
    },
    {
      accessorKey: "quantity_change",
      header: "Quantity Change",
      cell: ({ row, getValue }) => {
        const change = parseInt(getValue(), 10);
        const changeText = change > 0 ? `+${change}` : `${change}`;
        let color = "var(--warning)";
        if (row.original.movement_type === "initial") {
          color = "var(--success)";
        } else if (row.original.movement_type === "return") {
          color = "var(--success)";
        } else if (row.original.movement_type === "sale") {
          color = "var(--danger)";
        } else if (row.original.movement_type === "write_off") {
          color = "var(--warning)";
        } else if (row.original.movement_type === "manual_adjust") {
          color = change >= 0 ? "var(--success)" : "var(--danger)";
        }
        return /* @__PURE__ */ React5.createElement("span", { style: { fontWeight: "bold", color } }, changeText);
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
        return /* @__PURE__ */ React5.createElement("span", { className: `status-tag ${tagClass}` }, typeLabel);
      }
    },
    {
      accessorKey: "reference",
      header: "Reference",
      cell: ({ getValue }) => /* @__PURE__ */ React5.createElement("span", { style: { color: "var(--text-muted)", fontSize: "0.9rem" } }, getValue() || "-")
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
  ], []);
  const table = useReactTable({
    data: ledger,
    columns,
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
  return /* @__PURE__ */ React5.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "2rem" } }, /* @__PURE__ */ React5.createElement("div", { className: "section-card" }, /* @__PURE__ */ React5.createElement("div", { className: "section-header" }, /* @__PURE__ */ React5.createElement("h2", null, "Stock Movement Ledger")), /* @__PURE__ */ React5.createElement("div", { className: "table-wrapper" }, /* @__PURE__ */ React5.createElement("table", null, /* @__PURE__ */ React5.createElement("thead", null, table.getHeaderGroups().map((headerGroup) => /* @__PURE__ */ React5.createElement("tr", { key: headerGroup.id }, headerGroup.headers.map((header) => {
    const isSortable = header.column.getCanSort();
    const sortDir = header.column.getIsSorted();
    return /* @__PURE__ */ React5.createElement(
      "th",
      {
        key: header.id,
        style: isSortable ? { cursor: "pointer", userSelect: "none" } : {},
        onClick: header.column.getToggleSortingHandler()
      },
      flexRender(header.column.columnDef.header, header.getContext()),
      isSortable && /* @__PURE__ */ React5.createElement("span", { className: "sort-icon", style: { opacity: sortDir ? 1 : 0.35 } }, sortDir === "asc" ? " \u25B2" : sortDir === "desc" ? " \u25BC" : " \u2195")
    );
  })))), /* @__PURE__ */ React5.createElement("tbody", { id: "stock-ledger-table-body" }, isLoading ? /* @__PURE__ */ React5.createElement("tr", null, /* @__PURE__ */ React5.createElement("td", { colSpan: 7, style: { textAlign: "center", color: "var(--text-muted)" } }, "Loading ledger history...")) : ledger.length === 0 ? /* @__PURE__ */ React5.createElement("tr", null, /* @__PURE__ */ React5.createElement("td", { colSpan: 7, style: { textAlign: "center", color: "var(--text-muted)" } }, "No stock movements recorded yet.")) : table.getRowModel().rows.map((row) => /* @__PURE__ */ React5.createElement("tr", { key: row.id }, row.getVisibleCells().map((cell) => /* @__PURE__ */ React5.createElement("td", { key: cell.id }, flexRender(cell.column.columnDef.cell, cell.getContext())))))))), ledger.length > 0 && /* @__PURE__ */ React5.createElement(
    "div",
    {
      className: "pagination-controls",
      style: {
        display: "flex",
        gap: "0.5rem",
        alignItems: "center",
        marginTop: "1rem",
        justifyContent: "flex-end"
      }
    },
    /* @__PURE__ */ React5.createElement(
      "button",
      {
        className: "btn btn-secondary btn-sm",
        onClick: () => table.previousPage(),
        disabled: !table.getCanPreviousPage()
      },
      "Prev"
    ),
    /* @__PURE__ */ React5.createElement("span", { style: { fontSize: "0.85rem", color: "var(--text-secondary)" } }, "Page ", table.getState().pagination.pageIndex + 1, " of ", table.getPageCount() || 1),
    /* @__PURE__ */ React5.createElement(
      "button",
      {
        className: "btn btn-secondary btn-sm",
        onClick: () => table.nextPage(),
        disabled: !table.getCanNextPage()
      },
      "Next"
    )
  )));
}

// app/routes/stock-history.jsx
var Route4 = createFileRoute4("/stock-history")({
  loader: ({ context }) => context.queryClient.ensureQueryData(ledgerQueryOptions),
  component: StockHistory
});

// app/routes/review.jsx
import { createFileRoute as createFileRoute5 } from "@tanstack/react-router";

// app/pages/Review.jsx
import React7, { useState as useState6, useEffect as useEffect6 } from "react";
import { useQuery as useQuery5, useMutation as useMutation3, useQueryClient as useQueryClient5 } from "@tanstack/react-query";

// app/components/OrderPrint.jsx
import React6, { useState as useState5, useEffect as useEffect5 } from "react";
var CODE128_PATTERNS = [
  "212222",
  "222122",
  "222221",
  "121223",
  "121322",
  "131222",
  "122213",
  "122312",
  "132212",
  "221213",
  "221312",
  "231212",
  "112232",
  "122132",
  "122231",
  "113222",
  "123122",
  "123221",
  "223211",
  "221132",
  "221231",
  "213212",
  "223112",
  "312131",
  "311222",
  "321122",
  "321221",
  "312212",
  "322112",
  "322211",
  "212123",
  "212321",
  "232121",
  "111323",
  "131123",
  "131321",
  "112313",
  "132113",
  "132311",
  "211313",
  "231113",
  "231311",
  "112133",
  "112331",
  "132131",
  "113123",
  "113321",
  "133121",
  "313121",
  "211331",
  "231131",
  "213113",
  "213311",
  "213131",
  "311123",
  "311321",
  "331121",
  "312113",
  "312311",
  "332111",
  "314111",
  "221411",
  "431111",
  "111224",
  "111422",
  "121124",
  "121421",
  "141122",
  "141221",
  "112214",
  "112412",
  "122114",
  "122411",
  "142112",
  "142211",
  "241211",
  "221114",
  "213111",
  "241112",
  "134111",
  "111242",
  "121142",
  "121241",
  "114212",
  "124112",
  "124211",
  "411212",
  "421112",
  "421211",
  "212141",
  "214121",
  "412121",
  "111143",
  "111341",
  "131141",
  "114113",
  "114311",
  "411113",
  "411311",
  "113141",
  "114131",
  "311141",
  "411131",
  "211412",
  "211214",
  "211232",
  "2331112"
];
function Barcode({ value }) {
  if (!value) return null;
  const valStr = String(value);
  const charCodes = [];
  let sum2 = 104;
  for (let i = 0; i < valStr.length; i++) {
    const code = valStr.charCodeAt(i);
    const val = code >= 32 && code <= 127 ? code - 32 : 0;
    charCodes.push(val);
    sum2 += val * (i + 1);
  }
  const checksum = sum2 % 103;
  const encoded = [104, ...charCodes, checksum, 106];
  let binaryString = "";
  for (const val of encoded) {
    const pattern = CODE128_PATTERNS[val];
    if (pattern) {
      for (let i = 0; i < pattern.length; i++) {
        const width = parseInt(pattern[i], 10);
        const bit = i % 2 === 0 ? "1" : "0";
        binaryString += bit.repeat(width);
      }
    }
  }
  const barWidth = 1.5;
  const height = 40;
  const rects = [];
  let x = 0;
  for (let j = 0; j < binaryString.length; j++) {
    if (binaryString[j] === "1") {
      rects.push(
        /* @__PURE__ */ React6.createElement("rect", { key: j, x, y: 0, width: barWidth, height, fill: "black" })
      );
    }
    x += barWidth;
  }
  return /* @__PURE__ */ React6.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", margin: "0.4rem 0" } }, /* @__PURE__ */ React6.createElement("svg", { width: x, height, viewBox: `0 0 ${x} ${height}` }, rects), /* @__PURE__ */ React6.createElement("span", { style: { fontSize: "0.7rem", letterSpacing: "0.12em", marginTop: "2px", fontWeight: "bold", fontFamily: "monospace" } }, value));
}
var PRESETS = {
  A6: { name: "A6 Thermal Label (100mm x 150mm)", width: "100mm", height: "150mm", padding: "10mm" },
  A7: { name: "A7 Thermal Label (74mm x 105mm)", width: "74mm", height: "105mm", padding: "5mm" },
  A4: { name: "A4 Standard Invoice (210mm x 297mm)", width: "210mm", height: "297mm", padding: "20mm" }
};
function OrderPrint({ order, onClose }) {
  const [selectedFormat, setSelectedFormat] = useState5("A6");
  const [customWidth, setCustomWidth] = useState5("100mm");
  const [customHeight, setCustomHeight] = useState5("150mm");
  const [customPadding, setCustomPadding] = useState5("10mm");
  const format = selectedFormat === "custom" ? { width: customWidth, height: customHeight, padding: customPadding } : PRESETS[selectedFormat];
  useEffect5(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);
  useEffect5(() => {
    const styleId = "dynamic-order-print-style";
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `
      @media print {
        body * {
          visibility: hidden !important;
        }
        #printable-invoice-wrapper, #printable-invoice-wrapper * {
          visibility: visible !important;
        }
        #printable-invoice-wrapper {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: ${format.width} !important;
          height: ${format.height} !important;
          padding: ${format.padding} !important;
          box-sizing: border-box !important;
          background: white !important;
          color: black !important;
          margin: 0 !important;
        }
        @page {
          size: ${format.width} ${format.height};
          margin: 0;
        }
        .no-print {
          display: none !important;
        }
      }
    `;
    return () => {
      const styleElToRemove = document.getElementById(styleId);
      if (styleElToRemove) {
        styleElToRemove.remove();
      }
    };
  }, [selectedFormat, format]);
  const handlePrint = () => {
    window.print();
  };
  const getPreviewStyles = () => {
    let w = "300px";
    let h = "450px";
    try {
      const matchW = format.width.match(/^([\d.]+)(mm|in|px)$/);
      if (matchW) {
        const val = parseFloat(matchW[1]);
        const unit = matchW[2];
        if (unit === "mm") {
          w = `${val * 3}px`;
        } else if (unit === "in") {
          w = `${val * 75}px`;
        } else {
          w = `${val}px`;
        }
      }
      const matchH = format.height.match(/^([\d.]+)(mm|in|px)$/);
      if (matchH) {
        const val = parseFloat(matchH[1]);
        const unit = matchH[2];
        if (unit === "mm") {
          h = `${val * 3}px`;
        } else if (unit === "in") {
          h = `${val * 75}px`;
        } else {
          h = `${val}px`;
        }
      }
    } catch (e) {
    }
    return { width: w, minHeight: h };
  };
  const previewStyles = getPreviewStyles();
  if (!order) return null;
  return /* @__PURE__ */ React6.createElement("div", { className: "modal-overlay", style: { zIndex: 9999 } }, /* @__PURE__ */ React6.createElement("div", { className: "modal", style: { maxWidth: "650px", padding: "0" } }, /* @__PURE__ */ React6.createElement("div", { className: "modal-header no-print", style: { padding: "1rem 1.5rem", borderBottom: "1px solid var(--border-color)" } }, /* @__PURE__ */ React6.createElement("div", null, /* @__PURE__ */ React6.createElement("h3", { style: { margin: 0 } }, "Print Order Invoice"), /* @__PURE__ */ React6.createElement("span", { style: { fontSize: "0.85rem", color: "var(--text-muted)" } }, "Configure print format for your device")), /* @__PURE__ */ React6.createElement("button", { className: "modal-close", onClick: onClose }, "\xD7")), /* @__PURE__ */ React6.createElement("div", { className: "modal-body no-print", style: { padding: "1rem 1.5rem", backgroundColor: "#fcfcfc", borderBottom: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "0.75rem" } }, /* @__PURE__ */ React6.createElement("div", { style: { display: "flex", gap: "1rem", alignItems: "center" } }, /* @__PURE__ */ React6.createElement("div", { className: "form-group", style: { margin: 0, flex: 1 } }, /* @__PURE__ */ React6.createElement("label", { htmlFor: "print-format-select", style: { fontSize: "0.85rem", fontWeight: "bold" } }, "Select Format Size"), /* @__PURE__ */ React6.createElement(
    "select",
    {
      id: "print-format-select",
      value: selectedFormat,
      onChange: (e) => setSelectedFormat(e.target.value),
      style: { width: "100%", marginTop: "4px" }
    },
    Object.entries(PRESETS).map(([key, value]) => /* @__PURE__ */ React6.createElement("option", { key, value: key }, value.name)),
    /* @__PURE__ */ React6.createElement("option", { value: "custom" }, "Custom Size...")
  )), /* @__PURE__ */ React6.createElement("button", { className: "btn btn-primary", onClick: handlePrint, style: { height: "fit-content", marginTop: "1.2rem" } }, /* @__PURE__ */ React6.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", style: { width: "16px", height: "16px" } }, /* @__PURE__ */ React6.createElement("path", { d: "M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" }), /* @__PURE__ */ React6.createElement("path", { d: "M6 14h12v8H6z" })), "Print Now")), selectedFormat === "custom" && /* @__PURE__ */ React6.createElement("div", { style: { display: "flex", gap: "0.75rem", marginTop: "0.25rem" } }, /* @__PURE__ */ React6.createElement("div", { className: "form-group", style: { flex: 1, margin: 0 } }, /* @__PURE__ */ React6.createElement("label", { style: { fontSize: "0.75rem", fontWeight: "bold" } }, "Width (e.g. 100mm, 4in)"), /* @__PURE__ */ React6.createElement(
    "input",
    {
      type: "text",
      value: customWidth,
      onChange: (e) => setCustomWidth(e.target.value),
      style: { width: "100%", marginTop: "4px", padding: "0.4rem" }
    }
  )), /* @__PURE__ */ React6.createElement("div", { className: "form-group", style: { flex: 1, margin: 0 } }, /* @__PURE__ */ React6.createElement("label", { style: { fontSize: "0.75rem", fontWeight: "bold" } }, "Height (e.g. 150mm, 6in)"), /* @__PURE__ */ React6.createElement(
    "input",
    {
      type: "text",
      value: customHeight,
      onChange: (e) => setCustomHeight(e.target.value),
      style: { width: "100%", marginTop: "4px", padding: "0.4rem" }
    }
  )), /* @__PURE__ */ React6.createElement("div", { className: "form-group", style: { flex: 1, margin: 0 } }, /* @__PURE__ */ React6.createElement("label", { style: { fontSize: "0.75rem", fontWeight: "bold" } }, "Padding (e.g. 10mm)"), /* @__PURE__ */ React6.createElement(
    "input",
    {
      type: "text",
      value: customPadding,
      onChange: (e) => setCustomPadding(e.target.value),
      style: { width: "100%", marginTop: "4px", padding: "0.4rem" }
    }
  )))), /* @__PURE__ */ React6.createElement("div", { style: {
    padding: "2rem",
    backgroundColor: "#eee",
    display: "flex",
    justifyContent: "center",
    maxHeight: "60vh",
    overflowY: "auto"
  }, className: "no-print" }, /* @__PURE__ */ React6.createElement(
    "div",
    {
      style: {
        width: previewStyles.width,
        minHeight: previewStyles.minHeight,
        padding: format.padding,
        boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
        backgroundColor: "#fff",
        color: "#000",
        fontFamily: "system-ui, sans-serif",
        boxSizing: "border-box"
      }
    },
    /* @__PURE__ */ React6.createElement(InvoiceLayoutContent, { order })
  )), /* @__PURE__ */ React6.createElement(
    "div",
    {
      id: "printable-invoice-wrapper",
      style: {
        display: "none",
        position: "absolute",
        left: "-9999px"
      }
    },
    /* @__PURE__ */ React6.createElement(InvoiceLayoutContent, { order })
  ), /* @__PURE__ */ React6.createElement("div", { className: "modal-footer no-print", style: { padding: "1rem 1.5rem", borderTop: "1px solid var(--border-color)" } }, /* @__PURE__ */ React6.createElement("button", { className: "btn btn-secondary", onClick: onClose }, "Close"))));
}
function InvoiceLayoutContent({ order }) {
  const items = order.items || order.splits || order.orderItems || [];
  return /* @__PURE__ */ React6.createElement("div", { style: { fontSize: "0.85rem", lineHeight: 1.4, display: "flex", flexDirection: "column", height: "100%" } }, /* @__PURE__ */ React6.createElement("div", { style: { textAlign: "center", borderBottom: "2px dashed #000", paddingBottom: "0.5rem", marginBottom: "0.5rem" } }, /* @__PURE__ */ React6.createElement("h2", { style: { margin: "0 0 0.2rem 0", fontSize: "1.2rem", fontWeight: "bold" } }, "STOCK MANAGER INVOICE"), /* @__PURE__ */ React6.createElement("span", { style: { fontSize: "0.75rem", textTransform: "uppercase" } }, "Shop Order Ingestion Receipt")), order.resi_number ? /* @__PURE__ */ React6.createElement(Barcode, { value: order.resi_number }) : /* @__PURE__ */ React6.createElement(Barcode, { value: order.order_id }), /* @__PURE__ */ React6.createElement("div", { style: { borderBottom: "1px solid #000", paddingBottom: "0.4rem", marginBottom: "0.4rem" } }, /* @__PURE__ */ React6.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" } }, /* @__PURE__ */ React6.createElement("tbody", null, /* @__PURE__ */ React6.createElement("tr", null, /* @__PURE__ */ React6.createElement("td", { style: { fontWeight: "bold", width: "35%" } }, "Order ID:"), /* @__PURE__ */ React6.createElement("td", null, order.order_id)), order.resi_number && /* @__PURE__ */ React6.createElement("tr", null, /* @__PURE__ */ React6.createElement("td", { style: { fontWeight: "bold" } }, "Resi Num:"), /* @__PURE__ */ React6.createElement("td", null, order.resi_number)), /* @__PURE__ */ React6.createElement("tr", null, /* @__PURE__ */ React6.createElement("td", { style: { fontWeight: "bold" } }, "Buyer:"), /* @__PURE__ */ React6.createElement("td", null, order.customer_name || "N/A")), /* @__PURE__ */ React6.createElement("tr", null, /* @__PURE__ */ React6.createElement("td", { style: { fontWeight: "bold" } }, "Courier:"), /* @__PURE__ */ React6.createElement("td", null, order.expedition || "N/A")), /* @__PURE__ */ React6.createElement("tr", null, /* @__PURE__ */ React6.createElement("td", { style: { fontWeight: "bold" } }, "Date:"), /* @__PURE__ */ React6.createElement("td", null, order.order_date || "N/A"))))), /* @__PURE__ */ React6.createElement("div", { style: { flexGrow: 1 } }, /* @__PURE__ */ React6.createElement("span", { style: { fontSize: "0.8rem", fontWeight: "bold", display: "block", marginBottom: "0.2rem" } }, "ITEMS ORDERED:"), /* @__PURE__ */ React6.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" } }, /* @__PURE__ */ React6.createElement("thead", null, /* @__PURE__ */ React6.createElement("tr", { style: { borderBottom: "1px solid #000" } }, /* @__PURE__ */ React6.createElement("th", { style: { textAlign: "left", paddingBottom: "2px" } }, "Product Details"), /* @__PURE__ */ React6.createElement("th", { style: { textAlign: "right", paddingBottom: "2px", width: "20%" } }, "Qty"))), /* @__PURE__ */ React6.createElement("tbody", null, items.length === 0 ? /* @__PURE__ */ React6.createElement("tr", null, /* @__PURE__ */ React6.createElement("td", { colSpan: 2, style: { padding: "4px 0", fontStyle: "italic", color: "#666" } }, order.product_name_raw)) : items.map((item, idx) => /* @__PURE__ */ React6.createElement("tr", { key: idx, style: { borderBottom: "1px solid #eee" } }, /* @__PURE__ */ React6.createElement("td", { style: { padding: "4px 0" } }, /* @__PURE__ */ React6.createElement("div", { style: { fontWeight: "bold" } }, item.product_name || item.name || "Unmatched Product"), /* @__PURE__ */ React6.createElement("div", { style: { fontSize: "0.75rem", color: "#444" } }, "Model: ", item.model || "N/A")), /* @__PURE__ */ React6.createElement("td", { style: { textAlign: "right", padding: "4px 0", fontWeight: "bold" } }, item.quantity, " Pcs")))))), /* @__PURE__ */ React6.createElement("div", { style: { borderTop: "2px dashed #000", paddingTop: "0.5rem", marginTop: "0.5rem", textAlign: "center", fontSize: "0.75rem" } }, /* @__PURE__ */ React6.createElement("span", null, "Thank you for shopping with us!")));
}

// app/pages/Review.jsx
function Review() {
  const queryClient = useQueryClient5();
  const [isResolveModalOpen, setIsResolveModalOpen] = useState6(false);
  const [resolveTargetOrder, setResolveTargetOrder] = useState6(null);
  const [printTargetOrder, setPrintTargetOrder] = useState6(null);
  const [resolveType, setResolveType] = useState6("");
  const [resolveNotes, setResolveNotes] = useState6("");
  const [ambiguousSelections, setAmbiguousSelections] = useState6({});
  const { data: products = [] } = useQuery5(productsQueryOptions);
  const { data: reviewOrders = [], isLoading: isLoadingOrders, error: errorOrders } = useQuery5(reviewOrdersQueryOptions);
  const { data: ambiguousItems = [], isLoading: isLoadingAmbiguous, error: errorAmbiguous } = useQuery5(reviewAmbiguousQueryOptions);
  useEffect6(() => {
    if (errorOrders || errorAmbiguous) {
      showToast("Error", "Failed to load review data", "error");
    }
  }, [errorOrders, errorAmbiguous]);
  useEffect6(() => {
    const handleResync = () => {
      queryClient.invalidateQueries({ queryKey: ["reviewOrders"] });
      queryClient.invalidateQueries({ queryKey: ["ambiguousItems"] });
    };
    window.addEventListener("resync-data", handleResync);
    return () => {
      window.removeEventListener("resync-data", handleResync);
    };
  }, [queryClient]);
  const resolveOrderMutation = useMutation3({
    mutationFn: async ({ order_id, resolution, resolution_notes }) => {
      const res = await fetch("/api/review/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id, resolution, resolution_notes })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
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
  const confirmSplitMutation = useMutation3({
    mutationFn: async ({ item_id, product_id, quantity }) => {
      const res = await fetch("/api/review/confirm-split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id, product_id, quantity })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
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
    const qtyVal = parseInt(quantity, 10);
    if (isNaN(qtyVal) || qtyVal <= 0) {
      showToast("Warning", "Quantity must be a positive number", "warning");
      return;
    }
    confirmSplitMutation.mutate({
      item_id: item.id,
      product_id: parseInt(productId, 10),
      quantity: qtyVal
    });
  };
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["reviewOrders"] });
    queryClient.invalidateQueries({ queryKey: ["ambiguousItems"] });
  };
  return /* @__PURE__ */ React7.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "2.5rem" } }, /* @__PURE__ */ React7.createElement("div", { className: "section-card" }, /* @__PURE__ */ React7.createElement("div", { className: "section-header" }, /* @__PURE__ */ React7.createElement("h2", null, "Cancelled & Stuck Orders (Needs Review)"), /* @__PURE__ */ React7.createElement("button", { id: "btn-refresh-review", className: "btn btn-secondary btn-sm", onClick: handleRefresh }, /* @__PURE__ */ React7.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor" }, /* @__PURE__ */ React7.createElement("path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16m0 0V21m0-5h5M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8m0 0V3m0 5h-5" })), "Refresh")), /* @__PURE__ */ React7.createElement("div", { className: "table-wrapper" }, /* @__PURE__ */ React7.createElement("table", null, /* @__PURE__ */ React7.createElement("thead", null, /* @__PURE__ */ React7.createElement("tr", null, /* @__PURE__ */ React7.createElement("th", null, "Order ID"), /* @__PURE__ */ React7.createElement("th", null, "Buyer & Expedition"), /* @__PURE__ */ React7.createElement("th", null, "Raw Product Name"), /* @__PURE__ */ React7.createElement("th", null, "Qty"), /* @__PURE__ */ React7.createElement("th", null, "Courier Status"), /* @__PURE__ */ React7.createElement("th", null, "Seeded Items Split"), /* @__PURE__ */ React7.createElement("th", null, "Action"))), /* @__PURE__ */ React7.createElement("tbody", { id: "cancelled-orders-table-body" }, isLoadingOrders ? /* @__PURE__ */ React7.createElement("tr", null, /* @__PURE__ */ React7.createElement("td", { colSpan: 7, style: { textAlign: "center", color: "var(--text-muted)" } }, "Loading flagged orders...")) : reviewOrders.length === 0 ? /* @__PURE__ */ React7.createElement("tr", null, /* @__PURE__ */ React7.createElement("td", { colSpan: 7, style: { textAlign: "center", color: "var(--text-muted)" } }, "No flagged orders require review. Good job!")) : reviewOrders.map((o) => {
    const splitsHtml = o.items ? o.items.map((item, idx) => /* @__PURE__ */ React7.createElement("div", { key: item.id || idx, style: { fontSize: "0.8rem", marginBottom: "0.25rem" } }, /* @__PURE__ */ React7.createElement("strong", null, item.quantity, "x"), " ", item.product_name, " ", item.is_confirmed === 0 && /* @__PURE__ */ React7.createElement("span", { className: "status-tag warning", style: { fontSize: "0.6rem", padding: "0.1rem 0.25rem" } }, "Unmapped"))) : /* @__PURE__ */ React7.createElement("span", { style: { color: "var(--danger)", fontSize: "0.8rem" } }, "No items mapped!");
    return /* @__PURE__ */ React7.createElement("tr", { key: o.id }, /* @__PURE__ */ React7.createElement("td", { style: { fontFamily: "monospace", fontSize: "0.85rem", fontWeight: 600 } }, o.order_id), /* @__PURE__ */ React7.createElement("td", null, /* @__PURE__ */ React7.createElement("div", { style: { fontSize: "0.85rem", fontWeight: 500 } }, o.customer_name || "Anonymous"), /* @__PURE__ */ React7.createElement("div", { style: { fontSize: "0.75rem", color: "var(--text-secondary)" } }, o.expedition || "Unknown Courier")), /* @__PURE__ */ React7.createElement(
      "td",
      {
        style: {
          fontSize: "0.85rem",
          maxWidth: "200px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        },
        title: o.product_name_raw
      },
      o.product_name_raw
    ), /* @__PURE__ */ React7.createElement("td", { style: { fontWeight: 600 } }, o.quantity), /* @__PURE__ */ React7.createElement("td", null, /* @__PURE__ */ React7.createElement("span", { className: "status-tag warning" }, o.order_status)), /* @__PURE__ */ React7.createElement("td", null, splitsHtml), /* @__PURE__ */ React7.createElement("td", null, /* @__PURE__ */ React7.createElement("div", { style: { display: "flex", gap: "0.5rem" } }, /* @__PURE__ */ React7.createElement("button", { className: "btn btn-secondary btn-sm", onClick: () => setPrintTargetOrder(o) }, /* @__PURE__ */ React7.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor" }, /* @__PURE__ */ React7.createElement("path", { d: "M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" }), /* @__PURE__ */ React7.createElement("path", { d: "M6 14h12v8H6z" })), "Print"), /* @__PURE__ */ React7.createElement("button", { className: "btn btn-primary btn-sm btn-resolve-order", onClick: () => openResolveModal(o) }, /* @__PURE__ */ React7.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor" }, /* @__PURE__ */ React7.createElement("path", { d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" }), /* @__PURE__ */ React7.createElement("line", { x1: "12", y1: "9", x2: "12", y2: "13" }), /* @__PURE__ */ React7.createElement("line", { x1: "12", y1: "17", x2: "12.01", y2: "17" })), "Resolve"))));
  }))))), /* @__PURE__ */ React7.createElement("div", { className: "section-card" }, /* @__PURE__ */ React7.createElement("div", { className: "section-header" }, /* @__PURE__ */ React7.createElement("h2", null, "Ambiguous Product Names (Awaiting Mapping)")), /* @__PURE__ */ React7.createElement("div", { className: "table-wrapper" }, /* @__PURE__ */ React7.createElement("table", null, /* @__PURE__ */ React7.createElement("thead", null, /* @__PURE__ */ React7.createElement("tr", null, /* @__PURE__ */ React7.createElement("th", null, "Order ID"), /* @__PURE__ */ React7.createElement("th", null, "Raw Name from Excel"), /* @__PURE__ */ React7.createElement("th", null, "Order Date"), /* @__PURE__ */ React7.createElement("th", null, "Suggest Quantity"), /* @__PURE__ */ React7.createElement("th", null, "Select Catalog Mapping"), /* @__PURE__ */ React7.createElement("th", null, "Action"))), /* @__PURE__ */ React7.createElement("tbody", { id: "ambiguous-orders-table-body" }, isLoadingAmbiguous ? /* @__PURE__ */ React7.createElement("tr", null, /* @__PURE__ */ React7.createElement("td", { colSpan: 6, style: { textAlign: "center", color: "var(--text-muted)" } }, "Loading ambiguous items...")) : ambiguousItems.length === 0 ? /* @__PURE__ */ React7.createElement("tr", null, /* @__PURE__ */ React7.createElement("td", { colSpan: 6, style: { textAlign: "center", color: "var(--text-muted)" } }, "No ambiguous items require mapping. Excellent!")) : ambiguousItems.map((item) => {
    const currentSelection = ambiguousSelections[item.id] || {};
    const currentProductId = currentSelection.productId || "";
    const currentQty = currentSelection.quantity ?? item.quantity;
    return /* @__PURE__ */ React7.createElement("tr", { key: item.id }, /* @__PURE__ */ React7.createElement("td", { style: { fontFamily: "monospace", fontSize: "0.85rem" } }, item.order_id), /* @__PURE__ */ React7.createElement("td", { style: { fontSize: "0.85rem", fontWeight: 500, maxWidth: "250px" } }, item.original_text || item.product_name_raw), /* @__PURE__ */ React7.createElement("td", { style: { fontSize: "0.8rem", color: "var(--text-secondary)" } }, item.order_date), /* @__PURE__ */ React7.createElement("td", null, /* @__PURE__ */ React7.createElement(
      "input",
      {
        type: "number",
        className: "amb-qty-input",
        value: currentQty,
        min: "1",
        style: { width: "70px", padding: "0.25rem", fontSize: "0.85rem" },
        onChange: (e) => handleAmbQtyChange(item.id, parseInt(e.target.value, 10) || 1)
      }
    )), /* @__PURE__ */ React7.createElement("td", null, /* @__PURE__ */ React7.createElement(
      "select",
      {
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
        onChange: (e) => handleAmbSelectChange(item.id, e.target.value)
      },
      /* @__PURE__ */ React7.createElement("option", { value: "" }, "-- Choose matching product --"),
      products.map((p) => /* @__PURE__ */ React7.createElement("option", { key: p.id, value: p.id }, p.name, " (", p.model, ")"))
    )), /* @__PURE__ */ React7.createElement("td", null, /* @__PURE__ */ React7.createElement(
      "button",
      {
        className: "btn btn-primary btn-sm btn-confirm-split",
        onClick: () => handleConfirmSplit(item),
        disabled: confirmSplitMutation.isPending
      },
      confirmSplitMutation.isPending && confirmSplitMutation.variables?.item_id === item.id ? "\u231B..." : "Confirm"
    )));
  }))))), isResolveModalOpen && resolveTargetOrder && /* @__PURE__ */ React7.createElement("div", { className: "modal-overlay" }, /* @__PURE__ */ React7.createElement("div", { className: "modal" }, /* @__PURE__ */ React7.createElement("div", { className: "modal-header" }, /* @__PURE__ */ React7.createElement("h3", null, "Resolve Flagged Order"), /* @__PURE__ */ React7.createElement("button", { className: "modal-close", onClick: closeResolveModal }, "\xD7")), /* @__PURE__ */ React7.createElement("div", { className: "modal-body" }, /* @__PURE__ */ React7.createElement("form", { id: "modal-resolve-form", className: "login-form", style: { gap: "1.25rem" }, onSubmit: handleResolveSubmit }, /* @__PURE__ */ React7.createElement(
    "div",
    {
      style: {
        fontSize: "0.9rem",
        padding: "0.75rem",
        backgroundColor: "var(--warning-light)",
        color: "var(--warning)",
        borderRadius: "var(--border-radius-sm)",
        border: "1px solid rgba(245, 158, 11, 0.2)",
        fontWeight: 500
      }
    },
    "\u26A0\uFE0F Resolving cancelled order: ",
    /* @__PURE__ */ React7.createElement("strong", null, resolveTargetOrder.order_id)
  ), /* @__PURE__ */ React7.createElement("div", { className: "form-group" }, /* @__PURE__ */ React7.createElement("label", { htmlFor: "resolve-type" }, "Select Resolution Type"), /* @__PURE__ */ React7.createElement(
    "select",
    {
      id: "resolve-type",
      required: true,
      value: resolveType,
      onChange: (e) => setResolveType(e.target.value)
    },
    /* @__PURE__ */ React7.createElement("option", { value: "" }, "-- Choose resolution --"),
    /* @__PURE__ */ React7.createElement("option", { value: "returned" }, "\u{1F504} Returned (Items back in warehouse, no stock changes needed)"),
    /* @__PURE__ */ React7.createElement("option", { value: "lost" }, "\u274C Lost / Gone (Items lost in transit, deduct stock permanent write-off)"),
    /* @__PURE__ */ React7.createElement("option", { value: "investigating" }, "\u231B Investigating (Keep flagged, update notes only)")
  )), /* @__PURE__ */ React7.createElement("div", { className: "form-group" }, /* @__PURE__ */ React7.createElement("label", { htmlFor: "resolve-notes" }, "Resolution Notes / Reason"), /* @__PURE__ */ React7.createElement(
    "textarea",
    {
      id: "resolve-notes",
      required: true,
      placeholder: "e.g. Package returned damaged, customer request, lost at J&T warehouse...",
      style: { height: "100px" },
      value: resolveNotes,
      onChange: (e) => setResolveNotes(e.target.value)
    }
  )))), /* @__PURE__ */ React7.createElement("div", { className: "modal-footer" }, /* @__PURE__ */ React7.createElement("button", { className: "btn btn-secondary", onClick: closeResolveModal }, "Cancel"), /* @__PURE__ */ React7.createElement("button", { type: "submit", form: "modal-resolve-form", className: "btn btn-primary", disabled: resolveOrderMutation.isPending }, resolveOrderMutation.isPending ? "Submitting..." : "Submit Resolution")))), printTargetOrder && /* @__PURE__ */ React7.createElement(OrderPrint, { order: printTargetOrder, onClose: () => setPrintTargetOrder(null) }));
}

// app/routes/review.jsx
var Route5 = createFileRoute5("/review")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(productsQueryOptions),
      context.queryClient.ensureQueryData(reviewOrdersQueryOptions),
      context.queryClient.ensureQueryData(reviewAmbiguousQueryOptions)
    ]);
  },
  component: Review
});

// app/routes/settings.jsx
import { createFileRoute as createFileRoute6 } from "@tanstack/react-router";

// app/pages/Settings.jsx
import React9, { useState as useState7, useEffect as useEffect7 } from "react";
import { useQuery as useQuery6, useMutation as useMutation4, useQueryClient as useQueryClient6 } from "@tanstack/react-query";

// app/context/AuthContext.jsx
import React8, { createContext, useContext } from "react";
var AuthContext = createContext(null);
function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// app/pages/Settings.jsx
function Settings() {
  const queryClient = useQueryClient6();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const [activeModal, setActiveModal] = useState7(null);
  const [modalTarget, setModalTarget] = useState7(null);
  const [templateName, setTemplateName] = useState7("");
  const [colOrderId, setColOrderId] = useState7("");
  const [colResiNumber, setColResiNumber] = useState7("");
  const [colProductName, setColProductName] = useState7("");
  const [colQuantity, setColQuantity] = useState7("");
  const [colOrderStatus, setColOrderStatus] = useState7("");
  const [colCustomerName, setColCustomerName] = useState7("");
  const [colExpedition, setColExpedition] = useState7("");
  const [colOrderDate, setColOrderDate] = useState7("");
  const [colPrice, setColPrice] = useState7("");
  const [colSkuRef, setColSkuRef] = useState7("");
  const [userUsername, setUserUsername] = useState7("");
  const [userPassword, setUserPassword] = useState7("");
  const [userRole, setUserRole] = useState7("staff");
  const [skuCode, setSkuCode] = useState7("");
  const [skuProductId, setSkuProductId] = useState7("");
  const [skuQuantity, setSkuQuantity] = useState7(1);
  const [marketPlatform, setMarketPlatform] = useState7("shopee");
  const [marketShopId, setMarketShopId] = useState7("");
  const [marketShopName, setMarketShopName] = useState7("");
  const [marketAccessToken, setMarketAccessToken] = useState7("");
  const [syncingShops, setSyncingShops] = useState7({});
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery6(settingsTemplatesQueryOptions);
  const { data: skuMappings = [], isLoading: isLoadingSkuMappings } = useQuery6(settingsSkuMappingsQueryOptions);
  const { data: users = [], isLoading: isLoadingUsers } = useQuery6({
    ...settingsUsersQueryOptions,
    enabled: isAdmin
  });
  const { data: products = [] } = useQuery6(settingsProductsQueryOptions);
  const { data: credentials = [], isLoading: isLoadingCredentials } = useQuery6({
    ...settingsCredentialsQueryOptions,
    enabled: isAdmin
  });
  const saveTemplateMutation = useMutation4({
    mutationFn: async (payload) => {
      const res = await fetch("/api/import/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
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
  const deleteTemplateMutation = useMutation4({
    mutationFn: async (id) => {
      const res = await fetch(`/api/import/templates/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
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
  const createUserMutation = useMutation4({
    mutationFn: async (payload) => {
      const res = await fetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
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
  const deleteUserMutation = useMutation4({
    mutationFn: async (id) => {
      const res = await fetch(`/api/auth/users/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
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
  const saveSkuMappingMutation = useMutation4({
    mutationFn: async (payload) => {
      const res = await fetch("/api/import/sku-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
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
  const deleteSkuMappingMutation = useMutation4({
    mutationFn: async (payload) => {
      const res = await fetch("/api/import/sku-mappings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
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
    if (modalTarget) {
      payload.id = modalTarget.id;
    }
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
    if (!skuProductId) {
      showToast("Warning", "Please select a target product", "warning");
      return;
    }
    saveSkuMappingMutation.mutate({
      sku_code: skuCode.trim(),
      product_id: parseInt(skuProductId, 10),
      quantity: parseInt(skuQuantity, 10)
    });
  };
  const connectShopMutation = useMutation4({
    mutationFn: async (payload) => {
      const res = await fetch("/api/ecommerce/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to connect shop");
      }
      return res.json();
    },
    onSuccess: () => {
      showToast("Success", "Shop connected successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["settingsCredentials"] });
      closeModal();
    },
    onError: (err) => {
      showToast("Error", err.message, "error");
    }
  });
  const deleteShopMutation = useMutation4({
    mutationFn: async (payload) => {
      const res = await fetch("/api/ecommerce/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to delete integration");
      }
      return res.json();
    },
    onSuccess: () => {
      showToast("Success", "Integration deleted successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["settingsCredentials"] });
    },
    onError: (err) => {
      showToast("Error", err.message, "error");
    }
  });
  const syncShopMutation = useMutation4({
    mutationFn: async (payload) => {
      setSyncingShops((prev) => ({ ...prev, [payload.platform + "-" + payload.shop_id]: true }));
      const res = await fetch("/api/ecommerce/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      setSyncingShops((prev) => ({ ...prev, [payload.platform + "-" + payload.shop_id]: false }));
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Synchronization failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      showToast("Success", `Sync completed! Import Session ID: ${data.session?.id || "N/A"}`, "success");
      queryClient.invalidateQueries({ queryKey: ["settingsCredentials"] });
    },
    onError: (err) => {
      showToast("Error", err.message, "error");
    }
  });
  const handleMarketplaceSubmit = (e) => {
    e.preventDefault();
    connectShopMutation.mutate({
      platform: marketPlatform,
      shop_id: marketShopId.trim(),
      shop_name: marketShopName.trim(),
      access_token: marketAccessToken.trim()
    });
  };
  const openMarketplaceModal = () => {
    setMarketPlatform("shopee");
    setMarketShopId("");
    setMarketShopName("");
    setMarketAccessToken("");
    setActiveModal("marketplace");
  };
  const handleSyncShop = (platform, shopId) => {
    syncShopMutation.mutate({ platform, shop_id: shopId });
  };
  const handleDeleteShop = (platform, shopId) => {
    if (window.confirm(`Are you sure you want to disconnect ${platform.toUpperCase()} shop ID ${shopId}?`)) {
      deleteShopMutation.mutate({ platform, shop_id: shopId });
    }
  };
  const handleDeleteTemplate = (id) => {
    if (window.confirm("Are you sure you want to delete this template?")) {
      deleteTemplateMutation.mutate(id);
    }
  };
  const handleDeleteUser = (user) => {
    if (window.confirm(`Are you sure you want to delete user account "${user.username}"?`)) {
      deleteUserMutation.mutate(user.id);
    }
  };
  const handleDeleteSku = (mapping) => {
    if (window.confirm(`Are you sure you want to delete mapping for "${mapping.sku_code.toUpperCase()}"?`)) {
      deleteSkuMappingMutation.mutate({
        sku_code: mapping.sku_code,
        product_id: mapping.product_id
      });
    }
  };
  return /* @__PURE__ */ React9.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "2rem" } }, /* @__PURE__ */ React9.createElement("div", { className: "section-card" }, /* @__PURE__ */ React9.createElement("div", { className: "section-header" }, /* @__PURE__ */ React9.createElement("h2", null, "Import Templates Mapping"), isAdmin && /* @__PURE__ */ React9.createElement("button", { className: "btn btn-primary", onClick: () => openTemplateModal() }, /* @__PURE__ */ React9.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor" }, /* @__PURE__ */ React9.createElement("path", { d: "M5 12h14M12 5v14" })), "Create Template")), /* @__PURE__ */ React9.createElement("div", { className: "table-wrapper" }, /* @__PURE__ */ React9.createElement("table", null, /* @__PURE__ */ React9.createElement("thead", null, /* @__PURE__ */ React9.createElement("tr", null, /* @__PURE__ */ React9.createElement("th", null, "ID"), /* @__PURE__ */ React9.createElement("th", null, "Template Name"), /* @__PURE__ */ React9.createElement("th", null, "Columns Mapped"), isAdmin && /* @__PURE__ */ React9.createElement("th", null, "Actions"))), /* @__PURE__ */ React9.createElement("tbody", { id: "templates-table-body" }, isLoadingTemplates ? /* @__PURE__ */ React9.createElement("tr", null, /* @__PURE__ */ React9.createElement("td", { colSpan: isAdmin ? 4 : 3, style: { textAlign: "center", color: "var(--text-muted)" } }, "Loading templates...")) : templates.length === 0 ? /* @__PURE__ */ React9.createElement("tr", null, /* @__PURE__ */ React9.createElement("td", { colSpan: isAdmin ? 4 : 3, style: { textAlign: "center", color: "var(--text-muted)" } }, "No templates found.")) : templates.map((t) => {
    const mappingKeys = Object.entries(t.column_mapping).map(([k, v]) => `${k} \u2192 ${v}`).join(", ");
    return /* @__PURE__ */ React9.createElement("tr", { key: t.id }, /* @__PURE__ */ React9.createElement("td", null, t.id), /* @__PURE__ */ React9.createElement("td", null, /* @__PURE__ */ React9.createElement("strong", null, t.name)), /* @__PURE__ */ React9.createElement(
      "td",
      {
        style: { fontSize: "0.85rem", maxWidth: "400px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
        title: JSON.stringify(t.column_mapping)
      },
      mappingKeys
    ), isAdmin && /* @__PURE__ */ React9.createElement("td", null, /* @__PURE__ */ React9.createElement("div", { style: { display: "flex", gap: "0.5rem" } }, /* @__PURE__ */ React9.createElement("button", { className: "btn btn-secondary btn-sm btn-edit-template", onClick: () => openTemplateModal(t) }, /* @__PURE__ */ React9.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor" }, /* @__PURE__ */ React9.createElement("path", { d: "M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" })), "Edit"), /* @__PURE__ */ React9.createElement("button", { className: "btn btn-danger btn-sm btn-delete-template", onClick: () => handleDeleteTemplate(t.id) }, /* @__PURE__ */ React9.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor" }, /* @__PURE__ */ React9.createElement("path", { d: "M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" })), "Delete"))));
  }))))), isAdmin && /* @__PURE__ */ React9.createElement("div", { className: "section-card", id: "user-management-section" }, /* @__PURE__ */ React9.createElement("div", { className: "section-header" }, /* @__PURE__ */ React9.createElement("h2", null, "User Accounts Management"), /* @__PURE__ */ React9.createElement("button", { className: "btn btn-primary", onClick: openUserModal }, /* @__PURE__ */ React9.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor" }, /* @__PURE__ */ React9.createElement("path", { d: "M5 12h14M12 5v14" })), "Create Account")), /* @__PURE__ */ React9.createElement("div", { className: "table-wrapper" }, /* @__PURE__ */ React9.createElement("table", null, /* @__PURE__ */ React9.createElement("thead", null, /* @__PURE__ */ React9.createElement("tr", null, /* @__PURE__ */ React9.createElement("th", null, "ID"), /* @__PURE__ */ React9.createElement("th", null, "Username"), /* @__PURE__ */ React9.createElement("th", null, "Role"), /* @__PURE__ */ React9.createElement("th", null, "Created At"), /* @__PURE__ */ React9.createElement("th", null, "Actions"))), /* @__PURE__ */ React9.createElement("tbody", { id: "users-table-body" }, isLoadingUsers ? /* @__PURE__ */ React9.createElement("tr", null, /* @__PURE__ */ React9.createElement("td", { colSpan: 5, style: { textAlign: "center", color: "var(--text-muted)" } }, "Loading users...")) : users.map((u) => {
    const cleanStr = typeof u.created_at === "string" && !u.created_at.includes("T") ? u.created_at.replace(/-/g, "/") : u.created_at;
    const createdDate = new Date(cleanStr).toLocaleString();
    const isSelfOrMainAdmin = u.id === 1 || u.id === currentUser?.id;
    return /* @__PURE__ */ React9.createElement("tr", { key: u.id }, /* @__PURE__ */ React9.createElement("td", null, u.id), /* @__PURE__ */ React9.createElement("td", null, /* @__PURE__ */ React9.createElement("strong", null, u.username)), /* @__PURE__ */ React9.createElement("td", null, /* @__PURE__ */ React9.createElement("span", { className: `status-tag ${u.role === "admin" ? "info" : "success"}` }, u.role.toUpperCase())), /* @__PURE__ */ React9.createElement("td", null, createdDate), /* @__PURE__ */ React9.createElement("td", null, isSelfOrMainAdmin ? /* @__PURE__ */ React9.createElement("span", { style: { fontSize: "0.85rem", color: "var(--text-muted)" } }, "Protected") : /* @__PURE__ */ React9.createElement("button", { className: "btn btn-danger btn-sm btn-delete-user", onClick: () => handleDeleteUser(u) }, /* @__PURE__ */ React9.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor" }, /* @__PURE__ */ React9.createElement("path", { d: "M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" })), "Delete")));
  }))))), /* @__PURE__ */ React9.createElement("div", { className: "section-card" }, /* @__PURE__ */ React9.createElement("div", { className: "section-header" }, /* @__PURE__ */ React9.createElement("h2", null, "SKU & Bundle Mappings Master"), isAdmin && /* @__PURE__ */ React9.createElement("button", { className: "btn btn-primary", onClick: openSkuModal }, /* @__PURE__ */ React9.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor" }, /* @__PURE__ */ React9.createElement("path", { d: "M5 12h14M12 5v14" })), "Add SKU Mapping")), /* @__PURE__ */ React9.createElement("div", { className: "table-wrapper" }, /* @__PURE__ */ React9.createElement("table", null, /* @__PURE__ */ React9.createElement("thead", null, /* @__PURE__ */ React9.createElement("tr", null, /* @__PURE__ */ React9.createElement("th", null, "SKU Code"), /* @__PURE__ */ React9.createElement("th", null, "Target Product"), /* @__PURE__ */ React9.createElement("th", null, "Model"), /* @__PURE__ */ React9.createElement("th", null, "Quantity"), /* @__PURE__ */ React9.createElement("th", null, "Actions"))), /* @__PURE__ */ React9.createElement("tbody", { id: "sku-mappings-table-body" }, isLoadingSkuMappings ? /* @__PURE__ */ React9.createElement("tr", null, /* @__PURE__ */ React9.createElement("td", { colSpan: 5, style: { textAlign: "center", color: "var(--text-muted)" } }, "Loading mappings...")) : skuMappings.length === 0 ? /* @__PURE__ */ React9.createElement("tr", null, /* @__PURE__ */ React9.createElement("td", { colSpan: 5, style: { textAlign: "center", color: "var(--text-muted)" } }, "No custom SKU mappings defined.")) : skuMappings.map((m, idx) => /* @__PURE__ */ React9.createElement("tr", { key: m.sku_code + "-" + m.product_id + "-" + idx }, /* @__PURE__ */ React9.createElement("td", null, /* @__PURE__ */ React9.createElement("strong", null, m.sku_code.toUpperCase())), /* @__PURE__ */ React9.createElement("td", null, m.product_name), /* @__PURE__ */ React9.createElement("td", null, /* @__PURE__ */ React9.createElement("code", { className: "code-badge" }, m.product_model)), /* @__PURE__ */ React9.createElement("td", null, m.quantity, " Pcs"), /* @__PURE__ */ React9.createElement("td", null, isAdmin ? /* @__PURE__ */ React9.createElement("button", { className: "btn btn-danger btn-sm btn-delete-sku", onClick: () => handleDeleteSku(m) }, /* @__PURE__ */ React9.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor" }, /* @__PURE__ */ React9.createElement("path", { d: "M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" })), "Delete") : /* @__PURE__ */ React9.createElement("span", { style: { fontSize: "0.85rem", color: "var(--text-muted)" } }, "Protected")))))))), isAdmin && /* @__PURE__ */ React9.createElement("div", { className: "section-card" }, /* @__PURE__ */ React9.createElement("div", { className: "section-header" }, /* @__PURE__ */ React9.createElement("h2", null, "Marketplace Connections (Tokopedia & Shopee)"), /* @__PURE__ */ React9.createElement("button", { className: "btn btn-primary", onClick: openMarketplaceModal }, /* @__PURE__ */ React9.createElement("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor" }, /* @__PURE__ */ React9.createElement("path", { d: "M5 12h14M12 5v14" })), "Connect Shop")), /* @__PURE__ */ React9.createElement("div", { className: "table-wrapper" }, /* @__PURE__ */ React9.createElement("table", null, /* @__PURE__ */ React9.createElement("thead", null, /* @__PURE__ */ React9.createElement("tr", null, /* @__PURE__ */ React9.createElement("th", null, "Platform"), /* @__PURE__ */ React9.createElement("th", null, "Shop ID"), /* @__PURE__ */ React9.createElement("th", null, "Shop Name"), /* @__PURE__ */ React9.createElement("th", null, "Expiration Status"), /* @__PURE__ */ React9.createElement("th", null, "Actions"))), /* @__PURE__ */ React9.createElement("tbody", null, isLoadingCredentials ? /* @__PURE__ */ React9.createElement("tr", null, /* @__PURE__ */ React9.createElement("td", { colSpan: 5, style: { textAlign: "center", color: "var(--text-muted)" } }, "Loading connections...")) : credentials.length === 0 ? /* @__PURE__ */ React9.createElement("tr", null, /* @__PURE__ */ React9.createElement("td", { colSpan: 5, style: { textAlign: "center", color: "var(--text-muted)" } }, "No connected marketplace shops.")) : credentials.map((cred) => {
    const syncingKey = cred.platform + "-" + cred.shop_id;
    const isSyncing = !!syncingShops[syncingKey];
    return /* @__PURE__ */ React9.createElement("tr", { key: cred.id }, /* @__PURE__ */ React9.createElement("td", null, /* @__PURE__ */ React9.createElement("span", { className: `platform-badge ${cred.platform}`, style: {
      padding: "0.2rem 0.5rem",
      borderRadius: "4px",
      fontWeight: "bold",
      fontSize: "0.8rem",
      backgroundColor: cred.platform === "shopee" ? "#ff5500" : "#42b549",
      color: "#ffffff"
    } }, cred.platform.toUpperCase())), /* @__PURE__ */ React9.createElement("td", null, cred.shop_id), /* @__PURE__ */ React9.createElement("td", null, cred.shop_name || "N/A"), /* @__PURE__ */ React9.createElement("td", null, cred.token_expires_at ? new Date(cred.token_expires_at) < /* @__PURE__ */ new Date() ? /* @__PURE__ */ React9.createElement("span", { style: { color: "var(--danger-color)", fontWeight: "bold" } }, "Expired") : /* @__PURE__ */ React9.createElement("span", null, "Expires: ", new Date(cred.token_expires_at).toLocaleString()) : "N/A"), /* @__PURE__ */ React9.createElement("td", null, /* @__PURE__ */ React9.createElement("div", { style: { display: "flex", gap: "0.5rem" } }, /* @__PURE__ */ React9.createElement(
      "button",
      {
        className: "btn btn-primary btn-sm",
        onClick: () => handleSyncShop(cred.platform, cred.shop_id),
        disabled: isSyncing
      },
      isSyncing ? "Syncing..." : "Sync Now"
    ), /* @__PURE__ */ React9.createElement(
      "button",
      {
        className: "btn btn-danger btn-sm",
        onClick: () => handleDeleteShop(cred.platform, cred.shop_id)
      },
      "Disconnect"
    ))));
  }))))), activeModal === "template" && /* @__PURE__ */ React9.createElement("div", { className: "modal-overlay" }, /* @__PURE__ */ React9.createElement("div", { className: "modal", style: { maxWidth: "550px" } }, /* @__PURE__ */ React9.createElement("div", { className: "modal-header" }, /* @__PURE__ */ React9.createElement("h3", null, modalTarget ? "Edit Import Template" : "Create Import Template"), /* @__PURE__ */ React9.createElement("button", { className: "modal-close", onClick: closeModal }, "\xD7")), /* @__PURE__ */ React9.createElement("div", { className: "modal-body" }, /* @__PURE__ */ React9.createElement("form", { id: "modal-template-form", style: { display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "60vh", overflowY: "auto", paddingRight: "0.5rem" }, onSubmit: handleTemplateSubmit }, /* @__PURE__ */ React9.createElement("div", { className: "form-group" }, /* @__PURE__ */ React9.createElement("label", { htmlFor: "t-name" }, "Template Name"), /* @__PURE__ */ React9.createElement(
    "input",
    {
      type: "text",
      id: "t-name",
      required: true,
      placeholder: "e.g. Shopee / Tokopedia",
      value: templateName,
      onChange: (e) => setTemplateName(e.target.value)
    }
  )), /* @__PURE__ */ React9.createElement("h4", { style: { marginTop: "1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem", color: "var(--accent-color)" } }, "Column Mapping Configuration"), /* @__PURE__ */ React9.createElement("p", { style: { fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.5rem" } }, "Enter the exact column names (headers) from your Excel spreadsheet mapping to the system fields."), /* @__PURE__ */ React9.createElement("div", { className: "form-group" }, /* @__PURE__ */ React9.createElement("label", { htmlFor: "m-order-id" }, "Order ID Column (Required)"), /* @__PURE__ */ React9.createElement(
    "input",
    {
      type: "text",
      id: "m-order-id",
      required: true,
      placeholder: "e.g. No. Pesanan or Nomor Invoice",
      value: colOrderId,
      onChange: (e) => setColOrderId(e.target.value)
    }
  )), /* @__PURE__ */ React9.createElement("div", { className: "form-group" }, /* @__PURE__ */ React9.createElement("label", { htmlFor: "m-resi-number" }, "Resi / Tracking Number Column"), /* @__PURE__ */ React9.createElement(
    "input",
    {
      type: "text",
      id: "m-resi-number",
      placeholder: "e.g. No. Resi or Nomor Resi",
      value: colResiNumber,
      onChange: (e) => setColResiNumber(e.target.value)
    }
  )), /* @__PURE__ */ React9.createElement("div", { className: "form-group" }, /* @__PURE__ */ React9.createElement("label", { htmlFor: "m-product-name" }, "Product Name / Description Column (Required)"), /* @__PURE__ */ React9.createElement(
    "input",
    {
      type: "text",
      id: "m-product-name",
      required: true,
      placeholder: "e.g. Nama Produk",
      value: colProductName,
      onChange: (e) => setColProductName(e.target.value)
    }
  )), /* @__PURE__ */ React9.createElement("div", { className: "form-group" }, /* @__PURE__ */ React9.createElement("label", { htmlFor: "m-quantity" }, "Quantity Column (Required)"), /* @__PURE__ */ React9.createElement(
    "input",
    {
      type: "text",
      id: "m-quantity",
      required: true,
      placeholder: "e.g. Jumlah or Jumlah Produk",
      value: colQuantity,
      onChange: (e) => setColQuantity(e.target.value)
    }
  )), /* @__PURE__ */ React9.createElement("div", { className: "form-group" }, /* @__PURE__ */ React9.createElement("label", { htmlFor: "m-order-status" }, "Order Status Column (Required)"), /* @__PURE__ */ React9.createElement(
    "input",
    {
      type: "text",
      id: "m-order-status",
      required: true,
      placeholder: "e.g. Status Pesanan or Status Terakhir",
      value: colOrderStatus,
      onChange: (e) => setColOrderStatus(e.target.value)
    }
  )), /* @__PURE__ */ React9.createElement("div", { className: "form-group" }, /* @__PURE__ */ React9.createElement("label", { htmlFor: "m-customer-name" }, "Customer Username / Name Column"), /* @__PURE__ */ React9.createElement(
    "input",
    {
      type: "text",
      id: "m-customer-name",
      placeholder: "e.g. Username Pembeli or Nama Pembeli",
      value: colCustomerName,
      onChange: (e) => setColCustomerName(e.target.value)
    }
  )), /* @__PURE__ */ React9.createElement("div", { className: "form-group" }, /* @__PURE__ */ React9.createElement("label", { htmlFor: "m-expedition" }, "Expedition / Courier Column"), /* @__PURE__ */ React9.createElement(
    "input",
    {
      type: "text",
      id: "m-expedition",
      placeholder: "e.g. Opsi Pengiriman or Kurir",
      value: colExpedition,
      onChange: (e) => setColExpedition(e.target.value)
    }
  )), /* @__PURE__ */ React9.createElement("div", { className: "form-group" }, /* @__PURE__ */ React9.createElement("label", { htmlFor: "m-order-date" }, "Order Date / Time Column"), /* @__PURE__ */ React9.createElement(
    "input",
    {
      type: "text",
      id: "m-order-date",
      placeholder: "e.g. Waktu Pembayaran or Tanggal Transaksi",
      value: colOrderDate,
      onChange: (e) => setColOrderDate(e.target.value)
    }
  )), /* @__PURE__ */ React9.createElement("div", { className: "form-group" }, /* @__PURE__ */ React9.createElement("label", { htmlFor: "m-price" }, "Price / Payment Column"), /* @__PURE__ */ React9.createElement(
    "input",
    {
      type: "text",
      id: "m-price",
      placeholder: "e.g. Total Pembayaran or Nilai Transaksi",
      value: colPrice,
      onChange: (e) => setColPrice(e.target.value)
    }
  )), /* @__PURE__ */ React9.createElement("div", { className: "form-group" }, /* @__PURE__ */ React9.createElement("label", { htmlFor: "m-sku-ref" }, "SKU Reference Column (Nomor Referensi SKU)"), /* @__PURE__ */ React9.createElement(
    "input",
    {
      type: "text",
      id: "m-sku-ref",
      placeholder: "e.g. Nomor Referensi SKU or SKU",
      value: colSkuRef,
      onChange: (e) => setColSkuRef(e.target.value)
    }
  )))), /* @__PURE__ */ React9.createElement("div", { className: "modal-footer" }, /* @__PURE__ */ React9.createElement("button", { className: "btn btn-secondary", onClick: closeModal }, "Cancel"), /* @__PURE__ */ React9.createElement("button", { type: "submit", form: "modal-template-form", className: "btn btn-primary", disabled: saveTemplateMutation.isPending }, saveTemplateMutation.isPending ? "Saving..." : "Save Template")))), activeModal === "user" && /* @__PURE__ */ React9.createElement("div", { className: "modal-overlay" }, /* @__PURE__ */ React9.createElement("div", { className: "modal" }, /* @__PURE__ */ React9.createElement("div", { className: "modal-header" }, /* @__PURE__ */ React9.createElement("h3", null, "Create New User Account"), /* @__PURE__ */ React9.createElement("button", { className: "modal-close", onClick: closeModal }, "\xD7")), /* @__PURE__ */ React9.createElement("div", { className: "modal-body" }, /* @__PURE__ */ React9.createElement("form", { id: "modal-user-form", style: { display: "flex", flexDirection: "column", gap: "1rem" }, onSubmit: handleUserSubmit }, /* @__PURE__ */ React9.createElement("div", { className: "form-group" }, /* @__PURE__ */ React9.createElement("label", { htmlFor: "u-username" }, "Username"), /* @__PURE__ */ React9.createElement(
    "input",
    {
      type: "text",
      id: "u-username",
      placeholder: "e.g. staff_john",
      required: true,
      autoComplete: "username",
      value: userUsername,
      onChange: (e) => setUserUsername(e.target.value)
    }
  )), /* @__PURE__ */ React9.createElement("div", { className: "form-group" }, /* @__PURE__ */ React9.createElement("label", { htmlFor: "u-password" }, "Password"), /* @__PURE__ */ React9.createElement(
    "input",
    {
      type: "password",
      id: "u-password",
      placeholder: "Enter password",
      required: true,
      autoComplete: "new-password",
      value: userPassword,
      onChange: (e) => setUserPassword(e.target.value)
    }
  )), /* @__PURE__ */ React9.createElement("div", { className: "form-group" }, /* @__PURE__ */ React9.createElement("label", { htmlFor: "u-role" }, "Role"), /* @__PURE__ */ React9.createElement(
    "select",
    {
      id: "u-role",
      required: true,
      value: userRole,
      onChange: (e) => setUserRole(e.target.value)
    },
    /* @__PURE__ */ React9.createElement("option", { value: "staff" }, "Staff"),
    /* @__PURE__ */ React9.createElement("option", { value: "admin" }, "Admin")
  )))), /* @__PURE__ */ React9.createElement("div", { className: "modal-footer" }, /* @__PURE__ */ React9.createElement("button", { className: "btn btn-secondary", onClick: closeModal }, "Cancel"), /* @__PURE__ */ React9.createElement("button", { type: "submit", form: "modal-user-form", className: "btn btn-primary", disabled: createUserMutation.isPending }, createUserMutation.isPending ? "Creating..." : "Create User")))), activeModal === "sku" && /* @__PURE__ */ React9.createElement("div", { className: "modal-overlay" }, /* @__PURE__ */ React9.createElement("div", { className: "modal" }, /* @__PURE__ */ React9.createElement("div", { className: "modal-header" }, /* @__PURE__ */ React9.createElement("h3", null, "Create SKU / Bundle Mapping"), /* @__PURE__ */ React9.createElement("button", { className: "modal-close", onClick: closeModal }, "\xD7")), /* @__PURE__ */ React9.createElement("div", { className: "modal-body" }, /* @__PURE__ */ React9.createElement("form", { id: "modal-sku-form", style: { display: "flex", flexDirection: "column", gap: "1rem" }, onSubmit: handleSkuSubmit }, /* @__PURE__ */ React9.createElement("div", { className: "form-group" }, /* @__PURE__ */ React9.createElement("label", { htmlFor: "sku-code" }, "SKU Code (e.g. CROOR_5S or CASE_1B)"), /* @__PURE__ */ React9.createElement(
    "input",
    {
      type: "text",
      id: "sku-code",
      placeholder: "Enter ecommerce SKU code",
      required: true,
      value: skuCode,
      onChange: (e) => setSkuCode(e.target.value)
    }
  )), /* @__PURE__ */ React9.createElement("div", { className: "form-group" }, /* @__PURE__ */ React9.createElement("label", { htmlFor: "sku-product-id" }, "Target Product"), /* @__PURE__ */ React9.createElement(
    "select",
    {
      id: "sku-product-id",
      required: true,
      value: skuProductId,
      onChange: (e) => setSkuProductId(e.target.value)
    },
    /* @__PURE__ */ React9.createElement("option", { value: "", disabled: true }, "Select target product"),
    products.map((p) => /* @__PURE__ */ React9.createElement("option", { key: p.id, value: p.id }, p.name, " (", p.model, ")"))
  )), /* @__PURE__ */ React9.createElement("div", { className: "form-group" }, /* @__PURE__ */ React9.createElement("label", { htmlFor: "sku-quantity" }, "Quantity Multiplier"), /* @__PURE__ */ React9.createElement(
    "input",
    {
      type: "number",
      id: "sku-quantity",
      min: "1",
      required: true,
      value: skuQuantity,
      onChange: (e) => setSkuQuantity(parseInt(e.target.value, 10) || 1)
    }
  )))), /* @__PURE__ */ React9.createElement("div", { className: "modal-footer" }, /* @__PURE__ */ React9.createElement("button", { className: "btn btn-secondary", onClick: closeModal }, "Cancel"), /* @__PURE__ */ React9.createElement("button", { type: "submit", form: "modal-sku-form", className: "btn btn-primary", disabled: saveSkuMappingMutation.isPending }, saveSkuMappingMutation.isPending ? "Saving..." : "Save Mapping")))), activeModal === "marketplace" && /* @__PURE__ */ React9.createElement("div", { className: "modal-overlay" }, /* @__PURE__ */ React9.createElement("div", { className: "modal", style: { maxWidth: "500px" } }, /* @__PURE__ */ React9.createElement("div", { className: "modal-header" }, /* @__PURE__ */ React9.createElement("h3", null, "Connect Marketplace Shop"), /* @__PURE__ */ React9.createElement("button", { className: "modal-close", onClick: closeModal }, "\xD7")), /* @__PURE__ */ React9.createElement("div", { className: "modal-body" }, /* @__PURE__ */ React9.createElement("form", { id: "modal-marketplace-form", style: { display: "flex", flexDirection: "column", gap: "1rem" }, onSubmit: handleMarketplaceSubmit }, /* @__PURE__ */ React9.createElement("div", { className: "form-group" }, /* @__PURE__ */ React9.createElement("label", { htmlFor: "m-platform" }, "Marketplace Platform"), /* @__PURE__ */ React9.createElement(
    "select",
    {
      id: "m-platform",
      required: true,
      value: marketPlatform,
      onChange: (e) => setMarketPlatform(e.target.value)
    },
    /* @__PURE__ */ React9.createElement("option", { value: "shopee" }, "Shopee Open API v2"),
    /* @__PURE__ */ React9.createElement("option", { value: "tokopedia" }, "Tokopedia Seller API")
  )), /* @__PURE__ */ React9.createElement("div", { className: "form-group" }, /* @__PURE__ */ React9.createElement("label", { htmlFor: "m-shop-id" }, "Shop ID"), /* @__PURE__ */ React9.createElement(
    "input",
    {
      type: "text",
      id: "m-shop-id",
      required: true,
      placeholder: "e.g. 123456",
      value: marketShopId,
      onChange: (e) => setMarketShopId(e.target.value)
    }
  )), /* @__PURE__ */ React9.createElement("div", { className: "form-group" }, /* @__PURE__ */ React9.createElement("label", { htmlFor: "m-shop-name" }, "Shop Name (Optional)"), /* @__PURE__ */ React9.createElement(
    "input",
    {
      type: "text",
      id: "m-shop-name",
      placeholder: "e.g. My Shop Indo",
      value: marketShopName,
      onChange: (e) => setMarketShopName(e.target.value)
    }
  )), /* @__PURE__ */ React9.createElement("div", { className: "form-group" }, /* @__PURE__ */ React9.createElement("label", { htmlFor: "m-access-token" }, "Mock Access Token"), /* @__PURE__ */ React9.createElement(
    "input",
    {
      type: "text",
      id: "m-access-token",
      required: true,
      placeholder: "Enter any mock access token key",
      value: marketAccessToken,
      onChange: (e) => setMarketAccessToken(e.target.value)
    }
  )))), /* @__PURE__ */ React9.createElement("div", { className: "modal-footer" }, /* @__PURE__ */ React9.createElement("button", { className: "btn btn-secondary", onClick: closeModal }, "Cancel"), /* @__PURE__ */ React9.createElement("button", { type: "submit", form: "modal-marketplace-form", className: "btn btn-primary", disabled: connectShopMutation.isPending }, connectShopMutation.isPending ? "Connecting..." : "Connect")))));
}

// app/routes/settings.jsx
var Route6 = createFileRoute6("/settings")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(settingsTemplatesQueryOptions),
      context.queryClient.ensureQueryData(settingsSkuMappingsQueryOptions),
      context.queryClient.ensureQueryData(settingsProductsQueryOptions)
    ]);
  },
  component: Settings
});

// app/routes/products/status-return.jsx
import { createFileRoute as createFileRoute7 } from "@tanstack/react-router";

// app/pages/StatusReturn.jsx
import React10, { useState as useState8, useEffect as useEffect8 } from "react";
import { useQuery as useQuery7 } from "@tanstack/react-query";
function StatusReturn() {
  const [searchQuery, setSearchQuery] = useState8("");
  const { data: returnedOrders = [], isLoading, error } = useQuery7(returnedOrdersQueryOptions);
  useEffect8(() => {
    if (error) {
      showToast("Error", "Failed to load returned orders", "error");
    }
  }, [error]);
  const filteredOrders = returnedOrders.filter((o) => {
    const q = searchQuery.toLowerCase();
    return (o.order_id || "").toLowerCase().includes(q) || (o.customer_name || "").toLowerCase().includes(q) || (o.product_name_raw || "").toLowerCase().includes(q) || (o.resolution_notes || "").toLowerCase().includes(q);
  });
  return /* @__PURE__ */ React10.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "2rem" } }, /* @__PURE__ */ React10.createElement("div", { className: "section-card", style: { padding: "1.5rem", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center", justifyContent: "space-between", borderRadius: "var(--border-radius-lg)", boxShadow: "var(--shadow-sm)" } }, /* @__PURE__ */ React10.createElement("div", null, /* @__PURE__ */ React10.createElement("h2", { style: { fontSize: "1.25rem", fontWeight: "700", color: "var(--text-primary)", margin: 0 } }, "Returned Orders Logs"), /* @__PURE__ */ React10.createElement("p", { style: { fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem", margin: 0 } }, "View all completed returns that have been processed and added back to inventory stock.")), /* @__PURE__ */ React10.createElement("div", { style: { position: "relative", width: "320px", maxWidth: "100%" } }, /* @__PURE__ */ React10.createElement(
    "input",
    {
      type: "text",
      placeholder: "Search customer, order, notes...",
      value: searchQuery,
      onChange: (e) => setSearchQuery(e.target.value),
      style: {
        width: "100%",
        padding: "0.6rem 1rem",
        paddingLeft: "2.5rem",
        fontSize: "0.85rem",
        borderRadius: "var(--border-radius-md)",
        border: "1px solid var(--border-color)",
        backgroundColor: "var(--bg-secondary)",
        color: "var(--text-primary)",
        transition: "var(--transition)"
      }
    }
  ), /* @__PURE__ */ React10.createElement("span", { style: { position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", opacity: 0.4, fontSize: "0.9rem" } }, "\u{1F50D}"))), /* @__PURE__ */ React10.createElement("div", { className: "section-card" }, /* @__PURE__ */ React10.createElement("div", { className: "section-header", style: { borderBottom: "1px solid var(--border-color)", paddingBottom: "1rem", marginBottom: "1rem" } }, /* @__PURE__ */ React10.createElement("h2", null, "Status Return Logs (", filteredOrders.length, ")")), /* @__PURE__ */ React10.createElement("div", { className: "table-wrapper" }, /* @__PURE__ */ React10.createElement("table", null, /* @__PURE__ */ React10.createElement("thead", null, /* @__PURE__ */ React10.createElement("tr", null, /* @__PURE__ */ React10.createElement("th", null, "No Order"), /* @__PURE__ */ React10.createElement("th", null, "Date"), /* @__PURE__ */ React10.createElement("th", null, "Channel MP"), /* @__PURE__ */ React10.createElement("th", null, "Customer Info"), /* @__PURE__ */ React10.createElement("th", null, "Item Name (Raw)"), /* @__PURE__ */ React10.createElement("th", null, "Qty"), /* @__PURE__ */ React10.createElement("th", null, "Description"), /* @__PURE__ */ React10.createElement("th", null, "Status Item"), /* @__PURE__ */ React10.createElement("th", null, "Resolved Items (Mapped)"), /* @__PURE__ */ React10.createElement("th", null, "Time Resolved"))), /* @__PURE__ */ React10.createElement("tbody", null, isLoading ? /* @__PURE__ */ React10.createElement("tr", null, /* @__PURE__ */ React10.createElement("td", { colSpan: 10, style: { textAlign: "center", py: "2.5rem", color: "var(--text-muted)" } }, /* @__PURE__ */ React10.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", padding: "2rem 0" } }, /* @__PURE__ */ React10.createElement("div", { className: "loading-spinner", style: { width: "1.5rem", height: "1.5rem" } }), /* @__PURE__ */ React10.createElement("span", { style: { fontSize: "0.85rem" } }, "Retrieving logs...")))) : filteredOrders.length === 0 ? /* @__PURE__ */ React10.createElement("tr", null, /* @__PURE__ */ React10.createElement("td", { colSpan: 10, style: { textAlign: "center", py: "2rem", color: "var(--text-muted)", fontSize: "0.85rem", padding: "3rem 0" } }, "No returned orders found.")) : filteredOrders.map((o) => {
    const resolvedItemsText = o.items && o.items.length > 0 ? /* @__PURE__ */ React10.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "0.35rem" } }, o.items.map((item) => /* @__PURE__ */ React10.createElement("div", { key: item.id, style: { display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.25rem 0.5rem", backgroundColor: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "var(--border-radius-sm)", fontSize: "0.75rem" } }, /* @__PURE__ */ React10.createElement("span", { style: { color: "var(--accent-color)", fontWeight: "600" } }, item.quantity, "x"), /* @__PURE__ */ React10.createElement("span", { style: { fontWeight: "500", color: "var(--text-primary)" }, className: "truncate" }, item.product_name), item.product_model && /* @__PURE__ */ React10.createElement("span", { style: { opacity: 0.5, fontSize: "0.7rem" } }, "(", item.product_model, ")")))) : /* @__PURE__ */ React10.createElement("span", { style: { color: "var(--text-muted)", fontSize: "0.75rem", fontStyle: "italic" } }, "None (Direct raw refund)");
    return /* @__PURE__ */ React10.createElement("tr", { key: o.id }, /* @__PURE__ */ React10.createElement("td", { style: { fontFamily: "monospace", fontSize: "0.8rem", fontWeight: "600", color: "var(--text-primary)" } }, o.order_id), /* @__PURE__ */ React10.createElement("td", { style: { fontSize: "0.8rem", color: "var(--text-primary)", whiteSpace: "nowrap" } }, o.order_date || "-"), /* @__PURE__ */ React10.createElement("td", { style: { fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: "500" } }, /* @__PURE__ */ React10.createElement("span", { style: {
      padding: "0.25rem 0.5rem",
      borderRadius: "var(--border-radius-sm)",
      fontSize: "0.75rem",
      fontWeight: "600",
      backgroundColor: o.channel_mp?.toLowerCase() === "shopee" ? "#ff572220" : o.channel_mp?.toLowerCase() === "tokopedia" ? "#4caf5020" : "var(--bg-primary)",
      color: o.channel_mp?.toLowerCase() === "shopee" ? "#ff5722" : o.channel_mp?.toLowerCase() === "tokopedia" ? "#4caf50" : "var(--text-primary)"
    } }, o.channel_mp || "Unknown")), /* @__PURE__ */ React10.createElement("td", null, /* @__PURE__ */ React10.createElement("div", { style: { fontWeight: "600", fontSize: "0.85rem", color: "var(--text-primary)" } }, o.customer_name || "Anonymous Customer"), /* @__PURE__ */ React10.createElement("div", { style: { fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.1rem", display: "flex", alignItems: "center", gap: "0.35rem" } }, /* @__PURE__ */ React10.createElement("span", null, "\u{1F69A} ", o.expedition || "Courier"), o.resi_number && /* @__PURE__ */ React10.createElement(React10.Fragment, null, /* @__PURE__ */ React10.createElement("span", { style: { opacity: 0.3 } }, "|"), /* @__PURE__ */ React10.createElement("span", { style: { fontFamily: "monospace", fontSize: "0.7rem", color: "var(--accent-color)" } }, o.resi_number)))), /* @__PURE__ */ React10.createElement("td", { style: { fontSize: "0.8rem", color: "var(--text-secondary)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, title: o.product_name_raw }, o.product_name_raw), /* @__PURE__ */ React10.createElement("td", { style: { fontWeight: "700", fontSize: "0.85rem", color: "var(--text-primary)" } }, o.quantity), /* @__PURE__ */ React10.createElement("td", null, /* @__PURE__ */ React10.createElement("div", { style: { fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: "500", padding: "0.4rem 0.6rem", backgroundColor: "var(--accent-light)", border: "1px solid rgba(var(--accent-color-rgb), 0.15)", borderRadius: "var(--border-radius-md)", maxWidth: "280px", lineHeight: "1.4" } }, o.resolution_notes || "No return notes provided.")), /* @__PURE__ */ React10.createElement("td", { style: { fontSize: "0.8rem", color: "var(--text-secondary)", whiteSpace: "nowrap" } }, o.order_status || "-"), /* @__PURE__ */ React10.createElement("td", null, resolvedItemsText), /* @__PURE__ */ React10.createElement("td", { style: { fontSize: "0.75rem", color: "var(--text-secondary)", whiteSpace: "nowrap" } }, o.resolved_at || o.created_at || "Recently"));
  }))))));
}

// app/routes/products/status-return.jsx
var Route7 = createFileRoute7("/products/status-return")({
  loader: ({ context }) => context.queryClient.ensureQueryData(returnedOrdersQueryOptions),
  component: StatusReturn
});

// tests/test-route-loaders.js
async function runTests() {
  console.log("\n--- Running Route Loaders Unit Tests ---");
  const calledOptions = [];
  const mockQueryClient = {
    ensureQueryData: async (options) => {
      calledOptions.push(options);
      return { success: true };
    }
  };
  const context = { queryClient: mockQueryClient };
  console.log("Testing '/' loader...");
  await Route.options.loader({ context });
  if (calledOptions[0] !== dashboardStatsQueryOptions) {
    throw new Error("'/' loader failed to call ensureQueryData with dashboardStatsQueryOptions");
  }
  calledOptions.length = 0;
  console.log("Testing '/products/' loader...");
  await Route2.options.loader({ context });
  if (calledOptions[0] !== productsQueryOptions) {
    throw new Error("'/products/' loader failed to call ensureQueryData with productsQueryOptions");
  }
  calledOptions.length = 0;
  console.log("Testing '/opname' loader...");
  await Route3.options.loader({ context });
  if (calledOptions[0] !== opnamesQueryOptions) {
    throw new Error("'/opname' loader failed to call ensureQueryData with opnamesQueryOptions");
  }
  calledOptions.length = 0;
  console.log("Testing '/stock-history' loader...");
  await Route4.options.loader({ context });
  if (calledOptions[0] !== ledgerQueryOptions) {
    throw new Error("'/stock-history' loader failed to call ensureQueryData with ledgerQueryOptions");
  }
  calledOptions.length = 0;
  console.log("Testing '/review' loader...");
  await Route5.options.loader({ context });
  if (calledOptions.length !== 3 || !calledOptions.includes(productsQueryOptions) || !calledOptions.includes(reviewOrdersQueryOptions) || !calledOptions.includes(reviewAmbiguousQueryOptions)) {
    throw new Error("'/review' loader failed to call ensureQueryData with expected query options");
  }
  calledOptions.length = 0;
  console.log("Testing '/settings' loader...");
  await Route6.options.loader({ context });
  if (calledOptions.length !== 3 || !calledOptions.includes(settingsTemplatesQueryOptions) || !calledOptions.includes(settingsSkuMappingsQueryOptions) || !calledOptions.includes(settingsProductsQueryOptions)) {
    throw new Error("'/settings' loader failed to call ensureQueryData with expected query options");
  }
  calledOptions.length = 0;
  console.log("Testing '/products/status-return' loader...");
  await Route7.options.loader({ context });
  if (calledOptions[0] !== returnedOrdersQueryOptions) {
    throw new Error("'/products/status-return' loader failed to call ensureQueryData with returnedOrdersQueryOptions");
  }
  console.log("\u2705 All Route Loaders unit tests passed successfully!");
  process.exit(0);
}
runTests().catch((err) => {
  console.error("\u274C Test failed:", err);
  process.exit(1);
});
/*! Bundled license information:

@tanstack/table-core/build/lib/index.mjs:
  (**
     * table-core
     *
     * Copyright (c) TanStack
     *
     * This source code is licensed under the MIT license found in the
     * LICENSE.md file in the root directory of this source tree.
     *
     * @license MIT
     *)

@tanstack/react-table/build/lib/index.mjs:
  (**
     * react-table
     *
     * Copyright (c) TanStack
     *
     * This source code is licensed under the MIT license found in the
     * LICENSE.md file in the root directory of this source tree.
     *
     * @license MIT
     *)
*/
