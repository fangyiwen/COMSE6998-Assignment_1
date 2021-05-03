# https://python.gotrained.com/yelp-fusion-api-tutorial/

import requests
import json
import boto3
from decimal import *
import time

# Yelp API
api_key = 'api_key'
headers = {'Authorization': 'Bearer %s' % api_key}
url = 'https://api.yelp.com/v3/businesses/search'


def downloadFromApi(cuisine):
    unique = {}
    offset = -50
    while len(unique) < 1000:
        offset += 50
        params = {'term': cuisine + ' restaurants', 'location': 'Manhattan',
                  'limit': 50, 'offset': offset}

        req = requests.get(url, params=params, headers=headers)

        # proceed if status code is 200
        print('The status code is {}'.format(req.status_code))

        # printing the text from the response
        json_data = json.loads(req.text)

        for restaurant in json_data['businesses']:
            restaurantId = restaurant['id']
            if restaurantId not in unique:
                address = ''
                if restaurant['location']['address1']:
                    address += restaurant['location']['address1'].strip()
                if restaurant['location']['address2']:
                    address += ', ' + restaurant['location'][
                        'address2'].strip()
                if restaurant['location']['address3']:
                    address += ', ' + restaurant['location'][
                        'address3'].strip()
                # restaurantId, name, address, latitude, longitude, review_count, rating, zip_code
                unique[restaurantId] = (
                    restaurantId, restaurant['name'], address,
                    restaurant['coordinates']['latitude'],
                    restaurant['coordinates']['longitude'],
                    restaurant['review_count'], restaurant['rating'],
                    restaurant['location']['zip_code'])
    return unique


# DynamoDB
dynamodb = boto3.resource('dynamodb',
                          aws_access_key_id='aws_access_key_id',
                          aws_secret_access_key='SUeIio18QKCqW/aws_secret_access_key',
                          region_name='us-east-1'
                          )
table = dynamodb.Table('yelp-restaurants')


def batchCreateItem(unique):
    with table.batch_writer() as batch:
        for item in unique.values():
            batch.put_item(
                Item={
                    'restaurant_id': item[0],
                    'name': item[1],
                    'address': item[2],
                    'coordinates': {
                        'latitude': Decimal(str(item[3])),
                        'longitude': Decimal(str(item[4]))
                    },
                    'review_count': item[5],
                    'rating': Decimal(str(item[6])),
                    'zip_code': item[7],
                    'insertedAtTimestamp': str(time.time())
                }
            )


cuisines = ['Chinese', 'Japanese', 'Italian', 'Mexican', 'Thai']
for cuisine in cuisines:
    unique = downloadFromApi(cuisine)
    if len(unique) >= 1000:
        print(cuisine + ': Downloaded successfully')
    batchCreateItem(unique)
    print(cuisine + ': DB items created successfully')

print(table.scan()['Count'])
