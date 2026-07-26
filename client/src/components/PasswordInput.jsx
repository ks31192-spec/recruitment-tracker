import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// Drop-in replacement for <input type="password"> with a show/hide toggle.
// Pass layout/margin classes via wrapperClassName so the eye icon stays
// vertically centred on the input itself.
export default function PasswordInput({ className = '', wrapperClassName = '', ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`relative ${wrapperClassName}`}>
      <input {...props} type={visible ? 'text' : 'password'} className={`${className} pr-10`} />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        tabIndex={-1}
        aria-label={visible ? 'Hide password' : 'Show password'}
        title={visible ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
