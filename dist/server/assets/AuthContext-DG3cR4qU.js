import { createContext, useContext, useEffect, useState } from "react";
import { jsxDEV } from "react/jsx-dev-runtime";
//#region app/context/AuthContext.jsx
var _jsxFileName = "/data/data/com.termux/files/home/stock-manager/app/context/AuthContext.jsx";
var AuthContext = createContext(null);
function AuthProvider({ children }) {
	const [currentUser, setCurrentUser] = useState(null);
	const [loading, setLoading] = useState(true);
	useEffect(() => {
		async function fetchMe() {
			try {
				const res = await fetch("/api/auth/me");
				if (res.ok) setCurrentUser(await res.json());
				else setCurrentUser(null);
			} catch (err) {
				console.error("Failed to fetch user details:", err);
				setCurrentUser(null);
			} finally {
				setLoading(false);
			}
		}
		fetchMe();
	}, []);
	const login = async (username, password) => {
		const res = await fetch("/api/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				username,
				password
			})
		});
		if (!res.ok) {
			const errData = await res.json().catch(() => ({}));
			throw new Error(errData.message || "Invalid username or password");
		}
		const data = await res.json();
		setCurrentUser(data);
		return data;
	};
	const logout = async () => {
		try {
			await fetch("/api/auth/logout", { method: "POST" });
		} catch (err) {
			console.error("Failed to logout on server:", err);
		} finally {
			setCurrentUser(null);
		}
	};
	return /* @__PURE__ */ jsxDEV(AuthContext.Provider, {
		value: {
			currentUser,
			loading,
			login,
			logout
		},
		children
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 59,
		columnNumber: 5
	}, this);
}
function useAuth() {
	const context = useContext(AuthContext);
	if (!context) throw new Error("useAuth must be used within an AuthProvider");
	return context;
}
//#endregion
export { useAuth as n, AuthProvider as t };
