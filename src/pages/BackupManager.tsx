// src/pages/BackupManager.tsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'
import { Cloud, Server, Play, RefreshCw, HardDrive, CheckCircle2, AlertCircle, Download, Trash2, Filter, ArrowLeft } from 'lucide-react';

interface BackupFile {
  id: string;
  name: string;
  createdTime: string;
  size: string;
}

export default function BackupManager() {
    const navigate = useNavigate();
    const [backups, setBackups] = useState<BackupFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filters
  const [filterDay, setFilterDay] = useState('All');
  const [filterType, setFilterType] = useState('All');

  const daysOfWeek = ['All', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const types = ['All', 'Auto', 'Manual'];

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8080/api/backup/list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBackups(response.data || []);
      setMessage(null);
    } catch (error: unknown) {
      console.error("Failed to fetch backups:", error);
      setMessage({ text: 'Failed to connect to Cloud Storage.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleManualBackup = async () => {
    if (!window.confirm("Trigger a manual End of Day backup now?")) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:8080/api/backup/manual', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ text: 'Backup successfully uploaded to Google Drive!', type: 'success' });
      fetchBackups();
    } catch (error: unknown) {
      let backendError = 'Failed to process manual backup.';
      if (axios.isAxiosError(error)) backendError = error.response?.data?.error || backendError;
      setMessage({ text: `Error: ${backendError}`, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${name}" from the cloud?`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:8080/api/backup/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ text: 'Backup deleted successfully.', type: 'success' });
      fetchBackups();
    } catch (error) {
      console.error("Delete failed:", error); // <-- Added this line to fix the error!
      setMessage({ text: 'Failed to delete backup.', type: 'error' });
    }
  };

  const handleDownload = async (id: string, name: string) => {
    try {
      setMessage({ text: `Downloading ${name}...`, type: 'success' });
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:8080/api/backup/download/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob', 
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setMessage({ text: 'Download complete! Extract this file to C:\\NinePOS_Data to restore.', type: 'success' });
    } catch (error) {
      console.error("Download failed:", error); // <-- Added this line to fix the error!
      setMessage({ text: 'Failed to download file.', type: 'error' });
    }
  };

  // Format Bytes & Dates
  const formatBytes = (bytes: string) => {
    const size = parseInt(bytes, 10);
    if (!size) return '0 B';
    const i = Math.floor(Math.log(size) / Math.log(1024));
    return parseFloat((size / Math.pow(1024, i)).toFixed(2)) + ' ' + ['B', 'KB', 'MB', 'GB'][i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', { 
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // --- FILTERING LOGIC ---
  const filteredBackups = backups.filter(file => {
    const isAuto = file.name.startsWith('auto_');
    const fileDate = new Date(file.createdTime);
    const fileDay = fileDate.toLocaleString('en-US', { weekday: 'short' });

    const matchDay = filterDay === 'All' || fileDay === filterDay;
    const matchType = filterType === 'All' || (filterType === 'Auto' && isAuto) || (filterType === 'Manual' && !isAuto);
    
    return matchDay && matchType;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
        <button 
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-medium w-fit"
      >
        <ArrowLeft size={18} />
        Back to Dashboard
      </button>
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Cloud className="text-blue-600" /> Cloud Backup Manager
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage your secure Google Drive backups.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={fetchBackups} className="p-2 text-slate-500 hover:text-blue-600 rounded-lg">
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleManualBackup}
            disabled={actionLoading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
          >
            {actionLoading ? <RefreshCw size={18} className="animate-spin" /> : <Play size={18} />}
            Run Manual Backup
          </button>
        </div>
      </div>

      {/* NOTIFICATIONS */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* FILTERS */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center">
        <Filter size={18} className="text-slate-400" />
        <span className="text-sm font-medium text-slate-600">Filters:</span>
        
        <div className="flex bg-slate-100 rounded-lg p-1">
          {types.map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${filterType === t ? 'bg-white shadow-sm font-semibold text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap bg-slate-100 rounded-lg p-1">
          {daysOfWeek.map(d => (
            <button key={d} onClick={() => setFilterDay(d)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${filterDay === d ? 'bg-white shadow-sm font-semibold text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <HardDrive size={18} className="text-slate-500" />
          <h2 className="font-semibold text-slate-700">Google Drive Archive ({filteredBackups.length})</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-sm border-b border-slate-100">
                <th className="p-4 font-medium">Filename</th>
                <th className="p-4 font-medium">Type</th>
                <th className="p-4 font-medium">Date & Time</th>
                <th className="p-4 font-medium">Size</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Loading secure cloud data...</td></tr>
              ) : filteredBackups.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">No backups match your filters.</td></tr>
              ) : (
                filteredBackups.map((file) => {
                  const isAuto = file.name.startsWith('auto_');
                  return (
                    <tr key={file.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        <Server size={18} className={isAuto ? "text-slate-400" : "text-blue-500"} />
                        <span className="font-medium text-slate-700">{file.name}</span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${isAuto ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-700'}`}>
                          {isAuto ? 'Auto' : 'Manual'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600">{formatDate(file.createdTime)}</td>
                      <td className="p-4 text-slate-600">{formatBytes(file.size)}</td>
                      <td className="p-4 text-right space-x-2">
                        <button onClick={() => handleDownload(file.id, file.name)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Download & Restore">
                          <Download size={18} />
                        </button>
                        <button onClick={() => handleDelete(file.id, file.name)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}