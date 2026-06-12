import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { jsxDEV } from "react/jsx-dev-runtime";
//#region app/context/WebSocketContext.jsx
var _jsxFileName = "/data/data/com.termux/files/home/stock-manager/app/context/WebSocketContext.jsx";
var WebSocketContext = createContext(null);
function WebSocketProvider({ children }) {
	const [onlineCount, setOnlineCount] = useState(1);
	const [isConnected, setIsConnected] = useState(false);
	const wsRef = useRef(null);
	const listenersRef = useRef(/* @__PURE__ */ new Set());
	const reconnectTimeoutRef = useRef(null);
	const isUnmountedRef = useRef(false);
	const connect = useCallback(() => {
		if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) return;
		const wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`;
		console.log("Connecting to WebSocket:", wsUrl);
		const ws = new WebSocket(wsUrl);
		wsRef.current = ws;
		ws.onopen = () => {
			console.log("WebSocket connection established.");
			setIsConnected(true);
			window.dispatchEvent(new CustomEvent("resync-data"));
		};
		ws.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				if (data.type === "ONLINE_COUNT") setOnlineCount(data.count);
				listenersRef.current.forEach((listener) => {
					try {
						listener(data);
					} catch (err) {
						console.error("Error in WS subscriber:", err);
					}
				});
			} catch (err) {
				console.error("Error parsing WebSocket message:", err);
			}
		};
		ws.onclose = () => {
			console.log("WebSocket connection closed, retrying in 3 seconds...");
			setIsConnected(false);
			wsRef.current = null;
			if (isUnmountedRef.current) return;
			if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = setTimeout(connect, 3e3);
		};
		ws.onerror = (err) => {
			console.error("WebSocket error:", err);
		};
	}, []);
	const addWsListener = useCallback((callback) => {
		listenersRef.current.add(callback);
		return () => {
			listenersRef.current.delete(callback);
		};
	}, []);
	const sendWsMessage = useCallback((msg) => {
		if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify(msg));
			return true;
		}
		return false;
	}, []);
	const sendCursorPosition = useCallback(() => {}, []);
	useEffect(() => {
		connect();
		const handleFocus = () => {
			window.dispatchEvent(new CustomEvent("resync-data"));
			if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) connect();
		};
		const handleOnline = () => {
			window.dispatchEvent(new CustomEvent("resync-data"));
			connect();
		};
		window.addEventListener("focus", handleFocus);
		window.addEventListener("online", handleOnline);
		return () => {
			isUnmountedRef.current = true;
			window.removeEventListener("focus", handleFocus);
			window.removeEventListener("online", handleOnline);
			if (wsRef.current) wsRef.current.close();
			if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
		};
	}, [connect]);
	return /* @__PURE__ */ jsxDEV(WebSocketContext.Provider, {
		value: {
			onlineCount,
			cursors: {},
			isConnected,
			addWsListener,
			sendWsMessage,
			sendCursorPosition
		},
		children
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 123,
		columnNumber: 5
	}, this);
}
function useWebSocket() {
	const context = useContext(WebSocketContext);
	if (!context) throw new Error("useWebSocket must be used within a WebSocketProvider");
	return context;
}
//#endregion
export { useWebSocket as n, WebSocketProvider as t };
