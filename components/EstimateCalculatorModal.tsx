import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { loadPriceList, getAllComponents, getComponentPrice } from '../pricing/pricelist';

interface EstimateItem {
  component: string;
  quantity: number;
}

interface EstimateCalculatorModalProps {
  onClose: () => void;
}

export const EstimateCalculatorModal: React.FC<EstimateCalculatorModalProps> = ({ onClose }) => {
  const [components, setComponents] = useState<string[]>([]);
  const [items, setItems] = useState<EstimateItem[]>([]);

  useEffect(() => {
    loadPriceList().then(() => {
      setComponents(getAllComponents());
      if (components.length === 0 && getAllComponents().length > 0) {
        setItems([{ component: getAllComponents()[0], quantity: 1 }]);
      }
    });
  }, []);

  const addItem = () => {
    if (components.length === 0) return;
    setItems([...items, { component: components[0], quantity: 1 }]);
  };

  const updateItem = (index: number, field: keyof EstimateItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const total = items.reduce((sum, item) => {
    const price = getComponentPrice(item.component) || 0;
    return sum + price * item.quantity;
  }, 0);

  return (
    <Modal isOpen={true} onClose={onClose} title="Estimate Calculator">
      <div className="space-y-4">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center space-x-2">
            <select
              className="flex-1 border p-1 rounded"
              value={item.component}
              onChange={e => updateItem(idx, 'component', e.target.value)}
            >
              {components.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              type="number"
              className="w-20 border p-1 rounded"
              value={item.quantity}
              min={0}
              onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
            />
            <span className="w-24 text-right">{(getComponentPrice(item.component) || 0).toFixed(2)}</span>
          </div>
        ))}
        <button
          type="button"
          onClick={addItem}
          className="px-3 py-1 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700"
        >
          Add Item
        </button>
        <div className="text-right font-semibold">Total: {total.toFixed(2)}</div>
        <div className="flex justify-end pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

