import requests

# 訪客模式直接呼叫 API 網址
# 注意：每日僅限 20 次，且部分 API 可能會回傳 401 Unauthorized
api_url = "https://tdx.transportdata.tw/api/basic/v2/Bus/EstimatedTimeOfArrival/City/Taipei?%24top=5&%24format=JSON"

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

try:
    response = requests.get(api_url, headers=headers)
    if response.status_code == 200:
        print("成功取得資料！")
        print(response.json())
    else:
        print(f"失敗，錯誤碼：{response.status_code}")
        print("提示：這可能是因為訪客額度已達上限，或該 API 不支援訪客模式。")
except Exception as e:
    print(f"發生錯誤: {e}")      