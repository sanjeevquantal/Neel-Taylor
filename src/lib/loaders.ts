import { LoaderFunctionArgs, LoaderFunction } from 'react-router-dom';
import apiClient from './api';

// Types for loader data
export type CampaignLoaderData = {
  id: number;
  conversation_id?: number;
  status?: string;
  created_at?: string;
  tone?: string;
  leads?: Array<{ id?: number; email?: string; name?: string }>;
  email_sequence?: {
    sequence_id?: number;
    campaign_id?: number;
    steps?: Array<{
      sequence_step_id?: number;
      step_number?: number;
      subject_line?: string;
      body_template?: string;
      created_at?: string;
    }>;
  };
};

export type ConversationLoaderData = {
  id: number;
  title?: string;
  lastMessage?: string;
  timestamp?: string;
  status?: string;
  messageCount?: number;
  persona?: string;
  tone?: string;
  tags?: string[];
  messages?: Array<{
    id: number;
    content: string;
    role: 'user' | 'assistant';
    timestamp: string;
  }>;
};

// Campaign loader function
export const campaignLoader: LoaderFunction<CampaignLoaderData> = async ({ params }) => {
  const campaignId = Number(params.id);
  
  if (!campaignId || Number.isNaN(campaignId)) {
    throw new Response('Campaign ID is required', { status: 400 });
  }

  try {
    const response = await apiClient.get<CampaignLoaderData>(`/campaigns/${campaignId}`);
    return response;
  } catch (error: any) {
    // If it's a 404, throw a Response object for React Router to handle
    if (error?.status === 404) {
      throw new Response('Campaign not found', { status: 404 });
    }
    // For other errors, re-throw as Response
    throw new Response(error?.message || 'Failed to load campaign', { 
      status: error?.status || 500 
    });
  }
}

// Conversation loader function
export const conversationLoader: LoaderFunction<ConversationLoaderData> = async ({ params }) => {
  const conversationId = Number(params.id);
  
  // console.log('conversationLoader called with params:', params);
  // console.log('conversationId:', conversationId);
  
  if (!conversationId || Number.isNaN(conversationId)) {
    // console.log('Invalid conversation ID, throwing 400');
    throw new Response('Conversation ID is required', { status: 400 });
  }

  try {
    const response = await apiClient.get<ConversationLoaderData>(`/conversations/${conversationId}`);
    return response;
  } catch (error: any) {
    if (error?.status === 404) {
      throw new Response('Conversation not found', { status: 404 });
    }
    throw new Response(error?.message || 'Failed to load conversation', {
      status: error?.status || 500
    });
  }
}
