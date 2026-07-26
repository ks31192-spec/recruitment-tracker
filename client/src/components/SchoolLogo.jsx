import { useBranding } from '../context/BrandingContext.jsx';

export default function SchoolLogo({ size = 40, className = '', rounded = 'rounded-xl' }) {
  const { schoolLogo, schoolShort } = useBranding();

  if (schoolLogo) {
    return <img src={schoolLogo} alt="" className={`${rounded} object-contain ${className}`} style={{ width: size, height: size }} />;
  }

  return (
    <div className={`${rounded} bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <span className="font-bold text-white" style={{ fontSize: size * 0.35 }}>{schoolShort}</span>
    </div>
  );
}
