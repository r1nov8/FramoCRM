import React from 'react';
import { TrendingUpIcon, NewspaperIcon } from './icons';

const Widget: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-700 dark:text-gray-300">
            {icon}
            <span className="ml-3">{title}</span>
        </h3>
        <div className="text-gray-600 dark:text-gray-400">
            {children}
        </div>
    </div>
);





interface DashboardProps {
    userFirstName: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ userFirstName }) => {
// ...existing code...

    return (
        <div className="space-y-6 mt-16 p-6">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome back, {userFirstName}!</h1>
                <p className="mt-2 text-gray-500 dark:text-gray-400">Here's a summary of your sales pipeline and latest updates.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto justify-center">
                <Widget icon={<TrendingUpIcon className="w-6 h-6" />} title="Sales Forecast">
                    <p>Sales forecast widget is under construction.</p>
                    <p className="mt-2 text-sm">This area will display projected sales, quarterly goals, and performance metrics.</p>
                </Widget>
                <Widget icon={<NewspaperIcon className="w-6 h-6" />} title="Latest Industry News (from TradeWinds)">
                    <p>Industry news widget is under construction.</p>
                    <p className="mt-2 text-sm">This area will show the latest headlines and articles relevant to the marine and liquified gas industry.</p>
                </Widget>
            </div>
        </div>
    );
};
