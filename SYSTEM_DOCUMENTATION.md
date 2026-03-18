# Dexterous Chat UI — Complete System Documentation

## Table of Contents

- [1. System Overview](#1-system-overview)
- [2. Technology Stack](#2-technology-stack)
- [3. Architecture](#3-architecture)
- [4. Project Structure](#4-project-structure)
- [5. Routes & Pages](#5-routes--pages)
- [6. Component Reference](#6-component-reference)
- [7. Data Flow & Communication](#7-data-flow--communication)
- [8. WebSocket Streaming](#8-websocket-streaming)
- [9. Type System](#9-type-system)
- [10. Utility Functions](#10-utility-functions)
- [11. Services Layer](#11-services-layer)
- [12. Stores & State Management](#12-stores--state-management)
- [13. Caching System](#13-caching-system)
- [14. Scenarios & User Flows](#14-scenarios--user-flows)
- [15. All Functionalities (Detailed)](#15-all-functionalities-detailed)
- [16. Environment Configuration](#16-environment-configuration)
- [17. Backend API Endpoints](#17-backend-api-endpoints)
- [18. Styling & Design System](#18-styling--design-system)

---

## 1. System Overview

**Dexterous Chat UI** is an AI-powered conversational interface built as a SvelteKit web application. It enables users to interact with a backend AI agent through a real-time streaming chat interface that supports rich, structured content — including tables, buttons, dropdowns, radio buttons, checklists, code blocks, and more.

### What It Does

- Provides a **multi-conversation chat interface** where users can create, manage, switch between, and delete conversations.
- Sends user messages to a backend AI service and **renders AI responses in real-time** via WebSocket streaming.
- Supports **structured, interactive responses** — the AI can respond with tables (with row selection/deletion), action buttons (confirm/reject), dropdown menus, radio groups, checklists, code blocks, and more.
- Allows users to **select items from tables/lists** and confirm or reject them, sending those selections back to the backend.
- Includes an **MCP (Model Context Protocol) tool testing interface** for executing and testing backend MCP tools with health monitoring.
- Provides a **sidebar** for conversation navigation, with titles, dates, and delete functionality.

### Who It's For

- End users interacting with the Dexterous AI assistant for data discovery, entity definition, and structured data workflows.
- Developers testing MCP tool integrations via the dedicated MCP test page.

---

## 2. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | SvelteKit | 2.47.1 |
| UI Library | Svelte | 5 (runes: `$state`, `$props`, `$effect`) |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.1.14 |
| WebSocket | Socket.IO Client | 4.8.3 |
| Icons | @iconify/svelte | 5.1.0 |
| Bundler | Vite | via SvelteKit |
| Adapter | @sveltejs/adapter-node | Node.js server |
| Testing | Vitest + Playwright | Unit + E2E |
| Cache | Redis 5.10.0 / In-Memory | Server-side |

---

## 3. Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (Client)                        │
│                                                             │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │ Sidebar  │  │  Chat Page   │  │  MCP Test Page        │ │
│  │          │  │  (+page.svelte) │  │  (/mcp-test)         │ │
│  └────┬─────┘  └──────┬───────┘  └───────────┬───────────┘ │
│       │               │                       │             │
│       │    ┌──────────┴──────────┐            │             │
│       │    │ Message Components  │            │             │
│       │    │ (Message → Structured │           │             │
│       │    │  → Block Components)│            │             │
│       │    └──────────┬──────────┘            │             │
│       │               │                       │             │
│  ┌────┴───────────────┴───────────────────────┴──────────┐  │
│  │              ChatUtils / Stores / Services             │  │
│  └───────────────────┬────────────────────┬──────────────┘  │
│                      │                    │                  │
│           ┌──────────┴─────┐   ┌──────────┴─────┐          │
│           │  HTTP (fetch)  │   │  WebSocket      │          │
│           │  /api/server/* │   │  (Socket.IO)    │          │
│           └──────────┬─────┘   └──────────┬─────┘          │
└──────────────────────┼────────────────────┼─────────────────┘
                       │                    │
┌──────────────────────┼────────────────────┼─────────────────┐
│                SvelteKit Server (Node.js)                    │
│  ┌───────────────────┴──────────────┐     │                 │
│  │  API Routes (+server.ts)         │     │                 │
│  │  /api/server/chat                │     │                 │
│  │  /api/server/conversations       │     │                 │
│  │  /api/server/selections          │     │                 │
│  │  /api/mcp/definition             │     │                 │
│  │  /api/mcp/health                 │     │                 │
│  └───────────────────┬──────────────┘     │                 │
│                      │                    │                 │
│  ┌───────────────────┴──────────────┐     │                 │
│  │  Services (chat, conversation,   │     │                 │
│  │  mcp, common HTTP helpers)       │     │                 │
│  └───────────────────┬──────────────┘     │                 │
│                      │                    │                 │
│  ┌───────────────────┴──────────────┐     │                 │
│  │  Cache Layer (Redis / In-Memory) │     │                 │
│  └──────────────────────────────────┘     │                 │
└──────────────────────┬────────────────────┼─────────────────┘
                       │                    │
                       ▼                    ▼
              ┌────────────────────────────────────┐
              │       Backend API Server            │
              │   (http://localhost:2345/api/v1)    │
              │                                     │
              │  - /dexterous/chat/messages          │
              │  - /dexterous/conversations/*        │
              │  - /dexterous/chat/selections/*      │
              │  - /dexterous/mcp/*                  │
              │  - WebSocket Server (Socket.IO)      │
              └────────────────────────────────────┘
```

### Component Rendering Chain

```
+page.svelte
  └─→ Message.svelte (decides rendering path)
        ├─→ StructuredMessageContent.svelte (if StructuredResponse.blocks exists)
        │     ├─→ ButtonBlock.svelte
        │     ├─→ TableBlock.svelte
        │     ├─→ DropdownBlock.svelte
        │     ├─→ RadioBlock.svelte
        │     ├─→ ListBlock.svelte
        │     ├─→ ChecklistBlock.svelte
        │     ├─→ CodeBlock.svelte
        │     └─→ (link, unsupported types as fallback)
        │
        └─→ MessageContent.svelte (legacy parsed markdown path)
              ├─→ ButtonBlock.svelte
              ├─→ TableBlock.svelte
              ├─→ ListBlock.svelte
              ├─→ ChecklistBlock.svelte
              └─→ CodeBlock.svelte
```

### Communication Patterns

1. **HTTP Request-Response**: Client → SvelteKit API routes → Backend API (for sending messages, managing conversations, confirming selections)
2. **WebSocket Streaming**: Backend → Client directly via Socket.IO (for real-time AI response chunks)
3. **Dual Path**: Message is sent via HTTP; response is received via WebSocket streaming

---

## 4. Project Structure

```
src/
├── routes/
│   ├── +layout.svelte                    # Root layout (minimal)
│   ├── +page.svelte                      # Landing page
│   ├── user/[userId]/
│   │   ├── dexterous/
│   │   │   ├── +page.svelte              # Main chat interface (1400+ lines)
│   │   │   └── +page.server.ts           # Server-side data loading
│   │   └── mcp-test/
│   │       ├── +page.svelte              # MCP testing + chat interface
│   │       └── +page.server.ts           # Server-side data loading
│   └── api/
│       ├── server/
│       │   ├── chat/+server.ts           # POST /api/server/chat
│       │   ├── conversations/
│       │   │   ├── +server.ts            # GET/POST conversations
│       │   │   └── [conversationId]/
│       │   │       ├── +server.ts        # DELETE conversation
│       │   │       └── messages/+server.ts # GET messages
│       │   └── selections/+server.ts     # POST confirm/reject selections
│       ├── mcp/
│       │   ├── definition/+server.ts     # POST MCP tool execution
│       │   └── health/+server.ts         # GET MCP health check
│       └── services/
│           ├── common.ts                 # HTTP helper functions (get_, post_, delete_)
│           ├── chat.service.ts           # Chat message service
│           ├── conversation.service.ts   # Conversation CRUD service
│           └── mcp.service.ts            # MCP tool service
│
├── lib/
│   ├── components/
│   │   ├── Message.svelte                # Root message renderer
│   │   ├── MessageContent.svelte         # Legacy markdown content renderer
│   │   ├── StructuredMessageContent.svelte # Structured block renderer
│   │   ├── Sidebar.svelte                # Conversation navigation sidebar
│   │   ├── ConfirmDialog.svelte          # Reusable confirmation modal
│   │   ├── StructuredDataViewer.svelte   # Legacy data viewer (deprecated)
│   │   ├── Blocks/
│   │   │   ├── ButtonBlock.svelte        # Action buttons
│   │   │   ├── TableBlock.svelte         # Interactive data tables
│   │   │   ├── DropdownBlock.svelte      # Select dropdowns
│   │   │   ├── RadioBlock.svelte         # Radio button groups
│   │   │   ├── ListBlock.svelte          # Bullet lists
│   │   │   ├── ChecklistBlock.svelte     # Checklists with checkmarks
│   │   │   └── CodeBlock.svelte          # Code display with copy
│   │   └── mcp/
│   │       ├── McpToolSelector.svelte    # MCP tool tab selector
│   │       ├── McpToolForm.svelte        # Dynamic MCP tool form
│   │       ├── McpResultViewer.svelte    # MCP execution result viewer
│   │       ├── McpContentBlocks.svelte   # MCP content block renderer
│   │       ├── McpEntityTable.svelte     # Collapsible entity category tables
│   │       └── McpHealthStatus.svelte    # Health status badge
│   │
│   ├── types/
│   │   ├── chat.ts                       # Chat, Message, LLMUIBlock types
│   │   ├── chat.d.ts                     # Extended chat type declarations
│   │   ├── streaming.ts                  # WebSocket event & chunk types
│   │   ├── backendTypes.ts               # Backend content union types
│   │   ├── botTypes.ts                   # Conversation & bot config types
│   │   └── mcp.types.ts                  # MCP tool, form, execution types
│   │
│   ├── utils/
│   │   ├── ChatUtils.ts                  # Core chat functions (API, conversions, selections)
│   │   ├── chunkTransformer.ts           # Streaming chunk → LLMUIBlock converter
│   │   ├── responseTransformer.ts        # Backend response → StructuredResponse converter
│   │   ├── response.handler.ts           # Response formatting utilities
│   │   ├── markdownParser.ts             # Markdown → parsed blocks & back
│   │   ├── localStorage.ts              # Local storage helpers for selections
│   │   ├── mcpApi.ts                     # MCP API client functions
│   │   ├── mcpFormState.ts               # MCP tool configs, validation, form state
│   │   └── helper.ts                     # UUID utilities
│   │
│   ├── services/
│   │   └── websocket.service.ts          # WebSocket (Socket.IO) client service
│   │
│   ├── stores/
│   │   └── websocket.store.ts            # WebSocket reactive store
│   │
│   └── server/
│       └── cache/
│           ├── cache.interface.ts        # Cache interface definitions
│           ├── cache.types.ts            # Cache type definitions
│           ├── inmemory.cache.ts          # In-memory cache implementation
│           ├── redis.cache.ts             # Redis cache implementation
│           ├── cache.map.ts               # Map-based cache operations
│           ├── cache.strategies.ts        # LRU, LFU, FIFO, TTL strategies
│           ├── cache.monitor.ts           # Cache monitoring
│           └── request.response.cache.service.ts # Request/response caching
```

---

## 5. Routes & Pages

### 5.1 Landing Page (`/`)

**File**: `src/routes/+page.svelte`

**Purpose**: Brand identity page with navigation to main chat.

**What it does**:
- Displays the "Dexterous AI" logo and branding
- Shows a single "Go to Chat Page" button
- Navigates to `/user/74f22a5f-8ed2-45ce-af2e-ac4c32d824f4/dexterous` on click

**Functionalities**:
- `navigateToChat()` — uses SvelteKit's `goto()` for client-side navigation

---

### 5.2 Main Chat Page (`/user/[userId]/dexterous`)

**Files**: `+page.svelte` (1413 lines), `+page.server.ts`

**Purpose**: Primary AI chat interface with full conversation management and interactive content.

#### Server-Side Loading

- Receives `userId` from route params
- Fetches all conversations for that user via `getConversationsByUserId()`
- Returns `{ userId, conversations }` to the client
- Gracefully handles errors (returns empty conversations array)

#### Client-Side Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `USER_ID` | `74f22a5f-8ed2-45ce-af2e-ac4c32d824f4` | Hardcoded user identity |
| `REFERENCE_MESSAGE_ID` | `123e4567-e89b-12d3-a456-426655440000` | Message reference ID |
| `PROJECT_ID` | `df4c6df0-594a-4dcb-8754-49eead9743f3` | Project context ID |
| `WEBSOCKET_URL` | `http://localhost:2345` | WebSocket server URL |

#### State Variables

**Conversation State**:
- `conversations` — Full list of user's conversations (sorted by date)
- `selectedConversationId` — Currently active conversation
- `conversationTitles` — Map<string, string> for cached conversation titles
- `conversationsInitialized` — One-time initialization flag

**Message State**:
- `messages` — Array of Message objects in current conversation
- `newMessageText` — Current textarea input value

**UI State**:
- `sidebarOpen` — Sidebar visibility toggle
- `inputFocused` — Whether the text input has focus
- `showDeleteConfirm` — Delete confirmation dialog visibility
- `conversationToDelete` — ID of conversation pending deletion
- `deletingConversation` — Whether a delete operation is in progress
- `inputElement` — HTMLTextAreaElement reference
- `chatContainer` — Chat scroll container reference

**Streaming State**:
- `wsConnectionStatus` — `'connected' | 'connecting' | 'disconnected' | 'error'`
- `isStreaming` — Whether a streaming response is in progress
- `isLoading` — Whether awaiting any response
- `streamingMessageId` — ID of the message currently being streamed
- `streamingBlocks` — Accumulated LLMUIBlock[] during streaming
- `streamingProgress` — Progress percentage (0-100)
- `wsOwnsCurrentStream` — Mutex flag for WebSocket ownership
- `responseClaimedForCurrentRequest` — Mutex flag to prevent duplicate responses

**Content & Selection State**:
- `parsedMessageContent` — Map<messageId, parsedContent[]> for cached markdown parsing
- `selectionState` — Map<messageId, Map<blockIndex, SelectionState>> for table/list selections
- `selectionManager` — Selection manager instance with toggle/clear/getCount methods

---

### 5.3 MCP Test Page (`/user/[userId]/mcp-test`)

**Files**: `+page.svelte` (1233 lines), `+page.server.ts`

**Purpose**: Dual-purpose interface combining the full chat functionality with MCP tool testing.

#### Additional State (beyond chat state)

- `selectedTool` — Currently selected MCP tool name
- `healthStatus` — `'healthy' | 'unhealthy' | 'degraded' | 'unknown'`
- `isCheckingHealth` — Whether a health check is running
- `lastHealthCheck` — ISO timestamp of last health check
- `execution` — MCP execution state: `{ isLoading, result, error, executedAt, duration }`
- `activeTab` — `'chat' | 'mcp'` tab state

#### MCP-Specific Functions

- `refreshHealth()` — Calls `checkMcpHealth()`, updates health status badge
- `handleToolSelect(tool)` — Selects MCP tool, resets execution state
- `handleSubmit(toolName, params)` — Executes MCP tool, tracks duration, records result/error

#### UI Tabs

- **Chat Tab** — Identical chat interface to the main dexterous page
- **MCP Tools Tab** — Left: tool selector + form; Right: result viewer or empty state

---

## 6. Component Reference

### 6.1 Message.svelte

**Purpose**: Root message renderer that routes to structured or legacy rendering.

**Props**:
| Prop | Type | Description |
|------|------|-------------|
| `message` | `Message` | Message object with Role, Content, StructuredResponse |
| `userId` | `string` | User ID for avatar |
| `parsedContent` | `any[]` | Pre-parsed markdown blocks (legacy path) |
| `selectionState` | `any` | Selection state map |
| `onButtonAction` | `(button, messageId) => void` | Button click callback |
| `onDeleteRow` | `(messageId, blockIndex, rowIndex, rowData, entityType) => void` | Table row delete |
| `onDeleteItem` | `(messageId, blockIndex, itemIndex) => void` | List item delete |
| `onSaveSelected` | `(messageId, blockIndex, entityType) => void` | Save selected items |
| `onDropdownChange` | `(dropdown, selectedValue, messageId) => void` | Dropdown change |
| `onRadioChange` | `(radioGroup, selectedValue, messageId) => void` | Radio change |

**Rendering Logic**:
- **User messages**: Right-aligned, orange gradient bubble, raw text content
- **Assistant messages**: Left-aligned, glass-morphism card
  - If `StructuredResponse.blocks.length > 0` → renders `StructuredMessageContent`
  - Otherwise → renders `MessageContent` (legacy markdown path)

---

### 6.2 StructuredMessageContent.svelte

**Purpose**: Renders the modern `StructuredResponse.blocks` array with per-block type dispatch and streaming animations.

**Block Type Handling**:

| renderType | Rendered As | Notes |
|-----------|------------|-------|
| `text` | Parsed markdown blocks | Parsed via `parseMarkdown()` |
| `markdown` | Parsed markdown blocks | Same as text |
| `table` | `TableBlock` component | Reorders "Service Name" before "Status" |
| `list` | `ListBlock` component | Items mapped to `{text, indent: 0}` |
| `code` | `CodeBlock` component | With language detection |
| `json` | `CodeBlock` component | Language set to 'json' |
| `button` | `ButtonBlock` component | Supports Action, EntityType, payload |
| `dropdown` | `DropdownBlock` component | Interactive select menus |
| `radioButton` | `RadioBlock` component | Interactive radio groups |
| `link` | Styled anchor tag | Opens in new tab with external link icon |
| `form`, `datePicker`, `colorPicker`, etc. | `CodeBlock` fallback | Shows JSON of unsupported block |

**Streaming Animation**: Each block gets a staggered `animation-delay: {idx * 50}ms` with `blockAppear` keyframes (opacity 0→1, translateY 8px→0 over 0.3s).

---

### 6.3 MessageContent.svelte

**Purpose**: Legacy renderer for parsed markdown content blocks.

**Supported Block Types**: `h1`, `h2`, `h3`, `hr`, `code`, `table`, `checklist`, `list`, `buttons`, `p`

**Helper**: `detectEntityType(headers[])` — inspects headers to determine entity type (`'service'`, `'model'`, `'column'`, etc.)

---

### 6.4 ButtonBlock.svelte

**Purpose**: Renders action buttons with className-based styling.

**Button Structure**:
```typescript
{
  text: string           // Button label
  className: string      // 'btn-primary' | 'btn-secondary' | 'btn-secondaryy'
  action?: string        // Action type
  entityType?: string    // Entity context
  operation?: string     // Operation type
  payload?: any          // Additional data
}
```

**Styling**:
- `btn-primary` → Orange gradient with glow shadow
- `btn-secondary` → Transparent with white border

---

### 6.5 TableBlock.svelte

**Purpose**: Interactive data table with checkbox selection, select-all, row rejection, and save functionality.

**Props**:
| Prop | Type | Description |
|------|------|-------------|
| `block` | `{content: {headers[], rows[][]}}` | Table data |
| `messageId` | `number \| string` | Message context |
| `blockIndex` | `number` | Block position index |
| `selectionState` | `Map` | Selection tracking |
| `entityType` | `string` | `'service' \| 'model' \| 'column'` |
| `onDeleteRow` | `callback` | Row rejection handler |
| `onSaveSelected` | `callback` | Save selection handler |

**Features**:
- Header checkbox for select-all / deselect-all
- Per-row checkbox for individual selection
- Per-row reject (X) button on hover
- Rejected rows: greyed out, strikethrough, non-selectable
- Selection counter badge showing "N row(s) selected"
- "Save Selected" button (appears when rows are selected)
- Alternating row colors with hover effects

---

### 6.6 DropdownBlock.svelte

**Purpose**: Renders `<select>` dropdown menus with labels and onChange callbacks.

**Dropdown Structure**:
```typescript
{
  name: string
  label?: string
  options: { label: string, value: string, selected?: boolean }[]
  placeholder?: string
}
```

**Features**:
- Optional label above dropdown
- Custom chevron icon overlay
- Focus ring with orange accent
- Dark theme option styling

---

### 6.7 RadioBlock.svelte

**Purpose**: Renders radio button groups with visual selection state.

**RadioGroup Structure**:
```typescript
{
  name: string
  label?: string
  options: { label: string, value: string, checked?: boolean }[]
}
```

**Features**:
- Custom radio button appearance (no native styling)
- Selected option gets orange border and background tint
- Hover effect on each option
- Tracks selected values per group in `Map<string, string>`

---

### 6.8 CodeBlock.svelte

**Purpose**: Displays code with language label and copy-to-clipboard.

**Features**:
- Language label in header bar
- "Copy" button using `navigator.clipboard.writeText()`
- Monospace font, syntax-highlighted appearance (orange text on dark background)
- Horizontal scroll for long lines

---

### 6.9 ListBlock.svelte

**Purpose**: Renders bullet lists with indent support.

**Features**:
- Orange diamond bullet character ("◆")
- Indent-based padding (`item.indent * 1.5rem`)
- Inline formatting (bold, code) via `parseInlineFormatting()`

---

### 6.10 ChecklistBlock.svelte

**Purpose**: Renders checklists with visual completion state.

**Features**:
- Disabled checkboxes (display-only, not interactive)
- Checked items: muted color + strikethrough
- Unchecked items: normal white text

---

### 6.11 Sidebar.svelte

**Purpose**: Conversation navigation panel.

**Features**:
- Animated open/close (width transition 0→360px)
- "New Chat" button with orange gradient
- "RECENT CONVERSATIONS" section header
- Per-conversation entry:
  - 💬 emoji icon
  - Title (truncated to 30 chars)
  - Relative date (e.g., "5 minutes ago", "Yesterday")
  - Selected state highlight
  - Delete button (red, appears on hover)
- Loading state ("Loading...")
- Empty state ("No conversations yet")
- User profile footer with avatar and truncated user ID

---

### 6.12 ConfirmDialog.svelte

**Purpose**: Reusable modal confirmation dialog.

**Props**:
| Prop | Type | Default |
|------|------|---------|
| `open` | `boolean` | — |
| `title` | `string` | `'Confirm Action'` |
| `message` | `string` | `'Are you sure you want to proceed?'` |
| `confirmText` | `string` | `'Confirm'` |
| `cancelText` | `string` | `'Cancel'` |
| `isLoading` | `boolean` | `false` |
| `variant` | `'danger' \| 'warning' \| 'info'` | `'danger'` |
| `onConfirm` | `() => void \| Promise<void>` | — |
| `onCancel` | `() => void` | — |

**Features**:
- Backdrop blur overlay
- Escape key to cancel
- Backdrop click to cancel
- Async confirm support (button disables during async operation)
- Variant-based confirm button color (red/yellow/blue)

---

### 6.13 MCP Components

| Component | Purpose |
|-----------|---------|
| `McpToolSelector` | Tab-like selector for 5 MCP tools with icons and descriptions |
| `McpToolForm` | Dynamic form generator based on tool config (text, textarea, number, boolean, JSON fields) |
| `McpResultViewer` | Result display with tool-specific views, raw JSON toggle, copy/duration info |
| `McpContentBlocks` | Renders DefinitionContentItem blocks (code/text detection) |
| `McpEntityTable` | Collapsible entity category tables (services, models, columns, relations, enums) |
| `McpHealthStatus` | Health status badge with auto-refresh, status dot, last-checked timestamp |

**Available MCP Tools**:
1. `define_entities` — Define entities in the system
2. `get_conversation_history` — Retrieve conversation history
3. `search_conversations` — Search across conversations
4. `get_project_context` — Get project context data
5. `get_cache_summary` — Get cache summary statistics

---

## 7. Data Flow & Communication

### 7.1 Sending a Message

```
User types message → clicks Send (or Enter key)
  │
  ├─ 1. addUserMessage(content) → pushes User message to UI immediately
  │
  ├─ 2. ensureConversation() → creates conversation if needed
  │
  ├─ 3. POST /api/server/chat (HTTP)
  │     Body: { conversationId, message, userId, referenceMessageId }
  │     │
  │     └─→ SvelteKit server calls sendMessageToMastra()
  │         │
  │         └─→ POST {BACKEND_API_URL}/dexterous/chat/messages
  │             Body: { ConversationId, UserId, ReferenceMessageId, Channel: 'web', Contents: [...] }
  │
  └─ 4. Response comes back via WebSocket (not HTTP response body)
        │
        ├─ stream-start → creates empty assistant message placeholder
        ├─ stream-chunk (N times) → accumulates blocks into message
        └─ stream-end → finalizes message with text + structured blocks
```

### 7.2 Selection Confirmation Flow

```
User selects table rows (checkboxes)
  │
  ├─ User clicks "Confirm" button
  │     │
  │     └─ handleButtonAction(button, messageId)
  │          │
  │          ├─ collectSelectedItems(messageId) → gathers selected row data
  │          │
  │          └─ confirmSelections({ conversationId, projectId, entityType, selectedItems, action: 'confirm' })
  │               │
  │               └─ POST /api/server/selections
  │                    │
  │                    └─→ POST {BACKEND_API_URL}/dexterous/chat/selections/confirm
  │
  └─ OR User clicks "Reject" button
        │
        └─ confirmSelections({ ...action: 'reject' })
             │
             └─→ POST {BACKEND_API_URL}/dexterous/chat/selections/reject
```

### 7.3 Dropdown / Radio Selection Flow

```
User selects dropdown option / radio button
  │
  ├─ handleDropdownChange(dropdown, value, messageId)
  │   OR handleRadioChange(radioGroup, value, messageId)
  │
  ├─ Builds descriptive message: "Selected [label]: [value]"
  │
  └─ sendChatMessage(conversationId, message, userId, referenceMessageId, { type: action, payload: {...} })
       │
       └─ Response via WebSocket streaming (same as regular message)
```

### 7.4 Table Row Deletion Flow

```
User clicks reject (X) button on table row
  │
  ├─ TableBlock marks row as rejected (optimistic UI)
  │
  └─ handleDeleteTableRow(messageId, blockIndex, rowIndex, rowData, entityType)
       │
       └─ confirmSelections({ selectedItems: [rowData], action: 'reject', entityType })
            │
            └─→ POST {BACKEND_API_URL}/dexterous/chat/selections/reject
```

---

## 8. WebSocket Streaming

### 8.1 Connection Lifecycle

```
onMount()
  │
  ├─ websocketService.connect(WEBSOCKET_URL, callbacks)
  │     │
  │     ├─ Creates Socket.IO connection (transports: ['websocket', 'polling'])
  │     └─ Sets up event listeners
  │
  ├─ On 'connect' event:
  │     ├─ wsConnectionStatus = 'connected'
  │     └─ Auto-rejoin conversation room if one was selected
  │
  ├─ On 'disconnect' event:
  │     └─ wsConnectionStatus = 'disconnected'
  │
  └─ On 'connect_error' event:
        ├─ wsConnectionStatus = 'error'
        └─ Auto-reconnect (up to 5 attempts, 1s delay)
```

### 8.2 Streaming Event Handlers

| Event | Handler | What It Does |
|-------|---------|-------------|
| `stream-start` | `handleStreamStart` | Creates placeholder assistant message, sets streaming flags |
| `stream-chunk` | `handleStreamChunk` | Converts chunk to LLMUIBlock, appends to streaming message's blocks |
| `stream-end` | `handleStreamEnd` | Finalizes message text + blocks, parses markdown, clears streaming state |
| `stream-error` | `handleStreamError` | Shows error in message, clears streaming state |
| `message` | (complete message) | Handles non-streaming complete messages |

### 8.3 Deduplication System

The WebSocket service prevents duplicate processing:
- `activeStreamMessageId` — Tracks the current stream's message ID; ignores duplicate `stream-start` events
- `processedChunkSequences` — Set of processed chunk sequence numbers; ignores duplicate chunks
- `wsOwnsCurrentStream` — Mutex flag; only the first claimed stream-start processes subsequent chunks/end

### 8.4 Streaming UI Indicators

- **Connection Badge** (top-right corner):
  - Green dot + "Live" = connected
  - Yellow pulsing dot + "Connecting..." = connecting
  - Red dot + "Error" = error
  - Gray dot + "Offline" = disconnected
- **Loading Indicator**: 3 bouncing dots when `isLoading && !isStreaming`
- **Progress Bar**: Blue gradient bar showing `streamingProgress%` when streaming

---

## 9. Type System

### 9.1 Core Chat Types

```typescript
// Render types for UI blocks
type RenderType = 'text' | 'markdown' | 'table' | 'list' | 'code' | 'json'
                | 'button' | 'dropdown' | 'radioButton' | 'link'
                | 'form' | 'datePicker' | 'colorPicker' | 'fileUploader'
                | 'progressBar' | 'toggleSwitch' | 'slider'

// A single UI block from the AI response
interface LLMUIBlock {
  datatype: 'text' | 'json'
  format: 'text' | 'markdown' | 'object' | 'objectArray'
  renderType: RenderType
  content: string | number | Record<string, any> | Array<Record<string, any>>
}

// A chat message
interface Message {
  id: number | string
  Content: string
  Role: 'User' | 'Assistant'
  StructuredResponse?: { blocks: LLMUIBlock[] }
}
```

### 9.2 Streaming Types

```typescript
interface StreamStartEvent { messageId: string; conversationId: string; userId: string; totalChunks?: number; timestamp: string }
interface StreamChunkEvent { messageId: string; conversationId: string; userId: string; chunk: { sequence: number; totalChunks: number; content: any }; timestamp: string }
interface StreamEndEvent   { messageId: string; conversationId: string; userId: string; totalChunks: number; timestamp: string }
interface StreamErrorEvent { messageId: string; conversationId: string; userId: string; error: string; timestamp: string }

// Chunk categories
enum ChunkType {
  // Text: introduction, description, explanation, closing
  // Data: table, two_column_table, list, code, json_view
  // Interactive: button, button_group, dropdown, radio, checkbox, form, link
  // Input: date_picker, color_picker, file_uploader, slider, toggle
  // Status: progress, error, success, warning
  // Next Steps: next_steps
}
```

### 9.3 Backend Content Types

```typescript
// Content union — multiple content formats from the backend
type Content =
  | TextContent       // { type: 'text', data: { text, format?, style? } }
  | TableContent      // { type: 'table', data: { headers, rows, pagination?, style? } }
  | ChartContent      // { type: 'chart', data: { chartType, title, datasets, labels } }
  | CodeContent       // { type: 'code', data: { code, language, filename?, copyable? } }
  | ListContent       // { type: 'list', data: { items, listType, interactive? } }
  | FormContent       // { type: 'form', data: { fields, submitText?, cancelText? } }
  | ImageContent      // { type: 'image', data: { url?, base64?, alt?, caption? } }
  | FileContent       // { type: 'file', data: { filename, url?, mimeType, size? } }
  | InteractiveContent // { type: 'interactive', data: { interactiveType, options, title? } }
```

### 9.4 MCP Types

```typescript
type McpToolName = 'define_entities' | 'get_conversation_history' | 'search_conversations'
                 | 'get_project_context' | 'get_cache_summary'

interface McpExecutionState {
  isLoading: boolean
  result: McpApiResponse | null
  error: string | null
  executedAt: string | null    // ISO timestamp
  duration: number | null      // milliseconds
}

interface McpFieldConfig {
  name: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'json'
  required: boolean
  placeholder?: string
  defaultValue?: any
  description?: string
}
```

---

## 10. Utility Functions

### 10.1 ChatUtils.ts — Core Chat Functions

| Function | Signature | Purpose |
|----------|-----------|---------|
| `apiCall` | `(url, options?) → Promise<any>` | Generic fetch with JSON headers |
| `sendChatMessage` | `(conversationId, message, userId, refId, action?) → Promise` | Send message via HTTP |
| `createConversation` | `(projectId, userId) → Promise` | Create new conversation |
| `fetchConversationMessages` | `(conversationId, userId?) → Promise` | Fetch messages for conversation |
| `deleteConversationAPI` | `(conversationId, userId?) → Promise` | Delete a conversation |
| `confirmSelections` | `(payload) → Promise` | Confirm or reject item selections |
| `extractAssistantContent` | `(result) → string` | Extract text from any backend response shape |
| `extractTextFromBotResponseArray` | `(botResponses[]) → string` | Join text parts from bot responses |
| `extractFirstUserMessage` | `(message) → string` | Get first user message from various formats |
| `buildAssistantMessageFromResult` | `(result, customId?) → Message \| null` | Convert backend response to UI Message |
| `convertBackendMessageToUIMessage` | `(backendMsg) → Message[]` | Convert backend message pair to UI messages |
| `createSelectionState` | `() → SelectionManager` | Create selection state manager |
| `sortConversations` | `(conversations) → Conversation[]` | Sort by creation date descending |
| `extractConversationId` | `(result) → string \| null` | Extract conversation ID from response |
| `extractConversationTitle` | `(conversation) → string \| null` | Extract title from conversation object |
| `extractConversationTitles` | `(conversations, fetchFn?) → Promise<Map>` | Build title map with message fetch fallback |
| `truncateText` | `(text, maxLength) → string` | Truncate with "..." |
| `truncateUUID` | `(uuid, length) → string` | Truncate UUID |
| `formatDate` | `(dateString) → string` | Relative date ("Just now", "5 min ago", "Yesterday", etc.) |
| `stripMarkdownCodeBlock` | `(text) → string` | Remove markdown code block wrappers |

### 10.2 chunkTransformer.ts — Streaming Chunk Processing

| Function | Purpose |
|----------|---------|
| `convertChunkToBlock(chunk)` | Convert ResponseChunk → LLMUIBlock |
| `convertBotResponseItemToBlock(item)` | Convert BotResponseItem → LLMUIBlock |
| `normalizeDataType(backendType)` | Map backend data type → `'text' \| 'json'` |
| `normalizeFormat(backendFormat)` | Map backend format → FormatType |
| `normalizeRenderType(type, format, chunkType)` | Map backend render type → RenderType (with ChunkType fallback) |
| `mapChunkTypeToRenderType(chunkType, format)` | Map 27+ ChunkType enum values → RenderType |
| `accumulateBlocks(existing, newBlock)` | Append block to array |

### 10.3 responseTransformer.ts — Response Processing

| Function | Purpose |
|----------|---------|
| `transformBackendResponseToStructured(response)` | Main transformer: backend response → StructuredResponse |
| `convertBotResponseToBlock(botResponse)` | Single BotResponse → LLMUIBlock |
| `convertContentItemToBlock(contentItem)` | Content union type → LLMUIBlock |
| `convertTextContentToBlock(content)` | TextContent → LLMUIBlock |
| `convertTableContentToBlock(content)` | TableContent → LLMUIBlock (maps rows to keyed objects) |
| `convertListContentToBlock(content)` | ListContent → LLMUIBlock |
| `convertCodeContentToBlock(content)` | CodeContent → LLMUIBlock |
| `convertInteractiveContentToBlock(content)` | InteractiveContent → LLMUIBlock |

### 10.4 markdownParser.ts — Markdown Processing

| Function | Purpose |
|----------|---------|
| `parseMarkdown(md)` | Parse markdown string → array of typed blocks |
| `parseTable(lines)` | Parse markdown table lines → `{headers, rows}` |
| `parseInlineFormatting(text)` | Convert `**bold**` and `` `code` `` to HTML |
| `reconstructMarkdown(blocks)` | Parsed blocks → markdown string |
| `deleteTableRowFromBlocks(blocks, blockIdx, rowIdx)` | Remove a row from parsed table |
| `deleteListItemFromBlocks(blocks, blockIdx, itemIdx)` | Remove an item from parsed list |
| `extractButtons(text)` | Extract `<button>` elements from markdown text |
| `extractRadioGroups(text)` | Extract radio group divs from markdown text |
| `extractDropdowns(text)` | Extract `<select>` elements from markdown text |

### 10.5 response.handler.ts

| Function | Purpose |
|----------|---------|
| `ResponseHandler.success(response)` | Create HTTP Response with mapped status code |
| `ResponseHandler.parseBackendResponse(response)` | Extract text from various response shapes |
| `ResponseHandler.processBackendResponseToMessage(response)` | Convert to Message with optional StructuredResponse |
| `ResponseHandler.handleError(httpCode, data?, error?)` | Format error HTTP Response |

### 10.6 localStorage.ts

| Function | Purpose |
|----------|---------|
| `loadFromLocalStorage(key)` | Load conversation data map |
| `saveToLocalStorage(key, data)` | Save conversation data map |
| `getConversationData(key, conversationId)` | Get single conversation data |
| `saveConversationData(key, conversationId, data)` | Save single conversation data |
| `addSelectedItems(key, conversationId, items)` | Merge new selections (deduplicates) |
| `removeSelectedItems(key, conversationId, messageId, blockIdx)` | Remove specific selections |
| `clearSelectedItems(key, conversationId)` | Clear all selections for conversation |

### 10.7 MCP Utilities

| Function | Location | Purpose |
|----------|----------|---------|
| `executeMcpTool(tool, params)` | mcpApi.ts | Execute MCP tool via API |
| `checkMcpHealth()` | mcpApi.ts | Check MCP service health |
| `getToolConfig(toolName)` | mcpFormState.ts | Get field configurations for tool |
| `getDefaultValues(toolName, userId?)` | mcpFormState.ts | Get default form values |
| `validateFormValues(toolName, values)` | mcpFormState.ts | Validate required/number/JSON fields |
| `buildRequestParams(toolName, values)` | mcpFormState.ts | Clean and build request params |

---

## 11. Services Layer

### 11.1 WebSocket Service (`src/lib/services/websocket.service.ts`)

**Class**: `WebSocketService`

**Properties**:
- `socket: Socket | null` — Socket.IO client instance
- `currentConversationId: string | null` — Currently joined room
- `reconnectAttempts: number` — Current retry count (max 5)
- `reconnectDelay: number` — Delay between retries (1000ms)
- `activeStreamMessageId: string | null` — Deduplication tracking
- `processedChunkSequences: Set<number>` — Chunk deduplication

**Methods**:
| Method | Description |
|--------|------------|
| `connect(serverUrl, callbacks?)` | Initialize Socket.IO connection with transport config |
| `setupEventListeners()` | Register handlers for connect/disconnect/stream events |
| `joinConversation(conversationId)` | Emit `join-conversation` to server |
| `leaveConversation(conversationId)` | Emit `leave-conversation` to server |
| `getStreamingMessage()` | Get current streaming message state |
| `clearStreamingMessage()` | Reset streaming state |
| `isStreaming()` | Check if actively streaming |
| `isConnected()` | Check connection status |
| `disconnect()` | Clean disconnect and reset |

### 11.2 Chat Service (`src/routes/api/services/chat.service.ts`)

```typescript
sendMessageToMastra(conversationId, message, userId, referenceMessageId, action?)
```
- Builds `Contents` array: `[{ type: 'text', data: { text: message } }]`
- If action provided, adds interactive content item with action metadata
- POSTs to `{BACKEND_API_URL}/dexterous/chat/messages`
- Includes `x-user-id` header

### 11.3 Conversation Service (`src/routes/api/services/conversation.service.ts`)

| Function | Endpoint | Description |
|----------|----------|-------------|
| `getConversationsByUserId(userId)` | GET `/dexterous/conversations/search?userId=...` | List all conversations |
| `getConversationMessages(conversationId, userId)` | GET `/dexterous/chat/conversations/{id}/messages` | Get messages |
| `getConversationMessagesById(conversationId, userId?)` | GET `/dexterous/chat/conversations/{id}/messages` | Get messages (alternate) |
| `createConversation(projectId, userId)` | POST `/dexterous/conversations` | Create new conversation |
| `deleteConversation(conversationId, userId?)` | DELETE `/dexterous/conversations/{id}` | Delete conversation |

**Note**: Handles multiple backend response shapes (Data.Items, Data[], root array, data.Items, etc.)

### 11.4 Common HTTP Helpers (`src/routes/api/services/common.ts`)

| Function | Description |
|----------|-------------|
| `post_(url, bodyObj)` | POST without auth header |
| `post__(url, bodyObj, userId?)` | POST with optional `x-user-id` header |
| `get_(url, extraHeaders?)` | GET with optional headers |
| `delete_(url, extraHeaders?)` | DELETE with 204 No Content handling |

All functions: log request/response, throw SvelteKit errors on fetch failure.

---

## 12. Stores & State Management

### 12.1 WebSocket Store (`src/lib/stores/websocket.store.ts`)

Svelte writable store wrapping WebSocket state:

**Derived Stores**:
| Store | Type | Description |
|-------|------|-------------|
| `connectionStatus` | `ConnectionStatus` | Current connection state |
| `isConnected` | `boolean` | Whether connected |
| `isStreaming` | `boolean` | Whether actively streaming |
| `streamingBlocks` | `LLMUIBlock[]` | Current streaming blocks |
| `streamingProgress` | `number` | 0-100 progress |

**Methods**: `connect`, `disconnect`, `joinConversation`, `leaveConversation`, `clearStreamingMessage`, `reset`

### 12.2 Selection State Manager

Created via `createSelectionState()` in ChatUtils.ts:

```typescript
// Internal structure: Map<messageId, Map<blockIndex, { type, selected: Set<number> }>>

selectionManager.get(messageId, blockIndex, itemType)     // Get selection set
selectionManager.toggle(messageId, blockIndex, itemIndex)  // Toggle single item
selectionManager.isSelected(messageId, blockIndex, itemIndex) // Check if selected
selectionManager.toggleAll(messageId, blockIndex, totalItems) // Toggle all
selectionManager.getCount(messageId, blockIndex)           // Count selected
selectionManager.clear()                                   // Clear all
selectionManager.getState()                                // Get full state map
```

---

## 13. Caching System

**Location**: `src/lib/server/cache/`

### Cache Types

| Implementation | File | Description |
|---------------|------|-------------|
| In-Memory | `inmemory.cache.ts` | Map-based cache for development |
| Redis | `redis.cache.ts` | Redis-backed cache for production |
| Request/Response | `request.response.cache.service.ts` | Caches API request/response pairs |

### Cache Strategies

| Strategy | Description |
|----------|-------------|
| LRU | Least Recently Used eviction |
| LFU | Least Frequently Used eviction |
| FIFO | First In, First Out eviction |
| TTL | Time-To-Live expiration |

### Configuration (via `.env`)

```
SESSION_CACHE_TYPE=in-memory    # or 'redis'
SESSION_CACHE_HOST=http://localhost
SESSION_CACHE_PORT=6379
SESSION_CACHE_PASSWORD=inflection123
REQUEST_CACHE_TYPE=in-memory    # or 'redis'
```

**Note**: Caching is currently disabled in conversation service (commented out).

---

## 14. Scenarios & User Flows

### Scenario 1: First Visit — Starting a New Chat

1. User lands on `/` → sees "Dexterous AI" branding
2. Clicks "Go to Chat Page" → navigated to `/user/{userId}/dexterous`
3. Server loads existing conversations (empty for first visit)
4. Welcome screen: "Welcome to Dexterous AI" with instruction text
5. WebSocket connects → status indicator shows "Live" (green)
6. User types a message and hits Enter
7. `ensureConversation()` creates a new conversation
8. User message appears immediately (right-aligned, orange bubble)
9. Loading dots appear while waiting for response
10. WebSocket `stream-start` → empty assistant message placeholder appears
11. Chunks arrive → blocks render progressively with staggered animation
12. `stream-end` → message finalized, progress bar disappears
13. Conversation appears in sidebar with title from first message

### Scenario 2: Resuming an Existing Conversation

1. User visits chat page
2. Server loads all conversations
3. Auto-selects the latest conversation
4. Fetches messages via API
5. Converts backend messages to UI format
6. Renders all messages (user + assistant) in chat area
7. Joins WebSocket room for real-time updates
8. User can continue chatting

### Scenario 3: Switching Between Conversations

1. User clicks a different conversation in sidebar
2. Current WebSocket room is left
3. Messages cleared, new messages fetched
4. New WebSocket room joined
5. Chat area shows messages from selected conversation

### Scenario 4: AI Responds with a Data Table

1. AI sends a structured response with `renderType: 'table'`
2. TableBlock renders with headers and rows
3. Each row has a checkbox and a reject button
4. User can:
   - Check individual rows
   - Use "Select All" checkbox
   - Click reject (X) to remove rows
   - See selection count badge
   - Click "Save Selected" to confirm

### Scenario 5: Confirming Selected Table Rows

1. User selects rows via checkboxes
2. AI response also includes a "Confirm" button (`btn-primary`)
3. User clicks "Confirm"
4. `handleButtonAction()` collects selected items via `collectSelectedItems()`
5. Sends POST to `/api/server/selections` with `action: 'confirm'`
6. Backend receives confirmed entities
7. Streaming response comes back via WebSocket with next step

### Scenario 6: Rejecting Selections

1. User clicks "Reject" button or individual row reject buttons
2. For button: sends all items with `action: 'reject'`
3. For individual row: row is visually greyed out + strikethrough, sent to backend as reject
4. Backend processes rejection

### Scenario 7: Interacting with Dropdown Menus

1. AI responds with a dropdown block (e.g., "Select a database")
2. DropdownBlock renders a styled `<select>` with options
3. User selects an option
4. `handleDropdownChange()` builds message: "Selected [label]: [value]"
5. Sends as chat message with action payload
6. AI responds to the selection via streaming

### Scenario 8: Interacting with Radio Buttons

1. AI responds with radio button groups (e.g., "Choose operation type")
2. RadioBlock renders styled radio options
3. User clicks an option
4. `handleRadioChange()` builds message: "Selected [label]: [option label]"
5. Sends as chat message with action payload
6. AI responds accordingly

### Scenario 9: AI Responds with Code

1. AI sends a `renderType: 'code'` block
2. CodeBlock renders with language label, monospace formatting, and dark background
3. User can click "Copy" to copy code to clipboard

### Scenario 10: AI Responds with Buttons

1. AI sends button blocks (e.g., "Confirm Services", "Reject All")
2. ButtonBlock renders styled buttons (primary = orange gradient, secondary = bordered)
3. User clicks a button → triggers `handleButtonAction()` with button metadata

### Scenario 11: AI Responds with Mixed Content

1. AI sends multiple blocks: text + table + buttons + dropdown
2. StructuredMessageContent renders each block in sequence
3. Each block appears with a 50ms staggered animation
4. User can interact with each block independently

### Scenario 12: Deleting a Conversation

1. User hovers over a conversation in sidebar → red delete button appears
2. Clicks delete → ConfirmDialog opens with "Delete Conversation" title
3. Warning: "This action cannot be undone."
4. User clicks "Confirm" (red button)
5. API call to delete conversation
6. Conversation removed from sidebar
7. If deleted conversation was active, chat area clears

### Scenario 13: Creating a New Chat

1. User clicks "New Chat" button in sidebar
2. Previous WebSocket room is left
3. New conversation created via API
4. All message state cleared
5. New conversation appears at top of sidebar
6. New WebSocket room joined
7. Chat area shows empty welcome state

### Scenario 14: WebSocket Connection Loss

1. Socket.IO connection drops
2. Status indicator changes to "Offline" (gray) or "Error" (red)
3. Auto-reconnect attempts (up to 5 times, 1s delay)
4. If reconnected: status returns to "Live", auto-rejoins conversation room
5. If all retries fail: stays in error state, user can still send messages via HTTP

### Scenario 15: Streaming Error

1. During streaming, backend sends `stream-error` event
2. `handleStreamError()` receives error
3. Streaming stops, progress bar removed
4. Error message displayed in assistant message bubble
5. Streaming state cleaned up, ready for next message

### Scenario 16: MCP Tool Testing

1. User navigates to `/user/{userId}/mcp-test`
2. Switches to "MCP Tools" tab
3. Selects a tool (e.g., `define_entities`)
4. Fills in the dynamic form (text/number/boolean/JSON fields)
5. Clicks "Execute"
6. Loading spinner shows during execution
7. Results displayed in McpResultViewer:
   - For `define_entities`: content blocks + entity tables
   - For `get_conversation_history`: message list with role badges
   - For `search_conversations`: conversation card grid
   - For `get_project_context`: property grid + cache table
   - For `get_cache_summary`: summary counts grid
8. Can toggle "Raw JSON" view
9. Can copy results to clipboard

### Scenario 17: MCP Health Monitoring

1. McpHealthStatus badge shown on MCP test page
2. Status dot: green (healthy), yellow (degraded), red (unhealthy), gray (unknown)
3. Click refresh button → calls `/api/mcp/health`
4. Updates status and "last checked" timestamp
5. Pulsing animation during health check

### Scenario 18: Markdown in AI Responses

1. AI sends text/markdown blocks
2. `parseMarkdown()` processes content into typed blocks:
   - Headers (h1, h2, h3) → styled headings
   - Horizontal rules → dividers
   - Tables → TableBlock
   - Checklists → ChecklistBlock
   - Lists → ListBlock
   - Code blocks → CodeBlock
   - Paragraphs → styled text with inline bold/code
3. Interactive elements extracted from markdown:
   - `<button>` tags → ButtonBlock
   - Radio group divs → RadioBlock
   - `<select>` elements → DropdownBlock

### Scenario 19: List Item Deletion

1. AI responds with a list block
2. User triggers delete on a list item
3. `handleDeleteListItem()` removes item from parsed markdown
4. Content reconstructed and message updated

### Scenario 20: Keyboard Shortcuts

1. **Enter** → Send message
2. **Shift+Enter** → New line in message
3. **Escape** → Close confirmation dialog

---

## 15. All Functionalities (Detailed)

### Chat Functionalities

| # | Functionality | Description |
|---|-------------|-------------|
| 1 | Send text message | Type in textarea, press Enter or click Send button |
| 2 | Multiline input | Shift+Enter adds a new line without sending |
| 3 | Auto-resize textarea | Textarea grows from 60px to max 200px based on content |
| 4 | Real-time streaming | AI responses stream in block-by-block via WebSocket |
| 5 | Streaming progress bar | Visual progress indicator during streaming |
| 6 | Loading animation | 3 bouncing dots while waiting for response |
| 7 | Connection status indicator | Real-time WebSocket status badge (Live/Connecting/Error/Offline) |
| 8 | Auto-scroll | Chat auto-scrolls to bottom on new messages |
| 9 | Smooth scroll animation | Uses requestAnimationFrame + smooth behavior |
| 10 | Message timestamps | Each message shows formatted timestamp |
| 11 | User avatar | Gradient avatar with user icon for user messages |
| 12 | Assistant avatar | Gradient avatar with layers icon for AI messages |
| 13 | Markdown rendering | AI text parsed to headings, tables, lists, code, etc. |
| 14 | Inline formatting | Bold (`**text**`) and inline code (`` `code` ``) in all text |
| 15 | Fade-in animation | Messages appear with fadeInUp animation |
| 16 | Block stagger animation | Structured blocks appear with 50ms staggered delay |

### Conversation Management

| # | Functionality | Description |
|---|-------------|-------------|
| 17 | Create new conversation | "New Chat" button creates conversation via API |
| 18 | Switch conversations | Click sidebar item to switch |
| 19 | Delete conversation | Delete button + confirmation dialog |
| 20 | Delete confirmation modal | Danger-variant modal with cancel option |
| 21 | Auto-select latest | On page load, automatically selects most recent conversation |
| 22 | Conversation titles | Derived from first user message, cached in Map |
| 23 | Conversation date display | Relative dates (Just now, 5 min ago, Yesterday, etc.) |
| 24 | Title truncation | Long titles truncated to 30 characters with "..." |
| 25 | Sorted conversation list | Conversations sorted by creation date (newest first) |
| 26 | Loading state | "Loading..." shown while fetching conversations |
| 27 | Empty state | "No conversations yet" when list is empty |
| 28 | WebSocket room management | Joins/leaves conversation rooms on switch |

### Sidebar

| # | Functionality | Description |
|---|-------------|-------------|
| 29 | Toggle sidebar | Open/close with width animation (0↔360px) |
| 30 | Sidebar logo/branding | Dexterous AI logo + name in header |
| 31 | Conversation list scroll | Scrollable list with custom scrollbar |
| 32 | Hover delete button | Delete button appears on conversation hover |
| 33 | Selected conversation highlight | Active conversation has brighter background |
| 34 | User profile footer | Shows avatar, user ID, and "User ID" label |

### Interactive Blocks

| # | Functionality | Description |
|---|-------------|-------------|
| 35 | Table rendering | Full data tables with headers and rows |
| 36 | Table row selection | Checkbox per row for selection |
| 37 | Table select-all | Header checkbox toggles all rows |
| 38 | Table row rejection | Per-row reject (X) button, appears on hover |
| 39 | Rejected row styling | Greyed out + strikethrough + non-selectable |
| 40 | Selection counter | Badge showing "N row(s) selected" |
| 41 | Save selected rows | "Save Selected" button sends confirmed items to backend |
| 42 | Entity type detection | Auto-detects 'service', 'model', 'column' from table headers |
| 43 | Table column reordering | "Service Name" moved before "Status" automatically |
| 44 | Button actions | Primary/secondary styled buttons with action metadata |
| 45 | Confirm action | Collects selections + sends confirm to backend |
| 46 | Reject action | Sends reject to backend |
| 47 | Custom button actions | Sends as chat message with metadata |
| 48 | Dropdown rendering | Styled select menus with label and placeholder |
| 49 | Dropdown onChange | Sends selection as chat message with payload |
| 50 | Radio group rendering | Styled radio buttons with custom appearance |
| 51 | Radio onChange | Sends selection as chat message with payload |
| 52 | Code block display | Syntax-colored code with language label |
| 53 | Code copy to clipboard | Copy button using navigator.clipboard API |
| 54 | List rendering | Bullet lists with orange diamond markers |
| 55 | List indent support | Nested items with proportional padding |
| 56 | Checklist rendering | Display-only checklists with check/uncheck styling |
| 57 | Link rendering | Styled anchor tags opening in new tab |
| 58 | Unsupported block fallback | Unknown block types shown as JSON in CodeBlock |

### Selection Management

| # | Functionality | Description |
|---|-------------|-------------|
| 59 | Toggle individual selection | Check/uncheck single table row or list item |
| 60 | Toggle all selections | Select/deselect all items at once |
| 61 | Selection state tracking | Map<messageId, Map<blockIndex, Set<indices>>> |
| 62 | Selection count | Real-time count of selected items |
| 63 | Collect selected items | Gathers actual row data from StructuredResponse or parsed markdown |
| 64 | Clear selections | Clears all selection state after confirm/reject |

### WebSocket & Streaming

| # | Functionality | Description |
|---|-------------|-------------|
| 65 | Socket.IO connection | Connects with websocket + polling transports |
| 66 | Auto-reconnect | Up to 5 retry attempts with 1s delay |
| 67 | Room-based messaging | Joins conversation-specific rooms |
| 68 | Stream deduplication | Prevents duplicate stream-start/chunk/end processing |
| 69 | Chunk sequence tracking | Set of processed chunk sequences for dedup |
| 70 | Stream ownership mutex | `wsOwnsCurrentStream` prevents race conditions |
| 71 | Response claim mutex | `responseClaimedForCurrentRequest` prevents duplicate handling |
| 72 | Progressive block rendering | Blocks render incrementally as chunks arrive |
| 73 | Stream finalization | Text extraction + markdown parsing on stream-end |
| 74 | Error recovery | Stream errors display error message and clean up state |

### MCP Tool Testing

| # | Functionality | Description |
|---|-------------|-------------|
| 75 | Tool selection | Tab-based tool selector with icons |
| 76 | Dynamic form generation | Forms auto-generate based on tool field configs |
| 77 | Field types | text, textarea, number, boolean toggle, JSON editor |
| 78 | Form validation | Required fields, number range, JSON parse validation |
| 79 | Tool execution | Execute button with loading spinner |
| 80 | Execution timing | Tracks and displays execution duration in ms |
| 81 | Result viewer | Tool-specific formatted result displays |
| 82 | Raw JSON toggle | Switch between formatted and raw JSON views |
| 83 | Copy results | Copy full result JSON to clipboard |
| 84 | Entity tables | Collapsible categories (services, models, columns, relations, enums) |
| 85 | Health monitoring | Status badge with refresh, last-checked timestamp |
| 86 | Chat + MCP tabs | Dual-tab interface combining chat and MCP testing |
| 87 | Form reset | Reset button clears form to default values |

### Data Processing

| # | Functionality | Description |
|---|-------------|-------------|
| 88 | Markdown parsing | Full markdown → typed blocks conversion |
| 89 | Markdown reconstruction | Typed blocks → markdown string conversion |
| 90 | Inline formatting | Bold and inline code conversion to HTML |
| 91 | Table parsing from markdown | Pipe-separated tables → {headers, rows} |
| 92 | Button extraction | `<button>` HTML in markdown → ButtonBlock |
| 93 | Radio extraction | Radio divs in markdown → RadioBlock |
| 94 | Dropdown extraction | `<select>` HTML in markdown → DropdownBlock |
| 95 | Backend response normalization | Handles 5+ response shape variations |
| 96 | BotResponse → LLMUIBlock | Streaming chunk conversion with type normalization |
| 97 | Content union → LLMUIBlock | Backend Content type conversion |
| 98 | Chunk type mapping | 27+ ChunkType values → RenderType |

### Error Handling & Edge Cases

| # | Functionality | Description |
|---|-------------|-------------|
| 99 | Missing conversation guard | Auto-creates conversation before sending |
| 100 | Empty input prevention | Send disabled when input is empty |
| 101 | Double-send prevention | Disabled when loading or streaming |
| 102 | WebSocket disconnect handling | Status indicator + auto-reconnect |
| 103 | Stream error handling | Error message display + state cleanup |
| 104 | API error responses | HTTP status code mapping from backend |
| 105 | Delete confirmation | Modal prevents accidental deletion |
| 106 | Async operation loading | Buttons disable during async operations |
| 107 | No-op fallback handlers | Component callbacks default to no-op if not provided |

### Local Storage

| # | Functionality | Description |
|---|-------------|-------------|
| 108 | Save conversation data | Persist conversation metadata locally |
| 109 | Save selected items | Persist table/list selections locally |
| 110 | Merge selections | Deduplicate when adding new selections |
| 111 | Remove selections | Remove by messageId + blockIndex |
| 112 | Clear selections | Clear all for a conversation |

### UI/UX Details

| # | Functionality | Description |
|---|-------------|-------------|
| 113 | Dark theme | Full dark gradient background throughout |
| 114 | Glass-morphism effects | Backdrop blur + semi-transparent backgrounds |
| 115 | Orange accent system | #ff6b35 → #f7931e gradient for primary elements |
| 116 | Custom scrollbar | Styled webkit scrollbar (8px, semi-transparent) |
| 117 | Hover effects | Scale/translate/opacity transitions on interactive elements |
| 118 | Focus rings | Orange ring on focused inputs |
| 119 | Responsive layout | Flex-based layout adapting to screen sizes |
| 120 | Conversation emoji | 💬 icon for each conversation in sidebar |
| 121 | Iconify icons | Material Design icons throughout (mdi:* set) |

---

## 16. Environment Configuration

### `.env` Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKEND_API_URL` | `http://localhost:2345/api/v1` | Backend API base URL |
| `PUBLIC_WEBSOCKET_URL` | `http://localhost:2345` | WebSocket server URL |
| `SESSION_CACHE_HOST` | `http://localhost` | Cache server host |
| `SESSION_CACHE_PORT` | `6379` | Cache server port |
| `SESSION_CACHE_PASSWORD` | `inflection123` | Cache auth password |
| `SESSION_CACHE_TYPE` | `in-memory` | `'in-memory'` or `'redis'` |
| `REQUEST_CACHE_TYPE` | `in-memory` | `'in-memory'` or `'redis'` |
| `ALLOW_INSECURE_DEV_TLS` | `true` | Allow insecure TLS for dev |

### Client-Side Constants (hardcoded in +page.svelte)

| Constant | Value |
|----------|-------|
| `USER_ID` | `74f22a5f-8ed2-45ce-af2e-ac4c32d824f4` |
| `REFERENCE_MESSAGE_ID` | `123e4567-e89b-12d3-a456-426655440000` |
| `PROJECT_ID` | `df4c6df0-594a-4dcb-8754-49eead9743f3` |
| `WEBSOCKET_URL` | `http://localhost:2345` |

---

## 17. Backend API Endpoints

### Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/dexterous/chat/messages` | Send chat message (triggers streaming response) |
| GET | `/dexterous/chat/conversations/{id}/messages` | Fetch conversation messages |

### Conversations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dexterous/conversations/search?userId={id}` | List user's conversations |
| POST | `/dexterous/conversations` | Create new conversation |
| DELETE | `/dexterous/conversations/{id}` | Delete conversation |

### Selections

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/dexterous/chat/selections/confirm` | Confirm selected items |
| POST | `/dexterous/chat/selections/reject` | Reject selected items |

### MCP

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/dexterous/mcp/definition` | Execute MCP tool |
| GET | `/dexterous/mcp/health` | MCP service health check |

---

## 18. Styling & Design System

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| Primary Orange | `#ff6b35` | Buttons, accents, borders, icons |
| Secondary Gold | `#f7931e` | Gradient endpoints, highlights |
| Dark Background | `#0a0a1a` | Primary background |
| Dark Mid | `#1a1a2e` | Code blocks, secondary backgrounds |
| Dark Tertiary | `#0f0f23` | Gradient intermediate |
| White/90 | `rgba(255,255,255,0.9)` | Primary text |
| White/70 | `rgba(255,255,255,0.7)` | Secondary text |
| White/40 | `rgba(255,255,255,0.4)` | Muted text, timestamps |
| White/20 | `rgba(255,255,255,0.2)` | Borders |
| White/10 | `rgba(255,255,255,0.1)` | Subtle borders, hover states |
| White/5 | `rgba(255,255,255,0.05)` | Subtle backgrounds |

### Animations

| Name | Duration | Effect |
|------|----------|--------|
| `fadeInUp` | 0.4s ease-out | opacity 0→1, translateY 15px→0 |
| `blockAppear` | 0.3s ease-out | opacity 0→1, translateY 8px→0 |
| `bounceDot` | 0.9s infinite | Loading dot bounce |
| Sidebar transition | 0.3s | Width 0↔360px |
| Smooth scroll | Browser default | Chat container auto-scroll |

### Glass-morphism

- `backdrop-blur-sm` — Subtle blur (inputs)
- `backdrop-blur-md` — Medium blur (cards)
- `backdrop-blur-xl` — Heavy blur (dialogs)
- Semi-transparent backgrounds (`bg-white/5` to `bg-white/10`)
- Subtle borders (`border-white/10` to `border-white/20`)

### Iconography

Uses **@iconify/svelte** with Material Design Icons (`mdi:*`):
- `mdi:layers` — App logo
- `mdi:send` — Send button
- `mdi:plus` — New chat
- `mdi:delete` — Delete
- `mdi:chevron-down` — Dropdown arrow
- `mdi:content-copy` — Copy
- `mdi:close` — Close/reject
- `mdi:refresh` — Refresh
- `mdi:loading` — Loading spinner
- `mdi:check` — Checkmark
- `mdi:server` — Services
- `mdi:database` — Models
- And more...

---

*This documentation was auto-generated from comprehensive codebase analysis. Last updated: February 2026.*
