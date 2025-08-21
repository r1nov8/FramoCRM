import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Modal } from './Modal';
import type { Project, Company, Contact, TeamMember } from '../types';
import { SparklesIcon, CopyIcon, NewspaperIcon, MailIcon, FileIcon } from './icons';

interface AIAssistantModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
    companies: Company[];
    contacts: Contact[];
    teamMembers: TeamMember[];
}

type Message = {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    isHtml?: boolean;
    hasCopyButton?: boolean;
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const TypingIndicator = () => (
    <div className="flex items-center space-x-1 p-3">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
    </div>
);

const SimpleMarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
    const html = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br />');

    return <div dangerouslySetInnerHTML={{ __html: html }} />;
};


export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({ isOpen, onClose, project, companies, contacts, teamMembers }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setMessages([
                { id: 'welcome', sender: 'ai', text: `Hi! I'm your AI assistant. How can I help with the "${project.name}" project today?` }
            ]);
        }
    }, [isOpen, project.name]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleAction = async (actionType: 'summarize' | 'email' | 'insights', userText: string) => {
        const newUserMessage: Message = { id: `user-${Date.now()}`, sender: 'user', text: userText };
        setMessages(prev => [...prev, newUserMessage]);
        setIsLoading(true);

        try {
            let prompt = '';
            const shipyard = companies.find(c => c.id === project.shipyardId);
            const vesselOwner = project.vesselOwnerId ? companies.find(c => c.id === project.vesselOwnerId) : undefined;
            const primaryContact = project.primaryContactId ? contacts.find(c => c.id === project.primaryContactId) : undefined;
            const primaryContactCompany = primaryContact ? companies.find(c => c.id === primaryContact.companyId) : undefined;
            const salesRep = project.salesRepId ? teamMembers.find(tm => tm.id === project.salesRepId) : undefined;

            if (actionType === 'summarize') {
                prompt = `You are a helpful sales assistant for Framo, a marine equipment supplier.
                Summarize the following CRM project entry in a concise, professional paragraph.
                Highlight the project stage, total value, key companies involved, and any critical notes.
                Format the response using simple markdown for clarity.
    
                Project Data:
                - Name: ${project.name}
                - Stage: ${project.stage}
                - Value: ${project.currency} ${project.value.toLocaleString()}
                - Closing Date: ${new Date(project.closingDate).toLocaleDateString()}
                - Shipyard: ${shipyard?.name || 'N/A'}
                - Vessel Owner: ${vesselOwner?.name || 'N/A'}
                - Primary Contact: ${primaryContact?.name || 'N/A'} from ${primaryContactCompany?.name || 'N/A'}
                - Notes: ${project.notes || 'No notes available.'}
                `;
            } else if (actionType === 'email' && primaryContact && primaryContactCompany && salesRep) {
                prompt = `You are a helpful sales assistant for Framo, a marine equipment supplier.
                Draft a professional follow-up email from '${salesRep.name}' to '${primaryContact.name}' of '${primaryContactCompany.name}'.
    
                The purpose of the email is to follow up on the project '${project.name}'.
                The current stage of the project is '${project.stage}'.
                Reference our latest notes: '${project.notes || 'Checking in on our recent discussions.'}'.
    
                Keep the tone professional and friendly. The goal is to move the project forward.
                The email should be concise. End with a clear call to action.
                Do not include a subject line. Start the email with 'Hi ${primaryContact.name.split(' ')[0]},'.
                Use markdown for formatting.`;
            } else if (actionType === 'insights') {
                prompt = `You are a market analyst specializing in the marine and shipping industry.
                Provide a brief overview of the current market trends, opportunities, and challenges for vessels using ${project.fuelType} as a fuel source.
                Focus on recent developments and the outlook for the next 12-18 months.
                Format the response with clear headings using markdown (e.g., **Trends**, **Opportunities**).`;
            }

            if (prompt) {
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                });
                const aiResponseText = response.text;
                setMessages(prev => [...prev, { id: `ai-${Date.now()}`, sender: 'ai', text: aiResponseText, isHtml: true, hasCopyButton: actionType === 'email' }]);
            } else {
                 setMessages(prev => [...prev, { id: `ai-err-${Date.now()}`, sender: 'ai', text: 'Sorry, I couldn\'t generate a response due to missing information (e.g., primary contact for email).', isHtml: false }]);
            }

        } catch (error) {
            console.error("Gemini API error:", error);
            setMessages(prev => [...prev, { id: `ai-err-${Date.now()}`, sender: 'ai', text: 'Sorry, I encountered an error. Please try again.', isHtml: false }]);
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text.replace(/<br \/>/g, '\n').replace(/<strong>/g, '').replace(/<\/strong>/g, ''));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="AI Assistant" size="4xl">
            <div className="flex flex-col h-[65vh]">
                <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 rounded-t-lg">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                            {msg.sender === 'ai' && (
                                <div className="w-8 h-8 flex-shrink-0 bg-blue-600 rounded-full flex items-center justify-center text-white">
                                    <SparklesIcon className="w-5 h-5" />
                                </div>
                            )}
                            <div className={`max-w-md p-3 rounded-lg relative ${msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-700'}`}>
                                {msg.isHtml ? <SimpleMarkdownRenderer text={msg.text} /> : <p>{msg.text}</p>}
                                {msg.hasCopyButton && (
                                    <button onClick={() => copyToClipboard(msg.text)} className="absolute -top-2 -right-2 p-1.5 bg-gray-200 dark:bg-gray-600 rounded-full hover:bg-gray-300 dark:hover:bg-gray-500" title="Copy to clipboard">
                                        <CopyIcon className="w-4 h-4 text-gray-700 dark:text-gray-200"/>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 flex-shrink-0 bg-blue-600 rounded-full flex items-center justify-center text-white">
                                <SparklesIcon className="w-5 h-5" />
                            </div>
                            <div className="max-w-md p-3 rounded-lg bg-white dark:bg-gray-700">
                               <TypingIndicator />
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
                <div className="p-4 border-t dark:border-gray-700">
                    {!isLoading && (
                        <div className="flex flex-wrap justify-center gap-3">
                           <button onClick={() => handleAction('summarize', 'Summarize this project')} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800">
                                <FileIcon className="w-4 h-4" />
                                Summarize Project
                            </button>
                             <button onClick={() => handleAction('email', 'Draft a follow-up email')} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800">
                                <MailIcon className="w-4 h-4" />
                                Draft Follow-up Email
                            </button>
                             <button onClick={() => handleAction('insights', `Get market insights for ${project.fuelType}`)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-700 bg-purple-100 rounded-lg hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-300 dark:hover:bg-purple-800">
                                <NewspaperIcon className="w-4 h-4" />
                                Market Insights
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};
