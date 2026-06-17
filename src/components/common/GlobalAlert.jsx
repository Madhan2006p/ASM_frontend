import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

const GlobalAlert = () => {
  const [alertData, setAlertData] = useState(null);

  useEffect(() => {
    // Keep a reference to the original window.alert
    const originalAlert = window.alert;
    
    // Override window.alert
    window.alert = (message) => {
      // Use setTimeout to avoid triggering state updates during an existing render cycle
      setTimeout(() => {
        setAlertData({ message: String(message) });
      }, 0);
    };

    // Cleanup on unmount
    return () => {
      window.alert = originalAlert;
    };
  }, []);

  if (!alertData) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999
    }}>
      <div style={{
        background: 'var(--bg-card, #1e293b)',
        border: '1px solid var(--border-color, #334155)',
        borderRadius: '12px',
        padding: '2rem',
        maxWidth: '450px',
        width: '90%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '1.25rem',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        <div style={{ 
          background: 'rgba(59, 130, 246, 0.1)', 
          padding: '1rem', 
          borderRadius: '50%',
          color: '#3B82F6'
        }}>
          <AlertCircle size={32} />
        </div>
        
        <h3 style={{ margin: 0, color: 'var(--text-primary, #f8fafc)', fontSize: '1.25rem' }}>System Notification</h3>
        
        <p style={{ margin: 0, color: 'var(--text-secondary, #94a3b8)', fontSize: '0.95rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
          {alertData.message}
        </p>
        
        <button 
          onClick={() => setAlertData(null)}
          style={{
            marginTop: '0.5rem',
            background: 'var(--primary, #3B82F6)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.2)',
            padding: '0.6rem 2.5rem',
            borderRadius: '6px',
            fontWeight: '600',
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => { e.target.style.opacity = '0.9'; e.target.style.transform = 'translateY(-1px)'; }}
          onMouseOut={(e) => { e.target.style.opacity = '1'; e.target.style.transform = 'none'; }}
        >
          Acknowledge
        </button>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default GlobalAlert;
