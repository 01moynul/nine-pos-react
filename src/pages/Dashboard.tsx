// src/pages/Dashboard.tsx

import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { LogOut, Search, ShoppingCart, Plus, Minus, Trash2, X, Settings, BarChart3, Printer } from 'lucide-react';
import type { Product, CartItem } from '../types';
import AIAssistant from '../components/AIAssistant';
import Receipt from '../components/Receipt'; // <--- 1. Import Receipt
import { useLanguage } from '../context/LanguageContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isCartOpen, setIsCartOpen] = useState(false);

  // --- NEW: PRINTING STATE ---
  const [lastSale, setLastSale] = useState<{ id: number; items: CartItem[]; total: number; date: string } | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const { t, toggleLanguage } = useLanguage();

  const username = localStorage.getItem('username') || 'User';
  const role = localStorage.getItem('role') || 'Cashier';

  const API_URL = import.meta.env.VITE_API_URL;

  const fetchProducts = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }
    try {
      const response = await axios.get(`${API_URL}/api/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(response.data);
    } catch (error) {
      console.error("Error", error);
    } finally {
      setLoading(false);
    }
  }, [navigate, API_URL]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // --- CASHIER SCANNER LISTENER (Milestone 2 - Task 2.3) ---
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ignore keystrokes if the user is typing inside the search box
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const currentTime = Date.now();
      // 50ms human filter: Scanners type instantly. Humans type slowly.
      if (currentTime - lastKeyTime > 50) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      // If the scanner hits Enter and we captured a barcode string
      if (e.key === 'Enter' && buffer.length > 0) {
        e.preventDefault();
        const scannedBarcode = buffer;
        buffer = ''; // Clear buffer immediately for the next scan

        const token = localStorage.getItem('token');
        try {
          // 1. Query the Go Backend's Smart Scale Route
          const response = await axios.get(`${API_URL}/api/products/scan/${scannedBarcode}`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          const scannedProduct = response.data;

          // 2. PRODUCT EXISTS: Drop it instantly into the active cart
          setCart(prev => {
            const existing = prev.find(item => item.id === scannedProduct.id);
            if (existing) {
              // If it's already in the cart, just increase the quantity by 1
              return prev.map(item => 
                item.id === scannedProduct.id ? { ...item, quantity: item.quantity + 1 } : item
              );
            }
            // If it's new to the cart, add it with a quantity of 1
            return [...prev, { ...scannedProduct, quantity: 1 }];
          });

          // 3. Auto-open the cart sidebar on mobile/smaller screens so the cashier sees it
          setIsCartOpen(true);

        } catch (error: unknown) {
          interface ApiError { response?: { status: number; }; }
          const apiError = error as ApiError;
          
          // 4. PRODUCT NOT FOUND: Show an immediate warning to the cashier
          if (apiError.response && apiError.response.status === 404) {
            alert(`Item Not Found in Database: ${scannedBarcode}`);
          }
        }
      } else if (e.key.length === 1) { // Ignore meta keys
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [API_URL]);
  // ---------------------------------------------------------

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };


  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }));
  };

  // --- NEW: HANDLING CHECKOUT & PRINTING ---
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const payload = { items: cart.map(item => ({ product_id: item.id, quantity: item.quantity })) };
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const sstTax = cart.reduce((sum, item) => sum + (item.is_sst_applicable ? (item.price * item.quantity * 0.06) : 0), 0);
    const currentTotal = subtotal + sstTax;
    const currentItems = [...cart]; // Snapshot of cart

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/api/checkout`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // 1. Prepare data for the Receipt
      setLastSale({
        id: response.data.sale_id,
        items: currentItems,
        total: currentTotal,
        date: new Date().toLocaleString()
      });

      // 2. Clear Cart & Update UI
      setCart([]);
      setIsCartOpen(false);
      fetchProducts();
      
      // 3. Trigger Print (Wait 100ms for React to render the receipt first)
      setTimeout(() => {
        window.print();
      }, 500);

    } catch (error) {
      console.error(error);
      alert('Checkout failed.');
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const categories = ['All', ...new Set(products.map(p => p.category))];
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden relative">
      
      {/* --- HIDDEN RECEIPT COMPONENT (Only visible during print) --- */}
      <div>  {/* <--- REMOVE "className='hidden'" */}
        {lastSale && (
          <Receipt 
            ref={receiptRef} 
            orderId={lastSale.id} 
            items={lastSale.items} 
            total={lastSale.total} 
            date={lastSale.date}
          />
        )}
      </div>

      {/* --- NORMAL UI (Hidden during print) --- */}
      <div className="flex-1 flex flex-col min-w-0 print:hidden">
        <header className="bg-white shadow-sm p-4 flex justify-between items-center z-10">
          <div>
            <h1 className="text-xl font-bold text-gray-800">{t('dashboard')}</h1>
            <p className="text-xs text-gray-500">{username} ({role})</p>
          </div>
          
          <div className="flex items-center gap-3">
            {role === 'admin' && (
              <>
                 <button 
                  onClick={() => navigate('/admin/reports')} 
                  className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-indigo-200"
                >
                  <BarChart3 size={16} /> 
                  <span className="hidden sm:inline">{t('reports')}</span>
                </button>

                <button 
                  onClick={() => navigate('/admin/products')} 
                  className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                >
                  <Settings size={16} /> 
                  <span className="hidden sm:inline">{t('products')}</span>
                </button>
              </>
            )}

            {/* --- NEW: LANGUAGE TOGGLE BUTTON --- */}
            <button 
              onClick={toggleLanguage}
              className="flex items-center justify-center w-10 h-10 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-bold transition-colors border border-blue-200 shadow-sm"
              title="Toggle Language"
            >
              {t('switch_lang')}
            </button>

            <button onClick={handleLogout} className="flex items-center gap-2 text-red-600 hover:text-red-800 px-2">
              <LogOut size={18} /> <span className="hidden sm:inline">{t('logout')}</span>
            </button>
          </div>
        </header>

        {/* Filters */}
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder={t('search_placeholder')} 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map(cat => {
              // Conditionally translate the 'All' category button
              const displayCat = cat === 'All' ? t('all_categories') : cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                    selectedCategory === cat 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  {displayCat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4 pt-0 pb-24 md:pb-4">
          {loading ? (
            <div className="flex justify-center items-center h-64">Loading...</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredProducts.map(product => (
                <div 
                  key={product.id} 
                  onClick={() => addToCart(product)}
                  className="bg-white p-3 rounded-xl shadow-sm hover:shadow-md cursor-pointer active:scale-95 transition-transform border border-transparent hover:border-blue-500"
                >
                  <div className="aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                     {product.image_url && product.image_url.includes('http') ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                     ) : (
                        <span className="text-2xl font-bold text-gray-300">{product.name[0]}</span>
                     )}
                  </div>
                  <h3 className="font-semibold text-gray-800 text-sm truncate">{product.name}</h3>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-green-600 font-bold text-sm">RM {product.price.toFixed(2)}</span>
                    <span className="text-[10px] text-gray-400">{product.stock_quantity} left</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- RIGHT SIDE: CART (Hidden during print) --- */}
      <div className={`
        fixed inset-0 z-40 transform transition-transform duration-300 ease-in-out print:hidden
        md:relative md:translate-x-0 md:w-96 md:block
        ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="absolute inset-0 bg-black/50 md:hidden" onClick={() => setIsCartOpen(false)}></div>

        <div className="absolute right-0 top-0 h-full w-full md:w-96 bg-white shadow-xl flex flex-col border-l border-gray-200">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <ShoppingCart size={20} /> {t('current_order')}
            </h2>
            <button onClick={() => setIsCartOpen(false)} className="md:hidden p-2 text-gray-500">
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <ShoppingCart size={48} className="mb-2 opacity-20" />
                <p>{t('cart_empty')}</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                  <div>
                    <h4 className="font-medium text-sm text-gray-800">{item.name}</h4>
                    <p className="text-xs text-gray-500">RM {item.price.toFixed(2)} x {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white rounded-md border border-gray-200 shadow-sm">
                      <button onClick={() => updateQuantity(item.id, -1)} className="p-1 px-2 text-gray-600 hover:bg-gray-100">
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="p-1 px-2 text-gray-600 hover:bg-gray-100">
                        <Plus size={14} />
                      </button>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-red-400"><Trash2 size={16}/></button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-3">
            <div className="flex justify-between text-sm text-gray-600">
              <span>{t('subtotal')}</span>
              <span>RM {cartTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 pb-2">
              <span>{t('sst_tax')}</span>
              <span>RM {cart.reduce((sum, item) => sum + (item.is_sst_applicable ? (item.price * item.quantity * 0.06) : 0), 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-gray-800 pt-2 border-t border-gray-200">
              <span>{t('total')}</span>
              <span>RM {(cartTotal + cart.reduce((sum, item) => sum + (item.is_sst_applicable ? (item.price * item.quantity * 0.06) : 0), 0)).toFixed(2)}</span>
            </div>
            
            {/* CHECKOUT BUTTON WITH PRINTER ICON */}
            <button 
              onClick={handleCheckout}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              disabled={cart.length === 0}
            >
              <Printer size={20} /> {t('pay_print')}
            </button>
          </div>
        </div>
      </div>

      {!isCartOpen && (
        <button 
          onClick={() => setIsCartOpen(true)}
          className="md:hidden fixed bottom-6 left-6 bg-blue-600 text-white p-4 rounded-full shadow-2xl z-30 flex items-center gap-2 print:hidden"
        >
          <ShoppingCart size={24} />
          {cart.length > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full absolute -top-1 -right-1">
              {cart.reduce((acc, item) => acc + item.quantity, 0)}
            </span>
          )}
        </button>
      )}

      <div className="print:hidden">
         {/* Only Admins get the Superpower */}
         {role === 'admin' && <AIAssistant onUpdate={fetchProducts} />}
      </div>
    </div>
  );
}