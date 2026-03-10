import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  const { table, action, order, asc, col, val } = req.query;

  try {
    // Vercel sometimes pre-parses the body if it's application/json
    const getBody = () => {
      if (!req.body) return {};
      if (typeof req.body === 'string') {
        try {
          return JSON.parse(req.body);
        } catch (e) {
          return {};
        }
      }
      return req.body;
    };

    let result;
    // Fix: Using dynamic strings for table and column names with the Supabase client can cause 
    // "Type instantiation is excessively deep" errors. Casting the Supabase client itself to any 
    // prevents this deep recursion by bypassing the complex generic type system for these calls.
    const sb = supabase as any;

    if (req.method === 'GET' && action === 'select') {
      let query = sb.from(table).select('*');
      if (order) {
        query = query.order(order as any, { ascending: asc === 'true' });
      }
      result = await query;
    } 
    else if (req.method === 'POST' && action === 'insert') {
      result = await sb.from(table).insert(getBody());
    } 
    else if (req.method === 'PATCH' && action === 'update') {
      // Fix for deep recursion by using the casted supabase client
      result = await sb.from(table).update(getBody()).eq(col, val);
    } 
    else if (req.method === 'DELETE' && action === 'delete') {
      // Fix for Error on line 43: Casting supabase to any breaks the type recursion for delete/eq calls
      result = await sb.from(table).delete().eq(col, val);
    }

    if (result?.error) throw result.error;
    
    // Explicitly send JSON to avoid any middleware stream issues
    const responseData = result?.data || { success: true };
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(JSON.stringify(responseData));

  } catch (error: any) {
    console.error("API Project Error:", error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).send(JSON.stringify({ error: error.message || 'Internal Server Error' }));
  }
}
