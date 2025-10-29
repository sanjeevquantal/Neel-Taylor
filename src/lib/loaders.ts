import { LoaderFunctionArgs, LoaderFunction, redirect } from 'react-router-dom';
import apiClient, { NetworkError } from './api';

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
    const response = await apiClient.get<CampaignLoaderData>(`/api/campaigns/${campaignId}`);
    return response;
  } catch (error: any) {
    // If unauthorized, redirect to login/home which renders Login when not authenticated
    if (error instanceof NetworkError && error.httpStatus === 401) {
      throw redirect('/');
    }
    // Normalize 404 errors to a clean message
    if (error instanceof NetworkError && error.httpStatus === 404) {
      throw new Response('Campaign not found', { status: 404 });
    }
    // For other errors, re-throw as Response with concise message
    const message = error instanceof Error ? error.message : 'Failed to load campaign';
    const status = (error instanceof NetworkError && error.httpStatus) || error?.status || 500;
    throw new Response(message, { status });
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
    const response = await apiClient.get<ConversationLoaderData>(`/api/conversations/${conversationId}`);
    return response;
  } catch (error: any) {
    if (error instanceof NetworkError && error.httpStatus === 401) {
      throw redirect('/');
    }
    if (error instanceof NetworkError && error.httpStatus === 404) {
      throw new Response('Conversation not found', { status: 404 });
    }
    const message = error instanceof Error ? error.message : 'Failed to load conversation';
    const status = (error instanceof NetworkError && error.httpStatus) || error?.status || 500;
    throw new Response(message, { status });
  }
}
