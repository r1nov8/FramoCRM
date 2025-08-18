
import React from 'react';
import type { Product } from '../types';
import { PumpIcon } from './icons';

interface ProductInfoProps {
    product: Product;
}

export const ProductInfo: React.FC<ProductInfoProps> = ({ product }) => {
    return (
        <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-700/50 dark:border-gray-600 flex items-start space-x-4">
            <div className="flex-shrink-0 text-blue-500">
                <PumpIcon className="w-8 h-8"/>
            </div>
            <div>
                 <p className="font-semibold text-gray-800 dark:text-gray-100">{product.type}</p>
                 <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-300 mt-1">
                    <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Quantity</span>
                        <p>{product.quantity}</p>
                    </div>
                    <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Capacity</span>
                        <p>{product.capacity} m³/h</p>
                    </div>
                    <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Head</span>
                        <p>{product.head} mlc</p>
                    </div>
                 </div>
            </div>
        </div>
    );
};
