interface WireframeBoxProps {
  label?: string;
  height?: string | number;
  className?: string;
  note?: string;
}

export function WireframeBox({ label, height = 120, className = "", note }: WireframeBoxProps) {
  const h = typeof height === "number" ? `${height}px` : height;
  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded border-2 border-dashed border-gray-300 bg-gray-50 ${className}`}
      style={{ height: h }}
    >
      {/* diagonal stripe bg */}
      <div
        className="absolute inset-0 rounded opacity-30"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-45deg, #d1d5db 0, #d1d5db 1px, transparent 0, transparent 50%)",
          backgroundSize: "10px 10px",
        }}
      />
      <div className="relative text-center px-3">
        {label && <p className="text-gray-400 text-xs" style={{ fontWeight: 500 }}>{label}</p>}
        {note && <p className="text-gray-400 mt-0.5" style={{ fontSize: 10 }}>{note}</p>}
      </div>
    </div>
  );
}
