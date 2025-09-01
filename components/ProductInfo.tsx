
import React from 'react';
import type { Product } from '../types';
import { PumpIcon } from './icons';

interface ProductInfoProps {
    product: Product;
}

export const ProductInfo: React.FC<ProductInfoProps> = ({ product }) => {
    return (
        <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-700/50 dark:border-gray-600 flex items-center space-x-3">
            <div className="flex-shrink-0 text-blue-500">
                <PumpIcon className="w-6 h-6"/>
            </div>
            <p className="font-semibold text-gray-800 dark:text-gray-100">{product.type}</p>
        </div>
    );
};
