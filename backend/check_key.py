from app.config import get_settings
s = get_settings()
key = s.supabase_service_role_key
print(f"Key length: {len(key)}")
if len(key) > 30:
    print(f"Key preview: {key[:30]}...")
else:
    print(f"Key value: {key}")
print(f"Is placeholder: {key == 'YOUR_SERVICE_ROLE_KEY_HERE'}")
print(f"Is empty: {key == ''}")
print(f"URL: {s.supabase_url}")
