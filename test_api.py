import urllib.request
import urllib.parse
import json

def post_multipart(url, file_path):
    boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
    with open(file_path, 'rb') as f:
        file_content = f.read()
    filename = file_path.replace('/', '\\').split('\\')[-1]
    
    parts = []
    parts.append(f'--{boundary}')
    parts.append(f'Content-Disposition: form-data; name="file"; filename="{filename}"')
    parts.append(f'Content-Type: text/plain')
    parts.append('')
    parts.append(file_content.decode('utf-8'))
    parts.append(f'--{boundary}--')
    parts.append('')
    
    body = '\r\n'.join(parts).encode('utf-8')
    headers = {
        'Content-Type': f'multipart/form-data; boundary={boundary}',
        'Content-Length': str(len(body))
    }
    
    req = urllib.request.Request(url, data=body, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req) as res:
            return json.loads(res.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code} - {e.read().decode('utf-8')}")
        raise

def post_json(url):
    req = urllib.request.Request(url, data=b'', method='POST')
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode('utf-8'))

def get_json(url):
    with urllib.request.urlopen(url) as res:
        return json.loads(res.read().decode('utf-8'))

try:
    print("Testing Upload Endpoint...")
    upload_url = "http://localhost:8000/api/documents/upload"
    file_path = "customer_requirements.txt"
    doc = post_multipart(upload_url, file_path)
    print("Upload Successful! Document ID:", doc['id'])
    
    print("\nTesting Analyze Endpoint...")
    analyze_url = f"http://localhost:8000/api/documents/{doc['id']}/analyze"
    analyzed_doc = post_json(analyze_url)
    print("Analysis Successful! Status:", analyzed_doc['status'])
    print("Requirements Count:", len(analyzed_doc.get('requirements', [])))
    
    for i, req in enumerate(analyzed_doc.get('requirements', [])[:5]):
        print(f"  Req {i+1}: {req['title']} ({req['priority']})")
        for j, task in enumerate(req.get('tasks', [])[:2]):
            print(f"    Task {i+1}.{j+1}: {task['title']} (Priority: {task['priority']}, Complexity: {task['complexity']})")
            for k, test in enumerate(task.get('test_scenarios', [])):
                print(f"      Expected: {test['expected_result']}")
    
    if len(analyzed_doc.get('requirements', [])) > 5:
        print("  ... (and more requirements)")
                
    print("\nTesting Get Documents List...")
    list_url = "http://localhost:8000/api/documents"
    docs_list = get_json(list_url)
    print("Documents in DB:", len(docs_list))
    
    print("\nAPI Integration Tests Passed Successfully!")
except Exception as e:
    print("API Integration Test Failed:", e)
