# API Integration Changes for Neel-Taylor Project

## Overview
The project has been updated to use the new `/chat` API endpoint structure with proper conversation history management and local storage.

## Key Changes Made

### 1. New API Structure
- **Endpoint**: Changed from `/chat?strem=true` to `/chat`
- **Request Format**: Now sends both `query` and `history` parameters
- **Response Handling**: Properly processes API responses and updates conversation history

### 2. Conversation History Management
- **Local Storage Keys**:
  - `neel-taylor-conversation-history`: Stores the conversation history in the required JSON format for API calls
  - `campaigner-chat-display`: Stores display messages for the UI
- **History Format**: Each message includes `role` ('user' or 'system') and `content`

### 3. API Request Structure
```json
{
  "query": "User's current message",
  "history": [
    {
      "role": "user",
      "content": "Previous user message"
    },
    {
      "role": "system", 
      "content": "Previous AI response"
    }
  ]
}
```

### 4. New Features Added
- **Export History**: Button to download conversation history as JSON file
- **Debug History**: Button to view stored conversation data in browser console
- **Proper History Persistence**: Conversation history is maintained across sessions

## How It Works

### 1. Message Flow
1. User types a message
2. Message is added to display messages and chat history
3. API request is sent with current query and full conversation history
4. AI response is received and added to both display and history
5. All data is automatically saved to localStorage

### 2. Local Storage Management
- **On Login**: Clears all previous chat data
- **On Logout**: Clears all chat data and authentication
- **On New Chat**: Resets both history and display messages
- **Automatic Saving**: Updates localStorage whenever messages or history change

### 3. File Upload Integration
- File uploads and URL fetching still work as before
- Uploaded content is automatically added to conversation history
- AI processes the uploaded content with full conversation context

## Testing the Integration

### 1. Check Console Logs
- Open browser developer tools
- Look for console logs showing API requests and responses
- Verify that the `query` and `history` parameters are being sent correctly

### 2. Verify Local Storage
- Use the "Debug History" button to view stored data
- Check localStorage in developer tools for the new keys
- Verify that conversation history is being maintained

### 3. Export Functionality
- Use the "Export History" button to download conversation data
- Verify that the exported JSON matches the required format

## API Endpoints Used

### Chat API
- **URL**: `https://neeltaylor.onrender.com/chat`
- **Method**: POST
- **Headers**: `Content-Type: application/json`
- **Body**: JSON with `query` and `history` parameters

### Upload API
- **URL**: `https://neeltaylor.onrender.com/upload`
- **Method**: POST
- **Body**: FormData with file

### Fetch API
- **URL**: `https://neeltaylor.onrender.com/fetch?url={encoded_url}`
- **Method**: GET

## Troubleshooting

### Common Issues
1. **API Not Responding**: Check if the endpoint is accessible
2. **History Not Saving**: Verify localStorage is enabled in browser
3. **Messages Not Persisting**: Check for JavaScript errors in console

### Debug Steps
1. Use "Debug History" button to view stored data
2. Check browser console for API request/response logs
3. Verify localStorage contents in developer tools
4. Test with a simple message to ensure basic functionality works

## Future Enhancements
- Add conversation search functionality
- Implement conversation tagging and categorization
- Add conversation analytics and insights
- Support for multiple conversation threads
- Real-time collaboration features
