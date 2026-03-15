import json

s = '{"name": "create_docx", "args": {"title": "Alice in Wonderland: A Summary & Analysis", "content": "# Alice in Wonderland\n## ... \n* ... \"Worry about being late!\" ... "'
s1 = s + '}'

success = False
for suffix in ['', '}', '}}', '"}', '"}}', '"]}']:
    try:
        json.loads(s1 + suffix, strict=False)
        success = True
        print(f"Fixed '{s1}' with suffix: {repr(suffix)}")
        break
    except Exception as e:
        pass
if not success: print("Failed to fix string")
