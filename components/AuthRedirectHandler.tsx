'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AuthRedirectHandler() {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Quando o Supabase detecta o token de recuperação,
        // ele dispara este evento. Redirecionamos o usuário
        // para a página de atualização de senha.
        router.push('/update-password');
      }
    });

    // Cleanup listener on component unmount
    return () => {
      authListener?.unsubscribe();
    };
  }, [supabase, router]);

  return null; // Este componente não renderiza nada
}
