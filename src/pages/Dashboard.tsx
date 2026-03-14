// src/pages/Dashboard.tsx

import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
// Replace your current lucide-react import with this:
import { LogOut, Search, ShoppingCart, Plus, Minus, Trash2, X, Settings, BarChart3, Monitor, RefreshCw, Cloud, DollarSign, Lock, LockOpen } from 'lucide-react';
import type { Product, CartItem, ShiftLog } from '../types'; // <-- ADD ShiftLog
import ShiftManagerModal from '../components/ShiftManagerModal'; // <-- ADD THIS
import AIAssistant from '../components/AIAssistant';
import Receipt from '../components/Receipt'; // <--- 1. Import Receipt
import { useLanguage } from '../context/LanguageContext';
import { FileText } from 'lucide-react';
import WeightPromptModal from '../components/WeightPromptModal';
import PaymentModal from '../components/PaymentModal';



export default function Dashboard() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  // --- NEW: WEIGHABLE ITEM STATE ---
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [productToWeigh, setProductToWeigh] = useState<Product | null>(null);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  // --- NEW: SECURITY STATE (Task 2.4) ---
  const [securitySessionId, setSecuritySessionId] = useState<string | null>(null);
  const prevCartLength = useRef(0);

  // --- NEW: PRINTING STATE ---
 // --- UPDATED: Allow string IDs for new RCPT format and optional LHDN data ---
  const [lastSale, setLastSale] = useState<{ 
    id: number | string; 
    items: CartItem[]; 
    total: number; 
    date: string;
    lhdnQrUrl?: string;
    lhdnValidationId?: string;
  } | null>(null);
  // --- NEW: LHDN Toggle State ---
  const [requestEInvoice, setRequestEInvoice] = useState(false);

  // --- NEW: SHIFT MANAGEMENT STATE ---
  const [isShiftTrackingEnabled, setIsShiftTrackingEnabled] = useState(false);
  const [activeShift, setActiveShift] = useState<ShiftLog | null>(null);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [shiftModalType, setShiftModalType] = useState<'open' | 'close'>('open');

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

  // --- NEW: FETCH SHIFT STATUS ---
  const fetchShiftStatus = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      // 1. Check if the Admin Kill Switch is ON
      const settingsRes = await axios.get(`${API_URL}/api/settings`, { headers: { Authorization: `Bearer ${token}` } });
      const trackingEnabled = settingsRes.data.enable_shift_tracking;
      setIsShiftTrackingEnabled(trackingEnabled);

      if (trackingEnabled) {
        // 2. Check if a shift is currently open
        try {
          const shiftRes = await axios.get(`${API_URL}/api/shift/active`, { headers: { Authorization: `Bearer ${token}` } });
          setActiveShift(shiftRes.data);
        } catch (err) {
          // 1. Define the shape of the error to satisfy the linter
          interface ApiError {
            response?: {
              status: number;
            };
          }
          // 2. Cast the unknown error to our specific interface
          const apiError = err as ApiError;
          
          if (apiError.response && apiError.response.status === 404) {
            setActiveShift(null); // 404 means register is closed!
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch shift status:", error);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchProducts();
    fetchShiftStatus(); // <-- Call it when Dashboard loads
  }, [fetchProducts, fetchShiftStatus]);

  // --- NEW: ANTI-THEFT CAMERA START TRIGGER (Task 2.4) ---
  useEffect(() => {
    const initiateSecurityRecording = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.post(`${API_URL}/api/security/start`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data && res.data.session_id) {
          setSecuritySessionId(res.data.session_id);
        }
      } catch (err) {
        // Fallback: Log error but DO NOT freeze the UI if camera is busy
        console.error("Security camera start bypassed/failed:", err);
      }
    };

    // If the cart just went from 0 to 1 item, start the camera!
    if (prevCartLength.current === 0 && cart.length > 0) {
      initiateSecurityRecording();
    }
    
    // Update our tracker for the next render
    prevCartLength.current = cart.length;
  }, [cart, API_URL]);
  // ---------------------------------------------------------

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

          // --- NEW: SHIFT LOCKOUT (SCANNER) ---
          if (isShiftTrackingEnabled && !activeShift) {
            setTimeout(() => alert(`Cannot add items. Please open the register first.`), 10);
            return;
          }

          // --- NEW: THE DATA FIREWALL ---
          // Protect the state from malformed responses (like 304 redirects from weird QR URLs)
          if (!scannedProduct || typeof scannedProduct.id === 'undefined' || typeof scannedProduct.price === 'undefined') {
            setTimeout(() => alert(`Invalid Barcode or QR Code Format Scanned.`), 10);
            return; // Stop execution immediately, preventing the white screen crash
          }
          // ------------------------------

          // 2. PRODUCT EXISTS: Drop it into the cart (WITH FIREWALL)
          setCart(prev => {
            const existing = prev.find(item => item.id === scannedProduct.id);
            
            if (existing) {
              // OVERRIDE PREVENTION: Check if scanning 1 more exceeds available stock
              if (existing.quantity >= scannedProduct.stock_quantity) {
                // Using setTimeout ensures the alert doesn't freeze React's state update cycle
                setTimeout(() => alert(`Cannot add more. Only ${scannedProduct.stock_quantity} units available.`), 10);
                return prev; // Cancel the addition, return the cart unchanged
              }
              // If stock is available, increase the quantity by 1
              return prev.map(item => 
                item.id === scannedProduct.id ? { ...item, quantity: item.quantity + 1 } : item
              );
            }
            
            // Prevent scanning the very first item if stock is already at 0
            if (scannedProduct.stock_quantity <= 0) {
              setTimeout(() => alert(`Sorry, this item is out of stock.`), 10);
              return prev;
            }
            
            // If it's a new item to the cart and in stock, add it
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
  }, [API_URL, activeShift, isShiftTrackingEnabled]);
  // ---------------------------------------------------------

  // --- NEW: DUAL-SCREEN BROADCAST CHANNEL (Action 2.3) ---
  // This effect runs every time the 'cart' state changes.
  useEffect(() => {
    // 1. Initialize the communication channel. Both screens will connect to 'pos_cart_channel'.
    const channel = new BroadcastChannel('pos_cart_channel');
    
    // 2. Pre-calculate the exact totals so the customer screen doesn't have to do the math.
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const sstTax = cart.reduce((sum, item) => sum + (item.is_sst_applicable ? (item.price * item.quantity * 0.06) : 0), 0);
    const grandTotal = subtotal + sstTax;

    // 3. Broadcast the current state of the order to the Customer Display window.
    channel.postMessage({
      items: cart,
      subtotal: subtotal,
      sstTax: sstTax,
      grandTotal: grandTotal
    });

    // 4. Close the channel connection to prevent memory leaks when the effect cleans up.
    return () => channel.close();
  }, [cart]); // Dependency array: ONLY trigger this broadcast when the 'cart' updates.
  // ---------------------------------------------------------

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  // --- NEW: HANDLE WEIGHT CONFIRMATION ---
  const handleWeightConfirm = (weight: number) => {
    if (!productToWeigh) return;

    setCart(prev => {
      const existing = prev.find(item => item.id === productToWeigh.id);
      
      if (existing) {
        // OVERRIDE PREVENTION: Check if adding the new weight exceeds available stock
        if (existing.quantity + weight > productToWeigh.stock_quantity) {
          alert(`Cannot add more. Only ${productToWeigh.stock_quantity} available.`);
          return prev;
        }
        // If it's already in the cart, add the new weight to the existing weight
        return prev.map(item => 
          item.id === productToWeigh.id ? { ...item, quantity: item.quantity + weight } : item
        );
      }
      
      // Prevent adding if the requested weight is more than the total stock
      if (weight > productToWeigh.stock_quantity) {
        alert(`Cannot add. Only ${productToWeigh.stock_quantity} available.`);
        return prev;
      }
      
      // Add as a new item with the custom fractional weight
      return [...prev, { ...productToWeigh, quantity: weight }];
    });

    // Close the modal and reset
    setIsWeightModalOpen(false);
    setProductToWeigh(null);
  };

  const addToCart = (product: Product) => {
    // --- NEW: SHIFT LOCKOUT (CLICK) ---
    if (isShiftTrackingEnabled && !activeShift) {
      alert("Cannot add items. Please open the register first.");
      return;
    }
    // --- NEW: INTERCEPT WEIGHABLE ITEMS ---
    // If the item needs to be weighed, open the modal and stop the normal flow
    if (product.is_weighable) {
      setProductToWeigh(product);
      setIsWeightModalOpen(true);
      return; 
    }
    // --------------------------------------

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      
      if (existing) {
        // OVERRIDE PREVENTION: Check if adding 1 more exceeds available stock
        if (existing.quantity >= product.stock_quantity) {
          alert(`Cannot add more. Only ${product.stock_quantity} units available.`);
          return prev; // Cancel the addition, return the cart unchanged
        }
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      
      // Prevent adding the first item if stock is 0
      if (product.stock_quantity <= 0) {
        alert(`Sorry, this item is out of stock.`);
        return prev;
      }
      
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: number) => {
    const itemToRemove = cart.find(i => i.id === id);
    if (!itemToRemove) return;

    const isDroppingToZero = cart.length === 1; // Since we are about to remove 1 item
    const token = localStorage.getItem('token');

    if (isDroppingToZero && securitySessionId) {
      // TRAP A: Line Void to Zero! (Cashier secretly emptied the cart)
      const totalValueLost = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      axios.post(`${API_URL}/api/security/stop-void`, {
        session_id: securitySessionId,
        reason: "Trash Can Drop to Zero",
        total_value_lost: totalValueLost,
        items_in_cart: JSON.stringify(cart)
      }, { headers: { Authorization: `Bearer ${token}` } })
      .catch(err => console.error("Failed to log void:", err));
      
      setSecuritySessionId(null); // Clear session
    } else if (securitySessionId) {
      // TRAP B: Partial Line Void (Cashier deleted one item mid-checkout)
      axios.post(`${API_URL}/api/security/log-removal`, {
        session_id: securitySessionId,
        item_name: itemToRemove.name
      }, { headers: { Authorization: `Bearer ${token}` } })
      .catch(err => console.error("Failed to log partial removal:", err));
    }

    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        
        // Find the original product in the main catalog to check its master stock limit
        const masterProduct = products.find(p => p.id === id);
        
        // OVERRIDE PREVENTION: Block if hitting '+' goes over stock
        if (delta > 0 && masterProduct && newQty > masterProduct.stock_quantity) {
          alert(`Maximum stock reached. Only ${masterProduct.stock_quantity} available.`);
          return item; // Keep quantity unchanged
        }
        
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }));
  };

  // --- NEW: FAST CLEAR ORDER (Task 2.4) ---
  const handleClearOrder = () => {
    if (cart.length === 0) return;
    const token = localStorage.getItem('token');
    const totalValueLost = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (securitySessionId) {
      axios.post(`${API_URL}/api/security/stop-void`, {
        session_id: securitySessionId,
        reason: "Clear Order Button",
        total_value_lost: totalValueLost,
        items_in_cart: JSON.stringify(cart)
      }, { headers: { Authorization: `Bearer ${token}` } })
      .catch(err => console.error("Failed to log clear order:", err));
      
      setSecuritySessionId(null);
    }
    setCart([]);
    setIsCartOpen(false);
  };

  // --- NEW: DECOUPLED CHECKOUT & PRINTING (Step 1) ---
  const processTransaction = async (method: string, amountTendered: number) => {
    if (cart.length === 0) return false;
    
    const payload = { 
      items: cart.map(item => ({ product_id: item.id, quantity: item.quantity })),
      request_einvoice: requestEInvoice,
      payment_method: method,
      amount_tendered: amountTendered
    };
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const sstTax = cart.reduce((sum, item) => sum + (item.is_sst_applicable ? (item.price * item.quantity * 0.06) : 0), 0);
    const currentTotal = subtotal + sstTax;
    const currentItems = [...cart]; // Snapshot of cart before clearing

    try {
      const token = localStorage.getItem('token');
      // 1. Save the sale to the database
      const response = await axios.post(`${API_URL}/api/checkout`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (securitySessionId) {
        axios.post(`${API_URL}/api/security/stop-success`, {
          session_id: securitySessionId,
          order_id: response.data.sale_id
        }, { headers: { Authorization: `Bearer ${token}` } })
        .catch(err => console.error("Failed to trigger success camera stop:", err));
        
        setSecuritySessionId(null); 
      }

      // 2. Prepare data for the Receipt (saved in state for printing later)
      setLastSale({
        id: response.data.sale_id,
        items: currentItems,
        total: currentTotal,
        date: new Date().toLocaleString(),
        lhdnQrUrl: response.data.lhdn?.QRCodeURL,
        lhdnValidationId: response.data.lhdn?.ValidationID
      });

      // 3. Open the cash drawer IMMEDIATELY so cashier can make change
      await axios.post(`${API_URL}/api/printer/kick-drawer`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // NOTE: We deliberately DO NOT clear the cart or close the modal here!
      return true; // Indicate success to the modal
    } catch (error) {
      console.error(error);
      alert('Checkout failed. Please check connection and try again.');
      return false;
    }
  };

  const finalizeAndClear = (shouldPrint: boolean) => {
    // 1. Trigger Print if requested
    if (shouldPrint) {
      setTimeout(() => window.print(), 500);
    }
    
    // 2. Clear Cart & Update UI for the next customer
    setCart([]);
    setIsCartOpen(false);
    setIsPaymentModalOpen(false); 
    fetchProducts();
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const categories = ['All', ...new Set(products.map(p => p.category))];
  // --- BUG FIX: Dashboard Search (Name + SKU) and Categories ---
  const filteredProducts = products.filter(p => {
    const searchLower = searchTerm.toLowerCase();
    
    // Check Name and SKU
    const matchesName = p.name.toLowerCase().includes(searchLower);
    const matchesSku = p.sku ? p.sku.toLowerCase().includes(searchLower) : false;
    
    // Combine them (it's a match if EITHER name or sku matches)
    const matchesSearch = matchesName || matchesSku;
    
    // Check Category
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    
    // MUST match both the search string AND the selected category button
    return matchesSearch && matchesCategory;
  });
  // -------------------------------------------------------------
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden relative">
      
      {/* --- HIDDEN RECEIPT COMPONENT (Only visible during print) --- */}
      <div>
        {lastSale && (
          <Receipt 
            ref={receiptRef} 
            orderId={lastSale.id} 
            items={lastSale.items} 
            total={lastSale.total} 
            date={lastSale.date}
            // --- NEW: Pass the LHDN props to the thermal printer layout ---
            lhdnQrUrl={lastSale.lhdnQrUrl}
            lhdnValidationId={lastSale.lhdnValidationId}
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
                  onClick={() => navigate('/admin/valuation')} 
                  className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-emerald-200"
                >
                  <FileText size={16} /> 
                  <span className="hidden sm:inline">Inventory Report</span>
                </button>

                <button 
                  onClick={() => navigate('/admin/products')} 
                  className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                >
                  <Settings size={16} /> 
                  <span className="hidden sm:inline">{t('products')}</span>
                </button>
                {/* --- NEW: BACKUPS BUTTON --- */}
                <button 
                  onClick={() => navigate('/admin/backups')} 
                  className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-blue-200"
                >
                  <Cloud size={16} /> 
                  <span className="hidden sm:inline">Backups</span>
                </button>
                {/* --------------------------- */}
                {/* --- NEW: EXPENSES BUTTON --- */}
                <button 
                  onClick={() => navigate('/admin/expenses')} 
                  className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-red-200"
                >
                  <DollarSign size={16} /> 
                  <span className="hidden sm:inline">Expenses</span>
                </button>
                {/* ---------------------------- */}
                
                {/* --- NEW: SHIFT AUDIT BUTTON --- */}
                <button 
                  onClick={() => navigate('/admin/shifts')} 
                  className="flex items-center gap-2 bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-purple-200 shadow-sm"
                  title="View Till Audits"
                >
                  <Lock size={16} /> 
                  <span className="hidden sm:inline">Till Audit</span>
                </button>
                {/* ------------------------------- */}
              </>
            )}

            {/* --- NEW: CUSTOMER VIEW POP-OUT BUTTON --- */}
            <button 
              onClick={() => window.open('/customer-display', '_blank')} 
              className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-indigo-200 shadow-sm"
              title="Open Secondary Customer Screen"
            >
              <Monitor size={16} /> 
              <span className="hidden sm:inline">Customer View</span>
            </button>
            {/* ----------------------------------------- */}

            {/* --- NEW: LANGUAGE TOGGLE BUTTON --- */}
            <button 
              onClick={toggleLanguage}
              className="flex items-center justify-center w-10 h-10 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-bold transition-colors border border-blue-200 shadow-sm"
              title="Toggle Language"
            >
              {t('switch_lang')}
            </button>

            {/* --- NEW: HARD RELOAD / CLEAR CACHE BUTTON --- */}
            <button 
              onClick={() => {
                // Force the browser to refresh the page entirely
                window.location.reload();
              }} 
              className="flex items-center gap-2 text-orange-600 hover:text-orange-800 px-2"
              title="Refresh / Clear Cache"
            >
              <RefreshCw size={18} /> <span className="hidden sm:inline">Refresh</span>
            </button>
            {/* --------------------------------------------- */}

            {/* --- NEW: SHIFT MANAGEMENT BUTTON --- */}
            {isShiftTrackingEnabled && (
              <button 
                onClick={() => {
                  setShiftModalType(activeShift ? 'close' : 'open');
                  setIsShiftModalOpen(true);
                }}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm transition-colors ${
                  activeShift 
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300' // Quiet Close button
                    : 'bg-red-600 text-white hover:bg-red-700 border border-red-700 animate-pulse' // Loud Open button
                }`}
              >
                {activeShift ? <Lock size={16} /> : <LockOpen size={16} />}
                <span className="hidden sm:inline">{activeShift ? 'Close Register' : 'Open Register'}</span>
              </button>
            )}
            {/* ------------------------------------ */}

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
                    {/* --- FORMAT: Smart decimals (no trailing zeros) --- */}
                    <span className="text-[10px] text-gray-400">
                      {product.is_weighable ? `${Number(product.stock_quantity.toFixed(3))} kg` : product.stock_quantity} left
                    </span>
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
                    {/* --- FORMAT: Smart decimals for cart summary --- */}
                      <p className="text-xs text-gray-500">
                        RM {item.price.toFixed(2)} x {item.is_weighable ? `${Number(item.quantity.toFixed(3))} kg` : item.quantity}
                      </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white rounded-md border border-gray-200 shadow-sm">
                      <button onClick={() => updateQuantity(item.id, -1)} className="p-1 px-2 text-gray-600 hover:bg-gray-100">
                        <Minus size={14} />
                      </button>
                      {/* --- FORMAT: Smart decimals inside the quantity adjuster --- */}
                        <span className="w-auto min-w-[2rem] px-1 text-center text-sm font-medium text-blue-700">
                          {item.is_weighable ? Number(item.quantity.toFixed(3)) : item.quantity}
                        </span>
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
            {/* --- NEW: LHDN e-Invoice Toggle --- */}
            <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-lg border border-gray-200">
              <label htmlFor="einvoice-toggle" className="text-sm font-semibold text-gray-700 cursor-pointer flex items-center gap-2">
                <FileText size={16} className="text-blue-600" />
                Request LHDN e-Invoice
              </label>
              <input
                id="einvoice-toggle"
                type="checkbox"
                checked={requestEInvoice}
                onChange={(e) => setRequestEInvoice(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
              />
            </div>
            
            {/* --- UPGRADED: CART ACTION BUTTONS (Task 2.4) --- */}
            <div className="flex gap-2">
              <button
                onClick={handleClearOrder}
                className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 py-3 rounded-lg font-bold shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                disabled={cart.length === 0}
                title="Clear Cart & Log Void"
              >
                <Trash2 size={20} /> Clear
              </button>
              
              <button 
                onClick={() => setIsPaymentModalOpen(true)}
                className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                disabled={cart.length === 0}
              >
                <ShoppingCart size={20} /> Checkout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- MOBILE FLOATING CART BUTTON --- */}
      {!isCartOpen && (
        <button 
          onClick={() => setIsCartOpen(true)}
          className="md:hidden fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-2xl z-30 flex items-center gap-2 print:hidden"
        >
          <ShoppingCart size={24} />
          {cart.length > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full absolute -top-1 -right-1">
              {cart.reduce((acc, item) => acc + item.quantity, 0)}
            </span>
          )}
        </button>
      )}
      {/* ----------------------------------- */}

      <div className="print:hidden">
         {/* Only Admins get the Superpower */}
         {role === 'admin' && <AIAssistant onUpdate={fetchProducts} />}
      </div>

      {/* --- WEIGHABLE PRODUCT MODAL (MOVED INSIDE THE DIV) --- */}
      <WeightPromptModal
        isOpen={isWeightModalOpen}
        productName={productToWeigh?.name || ''}
        onConfirm={(weight) => {
          handleWeightConfirm(weight); 
        }}
        onClose={() => {
          setIsWeightModalOpen(false);
          setProductToWeigh(null);
        }}
      />

      {/* --- NEW: SHIFT MANAGER MODAL --- */}
      <ShiftManagerModal 
        isOpen={isShiftModalOpen}
        type={shiftModalType}
        activeShift={activeShift}
        onClose={() => setIsShiftModalOpen(false)}
        onSuccess={() => {
          setIsShiftModalOpen(false);
          fetchShiftStatus(); // Refresh the UI state after opening/closing
        }}
      />

      {/* --- UPDATED: PAYMENT & PHANTOM RECEIPT MODAL --- */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        totalAmount={(cartTotal + cart.reduce((sum, item) => sum + (item.is_sst_applicable ? (item.price * item.quantity * 0.06) : 0), 0))}
        onProcessTransaction={processTransaction}
        onFinalizeAndClear={finalizeAndClear}
      />
      
    </div>
  );
}