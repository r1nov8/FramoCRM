
import React from 'react';
import type { Product } from '../types';
import { PumpIcon } from './icons';

interface ProductInfoProps {
    product: Product;
}

export const ProductInfo: React.FC<ProductInfoProps> = ({ product }) => {
    return (
        <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-700/50 dark:border-gray-600">
            <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 text-blue-500">
                    <PumpIcon className="w-6 h-6"/>
                </div>
                <p className="font-semibold text-gray-800 dark:text-gray-100">{product.type}</p>
            </div>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm text-gray-700 dark:text-gray-200 mt-3">
                <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Quantity</div>
                    <div className="font-medium">{product.quantity}</div>
                </div>
                <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Capacity</div>
                    <div className="font-medium">{product.capacity} m³/h</div>
                </div>
                <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Head</div>
                    <div className="font-medium">{product.head} mlc</div>
                </div>
            </div>
        </div>
    );
};
