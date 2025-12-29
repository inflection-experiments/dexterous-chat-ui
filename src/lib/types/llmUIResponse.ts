/* ======================================================
   LLM → Frontend Rendering Contract (FINAL)

   PURPOSE:
   This file defines a strict, minimal contract for sending
   LLM responses from backend to frontend in a way that is:

   - Predictable for frontend rendering
   - Safe and realistic for LLM-generated output
   - UI-agnostic (no HTML, no CSS, no framework coupling)
   - Easy to extend in future without breaking changes

   Core idea:
   - LLM decides WHAT the content is
   - Frontend decides HOW it looks
   ====================================================== */

/* ------------------------------------------------------
   LLM Transport Type
   ------------------------------------------------------
   Indicates the raw nature of the response coming from
   the LLM before the frontend interprets it.

   WHY this exists:
   - LLMs practically return either plain text or JSON
   - Helps frontend decide whether to parse JSON or not
   - Prevents unsafe assumptions on the frontend

   HOW it is used:
   - "text" → treat content as plain string
   - "json" → parse and validate structured data
------------------------------------------------------ */
export type DataType = "text" | "json";

/* ------------------------------------------------------
   Content
   ------------------------------------------------------
   This is the actual payload produced by the LLM.

   WHY this is flexible:
   - LLM outputs are dynamic by nature
   - Frontend should not care about business meaning,
     only about how to render the data

   POSSIBLE SHAPES:
   - string → normal text, markdown, code, etc.
   - number → numeric answers, counts, scores
   - object → single structured response
   - object[] → tabular or list-based data

   NOTE:
   Avoid deeply complex or custom shapes here.
   Keep it simple so LLMs can generate it reliably.
------------------------------------------------------ */
export type Content =
  | string
  | number
  | Record<string, any>
  | Array<Record<string, any>>;

/* ------------------------------------------------------
   Format Type (Content Interpretation)
   ------------------------------------------------------
   Defines how the frontend should INTERPRET the content
   structure before rendering it.

   WHY this exists:
   - Same content can be rendered differently
   - Separates data shape from visual presentation
   - Keeps frontend logic explicit and predictable

   EXAMPLES:
   - "text"        → plain string
   - "markdown"    → markdown-formatted string
   - "object"      → single JSON object
   - "objectArray" → array of objects (rows, items)

   IMPORTANT:
   Format answers the question:
   "What shape is this data in?"
------------------------------------------------------ */
export type FormatType =
  | "text"
  | "markdown"
  | "object"
  | "objectArray";

/* ------------------------------------------------------
   Render Type (UI Intent)
   ------------------------------------------------------
   Tells the frontend HOW the content should be shown
   visually in the UI.

   WHY this exists:
   - Backend/LLM should not send UI code
   - Frontend needs a clear intent to pick a component
   - Keeps rendering logic consistent and reusable

   EXAMPLES:
   - "text"     → simple text block
   - "markdown" → markdown renderer
   - "table"    → objectArray rendered as rows/columns
   - "list"     → bullet or numbered list
   - "code"     → code block with formatting
   - "json"     → pretty JSON viewer

   IMPORTANT:
   RenderType answers the question:
   "How should this data appear on screen?"
------------------------------------------------------ */
export type RenderType =
  | "text"
  | "markdown"
  | "table"
  | "list"
  | "code"
  | "json";

/* ------------------------------------------------------
   Core UI Block
   ------------------------------------------------------
   A single renderable unit sent from backend to frontend.

   THINK OF IT AS:
   One block = one visual section in the UI

   WHY blocks are used:
   - LLM responses are often multi-part
   - Each part may need a different renderer
   - Frontend can render blocks sequentially

   FIELD RESPONSIBILITIES:
   - datatype   → how to read the response
   - format     → how to interpret the data shape
   - renderType → how to display it visually
   - content    → the actual data

   Frontend flow:
   1. Read datatype
   2. Validate content shape using format
   3. Pick UI component using renderType
------------------------------------------------------ */
export interface LLMUIBlock {
  datatype: DataType;
  format: FormatType;
  renderType: RenderType;
  content: Content;
}

/* ------------------------------------------------------
   Full LLM Response
   ------------------------------------------------------
   Represents the complete response sent by the backend
   to the frontend.

   WHY blocks[]:
   - Allows mixed content (text + table + code)
   - Enables streaming or progressive rendering later
   - Keeps UI rendering simple and ordered

   Frontend responsibility:
   - Iterate over blocks
   - Render each block independently
------------------------------------------------------ */
export interface LLMUIResponse {
  blocks: LLMUIBlock[];
}



