import { LoaderFunctionArgs, LoaderFunction, redirect, defer } from 'react-router-dom';
import apiClient, { NetworkError } from './api';

// Types for loader data
export type CampaignLoaderData = {
  id: number;
  conversation_id?: number;
  status?: string;
  created_at?: string;
  tone?: string;
  leads?: Array<{ 
    id?: number; 
    email?: string; 
    name?: string; // Legacy field, prefer first_name + last_name
    first_name?: string;
    last_name?: string;
    job_title?: string;
    linkedin_url?: string;
  }>;
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

// Campaign loader function - using defer for non-blocking navigation
export const campaignLoader: LoaderFunction = async ({ params }) => {
  const campaignId = Number(params.id);
  
  if (!campaignId || Number.isNaN(campaignId)) {
    throw new Response('Campaign ID is required', { status: 400 });
  }

  // Defer the API call so navigation isn't blocked
  const campaignPromise = (async () => {
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
  })();

  return defer({
    campaign: campaignPromise
  });
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
