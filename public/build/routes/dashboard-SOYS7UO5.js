import {
  useFetcher,
  useNavigate
} from "/build/_shared/chunk-WPQIPCFB.js";
import "/build/_shared/chunk-U4FRFQSK.js";
import {
  useAuth0
} from "/build/_shared/chunk-VWXSB4XC.js";
import {
  createHotContext
} from "/build/_shared/chunk-NS3CYERZ.js";
import {
  require_jsx_dev_runtime
} from "/build/_shared/chunk-XGOTYLZ5.js";
import {
  require_react
} from "/build/_shared/chunk-7M6SC7J5.js";
import "/build/_shared/chunk-UWV35TSL.js";
import {
  __toESM
} from "/build/_shared/chunk-PNG5AS42.js";

// app/routes/dashboard.tsx
var import_react3 = __toESM(require_react(), 1);

// app/components/auth/RequireAuth.tsx
var import_react2 = __toESM(require_react(), 1);
var import_jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/components/auth/RequireAuth.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/components/auth/RequireAuth.tsx"
  );
  import.meta.hot.lastModified = "1729810286104.9622";
}
function RequireAuth({
  children
}) {
  _s();
  const {
    isAuthenticated,
    isLoading,
    error
  } = useAuth0();
  const navigate = useNavigate();
  (0, import_react2.useEffect)(() => {
    console.log("Auth State:", {
      isAuthenticated,
      isLoading,
      error: error?.message
    });
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isLoading, isAuthenticated, navigate, error]);
  if (isLoading) {
    return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: "Loading..." }, void 0, false, {
      fileName: "app/components/auth/RequireAuth.tsx",
      lineNumber: 47,
      columnNumber: 12
    }, this);
  }
  return children;
}
_s(RequireAuth, "ONsuLVNopicvnN8seTWRDn7U0kg=", false, function() {
  return [useAuth0, useNavigate];
});
_c = RequireAuth;
var _c;
$RefreshReg$(_c, "RequireAuth");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;

// app/routes/dashboard.tsx
var import_jsx_dev_runtime2 = __toESM(require_jsx_dev_runtime(), 1);
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/routes/dashboard.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s2 = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/routes/dashboard.tsx"
  );
  import.meta.hot.lastModified = "1729810286106.3152";
}
function Dashboard() {
  _s2();
  const {
    user,
    logout
  } = useAuth0();
  const fetcher = useFetcher();
  (0, import_react3.useEffect)(() => {
    if (user?.sub && user?.email) {
      const formData = new FormData();
      formData.append("sub", user.sub);
      formData.append("email", user.email);
      if (user.name) {
        formData.append("name", user.name);
      }
      fetcher.submit(
        formData,
        // FormData object instead of plain object
        {
          method: "post",
          // Use POST method
          action: "/auth/sync"
          // Endpoint to handle the sync
        }
      );
    }
  }, [user]);
  return /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(RequireAuth, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { className: "min-h-screen bg-gray-50", children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("nav", { className: "bg-white shadow", children: /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { className: "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", children: /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { className: "flex h-16 justify-between", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { className: "flex items-center", children: /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("h1", { className: "text-xl font-bold", children: "CloudChat" }, void 0, false, {
        fileName: "app/routes/dashboard.tsx",
        lineNumber: 65,
        columnNumber: 17
      }, this) }, void 0, false, {
        fileName: "app/routes/dashboard.tsx",
        lineNumber: 64,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { className: "flex items-center gap-4", children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("span", { className: "text-gray-700", children: user?.email }, void 0, false, {
          fileName: "app/routes/dashboard.tsx",
          lineNumber: 68,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("button", { onClick: () => logout({
          logoutParams: {
            returnTo: window.location.origin
          }
        }), className: "rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700", children: "Logout" }, void 0, false, {
          fileName: "app/routes/dashboard.tsx",
          lineNumber: 69,
          columnNumber: 17
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/dashboard.tsx",
        lineNumber: 67,
        columnNumber: 15
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/dashboard.tsx",
      lineNumber: 63,
      columnNumber: 13
    }, this) }, void 0, false, {
      fileName: "app/routes/dashboard.tsx",
      lineNumber: 62,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "app/routes/dashboard.tsx",
      lineNumber: 61,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("main", { className: "mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8", children: /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("h2", { className: "text-2xl font-bold", children: [
      "Welcome, ",
      user?.name || user?.email,
      "!"
    ] }, void 0, true, {
      fileName: "app/routes/dashboard.tsx",
      lineNumber: 81,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "app/routes/dashboard.tsx",
      lineNumber: 80,
      columnNumber: 9
    }, this)
  ] }, void 0, true, {
    fileName: "app/routes/dashboard.tsx",
    lineNumber: 60,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "app/routes/dashboard.tsx",
    lineNumber: 59,
    columnNumber: 10
  }, this);
}
_s2(Dashboard, "hoVraio+sIBJz9Dguj49FksCWA8=", false, function() {
  return [useAuth0, useFetcher];
});
_c2 = Dashboard;
var _c2;
$RefreshReg$(_c2, "Dashboard");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
export {
  Dashboard as default
};
//# sourceMappingURL=/build/routes/dashboard-SOYS7UO5.js.map
