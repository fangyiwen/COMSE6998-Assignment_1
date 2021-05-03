import json
import boto3

def lambda_handler(event, context):
    # # TODO implement
    receiveText = json.loads(event['body'])['messages'][0]['unstructured']['text']
    
    client = boto3.client('lex-runtime')
    response = client.post_text(
        botName='DiningConciergeChatBot',
        botAlias='DiningConciergeChatBot',
        userId='string',
        inputText=receiveText
    )
    
    message = response['message']
    messages = {'messages': [{'type': 'unstructured', 'unstructured': {'text': message}}]}
    
    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
        },
        'body': json.dumps(messages)
    }
