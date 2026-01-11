"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useUser } from '@auth0/nextjs-auth0/client';
import { ArrowLeft, Star, Trash2 } from "lucide-react";
import { getUserFavorites, removeFromFavorites } from "@/lib/backendApi";

interface Favorite {
    id: number;
    productName: string;
    brand?: string;
    safetyScore?: number;
    image?: string;
    addedAt: string;
}

export default function FavoritesPage({ onBack }: { onBack: () => void }) {
    const { user } = useUser();
    const [favorites, setFavorites] = useState<Favorite[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [removingId, setRemovingId] = useState<number | null>(null);

    useEffect(() => {
        if (user?.sub) {
            fetchFavorites();
        }
    }, [user?.sub]);

    const fetchFavorites = async () => {
        if (!user?.sub) return;
        try {
            setIsLoading(true);
            const data = await getUserFavorites(user.sub);
            setFavorites(data.favorites || []);
        } catch (error) {
            console.error('Error fetching favorites:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemove = async (favoriteId: number) => {
        if (!user?.sub) return;
        try {
            setRemovingId(favoriteId);
            await removeFromFavorites(user.sub, favoriteId);
            setFavorites(prev => prev.filter(f => f.id !== favoriteId));
        } catch (error) {
            console.error('Error removing favorite:', error);
        } finally {
            setRemovingId(null);
        }
    };

    const formatDate = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-green-600 bg-green-100";
        if (score >= 60) return "text-yellow-600 bg-yellow-100";
        if (score >= 40) return "text-orange-600 bg-orange-100";
        return "text-red-600 bg-red-100";
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50/30">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4 group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium">Back to Dashboard</span>
                    </button>
                    <div className="flex items-center gap-3">
                        <Star className="w-8 h-8 text-amber-500 fill-amber-500" />
                        <h1 className="text-3xl font-display font-bold text-gray-900">
                            My Favorites
                        </h1>
                    </div>
                    <p className="text-gray-600 mt-2">
                        Your saved products for quick access
                    </p>
                </motion.div>

                {isLoading ? (
                    <div className="flex items-center justify-center min-h-[300px]">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full"
                        />
                    </div>
                ) : favorites.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-16 bg-white rounded-2xl shadow-lg"
                    >
                        <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No favorites yet</h3>
                        <p className="text-gray-600">
                            Star products from your scan results to save them here
                        </p>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                    >
                        {favorites.map((favorite, index) => (
                            <motion.div
                                key={favorite.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                            >
                                {favorite.image ? (
                                    <img
                                        src={favorite.image}
                                        alt={favorite.productName}
                                        className="w-full h-40 object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-40 bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center text-5xl">
                                        🍽️
                                    </div>
                                )}

                                <div className="p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-semibold text-gray-900 truncate">
                                                {favorite.productName}
                                            </h3>
                                            {favorite.brand && (
                                                <p className="text-sm text-gray-500 truncate">{favorite.brand}</p>
                                            )}
                                        </div>

                                        {favorite.safetyScore !== undefined && favorite.safetyScore !== null && (
                                            <div className={`px-2 py-1 rounded-full font-semibold text-xs ${getScoreColor(favorite.safetyScore)}`}>
                                                {favorite.safetyScore}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                                        <span className="text-xs text-gray-400">
                                            Added {formatDate(favorite.addedAt)}
                                        </span>
                                        <button
                                            onClick={() => handleRemove(favorite.id)}
                                            disabled={removingId === favorite.id}
                                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                        >
                                            {removingId === favorite.id ? (
                                                <motion.div
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                    className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full"
                                                />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
