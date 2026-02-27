// src/components/SmartCategorySelector.tsx

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { POS_CATEGORIES } from '../utils/categories';

// Define the properties this component needs to receive from the parent
interface Props {
  value: string; // The currently selected category
  onChange: (value: string) => void; // Function to run when a new category is selected
}

export default function SmartCategorySelector({ value, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // --- LOGIC: Close dropdown when clicking outside of it ---
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- LOGIC: The Search Engine (Path B) ---
  // We filter the categories based on what the user types into the input box.
  const filteredCategories = POS_CATEGORIES.map(group => ({
    ...group,
    items: group.items.filter(item =>
      item.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(group => group.items.length > 0); // Hide empty parent groups

  return (
    <div ref={wrapperRef} className="relative w-full">
      {/* --- VISUAL: The Input Box --- */}
      <div 
        className="relative flex items-center w-full border border-gray-300 rounded-md bg-white cursor-pointer overflow-hidden focus-within:ring-2 focus-within:ring-blue-500"
        onClick={() => setIsOpen(true)}
      >
        <Search className="w-5 h-5 text-gray-400 ml-3" />
        <input
          type="text"
          className="w-full py-2 pl-2 pr-10 outline-none text-sm text-gray-700 placeholder-gray-400"
          placeholder={value || "Search or select a category..."}
          value={isOpen ? searchTerm : value} // Show search term when open, selected value when closed
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        <ChevronDown className="w-5 h-5 text-gray-500 absolute right-3 pointer-events-none" />
      </div>

      {/* --- VISUAL: The Dropdown Menu (Path A) --- */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredCategories.length === 0 ? (
            <div className="p-3 text-sm text-gray-500 text-center">No categories found.</div>
          ) : (
            filteredCategories.map((group, groupIdx) => (
              <div key={groupIdx}>
                {/* Parent Category Header (Non-clickable) */}
                <div className="px-3 py-2 text-xs font-bold text-gray-500 bg-gray-50 uppercase tracking-wider sticky top-0">
                  {group.parent}
                </div>
                {/* Sub-Category Items (Clickable) */}
                {group.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors"
                    onClick={() => {
                      onChange(item); // Update the React state in the parent
                      setSearchTerm(''); // Clear the search
                      setIsOpen(false); // Close the menu
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}