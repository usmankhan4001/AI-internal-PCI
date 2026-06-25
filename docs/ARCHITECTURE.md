# System Architecture & Workflows

This document outlines the high-level architecture and execution flows of the PCI WhatsApp Bot V2.

## 1. Webhook & Message Lifecycle Flow
When a customer sends a message on WhatsApp, it passes through WAHA into our NestJS Webhook controller. We instantly fetch the user's conversational history to maintain memory.

```mermaid
sequenceDiagram
    participant User as WhatsApp User
    participant WAHA as WAHA Webhook
    participant Webhook as WhatsappController
    participant Session as SessionService
    participant AI as AiService
    
    User->>WAHA: "I am looking for an apartment"
    WAHA->>Webhook: POST /webhook/waha { body: "..." }
    Webhook->>Session: getOrCreateSession(phone)
    Session-->>Webhook: { userId, session, messages[] }
    Webhook->>Session: addMessage('user', text)
    
    Webhook->>AI: processMessage(text, history)
    AI-->>Webhook: { text: "...", file?: PDF }
    
    Webhook->>Session: addMessage('assistant', responseText)
    
    alt File exists
        Webhook->>WAHA: POST /api/sendFile (base64 buffer)
    end
    Webhook->>WAHA: POST /api/sendText (responseText)
    WAHA->>User: Delivery
```

## 2. LLM Orchestration Flow (AiService)
The `AiService` uses the Google Gemini 2.5 Flash model with **Function Calling (Tools)**. The model acts autonomously inside a `while` loop, invoking database connections as needed until it has enough data to formulate a final reply.

```mermaid
sequenceDiagram
    participant AI as AiService (Node.js)
    participant Gemini as Google Gemini API
    participant Tools as Local Methods (Bitrix/RAG/PDF)
    
    AI->>Gemini: sendMessage(history + prompt)
    
    loop Until Final Text Response
        Gemini-->>AI: functionCall { name: 'search_units', args: {...} }
        AI->>Tools: Execute Local Tool
        Tools-->>AI: return JSON data
        AI->>Gemini: sendMessage({ toolResponses: [...] })
    end
    
    Gemini-->>AI: text response "I found 3 units..."
```

## 3. Knowledge Base RAG Flow
When a user asks complex questions about a project's amenities, location, or FAQs, the Gemini model triggers the `get_project_info` tool. This performs a Semantic Search against the `pgvector` database.

```mermaid
sequenceDiagram
    participant AI as AiService
    participant Knowledge as KnowledgeService
    participant Gemini as Google Embedding Model
    participant DB as PostgreSQL (pgvector)
    
    AI->>Knowledge: search("Are there gyms in Box Park 3?")
    Knowledge->>Gemini: embedContent(text)
    Gemini-->>Knowledge: [0.023, 0.451, ...] (768 dimensions)
    
    Knowledge->>DB: SELECT * FROM DocumentChunk ORDER BY embedding <=> query_embedding LIMIT 5
    DB-->>Knowledge: Return top matching chunks
    
    Knowledge-->>AI: Formatted context string
```

## 4. Procedural PDF Generation Flow
When the bot negotiates a final unit, it generates a branded PDF using `pdf-lib` via the `generate_and_send_proposal` tool.

```mermaid
graph TD
    A[AiService triggered Tool] --> B[BitrixService.getNormalizedUnit]
    B -->|Returns Live Price & Area| C[PdfService.generatePaymentPlan]
    C -->|Draws Header & branding| D[pdf-lib canvas]
    D -->|Stamps Name, Price, Installments| E[Generate Buffer]
    E -->|Returns to Controller| F[WhatsappService.sendWahaFile]
    F -->|Converts to Base64| G[WAHA Delivery]
```
