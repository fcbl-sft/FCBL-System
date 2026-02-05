
import { createClient } from '@supabase/supabase-js';

// Server-side client uses the Service Role key to bypass RLS
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://zilbigcueizkfvvpuwjp.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  const { table, action, order, asc, col, val } = req.query;

  try {
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
    // Cast to any to prevent "Type instantiation is excessively deep" errors in TS
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
      result = await sb.from(table).update(getBody()).eq(col, val);
    } 
    else if (req.method === 'DELETE' && action === 'delete') {
      result = await sb.from(table).delete().eq(col, val);
    }

    if (result?.error) throw result.error;
    
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(JSON.stringify(result?.data || { success: true }));

  } catch (error: any) {
    console.error("API Project Error:", error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).send(JSON.stringify({ error: error.message || 'Internal Server Error' }));
  }
}
