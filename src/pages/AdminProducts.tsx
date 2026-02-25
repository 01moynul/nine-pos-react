// src/pages/AdminProducts.tsx

import { useEffect, useState, useCallback, type ChangeEvent } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Search, X, Save, Upload } from 'lucide-react';
import type { Product } from '../types';
import { useLanguage } from '../context/LanguageContext';

export default function AdminProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // --- MODAL STATE ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null); // Null means "Create Mode"
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [uploading, setUploading] = useState(false);
  
  const { t } = useLanguage();

  const API_URL = import.meta.env.VITE_API_URL;

  const role = localStorage.getItem('role');

  const fetchProducts = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${API_URL}/api/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(response.data);
    } catch (error) {
      console.error("Error fetching products", error);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    if (role !== 'admin') {
      alert("Access Denied: Admins only.");
      navigate('/dashboard');
      return;
    }
    fetchProducts();
  }, [navigate, role, fetchProducts]);

  const handleDelete = async (id: number) => {
    if(!confirm("Are you sure you want to delete this product?")) return;
    
    const token = localStorage.getItem('token');
    try {
       await axios.delete(`${API_URL}/api/products/${id}`, {
         headers: { Authorization: `Bearer ${token}` }
       });
       setProducts(prev => prev.filter(p => p.id !== id));
       alert("Product deleted!");
    } catch (error: unknown) {
        console.error(error);
        interface ApiError { response?: { data?: { error?: string; }; }; }
        const apiError = error as ApiError;
        alert(apiError.response?.data?.error || "Failed to delete product");
    }
  };

  // --- CLICK HANDLERS ---
  const handleAddClick = () => {
    setEditingProduct(null); // Switch to "Create Mode"
    setFormData({});         // Clear form
    setIsModalOpen(true);    // Open Modal
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product); // Switch to "Edit Mode"
    setFormData({ ...product }); // Fill form
    setIsModalOpen(true);        // Open Modal
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formPayload = new FormData();
    formPayload.append('file', file);

    const token = localStorage.getItem('token');
    try {
      const response = await axios.post(`${API_URL}/api/upload`, formPayload, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}` 
        }
      });
      setFormData(prev => ({ ...prev, image_url: response.data.url }));
    } catch (error) {
      console.error("Upload failed", error);
      alert("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const token = localStorage.getItem('token');

    try {
      if (editingProduct) {
        // --- UPDATE MODE (PUT) ---
        await axios.put(`${API_URL}/api/products/${editingProduct.id}`, formData, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setProducts(prev => prev.map(p => (p.id === editingProduct.id ? { ...p, ...formData } as Product : p)));
        alert("Product updated successfully!");

      } else {
        // --- CREATE MODE (POST) ---
        // Ensure required fields (simple validation)
        if (!formData.name || !formData.price) {
           alert("Please enter at least a Name and Price");
           return;
        }

        const response = await axios.post(`${API_URL}/api/products`, formData, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setProducts(prev => [...prev, response.data]); // Add new item to list
        alert("Product created successfully!");
      }

      setIsModalOpen(false); // Close modal
    } catch (error: unknown) {
        console.error(error);
        interface ApiError { response?: { data?: { error?: string; }; }; }
        const apiError = error as ApiError;
        alert(apiError.response?.data?.error || "Failed to save product");
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 bg-white rounded-full shadow hover:bg-gray-50">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">{t('inventory_mgmt')}</h1>
        </div>
        {/* ADD BUTTON NOW CONNECTED */}
        <button onClick={handleAddClick} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-md">
          <Plus size={20} /> {t('add_product')}
        </button>
      </div>

      {/* Search Bar */}
      <div className="max-w-6xl mx-auto bg-white p-4 rounded-t-xl shadow-sm border-b border-gray-100 flex gap-4">
         <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder={t('search_inventory')} 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
      </div>

      {/* Data Table */}
      <div className="max-w-6xl mx-auto bg-white rounded-b-xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider font-semibold">
           <tr>
              <th className="p-4 border-b">SKU</th>
              <th className="p-4 border-b">Product</th>
              <th className="p-4 border-b">Category</th>
              <th className="p-4 border-b">Cost / Sell (RM)</th>
              <th className="p-4 border-b">Stock (Avail/Rsvd)</th>
              <th className="p-4 border-b">SST</th>
              <th className="p-4 border-b text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm text-gray-700 divide-y divide-gray-100">
            {loading ? (
               <tr><td colSpan={6} className="p-8 text-center">Loading inventory...</td></tr>
            ) : filteredProducts.map(product => (
              <tr key={product.id} className="hover:bg-blue-50 transition-colors">
                <td className="p-4 text-gray-500 text-xs font-mono">{product.sku || 'N/A'}</td>
                <td className="p-4 font-medium text-gray-900 flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden">
                        {product.image_url ? <img src={product.image_url} className="w-full h-full object-cover"/> : null}
                    </div>
                    {product.name}
                </td>
                <td className="p-4"><span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">{product.category}</span></td>
                <td className="p-4 font-mono text-sm text-gray-600">
                  <span className="text-red-500">{product.cost_price?.toFixed(2) || '0.00'}</span> / <span className="text-green-600 font-bold">{product.price?.toFixed(2) || '0.00'}</span>
                </td>
                <td className="p-4 text-sm">
                   <span className={`font-bold ${product.stock_quantity < 10 ? 'text-red-500' : 'text-green-600'}`}>{product.stock_quantity}</span> 
                   <span className="text-gray-400 ml-1">({product.stock_reserved || 0})</span>
                </td>
                <td className="p-4">
                   {product.is_sst_applicable ? <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Yes</span> : <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">No</span>}
                </td>
                <td className="p-4 text-right space-x-2">
                  <button onClick={() => handleEditClick(product)} className="text-blue-500 hover:text-blue-700 p-1">
                    <Pencil size={18} />
                  </button>
                  <button onClick={() => handleDelete(product.id)} className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- UNIFIED MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              {/* DYNAMIC TITLE */}
              <h3 className="font-bold text-lg text-gray-800">
                {editingProduct ? "Edit Product" : "Add New Product"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU / Barcode</label>
                  <input 
                    type="text" 
                    value={formData.sku || ''} 
                    onChange={e => setFormData({...formData, sku: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono text-sm"
                    placeholder="e.g. BNDL-01"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                  <input 
                    type="text" 
                    value={formData.name || ''} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select 
                    value={formData.category || 'Food'} 
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                     <option value="Food">Food</option>
                     <option value="Drinks">Drinks</option>
                     <option value="Dessert">Dessert</option>
                     <option value="Merch">Merch</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (RM)</label>
                  <input 
                    type="number" 
                    value={formData.cost_price || 0} 
                    onChange={e => setFormData({...formData, cost_price: parseFloat(e.target.value)})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sell Price (RM)</label>
                  <input 
                    type="number" 
                    value={formData.price || 0} 
                    onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-green-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Available Stock</label>
                  <input 
                    type="number" 
                    value={formData.stock_quantity || 0} 
                    onChange={e => setFormData({...formData, stock_quantity: parseInt(e.target.value)})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reserved Stock</label>
                  <input 
                    type="number" 
                    value={formData.stock_reserved || 0} 
                    onChange={e => setFormData({...formData, stock_reserved: parseInt(e.target.value)})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                  />
                </div>
                
                <div className="col-span-2 flex items-center gap-2 mt-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <input 
                    type="checkbox" 
                    id="sst_checkbox"
                    checked={formData.is_sst_applicable || false} 
                    onChange={e => setFormData({...formData, is_sst_applicable: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="sst_checkbox" className="text-sm font-medium text-gray-800 cursor-pointer">
                    Apply 6% SST to this item
                  </label>
                </div>
              </div>

               {/* --- IMAGE UPLOAD --- */}
               <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 mt-4">Product Image</label>
                <div className="flex items-center gap-4 mb-2">
                   <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden">
                      {uploading ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      ) : formData.image_url ? (
                        <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-gray-300 text-xs">No Img</span>
                      )}
                   </div>
                   <label className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
                      <Upload size={16} /> 
                      {uploading ? "Uploading..." : "Choose File"}
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                   </label>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2">
                <Save size={18} /> {editingProduct ? "Save Changes" : "Create Product"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}