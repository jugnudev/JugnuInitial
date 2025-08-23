import { motion } from "framer-motion";

interface SegmentedControlProps {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function SegmentedControl({ options, value, onChange, className = "" }: SegmentedControlProps) {
  return (
    <div className={`relative inline-flex bg-white/5 rounded-2xl p-1 ${className}`}>
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={`relative px-4 py-2 text-sm font-medium rounded-xl transition-colors duration-200 whitespace-nowrap ${
            value === option
              ? "text-black z-10"
              : "text-white/70 hover:text-white/90"
          }`}
          data-testid={`segment-${option.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {value === option && (
            <motion.div
              layoutId="segmented-control-background"
              className="absolute inset-0 bg-primary rounded-xl"
              initial={false}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 30
              }}
            />
          )}
          <span className="relative">{option}</span>
        </button>
      ))}
    </div>
  );
}