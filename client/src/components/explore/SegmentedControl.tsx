import { motion } from "framer-motion";

interface SegmentedControlProps {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

// Mobile-friendly category abbreviations
const getMobileLabel = (option: string): string => {
  const mobileLabels: Record<string, string> = {
    'All': 'All',
    'Concerts': 'Music',
    'Club Nights': 'Clubs', 
    'Comedy': 'Comedy',
    'Festivals': 'Events'
  };
  return mobileLabels[option] || option;
};

export default function SegmentedControl({ options, value, onChange, className = "" }: SegmentedControlProps) {
  return (
    <div className={`relative inline-flex bg-white/5 rounded-2xl p-1 flex-wrap sm:flex-nowrap gap-1 sm:gap-0 ${className}`}>
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={`relative px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-lg sm:rounded-xl transition-colors duration-200 flex-1 sm:flex-initial min-w-0 ${
            value === option
              ? "text-black z-10"
              : "text-white/70 hover:text-white/90"
          }`}
          data-testid={`segment-${option.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {value === option && (
            <motion.div
              layoutId="segmented-control-background"
              className="absolute inset-0 bg-primary rounded-lg sm:rounded-xl"
              initial={false}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 30
              }}
            />
          )}
          <span className="relative block sm:hidden truncate">{getMobileLabel(option)}</span>
          <span className="relative hidden sm:block">{option}</span>
        </button>
      ))}
    </div>
  );
}