import { useState, useEffect } from 'react';
import axios from 'axios';

interface LockdownProps {
  onUnlock: () => void;
}

export default function Lockdown({ onUnlock }: LockdownProps) {
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // New State for the Hardware Lock
  const [deviceID, setDeviceID] = useState('FETCHING...');
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  // Fetch the Hardware ID as soon as the Lockdown screen appears
  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/system/status`);
        setDeviceID(response.data.device_id);
      } catch (err) {
        // 🛠️ FIX: We now log the error to the console so the variable is "used"
        console.error("Hardware fetch failed:", err); 
        setDeviceID("ERROR-READING-HARDWARE");
        setError("Cannot read hardware ID. Ensure the Go backend is running.");
      }
    };
    fetchSystemStatus();
  }, [API_URL]);

  const handleActivate = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/system/activate`, { 
        license_key: licenseKey.trim().toUpperCase() // Auto-format the key 
      });
      
      // If successful, show the unlocked stage!
      alert(`✅ ${response.data.message}\nExpires: ${new Date(response.data.expires).toLocaleDateString()}`);
      onUnlock(); 
      window.location.href = '/'; // Kick them back to login for a fresh session
    } catch (err) {
      // Safely check if this is an Axios error to satisfy TypeScript
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || "Invalid License Key. Please contact support.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-lg w-full text-center border-t-8 border-red-600">
        
        {/* Warning Icon */}
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
          <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h2 className="text-3xl font-extrabold text-gray-900 mb-2">System Locked</h2>
        <p className="text-gray-600 mb-6">
          Your POS software requires activation. To unlock this terminal, please send your Device ID to Zo Total Software Solutions.
        </p>

        {/* The Hardware ID Display Box */}
        <div className="bg-slate-100 border border-slate-300 rounded-lg p-4 mb-6">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Your Device ID</p>
          <p className="text-2xl font-mono font-bold text-slate-800 tracking-widest select-all">
            {deviceID}
          </p>
          <p className="text-sm text-blue-600 mt-2 font-medium">
            📱 WhatsApp: +880 1903-934063 or +60167001106
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm font-semibold border border-red-200">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Enter Activation Key"
            className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-center uppercase tracking-widest text-lg"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
            disabled={deviceID === 'FETCHING...' || deviceID === 'ERROR-READING-HARDWARE'}
          />
          <button
            onClick={handleActivate}
            disabled={loading || !licenseKey}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded transition-colors disabled:opacity-50 text-lg shadow-md"
          >
            {loading ? 'Verifying...' : 'Reactivate System'}
          </button>
        </div>
      </div>
    </div>
  );
}