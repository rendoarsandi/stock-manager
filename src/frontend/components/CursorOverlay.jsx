import React from 'react';
import { useWebSocket } from '../context/WebSocketContext';

export default function CursorOverlay() {
  const { cursors } = useWebSocket();

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999999 }}>
      {Object.entries(cursors).map(([sessionId, cursor]) => {
        const { x, y, username, color } = cursor;
        return (
          <div
            key={sessionId}
            className="remote-cursor"
            style={{
              position: 'fixed',
              left: `${x}px`,
              top: `${y}px`,
              pointerEvents: 'none',
              transition: 'left 0.08s ease-out, top 0.08s ease-out',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill={color}
              stroke="white"
              strokeWidth="1.5"
              style={{
                transform: 'translate(-3px, -2px)',
              }}
            >
              <polygon points="3 11 22 2 13 21 11 13 3 11" />
            </svg>
            <div
              className="cursor-label"
              style={{
                backgroundColor: color,
                marginTop: '2px',
                marginLeft: '10px',
                padding: '0.15rem 0.45rem',
                borderRadius: '4px',
                color: '#ffffff',
                fontFamily: 'inherit',
                fontSize: '0.7rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 5px rgba(0,0,0,0.25)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              {username}
            </div>
          </div>
        );
      })}
    </div>
  );
}
