import { Link } from 'react-router';
import { motion } from 'motion/react';
import { ProductIcon } from '../components/ProductIcon';

export default function NotFound() {
  return (
    <div className="shell grid min-h-[60vh] place-items-center py-16 text-center">
      <div>
        <motion.div className="mx-auto w-fit" animate={{ rotate: [-4, 4, -4] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
          <ProductIcon icon="diya" size={150} active />
        </motion.div>
        <p className="mt-2 font-display text-7xl font-extrabold text-gradient">404</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold">This gali is still unlit</h1>
        <p className="mx-auto mt-2 max-w-md text-muted">Our rider looked everywhere, even behind the rangoli. The page you wanted isn’t here.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn btn-primary">Take me home</Link>
          <Link to="/wall" className="btn btn-ghost">Light a diya instead</Link>
        </div>
      </div>
    </div>
  );
}
