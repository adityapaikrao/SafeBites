"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useUser } from '@auth0/nextjs-auth0/client';
import { ArrowLeft, Clock, Shield, AlertTriangle, ChevronRight } from "lucide-react";
import { getUserScans } from "@/lib/backendApi";

interface Scan {
    id: string;
    productName: string;
    brand?: string;
    image?: string;
    safetyScore: number;
    isSafe: boolean;
    timestamp: string;
    ingredients?: any[];
}

export default function HistoryPage({ onBack }: { onBack: () => void }) {
    const { user } = useUser();
    const [scans, setScans] = useState<Scan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedScan, setSelectedScan] = useState<Scan | null>(null);

    useEffect(() => {
        if (user?.sub) {
            fetchScans();
        }
    }, [user?.sub]);

    const fetchScans = async () => {
        if (!user?.sub) return;
        try {
            setIsLoading(true);
            const data = await getUserScans(user.sub);
            setScans(data.scans || []);
        } catch (error) {
            console.error('Error fetching scans:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-green-600 bg-green-100";
        if (score >= 60) return "text-yellow-600 bg-yellow-100";
        if (score >= 40) return "text-orange-600 bg-orange-100";
        return "text-red-600 bg-red-100";
    };

    if (selectedScan) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-mint-50 via-white to-mint-50/30">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <button
                            onClick={() => setSelectedScan(null)}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4 group"
                        >
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                            <span className="font-medium">Back to History</span>
                        </button>
                        <h1 className="text-3xl font-display font-bold text-gray-900">
                            {selectedScan.productName}
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Scanned {formatDate(selectedScan.timestamp)}
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Product Image */}
                        {selectedScan.image && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-white rounded-2xl shadow-lg p-4"
                            >
                                <img
                                    src={selectedScan.image}
                                    alt={selectedScan.productName}
                                    className="w-full aspect-square object-cover rounded-xl"
                                />
                            </motion.div>
                        )}

                        {/* Score & Details */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-4"
                        >
                            <div className="bg-white rounded-2xl shadow-lg p-6">
                                <h3 className="font-semibold text-gray-900 mb-4">Safety Score</h3>
                                <div className="flex items-center gap-4">
                                    <div className={`text-4xl font-bold ${selectedScan.isSafe ? 'text-green-600' : 'text-red-600'}`}>
                                        {selectedScan.safetyScore}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {selectedScan.isSafe ? (
                                            <>
                                                <Shield className="w-6 h-6 text-green-500" />
                                                <span className="text-green-600 font-medium">Safe</span>
                                            </>
                                        ) : (
                                            <>
                                                <AlertTriangle className="w-6 h-6 text-red-500" />
                                                <span className="text-red-600 font-medium">Risky</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {selectedScan.ingredients && selectedScan.ingredients.length > 0 && (
                                <div className="bg-white rounded-2xl shadow-lg p-6">
                                    <h3 className="font-semibold text-gray-900 mb-4">Ingredients</h3>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {selectedScan.ingredients.map((ing, idx) => (
                                            <div
                                                key={idx}
                                                className={`px-3 py-2 rounded-lg text-sm ${ing.status === 'safe' ? 'bg-green-50 text-green-800' :
                                                        ing.status === 'moderate' ? 'bg-yellow-50 text-yellow-800' :
                                                            'bg-red-50 text-red-800'
                                                    }`}
                                            >
                                                <span className="font-medium">{ing.name}</span>
                                                {ing.reason && <span className="text-xs block mt-1 opacity-75">{ing.reason}</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-mint-50 via-white to-mint-50/30">
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
                        <Clock className="w-8 h-8 text-mint-600" />
                        <h1 className="text-3xl font-display font-bold text-gray-900">
                            Scan History
                        </h1>
                    </div>
                    <p className="text-gray-600 mt-2">
                        View all your previous product scans
                    </p>
                </motion.div>

                {isLoading ? (
                    <div className="flex items-center justify-center min-h-[300px]">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-12 h-12 border-4 border-mint-500 border-t-transparent rounded-full"
                        />
                    </div>
                ) : scans.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-16 bg-white rounded-2xl shadow-lg"
                    >
                        <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No scans yet</h3>
                        <p className="text-gray-600">Start scanning products to build your history</p>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-3"
                    >
                        {scans.map((scan, index) => (
                            <motion.div
                                key={scan.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                whileHover={{ scale: 1.01 }}
                                onClick={() => setSelectedScan(scan)}
                                className="bg-white rounded-xl shadow-md p-4 flex items-center gap-4 cursor-pointer hover:shadow-lg transition-all"
                            >
                                {scan.image ? (
                                    <img
                                        src={scan.image}
                                        alt={scan.productName}
                                        className="w-16 h-16 rounded-lg object-cover"
                                    />
                                ) : (
                                    <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-2xl">
                                        🍽️
                                    </div>
                                )}

                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 truncate">
                                        {scan.productName}
                                    </h3>
                                    {scan.brand && (
                                        <p className="text-sm text-gray-500 truncate">{scan.brand}</p>
                                    )}
                                    <p className="text-xs text-gray-400 mt-1">
                                        {formatDate(scan.timestamp)}
                                    </p>
                                </div>

                                <div className={`px-3 py-1 rounded-full font-semibold text-sm ${getScoreColor(scan.safetyScore)}`}>
                                    {scan.safetyScore}
                                </div>

                                <ChevronRight className="w-5 h-5 text-gray-400" />
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
