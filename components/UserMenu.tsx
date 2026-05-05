'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { SignOut, User } from '@phosphor-icons/react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

export default function UserMenu() {
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      router.push('/login');
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-secondary transition-all duration-200 group border border-transparent hover:border-primary"
        aria-label="Déconnexion"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 shadow-md flex items-center justify-center">
          <User className="h-4 w-4 text-white" weight="bold" />
        </div>
        <SignOut className="h-4 w-4 text-tertiary" weight="bold" />
      </button>

      {showConfirm &&
        createPortal(
          <ConfirmDialog
            isOpen={showConfirm}
            onClose={() => setShowConfirm(false)}
            onConfirm={handleLogout}
            title="Déconnexion"
            message="Êtes-vous sûr de vouloir vous déconnecter ?"
            confirmText="Se déconnecter"
            cancelText="Annuler"
            variant="danger"
          />,
          document.getElementById('logout-dialog-portal')!
        )}
    </>
  );
}
