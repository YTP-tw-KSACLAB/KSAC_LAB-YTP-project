import requests

# 台北市 YouBike 2.0 官方公開資料網址
url = "https://tcgbusfs.blob.core.windows.net/dotapp/youbike/v2/youbike_immediate.json"

response = requests.get(url)

if response.status_code == 200:
    data = response.json()
    
    # 假設我們要找「捷運科技大樓站」
    for station in data:
        if "捷運科技大樓站" in station['sna']:
            print(f"站點：{station['sna']}")
            print(f"可借車輛：{station['sbi']}")
            print(f"可還空位：{station['bemp']}")
            print(f"更新時間：{station['mday']}")
else:
    print("無法取得資料")