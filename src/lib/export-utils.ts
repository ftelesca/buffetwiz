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

  console.log('🔍 parseExportPayload - raw input:', rawPayload.slice(0, 200));

  // Step 1: Remove invisible chars
  let payload = removeInvisibleChars(rawPayload);
  
  // Step 2: Try URL decode safely (multiple times if needed)
  let lastPayload = '';
  while (payload !== lastPayload && payload.includes('%')) {
    lastPayload = payload;
    try {
      payload = decodeURIComponent(payload);
    } catch {
      break;
    }
  }

  console.log('🔍 After URL decode:', payload.slice(0, 200));

  // Step 3: Try base64 decode if applicable
  const maybeDecoded = tryBase64Decode(payload);
  if (maybeDecoded) {
    payload = maybeDecoded;
    console.log('🔍 After base64 decode:', payload.slice(0, 200));
  }

  // Step 4: Extract JSON object substring
  let jsonStr = extractJsonObject(payload);
  console.log('🔍 After JSON extraction:', jsonStr.slice(0, 200));

  // Step 5: Remove arbitrary line breaks/tabs
  jsonStr = removeAllLineBreaks(jsonStr);

  // Step 6: Try multiple JSON parsing strategies
  const strategies = [
    // Strategy 1: Direct parse
    () => JSON.parse(jsonStr),
    
    // Strategy 2: Fix quotes and parse
    () => {
      const fixed = jsonStr
        .replace(/'/g, '"')
        .replace(/"([^"]*)":/g, '"$1":')
        .replace(/:\s*"([^"]*)"/g, ':"$1"');
      return JSON.parse(fixed);
    },
    
    // Strategy 3: More aggressive quote fixing
    () => {
      const fixed = jsonStr
        .replace(/([{,]\s*)(\w+):/g, '$1"$2":')
        .replace(/:\s*([^",}\]]+)([,}\]])/g, ':"$1"$2')
        .replace(/:\s*"(\d+)"([,}\]])/g, ':$1$2')
        .replace(/:\s*"(true|false|null)"([,}\]])/g, ':$1$2');
      return JSON.parse(fixed);
    },
    
    // Strategy 4: Try to rebuild from recognizable patterns
    () => {
      const typeMatch = jsonStr.match(/["']?type["']?\s*:\s*["']?(\w+)["']?/i);
      const filenameMatch = jsonStr.match(/["']?filename["']?\s*:\s*["']?([^"',}]+)["']?/i);
      const dataMatch = jsonStr.match(/["']?data["']?\s*:\s*\[[\s\S]*\]/i);
      
      if (typeMatch) {
        const type = typeMatch[1];
        const filename = filenameMatch?.[1] || 'export';
        let data = [];
        
        if (dataMatch) {
          try {
            data = JSON.parse(dataMatch[0].split(':').slice(1).join(':'));
          } catch {
            data = [];
          }
        }
        
        return { type, filename, data };
      }
      throw new Error('No recognizable pattern');
    }
  ];

  for (let i = 0; i < strategies.length; i++) {
    try {
      const parsed = strategies[i]();
      console.log(`✅ Strategy ${i + 1} succeeded:`, parsed);
      
      const type = String(parsed.type || parsed.format || 'csv').toLowerCase();
      const filename = parsed.filename || parsed.name || 'export';
      const data = Array.isArray(parsed.data) ? parsed.data : [];
      
      return { type, filename, data };
    } catch (error) {
      console.log(`❌ Strategy ${i + 1} failed:`, error.message);
    }
  }

  console.error('❌ All parsing strategies failed for payload:', rawPayload);
  return null;
}
