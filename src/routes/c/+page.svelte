<script>
  import { onMount } from 'svelte';
  
  let markdownContent = `# 🚀 Complete Markdown Demo

This document demonstrates **all formatting types** with proper styling.

---

## 📊 Database Tables

Here are the core tables in our system:

### Users Table (\`users\`)

| Column    | Type         | Constraints           | Description                    |
|-----------|--------------|----------------------|--------------------------------|
| id        | UUID         | **PK**, NOT NULL     | Primary identifier             |
| email     | VARCHAR(255) | UNIQUE, NOT NULL     | User email address             |
| username  | VARCHAR(100) | UNIQUE               | Display name                   |
| password  | VARCHAR(255) | NOT NULL             | Hashed password                |
| role      | ENUM         | DEFAULT 'user'       | Values: \`admin\`, \`user\`, \`guest\` |
| createdAt | TIMESTAMP    | DEFAULT NOW()        | Account creation time          |
| isActive  | BOOLEAN      | DEFAULT true         | Account status                 |

### Products Table (\`products\`)

| Column      | Type          | Constraints      | Description              |
|-------------|---------------|------------------|--------------------------|
| id          | UUID          | **PK**           | Product ID               |
| name        | VARCHAR(200)  | NOT NULL         | Product name             |
| price       | DECIMAL(10,2) | NOT NULL         | Price in USD             |
| stock       | INTEGER       | DEFAULT 0        | Available quantity       |
| categoryId  | UUID          | **FK → categories.id** | Category reference | |
| description | TEXT          | NULL             | Product details          |

---

## 📝 Feature Lists

### Backend Features

- **Authentication System**
  - JWT-based token authentication
  - OAuth2 integration (Google, GitHub)
  - Two-factor authentication (2FA)
  - Password reset via email

- **API Endpoints**
  - RESTful API design
  - GraphQL support
  - Rate limiting (100 req/min)
  - API versioning (\`/v1\`, \`/v2\`)

- **Database**
  - PostgreSQL with migrations
  - Redis caching layer
  - Full-text search with Elasticsearch
  - Automated backups every 6 hours

### Frontend Features

- **UI Components**
  - Responsive design (mobile-first)
  - Dark mode support
  - Accessibility (WCAG 2.1 AA)
  - Internationalization (i18n)

- **Performance**
  - Code splitting
  - Lazy loading
  - Service worker caching
  - Image optimization

---

## 💻 Code Examples

### JavaScript Example

\`\`\`javascript
// User authentication service
class AuthService {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
    this.token = null;
  }

  async login(email, password) {
    try {
      const response = await fetch(\`\${this.apiUrl}/auth/login\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) throw new Error('Login failed');
      
      const data = await response.json();
      this.token = data.token;
      localStorage.setItem('authToken', data.token);
      
      return data;
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  }

  logout() {
    this.token = null;
    localStorage.removeItem('authToken');
  }
}
\`\`\`

### Python Example

\`\`\`python
# Database connection manager
from contextlib import contextmanager
import psycopg2

@contextmanager
def get_db_connection():
    """Context manager for database connections"""
    conn = psycopg2.connect(
        host="localhost",
        database="myapp",
        user="admin",
        password="secret"
    )
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

# Usage
with get_db_connection() as conn:
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE active = true")
    users = cursor.fetchall()
\`\`\`

### SQL Example

\`\`\`sql
-- Create users table with indexes
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;
\`\`\`

---

## 🎯 Performance Metrics

### Response Times (ms)

| Endpoint          | Average | P95  | P99  | Status |
|-------------------|---------|------|------|--------|
| GET /api/users    | 45      | 120  | 280  | ✅ Good |
| POST /api/login   | 230     | 450  | 890  | ⚠️ Slow |
| GET /api/products | 67      | 180  | 340  | ✅ Good |
| PUT /api/profile  | 110     | 290  | 560  | ✅ Good |

### System Resources

| Resource | Usage | Limit | Status      |
|----------|-------|-------|-------------|
| CPU      | 45%   | 80%   | 🟢 Healthy  |
| Memory   | 6.2GB | 16GB  | 🟢 Healthy  |
| Disk     | 340GB | 500GB | 🟡 Monitor  |
| Network  | 125Mbps | 1Gbps | 🟢 Healthy |

---

## ✅ Deployment Checklist

Before deploying to production:

- [ ] Run all unit tests (\`npm test\`)
- [ ] Check code coverage (minimum 80%)
- [ ] Update API documentation
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] SSL certificates valid
- [ ] Backup system verified
- [ ] Monitoring alerts configured
- [ ] Load testing completed
- [ ] Security audit passed

---

## 📚 API Response Format

All API responses follow this structure:

\`\`\`json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "username": "johndoe",
    "role": "user"
  },
  "meta": {
    "timestamp": "2025-11-17T10:30:00Z",
    "version": "v1",
    "requestId": "req_abc123"
  },
  "errors": null
}
\`\`\`

---

**Note:** This is a comprehensive demo showing tables, lists, code blocks, and inline formatting like \`code\`, **bold**, and normal text.`;

  let parsedContent = [];

  function parseMarkdown(md) {
    const lines = md.split('\n');
    const result = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Code block
      if (line.trim().startsWith('```')) {
        const language = line.trim().substring(3);
        const codeLines = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        result.push({ type: 'code', language, content: codeLines.join('\n') });
        i++;
      }
      // H1
      else if (line.startsWith('# ')) {
        result.push({ type: 'h1', content: line.substring(2) });
        i++;
      }
      // H2
      else if (line.startsWith('## ')) {
        result.push({ type: 'h2', content: line.substring(3) });
        i++;
      }
      // H3
      else if (line.startsWith('### ')) {
        result.push({ type: 'h3', content: line.substring(4) });
        i++;
      }
      // HR
      else if (line.trim() === '---') {
        result.push({ type: 'hr' });
        i++;
      }
      // Table
      else if (line.includes('|') && line.trim().startsWith('|')) {
        const tableLines = [];
        while (i < lines.length && lines[i].includes('|')) {
          tableLines.push(lines[i]);
          i++;
        }
        result.push({ type: 'table', content: parseTable(tableLines) });
      }
      // Checkbox list
      else if (line.trim().match(/^- \[[ x]\]/)) {
        const listItems = [];
        while (i < lines.length && lines[i].trim().match(/^- \[[ x]\]/)) {
          const checked = lines[i].includes('[x]');
          const text = lines[i].trim().substring(6);
          listItems.push({ checked, text });
          i++;
        }
        result.push({ type: 'checklist', content: listItems });
      }
      // Bullet list
      else if (line.trim().startsWith('- ')) {
        const listItems = [];
        let currentIndent = 0;
        while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('  -'))) {
          const indent = lines[i].search(/\S/);
          const text = lines[i].trim().substring(2);
          listItems.push({ text, indent });
          i++;
        }
        result.push({ type: 'list', content: listItems });
      }
      // Paragraph
      else if (line.trim() !== '') {
        result.push({ type: 'p', content: line });
        i++;
      }
      // Empty line
      else {
        i++;
      }
    }

    return result;
  }

  function parseTable(lines) {
    if (lines.length < 2) return { headers: [], rows: [] };
    
    const headers = lines[0]
      .split('|')
      .map(h => h.trim())
      .filter(h => h !== '');
    
    const rows = lines.slice(2).map(row =>
      row
        .split('|')
        .map(cell => cell.trim())
        .filter(cell => cell !== '')
    );

    return { headers, rows };
  }

  function parseInlineFormatting(text) {
    // Bold
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
    // Code
    text = text.replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-purple-600">$1</code>');
    return text;
  }

  onMount(() => {
    parsedContent = parseMarkdown(markdownContent);
  });
</script>

<div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
  <div class="max-w-6xl mx-auto px-6">
    <div class="bg-white rounded-xl shadow-lg p-8">
      {#each parsedContent as block}
        {#if block.type === 'h1'}
          <h1 class="text-4xl font-bold mb-6 text-gray-900 border-b-4 border-blue-500 pb-3">
            {@html parseInlineFormatting(block.content)}
          </h1>
        
        {:else if block.type === 'h2'}
          <h2 class="text-3xl font-semibold mt-10 mb-5 text-gray-800 flex items-center gap-2">
            {@html parseInlineFormatting(block.content)}
          </h2>
        
        {:else if block.type === 'h3'}
          <h3 class="text-xl font-semibold mt-6 mb-3 text-gray-700">
            {@html parseInlineFormatting(block.content)}
          </h3>
        
        {:else if block.type === 'hr'}
          <hr class="my-8 border-t-2 border-gray-200" />
        
        {:else if block.type === 'code'}
          <div class="my-6 rounded-lg overflow-hidden border border-gray-300 shadow-sm">
            <div class="bg-gray-800 px-4 py-2 flex items-center justify-between">
              <span class="text-gray-300 text-sm font-mono">{block.language || 'code'}</span>
              <button class="text-gray-400 hover:text-white text-xs px-2 py-1 bg-gray-700 rounded">
                Copy
              </button>
            </div>
            <pre class="bg-gray-900 p-4 overflow-x-auto"><code class="text-sm font-mono text-green-400">{block.content}</code></pre>
          </div>
        
        {:else if block.type === 'table'}
          <div class="overflow-x-auto my-6 rounded-lg border border-gray-200 shadow-sm">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gradient-to-r from-blue-600 to-blue-700">
                <tr>
                  {#each block.content.headers as header}
                    <th class="px-6 py-4 text-left font-semibold text-sm text-white tracking-wider">
                      {@html parseInlineFormatting(header)}
                    </th>
                  {/each}
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each block.content.rows as row, idx}
                  <tr class={idx % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 hover:bg-blue-50'} style="transition-colors duration-150;">
                    {#each row as cell}
                      <td class="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                        {@html parseInlineFormatting(cell)}
                      </td>
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        
        {:else if block.type === 'checklist'}
          <ul class="my-4 space-y-2">
            {#each block.content as item}
              <li class="flex items-start gap-3">
                <input 
                  type="checkbox" 
                  checked={item.checked}
                  class="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span class={item.checked ? 'text-gray-500 line-through' : 'text-gray-700'}>
                  {@html parseInlineFormatting(item.text)}
                </span>
              </li>
            {/each}
          </ul>
        
        {:else if block.type === 'list'}
          <ul class="my-4 space-y-2">
            {#each block.content as item}
              <li class="flex items-start gap-3" style="padding-left: {item.indent * 1.5}rem">
                <span class="text-blue-500 mt-1.5">●</span>
                <span class="text-gray-700 flex-1">{@html parseInlineFormatting(item.text)}</span>
              </li>
            {/each}
          </ul>
        
        {:else if block.type === 'p'}
          <p class="my-3 text-gray-700 leading-relaxed">
            {@html parseInlineFormatting(block.content)}
          </p>
        {/if}
      {/each}
    </div>
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }
</style>
