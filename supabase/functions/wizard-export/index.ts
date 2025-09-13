import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data, filename } = await req.json();
    
    // Get authorization header
    const authorization = req.headers.get('authorization');
    if (!authorization) {
      throw new Error('No authorization header');
    }

    // Get user from JWT
    const jwt = authorization.replace('Bearer ', '');
    const { data: user, error: userError } = await supabase.auth.getUser(jwt);
    
    if (userError || !user.user) {
      throw new Error('Invalid authorization');
    }

    console.log('Processing export request for user:', user.user.id);

    let fileContent: string;
    let contentType: string;
    let fileExtension: string;

    switch (type.toLowerCase()) {
      case 'excel':
      case 'xlsx':
        fileContent = generateExcelContent(data);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        fileExtension = 'xlsx';
        break;
      
      case 'csv':
        fileContent = generateCSVContent(data);
        contentType = 'text/csv';
        fileExtension = 'csv';
        break;
      
      case 'json':
        fileContent = JSON.stringify(data, null, 2);
        contentType = 'application/json';
        fileExtension = 'json';
        break;
      
      default:
        throw new Error('Formato de exportação não suportado');
    }

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const finalFilename = `${filename || 'export'}_${timestamp}.${fileExtension}`;

    // Create download blob
    const blob = new Blob([fileContent], { type: contentType });
    const base64Content = btoa(String.fromCharCode(...new Uint8Array(await blob.arrayBuffer())));

    // Return file content with download link
    return new Response(JSON.stringify({
      success: true,
      filename: finalFilename,
      downloadUrl: `data:${contentType};base64,${base64Content}`,
      size: fileContent.length,
      type: contentType
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in wizard-export function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      details: error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateExcelContent(data: any[]): string {
  // Simple CSV-like format for Excel (actual XLSX would require a library)
  // For now, we'll generate CSV content that Excel can open
  return generateCSVContent(data);
}

function generateCSVContent(data: any[]): string {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        let value = row[header];
        
        // Convert value to string and handle special cases
        if (value === null || value === undefined) {
          value = '';
        } else {
          value = String(value);
        }
        
        // Handle values that contain commas, quotes, or newlines
        if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
          // Escape quotes by doubling them
          value = value.replace(/"/g, '""');
          // Wrap in quotes
          value = `"${value}"`;
        }
        
        return value;
      }).join(',')
    )
  ].join('\n');

  return csvContent;
}