// app/update-password/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Lock, Eye, EyeOff } from 'lucide-react';

export default function UpdatePasswordPage() {
    const supabase = createClient();
    const router = useRouter();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [hasRecoveryToken, setHasRecoveryToken] = useState(false);

    useEffect(() => {
        // O cliente Supabase detecta o token da URL automaticamente.
        // Verificamos o hash da URL para garantir que o formulário só seja
        // exibido quando um token de recuperação estiver presente.
        const hash = window.location.hash;
        if (hash.includes('type=recovery')) {
            setHasRecoveryToken(true);
        } else {
            // Se não houver token, talvez redirecionar ou mostrar uma mensagem.
            // Por enquanto, mostraremos uma mensagem de erro.
            setError('Link inválido ou expirado. Solicite um novo link de recuperação de senha.');
        }
    }, []);

    const handleUpdatePassword = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('A senha deve ter no mínimo 6 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        setLoading(true);

        // O Supabase JS v2 usa o token da URL automaticamente para esta chamada
        const { error } = await supabase.auth.updateUser({ password });

        setLoading(false);

        if (error) {
            setError(`Erro ao atualizar a senha: ${error.message}`);
            toast.error('Falha ao atualizar a senha.');
        } else {
            toast.success('Senha atualizada com sucesso! Redirecionando...');
            // Redireciona para o painel após a atualização bem-sucedida.
            setTimeout(() => {
                router.push('/painel');
            }, 2000);
        }
    };

    if (!hasRecoveryToken && !error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-600">Verificando link...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Crie sua nova senha</h1>
                    <p className="text-gray-600 mt-2">
                        Escolha uma senha segura para acessar seu painel.
                    </p>
                </div>

                <form onSubmit={handleUpdatePassword} className="space-y-6">
                    <div className="relative">
                        <label
                            htmlFor="password"
                            className="block text-sm font-medium text-gray-700"
                        >
                            Nova Senha
                        </label>
                        <input
                            id="password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-10 mt-1 py-3 px-4 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="••••••••"
                        />
                        <Lock className="absolute left-3 top-10 text-gray-400" size={20} />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-10 text-gray-500"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    <div className="relative">
                        <label
                            htmlFor="confirmPassword"
                            className="block text-sm font-medium text-gray-700"
                        >
                            Confirmar Nova Senha
                        </label>
                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full pl-10 pr-4 mt-1 py-3 px-4 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="••••••••"
                        />
                        <Lock className="absolute left-3 top-10 text-gray-400" size={20} />
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                                    Salvando...
                                </>
                            ) : (
                                'Salvar Nova Senha'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
