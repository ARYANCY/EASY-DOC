import urllib.request
import json
import uuid

boundary = uuid.uuid4().hex
filepath = r'd:\Projects\EASY-DOC\legal-ai\sample_nda.txt'

with open(filepath, 'rb') as f:
    file_data = f.read()

header = (
    '--' + boundary + '\r\n'
    'Content-Disposition: form-data; name="file"; filename="sample_nda.txt"\r\n'
    'Content-Type: text/plain\r\n\r\n'
).encode()
footer = ('\r\n--' + boundary + '--\r\n').encode()
body = header + file_data + footer

req = urllib.request.Request(
    'http://localhost:8000/parse',
    data=body,
    headers={'Content-Type': 'multipart/form-data; boundary=' + boundary},
    method='POST'
)

resp = urllib.request.urlopen(req, timeout=30)
data = json.loads(resp.read())

print('SUCCESS:', data.get('success'))
print('doc_id:', data.get('doc_id'))
d = data.get('data', {})
print('document_type:', d.get('document_type'))
print('risk_score:', d.get('risk_score'))
print('risk_flags:', len(d.get('risk_flags', [])))
print('sections:', len(d.get('sections', [])))
print('summary:', d.get('summary', '')[:150])
print()
print('Risk flags:')
for f in d.get('risk_flags', []):
    print(f"  [{f['severity'].upper()}] {f['label']}: {f['description']}")
