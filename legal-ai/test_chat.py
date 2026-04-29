import urllib.request
import json

DOC_ID = "680f712b-5d69-45fb-897f-d368d34cee80"

# Test chat
payload = json.dumps({
    "doc_id": DOC_ID,
    "query": "What are the liability obligations in this agreement?",
    "history": []
}).encode()

req = urllib.request.Request(
    'http://localhost:8000/chat',
    data=payload,
    headers={'Content-Type': 'application/json'},
    method='POST'
)
resp = urllib.request.urlopen(req, timeout=30)
data = json.loads(resp.read())
print("CHAT RESPONSE:")
print(data['data']['answer'])
print()

# Test simplify
payload2 = json.dumps({
    "text": "The Receiving Party shall be solely liable for any unauthorized disclosure of Confidential Information and shall indemnify and hold harmless the Disclosing Party from any losses, damages, or expenses arising from such disclosure."
}).encode()

req2 = urllib.request.Request(
    'http://localhost:8000/simplify',
    data=payload2,
    headers={'Content-Type': 'application/json'},
    method='POST'
)
resp2 = urllib.request.urlopen(req2, timeout=30)
data2 = json.loads(resp2.read())
print("SIMPLIFY RESPONSE:")
print(data2['data']['simplified'])
