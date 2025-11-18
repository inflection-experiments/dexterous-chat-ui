<script lang="ts">
  import type { StructuredResponse } from '$lib/types/chat.ts';

  export let data: StructuredResponse;
  export let actions: string[] = [];

  // Debug logging
  console.log('StructuredDataViewer received data:', data);
  console.log('StructuredDataViewer received actions:', actions);

  const downloadData = (format: string) => {
    const content = JSON.stringify(data.Data, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };
</script>

<div class="structured-data-viewer">
  <!-- Conversational Message -->
  {#if data.Message}
    <div class="conversational-message">
      <p>{data.Message}</p>
    </div>
  {/if}

  <!-- Structured Data Display -->
  {#if data.Data && data.Data.length > 0}
    <div class="data-section">
      <div class="data-header">
        <h3>Data ({data.ResponseFormat || 'json'})</h3>
        <div class="data-actions">
          <button 
            class="action-button" 
            on:click={() => copyToClipboard(JSON.stringify(data.Data, null, 2))}
            title="Copy to clipboard"
          >
            📋 Copy
          </button>
          <button 
            class="action-button" 
            on:click={() => downloadData('json')}
            title="Download JSON"
          >
            ⬇️ Download
          </button>
        </div>
      </div>

      <!-- JSON Viewer -->
      {#if data.ResponseFormat === 'json'}
        <div class="json-viewer">
          <pre><code>{JSON.stringify(data.Data, null, 2)}</code></pre>
        </div>
      {/if}

      <!-- Table Viewer -->
      {#if data.Data && Array.isArray(data.Data) && data.Data.length > 0}
        <div class="table-viewer">
          <table>
            <thead>
              <tr>
                {#each Object.keys(data.Data[0]) as header}
                  <th>{header}</th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each data.Data as row}
                <tr>
                  {#each Object.values(row) as cell}
                    <td>{cell}</td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  {:else}
    <div class="no-data">
      <p>No structured data available</p>
    </div>
  {/if}

  <!-- Suggested Actions -->
  {#if actions && actions.length > 0}
    <div class="suggested-actions">
      <h4>Suggested Actions:</h4>
      <div class="action-buttons">
        {#each actions as action}
          <button class="suggested-action-button">
            {action}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .structured-data-viewer {
    margin-top: 1rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .conversational-message {
    padding: 1rem;
    background-color: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
  }

  .conversational-message p {
    margin: 0;
    color: #374151;
  }

  .data-section {
    padding: 1rem;
  }

  .data-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .data-header h3 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
  }

  .data-actions {
    display: flex;
    gap: 0.5rem;
  }

  .action-button {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    background-color: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 0.25rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .action-button:hover {
    background-color: #e5e7eb;
  }

  .json-viewer {
    background-color: #1f2937;
    border-radius: 0.375rem;
    padding: 1rem;
    overflow-x: auto;
  }

  .json-viewer pre {
    margin: 0;
    color: #f9fafb;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .table-viewer {
    overflow-x: auto;
  }

  .table-viewer table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  .table-viewer th,
  .table-viewer td {
    padding: 0.5rem;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
  }

  .table-viewer th {
    background-color: #f9fafb;
    font-weight: 600;
    color: #374151;
  }

  .suggested-actions {
    padding: 1rem;
    background-color: #f9fafb;
    border-top: 1px solid #e5e7eb;
  }

  .suggested-actions h4 {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
  }

  .action-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .suggested-action-button {
    padding: 0.25rem 0.75rem;
    font-size: 0.75rem;
    background-color: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .suggested-action-button:hover {
    background-color: #2563eb;
  }

  .no-data {
    padding: 1rem;
    text-align: center;
    color: #6b7280;
    font-style: italic;
  }
</style>
