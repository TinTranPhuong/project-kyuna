import json
try:
    s = '{"a": {"b": "c"}'
    json.loads(s)
except Exception as e:
    print('Testing missing closing brace:', e)

try:
    s = '{"a": "b\ncd""}'
    json.loads(s)
except Exception as e:
    print('Testing unescaped newline:', e)

try:
    s = '{"a": "b\ncd", "b": "c\\nd"}'
    json.loads(s, strict=False)
    print("Strict=False can parse unescaped newline.")
except Exception as e:
    print('Testing strict=false:', e)

try:
    s = '{"a": "b"cd"}'
    json.loads(s)
    print("strict=False parsed unescaped quote.")
except Exception as e:
    print('Testing unescaped double quote:', type(e), e)
