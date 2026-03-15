import json

def parse_lenient_json(json_str):
    for suffix in ['', '}', '}}', '"}', '"}}']:
        try:
            return json.loads(json_str + suffix, strict=False)
        except json.JSONDecodeError:
            pass
    raise ValueError("Could not fix JSON")

s = '{"name": "a", "args": {"title": "b", "content": "c"}'
print("Parsed missing 1 brace:", parse_lenient_json(s))

s2 = '{"name": "a", "args": {"title": "b", "content": "c"'
print("Parsed missing quote and 2 braces:", parse_lenient_json(s2))
