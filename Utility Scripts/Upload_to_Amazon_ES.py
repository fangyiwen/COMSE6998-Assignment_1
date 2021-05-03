import json

cuisines = ['Chinese', 'Japanese', 'Italian', 'Mexican', 'Thai']
frs = ['API_Chinese.py', 'API_Japanese.py', 'API_Italian.py', 'API_Mexican.py',
       'API_Thai.py']

fw = open('bulk_restaurants.json', 'w+')
count = 0
for i in range(5):
    cuisine = cuisines[i]

    tmp1 = "{ \"index\" : { \"_index\": \"restaurants\", \"_type\" : \"Restaurant\", \"_id\" : \"" + cuisine + "\" } }\n"
    if count != 0:
        tmp1 = '\n' + tmp1
    count = 1
    fw.write(tmp1)

    fr = open(frs[i], 'r+', encoding='utf-8')
    dic = eval(fr.read())
    print(dic)
    tmp2 = {}
    for id in dic:
        tmp2["restaurant_id"] = tmp2.get("restaurant_id", []) + [id]
    fw.write(json.dumps(tmp2))
    fw.write("\n")
    fr.close()
fw.close()
