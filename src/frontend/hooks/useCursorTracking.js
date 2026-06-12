import { useEffect } from 'react';
import { useWebSocket } from '../context/WebSocketContext';

export function useCursorTracking() {
  const { sendCursorPosition } = useWebSocket();

  useEffect(() => {
    const handleMouseMove = (e) => {
      sendCursorPosition(e.clientX, e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [sendCursorPosition]);
}
