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

type AssistantMode = 'ask' | 'agent';

const getAI = () => {
    // Use any to bypass TypeScript env checking for now
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        console.warn('VITE_GEMINI_API_KEY not set - AI features will be limited');
        return null;
    }
    return new GoogleGenAI({ apiKey });
};

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
    const [mode, setMode] = useState<AssistantMode>('ask');
    const [inputText, setInputText] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            const welcomeMessage = mode === 'ask' 
                ? `Hi! I'm your AI assistant. How can I help with the "${project.name}" project today?`
                : `Hi! I'm your AI assistant in agent mode. You can ask me anything about the "${project.name}" project or have a conversation about sales strategies, market insights, and more.`;
            setMessages([
                { id: 'welcome', sender: 'ai', text: welcomeMessage }
            ]);
        }
    }, [isOpen, project.name, mode]);

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
                Draft a professional follow-up email from '${salesRep.first_name} ${salesRep.last_name}' to '${primaryContact.name}' of '${primaryContactCompany.name}'.
    
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
                const ai = getAI();
                if (!ai) {
                    setMessages(prev => [...prev, { id: `ai-err-${Date.now()}`, sender: 'ai', text: 'AI features are not available. Please configure VITE_GEMINI_API_KEY in your environment.', isHtml: false }]);
                    setIsLoading(false);
                    return;
                }
                
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

    const handleSendMessage = async () => {
        if (!inputText.trim() || isLoading) return;

        const userMessage: Message = { id: `user-${Date.now()}`, sender: 'user', text: inputText };
        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        setIsLoading(true);

        try {
            const ai = getAI();
            if (!ai) {
                setMessages(prev => [...prev, { id: `ai-err-${Date.now()}`, sender: 'ai', text: 'AI features are not available. Please configure VITE_GEMINI_API_KEY in your environment.', isHtml: false }]);
                setIsLoading(false);
                return;
            }

            // Build context about the project for agent mode
            const shipyard = companies.find(c => c.id === project.shipyardId);
            const vesselOwner = project.vesselOwnerId ? companies.find(c => c.id === project.vesselOwnerId) : undefined;
            const primaryContact = project.primaryContactId ? contacts.find(c => c.id === project.primaryContactId) : undefined;
            const primaryContactCompany = primaryContact ? companies.find(c => c.id === primaryContact.companyId) : undefined;
            const salesRep = project.salesRepId ? teamMembers.find(tm => tm.id === project.salesRepId) : undefined;

            const contextPrompt = `You are a helpful AI assistant for Framo, a marine equipment supplier. You are helping with the project "${project.name}".

Project Context:
- Name: ${project.name}
- Stage: ${project.stage}
- Value: ${project.currency} ${project.value.toLocaleString()}
- Closing Date: ${new Date(project.closingDate).toLocaleDateString()}
- Shipyard: ${shipyard?.name || 'N/A'}
- Vessel Owner: ${vesselOwner?.name || 'N/A'}
- Primary Contact: ${primaryContact?.name || 'N/A'} from ${primaryContactCompany?.name || 'N/A'}
- Sales Rep: ${salesRep ? `${salesRep.first_name} ${salesRep.last_name}` : 'N/A'}
- Notes: ${project.notes || 'No notes available'}

User's question: ${inputText}

Please provide a helpful response. Use markdown formatting for clarity when appropriate.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: contextPrompt,
            });
            
            const aiResponseText = response.text;
            setMessages(prev => [...prev, { id: `ai-${Date.now()}`, sender: 'ai', text: aiResponseText, isHtml: true }]);
        } catch (error) {
            console.error("Gemini API error:", error);
            setMessages(prev => [...prev, { id: `ai-err-${Date.now()}`, sender: 'ai', text: 'Sorry, I encountered an error. Please try again.', isHtml: false }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
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
                    {/* Mode Selector */}
                    <div className="mb-4">
                        <div className="flex items-center justify-center gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                            <button
                                onClick={() => setMode('ask')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                    mode === 'ask'
                                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                                }`}
                            >
                                Ask Mode
                            </button>
                            <button
                                onClick={() => setMode('agent')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                    mode === 'agent'
                                        ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                                }`}
                            >
                                Agent Mode
                            </button>
                        </div>
                    </div>

                    {/* Conditional UI based on mode */}
                    {mode === 'ask' && !isLoading && (
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

                    {/* Agent Mode Input */}
                    {mode === 'agent' && (
                        <div className="flex gap-2">
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Ask me anything about this project..."
                                className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                rows={2}
                                disabled={isLoading}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputText.trim() || isLoading}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};
