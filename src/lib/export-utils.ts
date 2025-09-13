// Utility functions to robustly parse and sanitize export payloads embedded in Markdown links

export interface ExportPayload {
  type: string;
  data: any[];
  filename?: string;
}

// Remove zero-width and invisible characters often injected by renderers/copying
function removeInvisibleChars(input: string) {
  return input.replace(/[\u200B-\u200D\uFEFF\u2060\u00AD]/g, "");
}

// Extract the JSON object substring from any surrounding text
function extractJsonObject(input: string) {
  const start = input.indexOf("{");
  const end = input.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return input.trim();
  return input.slice(start, end + 1);
}

// Remove line breaks (and tabs) that may have been inserted arbitrarily, including inside strings
function removeAllLineBreaks(input: string) {
  return input.replace(/[\r\n\t]+/g, "");
}

// Try base64 decode if pattern matches
function tryBase64Decode(input: string): string | null {
  try {
    const trimmed = input.trim();
    const lower = trimmed.toLowerCase();
    let b64 = "";

    if (lower.startsWith("base64,")) {
      b64 = trimmed.slice(7);
    } else if (lower.startsWith("b64,")) {
      b64 = trimmed.slice(4);
    } else if (lower.startsWith("base64:")) {
      b64 = trimmed.slice(7);
    } else if (lower.startsWith("b64:")) {
      b64 = trimmed.slice(4);
    } else if (/^[a-z0-9+/=]+$/i.test(trimmed) && !/[{}\[\]"]/.test(trimmed) && trimmed.length % 4 === 0) {
      // Looks like raw base64 without braces
      b64 = trimmed;
    } else {
      return null;
    }

    const decoded = atob(b64);
    return decoded;
  } catch {
    return null;
  }
}

export function parseExportPayload(rawPayload: string): ExportPayload | null {
  if (!rawPayload) return null;

  // Step 1: Remove invisible chars
  let payload = removeInvisibleChars(rawPayload);

  // Step 2: Try URL decode safely
  try {
    payload = decodeURIComponent(payload);
  } catch {
    // ignore
  }

  // Step 3: Try base64 decode if applicable
  const maybeDecoded = tryBase64Decode(payload);
  if (maybeDecoded) {
    payload = maybeDecoded;
  }

  // Step 4: Extract JSON object substring
  payload = extractJsonObject(payload);

  // Step 5: Remove arbitrary line breaks/tabs
  payload = removeAllLineBreaks(payload);

  // Step 6: Attempt direct JSON parse
  try {
    const parsed = JSON.parse(payload);
    const type = String(parsed.type || parsed.format || 'csv').toLowerCase();
    const filename = parsed.filename || parsed.name || 'export';
    const data = Array.isArray(parsed.data) ? parsed.data : [];
    return { type, filename, data };
  } catch {
    // Step 7: Last resort, try to fix single quotes to double quotes and parse again
    try {
      const fixed = payload
        .replace(/\"/g, '"')
        .replace(/'([^']*)'\s*:/g, '"$1":')
        .replace(/:\s*'([^']*)'/g, ':"$1"');
      const parsed = JSON.parse(fixed);
      const type = String(parsed.type || parsed.format || 'csv').toLowerCase();
      const filename = parsed.filename || parsed.name || 'export';
      const data = Array.isArray(parsed.data) ? parsed.data : [];
      return { type, filename, data };
    } catch {
      return null;
    }
  }
}
