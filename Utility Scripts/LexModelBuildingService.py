import boto3

client = boto3.client('lex-models')

response = client.delete_bot_version(
    name='DiningConciergeChatBot',
    version='2'
)

print(response)
