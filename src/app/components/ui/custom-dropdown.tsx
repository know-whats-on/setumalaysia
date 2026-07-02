import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

interface CustomDropdownProps {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
  searchable?: boolean;
  placeholder?: string;
}

export function CustomDropdown({
  label,
  value,
  options,
  onChange,
  searchable = false,
  placeholder = 'Select...',
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = searchable && searchQuery
    ? options.filter((opt) => opt.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="relative flex flex-col gap-1.5" ref={dropdownRef}>
      <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full cursor-pointer items-center justify-between rounded-md border border-input bg-input-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors hover:border-border focus:ring-2 focus:ring-ring/30"
        >
          <span className="truncate pr-2 font-medium">{selectedOption ? selectedOption.label : placeholder}</span>
          <ChevronDown className={`size-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute left-0 top-full z-[100] mt-2 w-full overflow-hidden rounded-md border border-border bg-popover text-popover-foreground">
            {searchable && (
              <div className="sticky top-0 z-10 border-b border-border bg-popover p-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    className="w-full rounded-md border-none bg-input-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                    placeholder={`Search ${label.toLowerCase()}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                </div>
              </div>
            )}
            <div className="max-h-60 overflow-y-auto p-1.5">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className={`flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2.5 text-sm transition-colors ${
                      value === opt.value
                        ? 'bg-muted text-foreground font-semibold'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground font-medium'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {value === opt.value && <Check className="ml-2 size-4 shrink-0 text-foreground" />}
                  </button>
                ))
              ) : (
                <div className="m-1 rounded-md bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
                  No options found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
