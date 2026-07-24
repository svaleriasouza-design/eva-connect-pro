import { createClient } from '@supabase/supabase-js';
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key);
const { data, error } = await sb.from('meta_wa_settings').select('*').eq('id', true).maybeSingle();
if (error) { console.error('DB error', error); process.exit(1); }
console.log('cfg present:', { phone: !!data?.phone_number_id, token: !!data?.access_token, ver: data?.graph_version });
const to = process.argv[2] || '5511999999999';
const body = 'Teste EVA · ' + new Date().toISOString();
const graph = `https://graph.facebook.com/${data.graph_version || 'v21.0'}/${data.phone_number_id}/messages`;
const res = await fetch(graph, {
  method: 'POST',
  headers: { Authorization: `Bearer ${data.access_token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body } }),
});
const txt = await res.text();
console.log('HTTP', res.status);
console.log(txt);
