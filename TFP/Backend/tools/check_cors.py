import requests

def print_resp(r):
    print('URL:', r.url)
    print('Status:', r.status_code)
    for k, v in r.headers.items():
        print(f'{k}: {v}')
    try:
        print('Body:', r.text[:1000])
    except Exception:
        pass
    print('\n' + '='*60 + '\n')

BASE = 'http://127.0.0.1:5000'

def main():
    endpoints = [
        ('OPTIONS', f'{BASE}/api/communications/threads?channel=clients'),
        ('GET', f'{BASE}/api/communications/threads?channel=clients'),
        ('GET', f'{BASE}/api/employees/')
    ]

    headers = {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
        'Authorization': 'Bearer invalidtoken'
    }

    for method, url in endpoints:
        print('Requesting', method, url)
        try:
            if method == 'OPTIONS':
                r = requests.options(url, headers=headers, timeout=5)
            else:
                r = requests.get(url, headers=headers, timeout=5)
            print_resp(r)
        except Exception as e:
            print('Error contacting', url, e)

if __name__ == '__main__':
    main()
