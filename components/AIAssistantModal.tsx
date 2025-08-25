import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Modal } from './Modal';
import type { Project, Company, Contact, TeamMember } from '../types';
import { SparklesIcon, CopyIcon, NewspaperIcon, MailIcon, FileIcon, PencilIcon, PlusIcon } from './icons';

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

    const handleAction = async (actionType: 'summarize' | 'email' | 'insights' | 'update_project' | 'create_task' | 'add_note', userText: string, actionData?: any) => {
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

            // Handle data modification actions
            if (actionType === 'update_project' && actionData) {
                try {
                    const response = await fetch(`${process.env.VITE_API_URL || 'http://localhost:4000'}/api/projects/${project.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                        },
                        body: JSON.stringify(actionData.updates)
                    });

                    if (response.ok) {
                        const updatedProject = await response.json();
                        setMessages(prev => [...prev, { 
                            id: `ai-${Date.now()}`, 
                            sender: 'ai', 
                            text: `✅ **Project Updated Successfully**\n\nI've updated the project with the following changes:\n${Object.entries(actionData.updates).map(([key, value]) => `- **${key}**: ${value}`).join('\n')}\n\nThe changes have been saved to the database.`,
                            isHtml: true 
                        }]);
                        
                        // Refresh the parent component's data
                        if (window.location.reload) {
                            setTimeout(() => window.location.reload(), 1000);
                        }
                        setIsLoading(false);
                        return;
                    } else {
                        throw new Error(`Failed to update project: ${response.statusText}`);
                    }
                } catch (error) {
                    setMessages(prev => [...prev, { 
                        id: `ai-err-${Date.now()}`, 
                        sender: 'ai', 
                        text: `❌ Failed to update project: ${error.message}`,
                        isHtml: false 
                    }]);
                    setIsLoading(false);
                    return;
                }
            }

            if (actionType === 'create_task' && actionData) {
                try {
                    const response = await fetch(`${process.env.VITE_API_URL || 'http://localhost:4000'}/api/projects/${project.id}/tasks`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                        },
                        body: JSON.stringify(actionData.task)
                    });

                    if (response.ok) {
                        const createdTask = await response.json();
                        setMessages(prev => [...prev, { 
                            id: `ai-${Date.now()}`, 
                            sender: 'ai', 
                            text: `✅ **Task Created Successfully**\n\n**Task:** ${createdTask.title}\n**Priority:** ${createdTask.priority || 'Medium'}\n**Status:** ${createdTask.status || 'Open'}\n\nThe task has been added to the project and will appear in the task list.`,
                            isHtml: true 
                        }]);
                        setIsLoading(false);
                        return;
                    } else {
                        throw new Error(`Failed to create task: ${response.statusText}`);
                    }
                } catch (error) {
                    setMessages(prev => [...prev, { 
                        id: `ai-err-${Date.now()}`, 
                        sender: 'ai', 
                        text: `❌ Failed to create task: ${error.message}`,
                        isHtml: false 
                    }]);
                    setIsLoading(false);
                    return;
                }
            }

            if (actionType === 'add_note' && actionData) {
                try {
                    const response = await fetch(`${process.env.VITE_API_URL || 'http://localhost:4000'}/api/projects/${project.id}/activities`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            type: actionData.type || 'note',
                            content: actionData.content,
                            createdBy: 'AI Assistant'
                        })
                    });

                    if (response.ok) {
                        const createdActivity = await response.json();
                        setMessages(prev => [...prev, { 
                            id: `ai-${Date.now()}`, 
                            sender: 'ai', 
                            text: `✅ **Note Added Successfully**\n\nI've added the following note to the project:\n\n"${actionData.content}"\n\nThis will appear in the project activity timeline.`,
                            isHtml: true 
                        }]);
                        setIsLoading(false);
                        return;
                    } else {
                        throw new Error(`Failed to add note: ${response.statusText}`);
                    }
                } catch (error) {
                    setMessages(prev => [...prev, { 
                        id: `ai-err-${Date.now()}`, 
                        sender: 'ai', 
                        text: `❌ Failed to add note: ${error.message}`,
                        isHtml: false 
                    }]);
                    setIsLoading(false);
                    return;
                }
            }

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
                        <div className="space-y-3">
                            <div className="flex flex-wrap justify-center gap-2">
                                <button onClick={() => handleAction('summarize', 'Summarize this project')} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800">
                                    <FileIcon className="w-4 h-4" />
                                    Summarize Project
                                </button>
                                <button onClick={() => handleAction('email', 'Draft a follow-up email')} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800">
                                    <MailIcon className="w-4 h-4" />
                                    Draft Follow-up Email
                                </button>
                                <button onClick={() => handleAction('insights', `Get market insights for ${project.fuelType}`)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-purple-700 bg-purple-100 rounded-lg hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-300 dark:hover:bg-purple-800">
                                    <NewspaperIcon className="w-4 h-4" />
                                    Market Insights
                                </button>
                            </div>
                            <div className="flex flex-wrap justify-center gap-2">
                                <button 
                                    onClick={() => {
                                        const stage = prompt('Enter new project stage (Lead, OPP, RFQ, Quote, PO, Order Confirmation, Won, Lost, Cancelled):');
                                        if (stage) {
                                            handleAction('update_project', `Update project stage to ${stage}`, {
                                                updates: { stage }
                                            });
                                        }
                                    }} 
                                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-orange-700 bg-orange-100 rounded-lg hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-300 dark:hover:bg-orange-800"
                                >
                                    <PencilIcon className="w-4 h-4" />
                                    Update Stage
                                </button>
                                <button 
                                    onClick={() => {
                                        const notes = prompt('Enter project notes to update:');
                                        if (notes) {
                                            handleAction('update_project', `Update project notes`, {
                                                updates: { notes }
                                            });
                                        }
                                    }} 
                                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-yellow-700 bg-yellow-100 rounded-lg hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-300 dark:hover:bg-yellow-800"
                                >
                                    <PencilIcon className="w-4 h-4" />
                                    Update Notes
                                </button>
                                <button 
                                    onClick={() => {
                                        const title = prompt('Enter task title:');
                                        if (title) {
                                            const priority = prompt('Enter priority (1=High, 2=Medium, 3=Low):', '2') || '2';
                                            handleAction('create_task', `Create task: ${title}`, {
                                                task: { title, priority: parseInt(priority) }
                                            });
                                        }
                                    }} 
                                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-lg hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-800"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    Create Task
                                </button>
                                <button 
                                    onClick={() => {
                                        const content = prompt('Enter note content:');
                                        if (content) {
                                            handleAction('add_note', `Add note: ${content.substring(0, 50)}...`, {
                                                content,
                                                type: 'note'
                                            });
                                        }
                                    }} 
                                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-teal-700 bg-teal-100 rounded-lg hover:bg-teal-200 dark:bg-teal-900 dark:text-teal-300 dark:hover:bg-teal-800"
                                >
                                    <FileIcon className="w-4 h-4" />
                                    Add Note
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};
